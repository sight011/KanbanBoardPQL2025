import React, { memo } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { useTaskContext } from '../../context/TaskContext';
import './TaskCard.css';

const TaskCard = memo(({ task, index }) => {
    const { openTaskModal } = useTaskContext();

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

    return (
        <Draggable draggableId={task.id.toString()} index={index}>
            {(provided, snapshot) => {
                const style = {
                    ...provided.draggableProps.style,
                    transform: snapshot.isDragging 
                        ? provided.draggableProps.style?.transform 
                        : 'translateZ(0)'
                };

                return (
                    <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`task-card ${snapshot.isDragging ? 'dragging' : ''}`}
                        onClick={() => openTaskModal(task)}
                        style={style}
                    >
                        <div className="task-card-content">
                            <h4 className="task-title" title={task.title}>
                                <svg id="stack-icon" className="stack-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M4 6H20V8H4V6Z" fill="currentColor"/>
                                    <path d="M4 10H20V12H4V10Z" fill="currentColor"/>
                                    <path d="M4 14H20V16H4V14Z" fill="currentColor"/>
                                </svg>
                                {task.title}
                            </h4>
                            <p className="task-description" title={task.description}>
                                {task.description}
                            </p>
                            <div className="task-meta">
                                <span className={`priority-badge priority-${task.priority}`}>
                                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                </span>
                                <span className="task-ticket-number">
                                    {task.ticket_number}
                                </span>
                                {task.effort && (
                                    <span className="task-effort">
                                        EE: {task.effort}
                                    </span>
                                )}
                                {task.timespent && (
                                    <span className="task-timespent">
                                        TS: {task.timespent}
                                    </span>
                                )}
                                {task.assignee_id ? (
                                    <span 
                                        className="assignee-circle" 
                                        title={`Assigned to ${getAssigneeInitials(task.assignee_id)}`}
                                        style={{ backgroundColor: getAssigneeColor(task.assignee_id) }}
                                    >
                                        {getAssigneeInitials(task.assignee_id)}
                                    </span>
                                ) : (
                                    <span className="assignee-circle unassigned" title="Unassigned">
                                        UA
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                );
            }}
        </Draggable>
    );
});

TaskCard.displayName = 'TaskCard';

export default TaskCard; 