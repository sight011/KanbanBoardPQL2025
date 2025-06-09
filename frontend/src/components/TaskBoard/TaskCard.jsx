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
                                {task.title}
                            </h4>
                            <p className="task-description" title={task.description}>
                                {task.description}
                            </p>
                            <div className="task-meta">
                                <span className={`priority ${task.priority}`}>
                                    {task.priority}
                                </span>
                                {task.assignee_id ? (
                                    <span className="assignee-circle" title={`Assigned to ${getAssigneeInitials(task.assignee_id)}`}>
                                        {getAssigneeInitials(task.assignee_id)}
                                    </span>
                                ) : (
                                    <span className="assignee-circle unassigned" title="Unassigned">
                                        UA
                                    </span>
                                )}
                                {task.ticket_number && (
                                    <span className="task-ticket-number">
                                        {task.ticket_number}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                );
            }}
        </Draggable>
    );
}, (prevProps, nextProps) => {
    // Only re-render if the task or index has actually changed
    return prevProps.task.id === nextProps.task.id && 
           prevProps.index === nextProps.index &&
           prevProps.task.status === nextProps.task.status;
});

TaskCard.displayName = 'TaskCard';

export default TaskCard; 