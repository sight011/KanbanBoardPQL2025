import React, { useState, useEffect, useMemo } from 'react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import TaskColumn from './TaskColumn';
import TaskFilters from './TaskFilters';
import { useTaskContext } from '../../context/TaskContext';
import TaskModal from './TaskModal';
import './TaskBoard.css';

const TaskBoard = () => {
    const { tasks, updateTaskPosition, loading, error } = useTaskContext();
    const [selectedTask, setSelectedTask] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'list'
    const [filters, setFilters] = useState({
        text: '',
        priority: '',
        assignee: ''
    });

    // Use useMemo to efficiently filter tasks
    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            const matchesText = !filters.text || 
                task.title.toLowerCase().includes(filters.text.toLowerCase()) ||
                task.description.toLowerCase().includes(filters.text.toLowerCase());
            
            const matchesPriority = !filters.priority || 
                task.priority === filters.priority;
            
            const matchesAssignee = !filters.assignee || 
                (filters.assignee === 'unassigned' && !task.assignee_id) ||
                task.assignee_id === parseInt(filters.assignee);

            return matchesText && matchesPriority && matchesAssignee;
        });
    }, [tasks, filters]);

    // Organize filtered tasks into columns
    const columns = useMemo(() => {
        const organizedTasks = {
            todo: [],
            inProgress: [],
            review: [],
            done: []
        };

        filteredTasks.forEach(task => {
            if (organizedTasks[task.status]) {
                organizedTasks[task.status].push(task);
            }
        });

        // Sort tasks by position within each column
        Object.keys(organizedTasks).forEach(status => {
            organizedTasks[status].sort((a, b) => a.position - b.position);
        });

        return organizedTasks;
    }, [filteredTasks]);

    const sortedTasks = useMemo(() => {
        if (viewMode === 'list') {
            return [...filteredTasks].sort((a, b) => {
                const priorityOrder = { high: 3, medium: 2, low: 1 };
                return priorityOrder[b.priority] - priorityOrder[a.priority];
            });
        }
        return filteredTasks;
    }, [filteredTasks, viewMode]);

    const handleFilterChange = (filterType, value) => {
        setFilters(prev => ({
            ...prev,
            [filterType]: value
        }));
    };

    const onDragStart = () => {
        // Add a class to the body when drag starts
        document.body.classList.add('dragging');
    };

    const onDragEnd = async (result) => {
        // Remove the dragging class from body
        document.body.classList.remove('dragging');

        const { source, destination, draggableId } = result;

        // Dropped outside a valid destination
        if (!destination) return;

        // Dropped in the same position
        if (
            source.droppableId === destination.droppableId &&
            source.index === destination.index
        ) return;

        const taskId = parseInt(draggableId);
        const newStatus = destination.droppableId;
        const newPosition = destination.index + 1;

        try {
            await updateTaskPosition(taskId, newPosition, newStatus);
        } catch (error) {
            console.error('Error updating task position:', error);
        }
    };

    const handleTaskClick = (task) => {
        setSelectedTask(task);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedTask(null);
    };

    const handleUpdateTask = (updatedTask) => {
        // Implement the logic to update the task
        console.log('Updating task:', updatedTask);
        handleCloseModal();
    };

    const handleDeleteTask = (taskId) => {
        // Implement the logic to delete the task
        console.log('Deleting task with id:', taskId);
        handleCloseModal();
    };

    const toggleViewMode = () => {
        setViewMode(prevMode => prevMode === 'kanban' ? 'list' : 'kanban');
    };

    const getAssigneeInitials = (assigneeId) => {
        // For now, we'll use a simple mapping
        const userMap = {
            1: { firstName: 'John', lastName: 'Doe' },
            2: { firstName: 'Jane', lastName: 'Smith' },
            3: { firstName: 'Bob', lastName: 'Johnson' }
        };
        
        const user = userMap[assigneeId];
        if (!user) return '?';
        
        return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    };

    const getAssigneeColor = (assigneeId) => {
        // Array of visually distinct colors
        const colors = [
            '#0052cc', // Blue
            '#36b37e', // Green
            '#ff5630', // Red
            '#ffab00', // Yellow
            '#6554c0', // Purple
            '#00b8d9', // Cyan
            '#ff7452', // Orange
            '#8777d9', // Lavender
            '#57d9a3', // Mint
            '#00a3bf'  // Teal
        ];
        
        // Use assigneeId to consistently map to a color
        return colors[(assigneeId - 1) % colors.length];
    };

    if (loading) {
        return (
            <div className="task-board-loading">
                <div className="loading-spinner"></div>
                <p>Loading tasks...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="task-board-error">
                <p>Error: {error}</p>
                <p>Please try again later.</p>
            </div>
        );
    }

    if (viewMode === 'list') {
        return (
            <div className="task-board">
                <div className="board-header">
                    <TaskFilters
                        tasks={tasks}
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        onClearFilters={() => handleFilterChange('text', '')}
                    />
                    <button 
                        className="view-toggle-button"
                        onClick={toggleViewMode}
                        title={viewMode === 'kanban' ? 'Switch to Kanban View' : 'Switch to List View'}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
                        </svg>
                    </button>
                </div>
                <div className="list-view">
                    <div className="list-header">
                        <div className="list-column">Title</div>
                        <div className="list-column">Description</div>
                        <div className="list-column">Priority</div>
                        <div className="list-column">Assignee</div>
                        <div className="list-column">Status</div>
                    </div>
                    {sortedTasks.map(task => (
                        <div 
                            key={task.id} 
                            className="list-item"
                            onClick={() => handleTaskClick(task)}
                        >
                            <div className="list-column">{task.title}</div>
                            <div className="list-column">{task.description}</div>
                            <div className="list-column">
                                <span className={`priority-badge ${task.priority}`}>
                                    {task.priority}
                                </span>
                            </div>
                            <div className="list-column">
                                {task.assignee_id ? (
                                    <div 
                                        className="assignee-bubble"
                                        style={{ backgroundColor: getAssigneeColor(task.assignee_id) }}
                                        title={`Assigned to ${getAssigneeInitials(task.assignee_id)}`}
                                    >
                                        {getAssigneeInitials(task.assignee_id)}
                                    </div>
                                ) : (
                                    <span className="unassigned">Unassigned</span>
                                )}
                            </div>
                            <div className="list-column">{task.status}</div>
                        </div>
                    ))}
                </div>
                {isModalOpen && (
                    <TaskModal
                        task={selectedTask}
                        onClose={handleCloseModal}
                        onUpdate={handleUpdateTask}
                        onDelete={handleDeleteTask}
                    />
                )}
            </div>
        );
    }

    return (
        <div className="task-board">
            <div className="board-header">
                <TaskFilters 
                    filters={filters}
                    onFilterChange={handleFilterChange}
                />
                <button 
                    className="view-toggle-button"
                    onClick={toggleViewMode}
                    title={viewMode === 'kanban' ? 'Switch to List View' : 'Switch to Kanban View'}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M4 11h5V5H4v6zm0 7h5v-6H4v6zm6 0h5v-6h-5v6zm6 0h5v-6h-5v6zm-6-7h5V5h-5v6zm6-6v6h5V5h-5z"/>
                    </svg>
                </button>
            </div>
            <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
                <div className="columns-container">
                    <TaskColumn
                        title="To Do"
                        tasks={columns.todo}
                        status="todo"
                        onTaskClick={handleTaskClick}
                    />
                    <TaskColumn
                        title="In Progress"
                        tasks={columns.inProgress}
                        status="inProgress"
                        onTaskClick={handleTaskClick}
                    />
                    <TaskColumn
                        title="Review"
                        tasks={columns.review}
                        status="review"
                        onTaskClick={handleTaskClick}
                    />
                    <TaskColumn
                        title="Done"
                        tasks={columns.done}
                        status="done"
                        onTaskClick={handleTaskClick}
                    />
                </div>
            </DragDropContext>
            {isModalOpen && (
                <TaskModal
                    task={selectedTask}
                    onClose={handleCloseModal}
                    onUpdate={handleUpdateTask}
                    onDelete={handleDeleteTask}
                />
            )}
        </div>
    );
};

export default TaskBoard; 