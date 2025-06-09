import React, { useState, useEffect, useMemo } from 'react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import TaskColumn from './TaskColumn';
import TaskFilters from './TaskFilters';
import { useTaskContext } from '../../context/TaskContext';
import './TaskBoard.css';

const TaskBoard = () => {
    const { tasks, updateTaskPosition, loading, error } = useTaskContext();
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

    return (
        <div className="task-board">
            <TaskFilters 
                filters={filters}
                onFilterChange={handleFilterChange}
            />
            <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
                <div className="columns-container">
                    <TaskColumn
                        title="To Do"
                        tasks={columns.todo}
                        status="todo"
                    />
                    <TaskColumn
                        title="In Progress"
                        tasks={columns.inProgress}
                        status="inProgress"
                    />
                    <TaskColumn
                        title="Review"
                        tasks={columns.review}
                        status="review"
                    />
                    <TaskColumn
                        title="Done"
                        tasks={columns.done}
                        status="done"
                    />
                </div>
            </DragDropContext>
        </div>
    );
};

export default TaskBoard; 