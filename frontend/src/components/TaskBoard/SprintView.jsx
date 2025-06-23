import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useTaskContext } from '../../context/TaskContext';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import './SprintView.css';
import classNames from 'classnames';
import TaskFilters from './TaskFilters';
import TaskModal from './TaskModal';
import ContextMenu from './ContextMenu';
import { formatHours } from '../../utils/timeFormat';
import DeleteConfirmationModal from './DeleteConfirmationModal';

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

SprintModal.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
    initial: PropTypes.shape({
        name: PropTypes.string,
        start_date: PropTypes.string,
        end_date: PropTypes.string
    })
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

DeleteSprintModal.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onConfirm: PropTypes.func.isRequired,
    sprints: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.number.isRequired,
        name: PropTypes.string.isRequired
    })).isRequired,
    defaultValue: PropTypes.string
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

ReactivateModal.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onConfirm: PropTypes.func.isRequired,
    activeSprint: PropTypes.shape({
        name: PropTypes.string.isRequired
    }),
    isDarkMode: PropTypes.bool.isRequired
};

const SprintView = () => {
    const { tasks, updateTask, updateTaskPosition, openTaskModal, addTask, removeTask, setTasks } = useTaskContext();
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
    const [hoursPerDay, setHoursPerDay] = useState(8);
    
    // Context menu state
    const [contextMenu, setContextMenu] = useState({
        isVisible: false,
        x: 0,
        y: 0,
        taskId: null
    });

    // Delete confirmation modal state
    const [deleteTaskModalOpen, setDeleteTaskModalOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState(null);

    const [attendeesDropdown, setAttendeesDropdown] = useState({}); // { [sprintId]: boolean }
    const [sprintAttendees, setSprintAttendees] = useState({}); // { [sprintId]: [userId, ...] }

    // Add drag operation state to prevent concurrent operations
    const [isDragUpdating, setIsDragUpdating] = useState(false);

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

    // Global click handler to close context menu
    useEffect(() => {
        const handleGlobalClick = () => {
            if (contextMenu.isVisible) {
                handleContextMenuClose();
            }
        };

        document.addEventListener('click', handleGlobalClick);
        return () => document.removeEventListener('click', handleGlobalClick);
    }, [contextMenu.isVisible]);

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

    useEffect(() => {
        fetch('/api/settings/hoursperday')
            .then(res => res.json())
            .then(data => {
                if (data && data.hours) setHoursPerDay(Number(data.hours));
            })
            .catch(() => {});
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
        console.log('🔄 onDragEnd called:', result);
        
        // Prevent concurrent drag operations
        if (isDragUpdating) {
            console.log('⚠️ Drag operation already in progress, skipping');
            return;
        }
        
        const { source, destination, draggableId } = result;
        if (!destination) {
            console.log('❌ No destination, returning early');
            return;
        }
        if (source.droppableId === destination.droppableId && source.index === destination.index) {
            console.log('❌ Same position, returning early');
            return;
        }
        
        const taskId = parseInt(draggableId);
        const destSprintId = destination.droppableId === 'backlog' ? null : parseInt(destination.droppableId);
        const task = tasks.find(t => t.id === taskId);
        if (!task) {
            console.log('❌ Task not found:', taskId);
            return;
        }

        console.log('✅ Starting drag update for task:', taskId, 'to position:', destination.index + 1);
        setIsDragUpdating(true);

        try {
            // Add timeout protection to prevent hanging
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Request timeout')), 10000)
            );

            // Use the more efficient updateTaskPosition endpoint for the moved task
            console.log('📡 Calling updateTaskPosition...');
            const updatePromise = updateTaskPosition(taskId, {
                newPosition: destination.index + 1,
                newStatus: task.status, // Keep the same status
                completed_at: task.completed_at
            });

            await Promise.race([updatePromise, timeoutPromise]);
            console.log('✅ updateTaskPosition completed');

            // Update sprint_id separately if it changed
            if (task.sprint_id !== destSprintId) {
                console.log('📡 Updating sprint_id from', task.sprint_id, 'to', destSprintId);
                const sprintUpdatePromise = updateTask(taskId, {
                    ...task,
                    sprint_id: destSprintId
                });
                await Promise.race([sprintUpdatePromise, timeoutPromise]);
                console.log('✅ sprint_id update completed');
            }
            
            console.log('✅ Drag operation completed successfully');
        } catch (error) {
            console.error('❌ Error updating task positions:', error);
            // The optimistic updates will be reverted by the TaskContext error handling
        } finally {
            setIsDragUpdating(false);
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

    const handleTaskDoubleClick = (task) => {
        openTaskModal(task);
    };

    // Context menu handlers
    const handleTaskRightClick = (e, task) => {
        e.preventDefault();
        setContextMenu({
            isVisible: true,
            x: e.clientX,
            y: e.clientY,
            taskId: task.id
        });
    };

    const handleContextMenuClose = () => {
        setContextMenu({
            isVisible: false,
            x: 0,
            y: 0,
            taskId: null
        });
    };

    const handleDuplicateTask = async () => {
        if (!contextMenu.taskId) return;

        // Find the original task to create an optimistic copy
        const originalTask = tasks.find(task => task.id === contextMenu.taskId);
        if (!originalTask) return;

        // Calculate a better sprint_order for the optimistic task
        let optimisticSprintOrder;
        if (originalTask.sprint_id) {
            // Get all tasks in the same sprint
            const sprintTasks = tasks.filter(task => task.sprint_id === originalTask.sprint_id);
            const originalIndex = sprintTasks.findIndex(task => task.id === originalTask.id);
            
            if (originalIndex >= 0 && originalIndex < sprintTasks.length - 1) {
                // Place it between the original and the next task
                const originalOrder = originalTask.sprint_order || 0;
                const nextTask = sprintTasks[originalIndex + 1];
                const nextOrder = nextTask.sprint_order || 0;
                optimisticSprintOrder = (originalOrder + nextOrder) / 2;
            } else {
                // Place it at the end
                const maxOrder = Math.max(...sprintTasks.map(t => t.sprint_order || 0), 0);
                optimisticSprintOrder = maxOrder + 1;
            }
        } else {
            // For backlog tasks, place at the end
            const backlogTasks = tasks.filter(task => !task.sprint_id);
            const maxOrder = Math.max(...backlogTasks.map(t => t.sprint_order || 0), 0);
            optimisticSprintOrder = maxOrder + 1;
        }

        const optimisticTask = {
            ...originalTask,
            id: `temp-${Date.now()}`,
            title: `${originalTask.title} (Copy)`,
            sprint_order: optimisticSprintOrder,
            isOptimistic: true,
        };

        // Add optimistic task to the list
        addTask(optimisticTask);
        handleContextMenuClose();

        try {
            const response = await fetch(`/api/tasks/${contextMenu.taskId}/duplicate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });

            if (response.ok) {
                const result = await response.json();
                // The backend now returns the full updated list for the affected sprint/status.
                // We use this list as the source of truth to avoid state inconsistencies.
                setTasks(prevTasks => {
                    const scopeSprintId = originalTask.sprint_id;

                    // Filter out all tasks from the affected scope (sprint or status column).
                    const unaffectedTasks = prevTasks.filter(task => {
                        if (scopeSprintId) {
                            // Keep tasks that are not in the affected sprint.
                            return task.sprint_id !== scopeSprintId;
                        } else {
                            // Keep tasks that are in any sprint OR are not in the affected backlog status column.
                            return task.sprint_id !== null || task.status !== originalTask.status;
                        }
                    });

                    // Combine the unaffected tasks with the complete, re-ordered list from the server.
                    return [...unaffectedTasks, ...result.tasks];
                });
            } else {
                // On failure, just remove the optimistic task
                removeTask(optimisticTask.id);
            }
        } catch (error) {
            console.error('Error duplicating task:', error);
            removeTask(optimisticTask.id);
        }
    };

    const handleDeleteTask = async () => {
        if (!contextMenu.taskId) return;

        // Find the task to delete
        const taskToDelete = tasks.find(task => task.id === contextMenu.taskId);
        if (!taskToDelete) {
            console.error('Task to delete not found');
            return;
        }

        // Set the task to delete and show confirmation modal
        setTaskToDelete(taskToDelete);
        setDeleteTaskModalOpen(true);
        
        // Close context menu
        handleContextMenuClose();
    };

    const confirmDeleteTask = async () => {
        if (!taskToDelete) return;

        try {
            const response = await fetch(`/api/tasks/${taskToDelete.id}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                console.log('Task deleted successfully');
                // Remove task from state
                removeTask(taskToDelete.id);
            } else {
                console.error('Failed to delete task');
                const errorData = await response.json();
                console.error('Delete error:', errorData);
            }
        } catch (error) {
            console.error('Error deleting task:', error);
        } finally {
            // Close modal and reset state
            setDeleteTaskModalOpen(false);
            setTaskToDelete(null);
        }
    };

    const calculateTotalEffort = (tasks) => {
        if (!tasks || tasks.length === 0) return formatHours(0, hoursPerDay);
        const tasksWithEffort = tasks.filter(task => task.effort !== null && task.effort !== undefined);
        if (tasksWithEffort.length === 0) return formatHours(0, hoursPerDay);
        const totalHours = tasksWithEffort.reduce((sum, task) => sum + Number(task.effort), 0);
        return formatHours(totalHours, hoursPerDay);
    };

    const toggleAttendeesDropdown = (sprintId) => {
        setAttendeesDropdown(prev => ({ ...prev, [sprintId]: !prev[sprintId] }));
    };

    const handleAttendeesChange = (sprintId, userId) => {
        setSprintAttendees(prev => {
            const current = prev[sprintId] || [];
            if (current.includes(userId)) {
                return { ...prev, [sprintId]: current.filter(id => id !== userId) };
            } else {
                return { ...prev, [sprintId]: [...current, userId] };
            }
        });
    };

    return (
        <div className={`sprint-view ${isDarkMode ? 'dark' : 'light'}`}>
            <TaskFilters filters={filters} onFilterChange={handleFilterChange} activeSprintId={activeSprint ? String(activeSprint.id) : ''} />
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
            <TaskModal viewMode="sprint" activeSprintId="" />
            <ContextMenu
                x={contextMenu.x}
                y={contextMenu.y}
                isVisible={contextMenu.isVisible}
                onClose={handleContextMenuClose}
                onDuplicate={handleDuplicateTask}
                onDelete={handleDeleteTask}
            />
            <DeleteConfirmationModal
                open={deleteTaskModalOpen}
                onClose={() => {
                    setDeleteTaskModalOpen(false);
                    setTaskToDelete(null);
                }}
                onConfirm={confirmDeleteTask}
                taskTitle={taskToDelete?.title || ''}
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
                            {sprints.map((sprint) => (
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
                                                            <path d="M19 9l-7 7-7-7" stroke={isDarkMode ? '#DDD' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                        </svg>
                                                    </button>
                                                    <h3 style={{ margin: 0 }}>{sprint.name}</h3>
                                                    <span className="sprint-dates" style={{ marginLeft: 16 }}>{formatDateRange(sprint.start_date, sprint.end_date)}</span>
                                                    <span className="sprint-status-badge" style={{ marginLeft: 16 }}>Status: {sprint.status}</span>
                                                    <span className="sprint-effort-sum" style={{ marginLeft: 16 }}>
                                                        Available Ressources: 0h
                                                    </span>
                                                    <span className="sprint-effort-sum" style={{ marginLeft: 16 }}>
                                                        Total Effort: {calculateTotalEffort(tasksBySprint[sprint.id])}
                                                    </span>
                                                    {/* Sprint Attendees Button and Dropdown */}
                                                    <div style={{ position: 'relative', marginLeft: 16 }}>
                                                        <button
                                                            className="sprint-attendees-button"
                                                            style={{ 
                                                                padding: '6px 12px', 
                                                                borderRadius: 4, 
                                                                border: '1px solid #93c5fd', 
                                                                background: '#dbeafe', 
                                                                color: '#1e40af', 
                                                                fontWeight: 500, 
                                                                cursor: 'pointer', 
                                                                fontSize: '0.875rem',
                                                                lineHeight: '1.25',
                                                                height: '32px',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center'
                                                            }}
                                                            onClick={() => toggleAttendeesDropdown(sprint.id)}
                                                            type="button"
                                                        >
                                                            Sprint Attendees
                                                        </button>
                                                        {attendeesDropdown[sprint.id] && (
                                                            <div style={{ position: 'absolute', top: '110%', left: 0, zIndex: 10, background: isDarkMode ? '#23272f' : '#fff', border: '1px solid #93c5fd', borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.12)', padding: '16px 12px', minWidth: 200, maxHeight: '400px' }}>
                                                                <div style={{ maxHeight: 350, overflowY: 'auto', paddingRight: 4 }}>
                                                                    {users.length === 0 ? (
                                                                        <div style={{ color: '#888' }}>No users</div>
                                                                    ) : (
                                                                        <>
                                                                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #e2e8f0' }}>
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={sprintAttendees[sprint.id] && users.every(user => sprintAttendees[sprint.id]?.includes(user.id))}
                                                                                    onChange={() => {
                                                                                        if (sprintAttendees[sprint.id]?.length === users.length) {
                                                                                            // If all are selected, deselect all
                                                                                            handleAttendeesChange(sprint.id, 'all', false);
                                                                                        } else {
                                                                                            // Otherwise select all
                                                                                            users.forEach(user => {
                                                                                                if (!sprintAttendees[sprint.id]?.includes(user.id)) {
                                                                                                    handleAttendeesChange(sprint.id, user.id);
                                                                                                }
                                                                                            });
                                                                                        }
                                                                                    }}
                                                                                />
                                                                                <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>All</span>
                                                                            </label>
                                                                            {users.map(user => (
                                                                                <label key={user.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontSize: '0.875rem' }}>
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={!!(sprintAttendees[sprint.id]?.includes(user.id))}
                                                                                        onChange={() => handleAttendeesChange(sprint.id, user.id)}
                                                                                    />
                                                                                    <span>{user.firstName} {user.lastName}</span>
                                                                                </label>
                                                                            ))}
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
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
                                                                        className={`sprint-task ${isDarkMode ? 'dark' : 'light'} ${snapshot.isDragging ? 'dragging' : ''} ${task.isOptimistic ? 'optimistic' : ''}`}
                                                                        ref={provided.innerRef}
                                                                        {...provided.draggableProps}
                                                                        {...provided.dragHandleProps}
                                                                        onDoubleClick={() => handleTaskDoubleClick(task)}
                                                                        onContextMenu={(e) => handleTaskRightClick(e, task)}
                                                                    >
                                                                        <div className="task-left">
                                                                            <span className="task-icon">
                                                                                {task.isOptimistic ? (
                                                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="loading-spinner">
                                                                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="31.416" strokeDashoffset="31.416">
                                                                                            <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                                                                                            <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
                                                                                        </circle>
                                                                                    </svg>
                                                                                ) : (
                                                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                                        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                                                                                        <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                                                                                        <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                                                                                    </svg>
                                                                                )}
                                                                            </span>
                                                                            <span className="task-title">{task.title}</span>
                                                                        </div>
                                                                        <div className="task-right">
                                                                            <span className="task-effort">
                                                                                {task.effort ? `EE: ${formatHours(task.effort, hoursPerDay)}` : '–'}
                                                                            </span>
                                                                            <span className={`priority-badge priority-${task.priority}`}>
                                                                                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                                                            </span>
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
                            <Droppable droppableId="backlog">
                                {(provided, snapshot) => (
                                    <div
                                        className={classNames('sprint-section', 'backlog', isDarkMode ? 'dark' : 'light', { 'dragging-over': snapshot.isDraggingOver })}
                                        style={{boxShadow: '0 2px 8px rgba(0,0,0,0.08)'}}
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                    >
                                        <div className="sprint-section-header">
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
                                                                className={`sprint-task ${isDarkMode ? 'dark' : 'light'} ${snapshot.isDragging ? 'dragging' : ''} ${task.isOptimistic ? 'optimistic' : ''}`}
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                onDoubleClick={() => handleTaskDoubleClick(task)}
                                                                onContextMenu={(e) => handleTaskRightClick(e, task)}
                                                            >
                                                                <div className="task-left">
                                                                    <span className="task-icon">
                                                                        {task.isOptimistic ? (
                                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="loading-spinner">
                                                                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="31.416" strokeDashoffset="31.416">
                                                                                    <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                                                                                    <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
                                                                                </circle>
                                                                            </svg>
                                                                        ) : (
                                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                                                                                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                                                                                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                                                                            </svg>
                                                                        )}
                                                                    </span>
                                                                    <span className="task-title">{task.title}</span>
                                                                </div>
                                                                <div className="task-right">
                                                                    <span className="task-effort">
                                                                        {task.effort ? `EE: ${formatHours(task.effort, hoursPerDay)}` : '–'}
                                                                    </span>
                                                                    <span className={`priority-badge priority-${task.priority}`}>
                                                                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                                                    </span>
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