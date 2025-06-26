import { memo, useState, useEffect } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { useTaskContext } from '../../context/TaskContext';
import './TaskCard.css';
import { formatHours } from '../../utils/timeFormat';

const TaskCard = memo(({ task, index }) => {
    const { openTaskModal } = useTaskContext();
    const [hoursPerDay, setHoursPerDay] = useState(8);

    useEffect(() => {
        fetch('/api/settings/hoursperday')
            .then(res => res.json())
            .then(data => {
                if (data && data.hours) setHoursPerDay(Number(data.hours));
            })
            .catch(() => {});
    }, []);

    return (
        <Draggable draggableId={task.id.toString()} index={index}>
            {(provided, snapshot) => {
                const style = {
                    ...provided.draggableProps.style,
                    transform: snapshot.isDragging 
                        ? provided.draggableProps.style?.transform 
                        : undefined
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
                                    EE: {task.effort ? formatHours(task.effort, hoursPerDay) : '–'}
                                </span>
                            )}
                            {task.timespent && (
                                <span className="task-timespent">
                                    TS: {task.timespent ? formatHours(task.timespent, hoursPerDay) : '–'}
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