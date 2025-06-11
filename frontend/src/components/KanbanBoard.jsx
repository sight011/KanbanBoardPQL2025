import { useState, useEffect } from 'react';
import { useTaskContext } from '../context/TaskContext';
import TaskColumn from './TaskColumn';
import TaskModal from './TaskModal';
import { DragDropContext, Droppable } from 'react-beautiful-dnd';
import { toast } from 'react-hot-toast';

const KanbanBoard = () => {
    const { 
        tasks, 
        loading, 
        error,
        createTask,
        updateTask,
        deleteTask,
        updateTaskPosition,
        openTaskModal,
        closeTaskModal,
        isModalOpen,
        selectedTask
    } = useTaskContext();

    const [columns, setColumns] = useState({
        todo: [],
        inProgress: [],
        done: []
    });

    // Organize tasks into columns
    useEffect(() => {
        const organizedTasks = {
            todo: [],
            inProgress: [],
            done: []
        };

        tasks.forEach(task => {
            if (organizedTasks[task.status]) {
                organizedTasks[task.status].push(task);
            }
        });

        // Sort tasks by position within each column
        Object.keys(organizedTasks).forEach(status => {
            organizedTasks[status].sort((a, b) => a.position - b.position);
        });

        setColumns(organizedTasks);
    }, [tasks]);

    // Handle drag end
    const handleDragEnd = async (result) => {
        const { source, destination, draggableId } = result;

        // Dropped outside a valid target
        if (!destination) return;

        // Same position
        if (
            source.droppableId === destination.droppableId &&
            source.index === destination.index
        ) {
            return;
        }

        const taskId = parseInt(draggableId);
        const newStatus = destination.droppableId;
        const newPosition = destination.index + 1;

        try {
            await updateTaskPosition(taskId, newPosition, newStatus);
        } catch (error) {
            toast.error('Failed to update task position');
            console.error('Error updating task position:', error);
        }
    };

    // Handle task creation
    const handleCreateTask = async (taskData) => {
        try {
            await createTask(taskData);
            toast.success('Task created successfully');
            closeTaskModal();
        } catch (error) {
            toast.error('Failed to create task');
            console.error('Error creating task:', error);
        }
    };

    // Handle task update
    const handleUpdateTask = async (taskId, updatedData) => {
        try {
            await updateTask(taskId, updatedData);
            toast.success('Task updated successfully');
            closeTaskModal();
        } catch (error) {
            toast.error('Failed to update task');
            console.error('Error updating task:', error);
        }
    };

    // Handle task deletion
    const handleDeleteTask = async (taskId) => {
        if (window.confirm('Are you sure you want to delete this task?')) {
            try {
                await deleteTask(taskId);
                toast.success('Task deleted successfully');
            } catch (error) {
                toast.error('Failed to delete task');
                console.error('Error deleting task:', error);
            }
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-red-500">Error: {error}</div>
            </div>
        );
    }

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Kanban Board</h1>
                <button
                    onClick={() => openTaskModal()}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                >
                    Create Task
                </button>
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <TaskColumn
                        title="To Do"
                        tasks={columns.todo}
                        status="todo"
                        onTaskClick={openTaskModal}
                        onDeleteTask={handleDeleteTask}
                    />
                    <TaskColumn
                        title="In Progress"
                        tasks={columns.inProgress}
                        status="inProgress"
                        onTaskClick={openTaskModal}
                        onDeleteTask={handleDeleteTask}
                    />
                    <TaskColumn
                        title="Done"
                        tasks={columns.done}
                        status="done"
                        onTaskClick={openTaskModal}
                        onDeleteTask={handleDeleteTask}
                    />
                </div>
            </DragDropContext>

            {isModalOpen && (
                <TaskModal
                    task={selectedTask}
                    onClose={closeTaskModal}
                    onSubmit={selectedTask ? handleUpdateTask : handleCreateTask}
                />
            )}
        </div>
    );
};

export default KanbanBoard; 