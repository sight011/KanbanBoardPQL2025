// import React, { useEffect, useState } from 'react';
import { useEffect, useState } from 'react';
import { useTaskContext } from '../../context/TaskContext';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import './SprintView.css';
import classNames from 'classnames';
import TaskFilters from './TaskFilters';
import TaskModal from './TaskModal';
import ContextMenu from './ContextMenu';
import { formatHours } from '../../utils/timeFormat';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import PropTypes from 'prop-types';

const formatDateInput = (date) => {
    if (!date) return '';
    const d = new Date(date);
    // Adjust for timezone offset so the date is correct in local time
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localISO = new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
    return localISO;
};

const SprintModal = ({ open, onClose, onSave, initial, projects }) => {
    const [name, setName] = useState(initial?.name || '');
    const [startDate, setStartDate] = useState(initial?.start_date ? formatDateInput(initial.start_date) : '');
    const [endDate, setEndDate] = useState(initial?.end_date ? formatDateInput(initial.end_date) : '');
    const [projectId, setProjectId] = useState(initial?.project_id || '');
    const isDarkMode = document.documentElement.classList.contains('dark-mode');

    useEffect(() => {
        setName(initial?.name || '');
        setStartDate(initial?.start_date ? formatDateInput(initial.start_date) : '');
        setEndDate(initial?.end_date ? formatDateInput(initial.end_date) : '');
        setProjectId(initial?.project_id || '');
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
                    <select 
                        className={`modal-input ${isDarkMode ? 'dark' : 'light'}`}
                        value={projectId} 
                        onChange={e => setProjectId(e.target.value)}
                        disabled={!!initial} // Disable project selection when editing
                    >
                        <option value="">Select a project</option>
                        {projects.map(project => (
                            <option key={project.id} value={project.id}>
                                {project.name}
                            </option>
                        ))}
                    </select>
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
                            onClick={() => onSave({ name, start_date: startDate, end_date: endDate, project_id: projectId })} 
                            disabled={!name || !projectId}
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
    initial: PropTypes.object,
    projects: PropTypes.array.isRequired
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
    sprints: PropTypes.array.isRequired,
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
                        ? `Sprint "${activeSprint.name}" is currently active in this project. Reactivating this sprint will set the active sprint back to planned status.`
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
    activeSprint: PropTypes.object,
    isDarkMode: PropTypes.bool.isRequired
};

const SprintView = ({ focusedSprintId, user }) => {
    const { tasks, updateTask, openTaskModal, addTask, removeTask, setTasks } = useTaskContext();
    const [sprints, setSprints] = useState([]);
    const [projects, setProjects] = useState([]);
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
        sprint: '',
        changedInTime: '',
        project: ''
    });
    const [foldedSprints, setFoldedSprints] = useState(new Set());
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [sprintToDelete, setSprintToDelete] = useState(null);
    const [reactivateModalOpen, setReactivateModalOpen] = useState(false);
    const [sprintToReactivate, setSprintToReactivate] = useState(null);
    const [activeSprint, setActiveSprint] = useState(null);
    const [hoursPerDay, setHoursPerDay] = useState(8);
    const [tasksWithChanges, setTasksWithChanges] = useState([]);
    
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
    
    // Multi-select dropdown state
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0 });
    const [selectedUsers, setSelectedUsers] = useState(new Set());
    const [dropdownTarget, setDropdownTarget] = useState(null); // 'sprint' or 'backlog'

    // Define fetchProjects ONCE
    const fetchProjects = async () => {
        try {
            const res = await fetch('/api/projects');
            const data = await res.json();
            setProjects(data.projects || []);
        } catch (err) {
            setProjects([]);
            console.error('Error fetching projects:', err);
        }
    };

    // Call fetchProjects ONCE on mount
    useEffect(() => {
        fetchProjects();
    }, []);

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
            if (dropdownOpen) {
                handleCloseDropdown();
            }
        };

        document.addEventListener('click', handleGlobalClick);
        return () => document.removeEventListener('click', handleGlobalClick);
    }, [contextMenu.isVisible, dropdownOpen]);

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
        fetchProjects();
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

    // Fetch tasks with changes when changedInTime filter is applied
    useEffect(() => {
        const fetchTasksWithChanges = async () => {
            if (filters.changedInTime && filters.changedInTime !== 'all') {
                try {
                    const response = await fetch(`/api/audit/tasks-with-changes?timeFrame=${filters.changedInTime}`);
                    const data = await response.json();
                    if (data.success) {
                        setTasksWithChanges(data.tasks.map(task => task.id));
                    } else {
                        setTasksWithChanges([]);
                    }
                } catch (err) {
                    console.error('Error fetching tasks with changes:', err);
                    setTasksWithChanges([]);
                }
            } else {
                setTasksWithChanges([]);
            }
        };

        fetchTasksWithChanges();
    }, [filters.changedInTime]);

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
        // Changed in Time filter
        if (filters.changedInTime && filters.changedInTime !== 'all' && !tasksWithChanges.includes(task.id)) {
            return false;
        }
        return true;
    });

    // Filter sprints based on selected project
    const filteredSprints = sprints.filter(sprint => {
        // If no project filter is selected, show all sprints
        if (!filters.project) {
            return true;
        }
        // Only show sprints that belong to the selected project
        return sprint.project_id === parseInt(filters.project);
    });

    // Group tasks by sprint_id
    const tasksBySprint = {};
    filteredTasks.forEach(task => {
        const sid = task.sprint_id || 'backlog';
        if (!tasksBySprint[sid]) tasksBySprint[sid] = [];
        tasksBySprint[sid].push(task);
    });

    useEffect(() => {
        fetchProjects();
        // Keep track of active sprint for the selected project (not globally)
        const projectSprints = filters.project 
            ? sprints.filter(s => s.project_id === parseInt(filters.project))
            : sprints;
        const active = projectSprints.find(s => s.status === 'active');
        setActiveSprint(active || null);
    }, [sprints, filters.project]);

    useEffect(() => {
        fetchProjects();
        if (focusedSprintId) {
            setFoldedSprints(() => {
                // Unfold only the focused sprint/backlog, fold all others
                const allIds = new Set([
                    ...sprints.map(s => s.id),
                    'backlog'
                ]);
                const focusedId = String(focusedSprintId);
                return new Set([...allIds].filter(id => String(id) !== focusedId));
            });
        }
    }, [focusedSprintId, sprints]);

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
        // Find active sprint for the same project (not globally)
        const projectSprints = sprints.filter(s => s.project_id === sprint.project_id);
        const activeSprint = projectSprints.find(s => s.status === 'active');
        
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

    const handleFoldToggle = (sprintId) => {
        setFoldedSprints((folded) => {
            const newSet = new Set(folded);
            if (newSet.has(sprintId)) {
                newSet.delete(sprintId);
            } else {
                newSet.add(sprintId);
            }
            return newSet;
        });
    };

    const handleFilterChange = (filterType, value) => {
        setFilters(prev => {
            const newFilters = { ...prev, [filterType]: value };
            
            // Clear sprint filter when project changes, unless the selected sprint belongs to the new project
            if (filterType === 'project') {
                const selectedSprint = sprints.find(s => String(s.id) === newFilters.sprint);
                if (!selectedSprint || selectedSprint.project_id !== parseInt(value)) {
                    newFilters.sprint = '';
                }
            }
            
            return newFilters;
        });
    };

    // Multi-select dropdown handlers
    const handleOpenDropdown = (event, target) => {
        console.log('Dropdown button clicked for:', target);
        const rect = event.currentTarget.getBoundingClientRect();
        console.log('Button position:', rect);
        setDropdownPosition({ x: rect.left, y: rect.bottom + 5 });
        setDropdownTarget(target);
        setDropdownOpen(true);
        console.log('Dropdown state set to open');
    };

    const handleToggleUser = (userId) => {
        setSelectedUsers(prev => {
            const newSet = new Set(prev);
            if (newSet.has(userId)) {
                newSet.delete(userId);
            } else {
                newSet.add(userId);
            }
            return newSet;
        });
    };

    const handleCloseDropdown = () => {
        setDropdownOpen(false);
        setDropdownTarget(null);
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

    // Find the selected project based on the project filter
    const selectedProject = projects.find(p => p.id === parseInt(filters.project)) || null;

    return (
        <div className={`sprint-view ${isDarkMode ? 'dark' : 'light'}`}>
            <TaskFilters 
                filters={filters} 
                onFilterChange={handleFilterChange} 
                activeSprintId={activeSprint ? String(activeSprint.id) : ''} 
                selectedProject={selectedProject}
                user={user}
            />
            <SprintModal
                open={modalOpen}
                onClose={() => { setModalOpen(false); setEditSprint(null); }}
                onSave={handleSaveSprint}
                initial={editSprint}
                projects={projects}
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
            <TaskModal 
                viewMode="sprint" 
                activeSprintId="" 
                selectedProjectId={filters.project ? parseInt(filters.project) : null}
                projects={projects} 
            />
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
            
            {/* Multi-select User Dropdown */}
            {dropdownOpen && (
                <div 
                    className={`user-dropdown ${isDarkMode ? 'dark' : 'light'}`}
                    style={{
                        position: 'fixed',
                        top: dropdownPosition.y,
                        left: dropdownPosition.x,
                        zIndex: 9999,
                        background: isDarkMode ? '#2d3748' : '#ffffff',
                        border: `1px solid ${isDarkMode ? '#4a5568' : '#e2e8f0'}`,
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        padding: '8px 0',
                        minWidth: '200px',
                        maxHeight: '300px',
                        overflowY: 'auto'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div style={{ padding: '8px 12px', borderBottom: `1px solid ${isDarkMode ? '#4a5568' : '#e2e8f0'}`, fontWeight: 'bold', fontSize: '14px' }}>
                        Select Users for {dropdownTarget === 'backlog' ? 'Backlog' : 'Sprint'} ({users.length} users)
                    </div>
                    {users.map(user => (
                        <div
                            key={user.id}
                            className="user-option"
                            onClick={() => handleToggleUser(user.id)}
                            style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                backgroundColor: selectedUsers.has(user.id) ? (isDarkMode ? '#4a5568' : '#edf2f7') : 'transparent',
                                color: isDarkMode ? '#e2e8f0' : '#2d3748'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.backgroundColor = isDarkMode ? '#4a5568' : '#edf2f7';
                            }}
                            onMouseLeave={(e) => {
                                if (!selectedUsers.has(user.id)) {
                                    e.target.style.backgroundColor = 'transparent';
                                }
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={selectedUsers.has(user.id)}
                                onChange={() => handleToggleUser(user.id)}
                                style={{ margin: 0 }}
                            />
                            <span>{user.firstName} {user.lastName}</span>
                        </div>
                    ))}
                    {users.length === 0 && (
                        <div style={{ padding: '8px 12px', color: isDarkMode ? '#a0aec0' : '#718096', fontStyle: 'italic' }}>
                            No users available
                        </div>
                    )}
                </div>
            )}
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
                            {filteredSprints.map((sprint) => (
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
                                                        onClick={() => handleFoldToggle(sprint.id)}
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
                                                        Total Effort: {calculateTotalEffort(tasksBySprint[sprint.id])}
                                                    </span>
                                                    <span className="sprint-effort-sum" style={{ marginLeft: 16 }}>
                                                        Available Time: TBD
                                                    </span>
                                                    <button
                                                        className={classNames('sprint-action-button', 'edit', isDarkMode ? 'dark' : 'light')}
                                                        onClick={() => handleOpenDropdown('sprint')}
                                                        style={{ 
                                                            marginLeft: 8, 
                                                            padding: '4px 8px', 
                                                            fontSize: '12px',
                                                            backgroundColor: dropdownOpen && dropdownTarget === 'sprint' ? (isDarkMode ? '#4a5568' : '#edf2f7') : undefined
                                                        }}
                                                        title="Select users for available time calculation"
                                                    >
                                                        👥 {dropdownOpen && dropdownTarget === 'sprint' ? '▼' : ''}
                                                    </button>
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
                                        className={classNames('sprint-section', 'backlog', isDarkMode ? 'dark' : 'light', { 'dragging-over': snapshot.isDraggingOver, 'folded': foldedSprints.has('backlog') })}
                                        style={{boxShadow: '0 2px 8px rgba(0,0,0,0.08)'}}
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                    >
                                        <div className="sprint-section-header">
                                            <div className="sprint-section-header-row" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                                <button
                                                    className="fold-toggle-button"
                                                    onClick={() => handleFoldToggle('backlog')}
                                                    title={foldedSprints.has('backlog') ? 'Expand backlog' : 'Collapse backlog'}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: foldedSprints.has('backlog') ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                                        <path d="M19 9l-7 7-7-7" stroke={isDarkMode ? '#DDD' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                    </svg>
                                                </button>
                                                <h3 style={{ margin: 0 }}>Backlog</h3>
                                                <span className="sprint-effort-sum" style={{ marginLeft: 16 }}>
                                                    Total Effort: {calculateTotalEffort(tasksBySprint['backlog'])}
                                                </span>
                                                <span className="sprint-effort-sum" style={{ marginLeft: 16 }}>
                                                    Available Time: TBD
                                                </span>
                                                <button
                                                    className={classNames('sprint-action-button', 'edit', isDarkMode ? 'dark' : 'light')}
                                                    onClick={() => handleOpenDropdown('backlog')}
                                                    style={{ 
                                                        marginLeft: 8, 
                                                        padding: '4px 8px', 
                                                        fontSize: '12px',
                                                        backgroundColor: dropdownOpen && dropdownTarget === 'backlog' ? (isDarkMode ? '#4a5568' : '#edf2f7') : undefined
                                                    }}
                                                    title="Select users for available time calculation"
                                                >
                                                    👥 {dropdownOpen && dropdownTarget === 'backlog' ? '▼' : ''}
                                                </button>
                                            </div>
                                        </div>
                                        {!foldedSprints.has('backlog') && (
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
                                        )}
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

SprintView.propTypes = {
    focusedSprintId: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number,
    ]),
    user: PropTypes.object,
};

export default SprintView;