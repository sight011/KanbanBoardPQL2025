import React, { memo, useState, useEffect } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { useTaskContext } from '../../context/TaskContext';
import './TaskCard.css';

const TaskCard = memo(({ task, index }) => {
    const { openTaskModal } = useTaskContext();
    const [users, setUsers] = useState([]);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await fetch('/api/users');
                const data = await res.json();
                setUsers(data.users || []);
            } catch (err) {
                console.error('Error fetching users:', err);
                setUsers([]);
            }
        };
        fetchUsers();
    }, []);

    const getAssigneeInitials = (assigneeId) => {
        if (!assigneeId) return 'UA';
        
        const user = users.find(u => u.id === assigneeId);
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
                        <div className="task-card-header">
                            <span className="task-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </span>
                            <h4 className="task-title" title={task.title}>{task.title}</h4>
                        </div>
                        <p className="task-description" title={task.description}>
                            {task.description}
                        </p>
                        <div className="task-meta">
                            <span className={`priority-badge priority-${task.priority}`}>
                                {task.priority === 'medium'
                                    ? 'Med'
                                    : task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
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
                                    TS: {task.timespent ? task.timespent : '–'}
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
                );
            }}
        </Draggable>
    );
});

TaskCard.displayName = 'TaskCard';

export default TaskCard; 