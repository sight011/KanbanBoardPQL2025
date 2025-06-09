import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import TaskColumn from './TaskColumn';
import { useTaskContext } from '../../context/TaskContext';
import './TaskBoard.css';

const TaskBoard = () => {
    const { tasks, updateTaskPosition, loading, error } = useTaskContext();
    const [columns, setColumns] = useState({
        todo: [],
        inProgress: [],
        review: [],
        done: []
    });

    useEffect(() => {
        // Organize tasks into columns
        const organizedTasks = {
            todo: [],
            inProgress: [],
            review: [],
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