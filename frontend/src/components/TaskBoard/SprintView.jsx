import React, { useEffect, useState } from 'react';
import { useTaskContext } from '../../context/TaskContext';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import './SprintView.css';
import classNames from 'classnames';

const formatDateInput = (date) => {
    if (!date) return '';
    const d = new Date(date);
    // Adjust for timezone offset so the date is correct in local time
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localISO = new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
    return localISO;
};

const SprintModal = ({ open, onClose, onSave, initial }) => {
    const [name, setName] = useState(initial?.name || '');
    const [startDate, setStartDate] = useState(initial?.start_date ? formatDateInput(initial.start_date) : '');
    const [endDate, setEndDate] = useState(initial?.end_date ? formatDateInput(initial.end_date) : '');
    const isDarkMode = document.documentElement.classList.contains('dark-mode');

    useEffect(() => {
        setName(initial?.name || '');
        setStartDate(initial?.start_date ? formatDateInput(initial.start_date) : '');
        setEndDate(initial?.end_date ? formatDateInput(initial.end_date) : '');
    }, [initial, open]);

    if (!open) return null;

    return (
        <div className="modal-backdrop">
            <div className={`modal-content ${isDarkMode ? 'dark' : 'light'}`}>
                <h3>{initial ? 'Edit Sprint' : 'Create Sprint'}</h3>
                <div className="modal-form">
                    <input 
                        className={`modal-input ${isDarkMode ? 'dark' : 'light'}`}
                        placeholder="Name" 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                    />
                    <input 
                        className={`modal-input ${isDarkMode ? 'dark' : 'light'}`}
                        type="date" 
                        value={startDate} 
                        onChange={e => setStartDate(e.target.value)} 
                    />
                    <input 
                        className={`modal-input ${isDarkMode ? 'dark' : 'light'}`}
                        type="date" 
                        value={endDate} 
                        onChange={e => setEndDate(e.target.value)} 
                    />
                    <div className="modal-actions">
                        <button 
                            className={`modal-button secondary ${isDarkMode ? 'dark' : 'light'}`}
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        <button 
                            className={`modal-button primary ${isDarkMode ? 'dark' : 'light'}`}
                            onClick={() => onSave({ name, start_date: startDate, end_date: endDate })} 
                            disabled={!name}
                        >
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

function formatDateRange(start, end) {
    if (!start || !end) return '';
    const s = new Date(start);
    const e = new Date(end);
    return `${s.toLocaleDateString()} – ${e.toLocaleDateString()}`;
}

const SprintView = () => {
    const { tasks, updateTask } = useTaskContext();
    const [sprints, setSprints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [editSprint, setEditSprint] = useState(null);
    const [actionLoading, setActionLoading] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(null);
    const [isDarkMode, setIsDarkMode] = useState(() =>
        document.documentElement.classList.contains('dark-mode') ||
        document.body.classList.contains('dark-mode')
    );

    useEffect(() => {
        const observer = new MutationObserver(() => {
            setIsDarkMode(
                document.documentElement.classList.contains('dark-mode') ||
                document.body.classList.contains('dark-mode')
            );
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    const fetchSprints = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/sprints');
            const data = await res.json();
            setSprints(data.sprints || []);
        } catch (err) {
            setError('Failed to load sprints');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSprints();
    }, []);

    // Group tasks by sprint_id
    const tasksBySprint = {};
    tasks.forEach(task => {
        const sid = task.sprint_id || 'backlog';
        if (!tasksBySprint[sid]) tasksBySprint[sid] = [];
        tasksBySprint[sid].push(task);
    });

    const onDragEnd = async (result) => {
        const { source, destination, draggableId } = result;
        if (!destination) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;
        const taskId = parseInt(draggableId);
        const sourceSprintId = source.droppableId === 'backlog' ? null : parseInt(source.droppableId);
        const destSprintId = destination.droppableId === 'backlog' ? null : parseInt(destination.droppableId);
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const sourceList = (tasksBySprint[sourceSprintId || 'backlog'] || []).filter(t => t.id !== taskId);
        const destList = (tasksBySprint[destSprintId || 'backlog'] || []).filter(t => t.id !== taskId);
        let newList;
        if (source.droppableId === destination.droppableId) {
            newList = [...sourceList];
            newList.splice(destination.index, 0, task);
        } else {
            newList = [...destList];
            newList.splice(destination.index, 0, { ...task, sprint_id: destSprintId });
        }

        for (let i = 0; i < newList.length; i++) {
            const t = newList[i];
            await updateTask(t.id, {
                ...t,
                sprint_id: destSprintId,
                sprint_order: i + 1
            });
        }

        if (source.droppableId !== destination.droppableId) {
            for (let i = 0; i < sourceList.length; i++) {
                const t = sourceList[i];
                await updateTask(t.id, {
                    ...t,
                    sprint_order: i + 1
                });
            }
        }
    };

    const handleSaveSprint = async (data) => {
        if (editSprint) {
            await fetch(`/api/sprints/${editSprint.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...editSprint, ...data })
            });
        } else {
            await fetch('/api/sprints', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        }
        setModalOpen(false);
        setEditSprint(null);
        fetchSprints();
    };

    const handleSprintAction = async (sprint) => {
        setActionLoading(sprint.id);
        try {
            if (sprint.status === 'planned') {
                await fetch(`/api/sprints/${sprint.id}/start`, { method: 'POST' });
            } else if (sprint.status === 'active') {
                await fetch(`/api/sprints/${sprint.id}/complete`, { method: 'POST' });
            }
            await fetchSprints();
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteSprint = async (sprint) => {
        if (!window.confirm(`Delete sprint "${sprint.name}"? All tasks will be moved to backlog.`)) return;
        setDeleteLoading(sprint.id);
        try {
            await fetch(`/api/sprints/${sprint.id}`, { method: 'DELETE' });
            await fetchSprints();
        } finally {
            setDeleteLoading(null);
        }
    };

    return (
        <div className={`sprint-view ${isDarkMode ? 'dark' : 'light'}`}>
            <SprintModal
                open={modalOpen}
                onClose={() => { setModalOpen(false); setEditSprint(null); }}
                onSave={handleSaveSprint}
                initial={editSprint}
            />
            <div className="sprint-header">
                <h2>Sprints</h2>
                <button 
                    className={`create-sprint-button ${isDarkMode ? 'dark' : 'light'}`}
                    onClick={() => { setModalOpen(true); setEditSprint(null); }}
                >
                    + Create Sprint
                </button>
            </div>
            <DragDropContext onDragEnd={onDragEnd}>
                {loading ? (
                    <div className="loading-message">Loading sprints...</div>
                ) : error ? (
                    <div className="error-message">{error}</div>
                ) : (
                    <>
                        <div className="sprint-list">
                            {sprints.map((sprint, sprintIdx) => (
                                <Droppable droppableId={String(sprint.id)} key={sprint.id}>
                                    {(provided, snapshot) => (
                                        <div
                                            id={`sprint-${sprint.id}`}
                                            className={classNames('sprint-section', isDarkMode ? 'dark' : 'light', { 'dragging-over': snapshot.isDraggingOver })}
                                            style={{boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: 32}}
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                        >
                                            <div className="sprint-section-header">
                                                <div className="sprint-section-header-row" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                                    <h3 style={{ margin: 0 }}>{sprint.name}</h3>
                                                    <span className="sprint-dates" style={{ marginLeft: 16 }}>{formatDateRange(sprint.start_date, sprint.end_date)}</span>
                                                    <span className="sprint-status-badge" style={{ marginLeft: 16 }}>Status: {sprint.status}</span>
                                                </div>
                                                <div className="sprint-actions">
                                                    {sprint.status === 'planned' && (
                                                        <button 
                                                            className={classNames('sprint-action-button', 'start', isDarkMode ? 'dark' : 'light')}
                                                            onClick={() => handleSprintAction(sprint)} 
                                                            disabled={actionLoading === sprint.id}
                                                        >
                                                            {actionLoading === sprint.id ? 'Starting...' : 'Start'}
                                                        </button>
                                                    )}
                                                    {sprint.status === 'active' && (
                                                        <button 
                                                            className={classNames('sprint-action-button', 'complete', isDarkMode ? 'dark' : 'light')}
                                                            onClick={() => handleSprintAction(sprint)} 
                                                            disabled={actionLoading === sprint.id}
                                                        >
                                                            {actionLoading === sprint.id ? 'Completing...' : 'Complete'}
                                                        </button>
                                                    )}
                                                    <button 
                                                        className={classNames('sprint-action-button', 'edit', isDarkMode ? 'dark' : 'light')}
                                                        onClick={() => { setModalOpen(true); setEditSprint(sprint); }}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button 
                                                        className={classNames('sprint-action-button', 'delete', isDarkMode ? 'dark' : 'light')}
                                                        onClick={() => handleDeleteSprint(sprint)} 
                                                        disabled={deleteLoading === sprint.id}
                                                    >
                                                        {deleteLoading === sprint.id ? 'Deleting...' : 'Delete'}
                                                    </button>
                                                </div>
                                            </div>
                                            <ul className="sprint-task-list">
                                                {(tasksBySprint[sprint.id] || [])
                                                    .slice()
                                                    .sort((a, b) => (a.sprint_order ?? 0) - (b.sprint_order ?? 0) || a.id - b.id)
                                                    .map((task, idx) => (
                                                        <Draggable draggableId={String(task.id)} index={idx} key={task.id}>
                                                            {(provided, snapshot) => (
                                                                <li
                                                                    id={`task-${task.id}`}
                                                                    className={`sprint-task ${isDarkMode ? 'dark' : 'light'} ${snapshot.isDragging ? 'dragging' : ''}`}
                                                                    ref={provided.innerRef}
                                                                    {...provided.draggableProps}
                                                                    {...provided.dragHandleProps}
                                                                >
                                                                    <span className="stack-icon-wrapper">
                                                                        <svg className="stack-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                            <path d="M4 6H20V8H4V6Z" fill="currentColor"></path>
                                                                            <path d="M4 10H20V12H4V10Z" fill="currentColor"></path>
                                                                            <path d="M4 14H20V16H4V14Z" fill="currentColor"></path>
                                                                        </svg>
                                                                    </span>
                                                                    <span className="task-title">{task.title}</span>
                                                                    <span className={`priority-badge ${task.priority}`}>{task.priority}</span>
                                                                </li>
                                                            )}
                                                        </Draggable>
                                                    ))}
                                                {provided.placeholder}
                                            </ul>
                                        </div>
                                    )}
                                </Droppable>
                            ))}
                        </div>
                        <div id="backlog-section" className="backlog-container">
                            <Droppable droppableId="backlog">
                                {(provided, snapshot) => (
                                    <div
                                        className={classNames('backlog-section', isDarkMode ? 'dark' : 'light', { 'dragging-over': snapshot.isDraggingOver })}
                                        style={{boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginTop: 32}}
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                    >
                                        <div className="backlog-header">
                                            <h3>Backlog</h3>
                                        </div>
                                        <ul className="backlog-task-list">
                                            {(tasksBySprint['backlog'] || [])
                                                .slice()
                                                .sort((a, b) => (a.sprint_order ?? 0) - (b.sprint_order ?? 0) || a.id - b.id)
                                                .map((task, idx) => (
                                                    <Draggable draggableId={String(task.id)} index={idx} key={task.id}>
                                                        {(provided, snapshot) => (
                                                            <li
                                                                id={`task-${task.id}`}
                                                                className={`backlog-task ${isDarkMode ? 'dark' : 'light'} ${snapshot.isDragging ? 'dragging' : ''}`}
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                            >
                                                                <span className="stack-icon-wrapper">
                                                                    <svg className="stack-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                        <path d="M4 6H20V8H4V6Z" fill="currentColor"></path>
                                                                        <path d="M4 10H20V12H4V10Z" fill="currentColor"></path>
                                                                        <path d="M4 14H20V16H4V14Z" fill="currentColor"></path>
                                                                    </svg>
                                                                </span>
                                                                <span className="task-title">{task.title}</span>
                                                                <span className={`priority-badge ${task.priority}`}>{task.priority}</span>
                                                            </li>
                                                        )}
                                                    </Draggable>
                                                ))}
                                            {provided.placeholder}
                                        </ul>
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    </>
                )}
            </DragDropContext>
        </div>
    );
};

export default SprintView; 