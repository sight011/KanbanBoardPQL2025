import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import TaskCard from './TaskCard';
import './TaskColumn.css';

const TaskColumn = ({ title, tasks, status }) => {
    return (
        <div className="task-column">
            <div className="column-header">
                <h3>{title}</h3>
                <span className="task-count">{tasks.length}</span>
            </div>
            <Droppable droppableId={status}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`task-list ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                    >
                        {tasks.map((task, index) => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                index={index}
                            />
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </div>
    );
};

export default TaskColumn; 