import React, { useEffect, useState } from 'react';
import { useTaskContext } from '../../context/TaskContext';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import './SprintView.css';
import classNames from 'classnames';
import TaskFilters from './TaskFilters';

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

const DeleteSprintModal = ({ open, onClose, onConfirm, sprints, defaultValue }) => {
    const [destination, setDestination] = useState(defaultValue || 'backlog');
    useEffect(() => {
        setDestination(defaultValue || 'backlog');
    }, [defaultValue, open]);
    if (!open) return null;
    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <h3>Delete Sprint</h3>
                <p>Where should the tickets from this sprint go?</p>
                <select
                    className="modal-input"
                    value={destination}
                    onChange={e => setDestination(e.target.value)}
                >
                    <option value="backlog">Backlog</option>
                    {sprints.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
                <div className="modal-actions">
                    <button className="modal-button secondary" onClick={onClose}>Cancel</button>
                    <button className="modal-button primary" onClick={() => onConfirm(destination)}>Delete</button>
                </div>
            </div>
        </div>
    );
};

const ReactivateModal = ({ open, onClose, onConfirm, activeSprint, isDarkMode }) => {
    if (!open) return null;

    return (
        <div className="modal-backdrop">
            <div className={`modal-content ${isDarkMode ? 'dark' : 'light'}`}>
                <h3>Reactivate Sprint</h3>
                <p>
                    {activeSprint 
                        ? `Sprint "${activeSprint.name}" is currently active. Reactivating this sprint will set the active sprint back to planned status.`
                        : 'Are you sure you want to reactivate this sprint?'}
                </p>
                <div className="modal-actions">
                    <button 
                        className={`modal-button secondary ${isDarkMode ? 'dark' : 'light'}`}
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button 
                        className={`modal-button primary ${isDarkMode ? 'dark' : 'light'}`}
                        onClick={onConfirm}
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
};

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
    const [users, setUsers] = useState([]);
    const [filters, setFilters] = useState({
        text: '',
        assignee: '',
        priority: '',
        sprint: ''
    });
    const [foldedSprints, setFoldedSprints] = useState(new Set());
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [sprintToDelete, setSprintToDelete] = useState(null);
    const [reactivateModalOpen, setReactivateModalOpen] = useState(false);
    const [sprintToReactivate, setSprintToReactivate] = useState(null);
    const [activeSprint, setActiveSprint] = useState(null);

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

    // Fetch users for the assignee filter
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await fetch('/api/users');
                const data = await res.json();
                setUsers(data.users || []);
            } catch (err) {
                setUsers([]);
            }
        };
        fetchUsers();
    }, []);

    const fetchSprints = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/sprints');
            const data = await res.json();
            // Sort sprints: Sprint 1 first, then others by name, then by ID
            const sortedSprints = (data.sprints || []).sort((a, b) => {
                // Sprint 1 always comes first
                if (a.name === 'Sprint 1') return -1;
                if (b.name === 'Sprint 1') return 1;
                
                // Then sort by name
                const nameCompare = a.name.localeCompare(b.name);
                if (nameCompare !== 0) return nameCompare;
                
                // Finally sort by ID
                return a.id - b.id;
            });
            setSprints(sortedSprints);
        } catch (err) {
            setError('Failed to load sprints');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSprints();
    }, []);

    // Filter tasks based on filters
    const filteredTasks = tasks.filter(task => {
        // Text filter
        if (filters.text && !task.title.toLowerCase().includes(filters.text.toLowerCase())) {
            return false;
        }
        // Assignee filter
        if (filters.assignee && task.assignee_id !== parseInt(filters.assignee)) {
            return false;
        }
        // Priority filter
        if (filters.priority && task.priority !== filters.priority) {
            return false;
        }
        // Sprint filter
        if (filters.sprint) {
            if (filters.sprint === 'backlog' && task.sprint_id !== null) {
                return false;
            }
            if (filters.sprint !== 'backlog' && task.sprint_id !== parseInt(filters.sprint)) {
                return false;
            }
        }
        return true;
    });

    // Group tasks by sprint_id
    const tasksBySprint = {};
    filteredTasks.forEach(task => {
        const sid = task.sprint_id || 'backlog';
        if (!tasksBySprint[sid]) tasksBySprint[sid] = [];
        tasksBySprint[sid].push(task);
    });

    useEffect(() => {
        // Keep track of active sprint
        const active = sprints.find(s => s.status === 'active');
        setActiveSprint(active || null);
    }, [sprints]);

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

    const handleDeleteSprint = (sprint) => {
        setSprintToDelete(sprint);
        setDeleteModalOpen(true);
    };

    const confirmDeleteSprint = async (destination) => {
        setDeleteLoading(sprintToDelete.id);
        try {
            // Move all tasks to destination
            const tasksToMove = tasks.filter(t => t.sprint_id === sprintToDelete.id);
            for (const task of tasksToMove) {
                await updateTask(task.id, {
                    sprint_id: destination === 'backlog' ? null : parseInt(destination),
                    sprint_order: 1 // or recalculate as needed
                });
            }
            // Delete the sprint
            await fetch(`/api/sprints/${sprintToDelete.id}`, { method: 'DELETE' });
            await fetchSprints();
        } finally {
            setDeleteLoading(null);
            setDeleteModalOpen(false);
            setSprintToDelete(null);
        }
    };

    const handleReactivate = (sprint) => {
        setSprintToReactivate(sprint);
        const activeSprint = sprints.find(s => s.status === 'active');
        
        if (activeSprint && activeSprint.id !== sprint.id) {
            setActiveSprint(activeSprint);
            setReactivateModalOpen(true);
        } else {
            confirmReactivate();
        }
    };

    const confirmReactivate = async () => {
        if (!sprintToReactivate) return;
        
        try {
            setLoading(true);
            const response = await fetch(`/api/sprints/${sprintToReactivate.id}/reactivate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to reactivate sprint');
            }

            await fetchSprints();
            setReactivateModalOpen(false);
            setSprintToReactivate(null);
            setActiveSprint(null);
        } catch (error) {
            console.error('Error reactivating sprint:', error);
            setError(error.message || 'Failed to reactivate sprint');
        } finally {
            setLoading(false);
        }
    };

    const handleFoldToggle = (sprintId, event) => {
        if (event && (event.altKey || event.metaKey)) {
            // Option/Alt or Command/Meta key: fold/unfold all
            setFoldedSprints(prev => {
                const allIds = new Set(sprints.map(s => s.id));
                const anyUnfolded = sprints.some(s => !prev.has(s.id));
                return anyUnfolded ? allIds : new Set();
            });
        } else {
            setFoldedSprints(prev => {
                const newSet = new Set(prev);
                if (newSet.has(sprintId)) {
                    newSet.delete(sprintId);
                } else {
                    newSet.add(sprintId);
                }
                return newSet;
            });
        }
    };

    const handleFilterChange = (filterType, value) => {
        setFilters(prev => ({
            ...prev,
            [filterType]: value
        }));
    };

    return (
        <div className={`sprint-view ${isDarkMode ? 'dark' : 'light'}`}>
            <TaskFilters filters={filters} onFilterChange={handleFilterChange} />
            <SprintModal
                open={modalOpen}
                onClose={() => { setModalOpen(false); setEditSprint(null); }}
                onSave={handleSaveSprint}
                initial={editSprint}
            />
            <DeleteSprintModal
                open={deleteModalOpen}
                onClose={() => { setDeleteModalOpen(false); setSprintToDelete(null); }}
                onConfirm={confirmDeleteSprint}
                sprints={sprints.filter(s => sprintToDelete && s.id !== sprintToDelete.id)}
                defaultValue="backlog"
            />
            <ReactivateModal
                open={reactivateModalOpen}
                onClose={() => {
                    setReactivateModalOpen(false);
                    setSprintToReactivate(null);
                }}
                onConfirm={confirmReactivate}
                activeSprint={activeSprint}
                isDarkMode={isDarkMode}
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
                                            className={classNames('sprint-section', isDarkMode ? 'dark' : 'light', { 'dragging-over': snapshot.isDraggingOver, 'folded': foldedSprints.has(sprint.id) })}
                                            style={{boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: 32}}
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                        >
                                            <div className="sprint-section-header">
                                                <div className="sprint-section-header-row" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                                    <button
                                                        className="fold-toggle-button"
                                                        onClick={e => handleFoldToggle(sprint.id, e)}
                                                        title={foldedSprints.has(sprint.id) ? 'Expand sprint' : 'Collapse sprint'}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: foldedSprints.has(sprint.id) ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                                            <path d="M19 9l-7 7-7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                        </svg>
                                                    </button>
                                                    <h3 style={{ margin: 0 }}>{sprint.name}</h3>
                                                    <span className="sprint-dates" style={{ marginLeft: 16 }}>{formatDateRange(sprint.start_date, sprint.end_date)}</span>
                                                    <span className="sprint-status-badge" style={{ marginLeft: 16 }}>Status: {sprint.status}</span>
                                                    <div className="sprint-actions" style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
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
                                                        {sprint.status === 'completed' && (
                                                            <button 
                                                                className={classNames('sprint-action-button', 'reactivate', isDarkMode ? 'dark' : 'light')}
                                                                onClick={() => handleReactivate(sprint)} 
                                                                disabled={actionLoading === sprint.id}
                                                            >
                                                                {actionLoading === sprint.id ? 'Reactivating...' : 'Reactivate'}
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
                                            </div>
                                            {!foldedSprints.has(sprint.id) && (
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
                                                                        <div className="sprint-task">
                                                                            <div className="task-left">
                                                                                <span className="task-icon">
                                                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                                        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                                                        <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                                                        <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                                                    </svg>
                                                                                </span>
                                                                                <span className="task-title">{task.title}</span>
                                                                            </div>
                                                                            <div className="task-right">
                                                                                <span className="task-effort">{task.effort ? `EE: ${task.effort}d` : '–'}</span>
                                                                                <span className={`priority-badge priority-${task.priority}`}>
                                                                                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </li>
                                                                )}
                                                            </Draggable>
                                                        ))}
                                                    {provided.placeholder}
                                                </ul>
                                            )}
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
                                                                className={`sprint-task ${isDarkMode ? 'dark' : 'light'} ${snapshot.isDragging ? 'dragging' : ''}`}
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                            >
                                                                <div className="sprint-task">
                                                                    <div className="task-left">
                                                                        <span className="task-icon">
                                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                                                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                                                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                                            </svg>
                                                                        </span>
                                                                        <span className="task-title">{task.title}</span>
                                                                    </div>
                                                                    <div className="task-right">
                                                                        <span className="task-effort">{task.effort ? `EE: ${task.effort}d` : '–'}</span>
                                                                        <span className={`priority-badge priority-${task.priority}`}>
                                                                            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                                                        </span>
                                                                    </div>
                                                                </div>
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