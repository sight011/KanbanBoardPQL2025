import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { useTaskContext } from '../../context/TaskContext';
import './TaskCard.css';

const TaskCard = ({ task, index }) => {
    const { openTaskModal } = useTaskContext();

    return (
        <Draggable draggableId={task.id.toString()} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`task-card ${snapshot.isDragging ? 'dragging' : ''}`}
                    onClick={() => openTaskModal(task)}
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
                            {task.assignee_id && (
                                <span className="assignee">
                                    Assigned
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </Draggable>
    );
};

export default TaskCard; 