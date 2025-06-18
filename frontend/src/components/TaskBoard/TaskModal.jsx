import React, { useState, useEffect } from 'react';
import { useTaskContext } from '../../context/TaskContext';
import './TaskModal.css';
import { formatHours } from '../../utils/timeFormat';

const TaskModal = ({ viewMode = '', activeSprintId = '' }) => {
    const {
        selectedTask,
        isModalOpen,
        closeTaskModal,
        createTask,
        updateTask,
        deleteTask
    } = useTaskContext();

    const [users, setUsers] = useState([]);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        assignee_id: '',
        effort: '',
        timespent: '',
        sprint_id: ''
    });

    const [effortError, setEffortError] = useState('');
    const [timeSpentError, setTimeSpentError] = useState('');
    const [sprints, setSprints] = useState([]);
    const [sprintsLoading, setSprintsLoading] = useState(false);
    const [sprintsError, setSprintsError] = useState(null);
    const [hoursPerDay, setHoursPerDay] = useState(8);

    // Fetch users from the database
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

    useEffect(() => {
        // Debug log for viewMode and activeSprintId
        console.log('[TaskModal] viewMode:', viewMode, 'activeSprintId:', activeSprintId);
        if (selectedTask) {
            setFormData({
                title: selectedTask.title,
                description: selectedTask.description,
                status: selectedTask.status,
                priority: selectedTask.priority,
                assignee_id: selectedTask.assignee_id || '',
                effort: selectedTask.effort || '',
                timespent: selectedTask.timespent || '',
                sprint_id: selectedTask.sprint_id ?? ''
            });
        } else {
            // Set default sprint_id based on viewMode and activeSprintId
            let defaultSprintId = '';
            if (["kanban", "list", "diagram", "burndown"].includes(viewMode) && activeSprintId) {
                defaultSprintId = String(activeSprintId); // Ensure it's a string for select value
            }
            setFormData({
                title: '',
                description: '',
                status: 'todo',
                priority: 'medium',
                assignee_id: '',
                effort: '',
                timespent: '',
                sprint_id: defaultSprintId
            });
        }
    }, [selectedTask, isModalOpen, viewMode, activeSprintId]);

    useEffect(() => {
        console.log('formData in modal:', formData);
    }, [formData]);

    useEffect(() => {
        const fetchSprints = async () => {
            setSprintsLoading(true);
            try {
                const res = await fetch('/api/sprints');
                const data = await res.json();
                setSprints(data.sprints || []);
                setSprintsError(null);
            } catch (err) {
                setSprints([]);
                setSprintsError('Failed to load sprints');
            } finally {
                setSprintsLoading(false);
            }
        };
        fetchSprints();
    }, []);

    // Force sprint_id to active sprint if not valid after sprints load
    useEffect(() => {
        if (!selectedTask && isModalOpen && sprints.length > 0) {
            const validIds = sprints.map(s => String(s.id));
            if (["kanban", "list", "diagram", "burndown"].includes(viewMode) && activeSprintId) {
                if (!formData.sprint_id || !validIds.includes(formData.sprint_id)) {
                    setFormData(prev => ({ ...prev, sprint_id: String(activeSprintId) }));
                }
            }
        }
    }, [sprints, selectedTask, isModalOpen, viewMode, activeSprintId, formData.sprint_id]);

    // Always set default sprint_id on modal open in create mode
    useEffect(() => {
        console.log('[TaskModal] useEffect triggered:', {
            isModalOpen,
            selectedTask,
            sprints,
            viewMode,
            activeSprintId
        });
        if (isModalOpen && !selectedTask && sprints.length > 0) {
            let defaultSprintId = '';
            if (["kanban", "list", "diagram", "burndown"].includes(viewMode) && activeSprintId) {
                defaultSprintId = String(activeSprintId);
            }
            setFormData({
                title: '',
                description: '',
                status: 'todo',
                priority: 'medium',
                assignee_id: '',
                effort: '',
                timespent: '',
                sprint_id: defaultSprintId
            });
        }
    }, [isModalOpen, selectedTask, sprints, viewMode, activeSprintId]);

    useEffect(() => {
        // Fetch hours per day from backend settings
        fetch('/api/settings/hoursperday')
            .then(res => res.json())
            .then(data => {
                if (data && data.hours) setHoursPerDay(Number(data.hours));
            })
            .catch(() => {});
    }, []);

    // Utility to parse and validate time input
    function parseEffortInput(value, hoursPerDay = 8) {
        if (!value) return null;
        const trimmed = value.trim().toLowerCase();
        if (/^\d+(\.\d+)?$/.test(trimmed)) {
            // Pure hours
            const val = parseFloat(trimmed);
            if (!isHalfHourStep(val)) throw new Error('Value must be in 0.5 hour steps');
            return val;
        }
        if (/^\d+(\.\d+)?h$/.test(trimmed)) {
            // e.g. 4h, 2.5h
            const val = parseFloat(trimmed.replace('h', ''));
            if (!isHalfHourStep(val)) throw new Error('Value must be in 0.5 hour steps');
            return val;
        }
        if (/^0\.5d$/.test(trimmed)) {
            // Only allow 0.5d as a decimal day
            return 0.5 * hoursPerDay;
        }
        if (/^\d+d$/.test(trimmed)) {
            // e.g. 1d, 2d
            const days = parseInt(trimmed.replace('d', ''), 10);
            return days * hoursPerDay;
        }
        if (/^\d+d \d+(\.\d+)?h$/.test(trimmed)) {
            // e.g. 1d 4h
            const [dPart, hPart] = trimmed.split(' ');
            const days = parseInt(dPart.replace('d', ''), 10);
            const hours = parseFloat(hPart.replace('h', ''));
            const total = days * hoursPerDay + hours;
            if (!isHalfHourStep(total)) throw new Error('Value must be in 0.5 hour steps');
            return total;
        }
        throw new Error('Invalid format. Use numbers with h (hours) or d (days).');
    }
    function isHalfHourStep(val) {
        return typeof val === 'number' && Math.abs(val * 2 - Math.round(val * 2)) < 1e-8;
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (name === 'effort') {
            try {
                parseEffortInput(value, hoursPerDay);
                setEffortError('');
            } catch (err) {
                setEffortError(err.message);
            }
        }
        if (name === 'timespent') {
            try {
                parseEffortInput(value, hoursPerDay);
                setTimeSpentError('');
            } catch (err) {
                setTimeSpentError(err.message);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (effortError || timeSpentError) return;
        try {
            const payload = {
                ...formData,
                sprint_id: formData.sprint_id === '' ? null : Number(formData.sprint_id),
                timespent: formData.timespent === '' ? null : formData.timespent
            };
            console.log('Submitting payload:', payload);
            if (selectedTask) {
                await updateTask(selectedTask.id, payload);
            } else {
                await createTask(payload);
            }
            closeTaskModal();
        } catch (error) {
            console.error('Error saving task:', error);
        }
    };

    const handleDelete = async () => {
        if (selectedTask) {
            try {
                await deleteTask(selectedTask.id);
                closeTaskModal();
            } catch (error) {
                console.error('Error deleting task:', error);
            }
        }
    };

    // Add a helper/info icon component
    function InfoIcon({ message }) {
        return (
            <span style={{ marginLeft: 6, cursor: 'pointer' }} title={message}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            </span>
        );
    }

    function formatPreviewNumber(val) {
        if (typeof val !== 'number') return val;
        return val % 1 === 0 ? val.toFixed(0) : val.toFixed(1);
    }

    if (!isModalOpen) return null;

    return (
        <div 
            className="modal-overlay" 
            onClick={closeTaskModal}
            onKeyPress={handleInputChange}
            tabIndex={0}
        >
            <div className={`modal-content ${selectedTask ? 'edit-task-modal' : 'create-task-modal'}`} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{selectedTask ? 'Edit Task' : 'Create New Task'}</h2>
                    <button className="close-button" onClick={closeTaskModal}>×</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="title">Title</label>
                        <input
                            type="text"
                            id="title"
                            name="title"
                            value={formData.title}
                            onChange={handleInputChange}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="description">Description</label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="sprint_id"><b>Sprint/Backlog</b></label>
                        <select
                            key={sprints.map(s => s.id).join('-')}
                            id="sprint_id"
                            name="sprint_id"
                            value={formData.sprint_id ?? ''}
                            onChange={handleInputChange}
                            disabled={sprintsLoading}
                        >
                            <option value="">Backlog</option>
                            {sprints.map(sprint => (
                                <option key={sprint.id} value={String(sprint.id)}>{sprint.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="status">Status</label>
                            <select
                                id="status"
                                name="status"
                                value={formData.status}
                                onChange={handleInputChange}
                                required
                            >
                                <option value="todo">To Do</option>
                                <option value="inProgress">In Progress</option>
                                <option value="done">Done</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="priority">Priority</label>
                            <select
                                id="priority"
                                name="priority"
                                value={formData.priority}
                                onChange={handleInputChange}
                                required
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="effort">
                                Effort
                                <InfoIcon message="Allowed: 4, 2.5, 1d, 0.5d, 1d 4h. All values are saved in hours. Display adapts to your hours/day setting." />
                            </label>
                            <input
                                type="text"
                                id="effort"
                                name="effort"
                                value={formData.effort}
                                onChange={handleInputChange}
                                placeholder="e.g., 2h, 1d, 1d 4h, 4 (hours)"
                            />
                            {effortError && <span className="error-message">{effortError}</span>}
                            {formData.effort && !effortError && (
                                <span className="live-preview">Will display as: <b>{formatPreviewNumber(parseEffortInput(formData.effort, hoursPerDay))}h</b></span>
                            )}
                        </div>
                        <div className="form-group">
                            <label htmlFor="timespent">
                                Time Spent
                                <InfoIcon message="Allowed: 4, 2.5, 1d, 0.5d, 1d 4h. All values are saved in hours. Display adapts to your hours/day setting." />
                            </label>
                            <input
                                type="text"
                                id="timespent"
                                name="timespent"
                                value={formData.timespent}
                                onChange={handleInputChange}
                                placeholder="e.g., 2h, 1d, 1d 4h, 4 (hours)"
                            />
                            {timeSpentError && <span className="error-message">{timeSpentError}</span>}
                            {formData.timespent && !timeSpentError && (
                                <span className="live-preview">Will display as: <b>{formatPreviewNumber(parseEffortInput(formData.timespent, hoursPerDay))}h</b></span>
                            )}
                        </div>
                    </div>
                    <div className="form-group">
                        <label htmlFor="assignee_id">Assignee</label>
                        <select
                            id="assignee_id"
                            name="assignee_id"
                            value={formData.assignee_id}
                            onChange={handleInputChange}
                        >
                            <option value="">Unassigned</option>
                            {users.map((user) => (
                                <option key={user.id} value={user.id}>
                                    {user.firstName} {user.lastName}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className={`modal-footer ${selectedTask ? 'row' : 'row-reverse'}`}>
                        <button type="submit" className="save-button">
                            {selectedTask ? 'Save Changes' : 'Create Task'}
                        </button>
                        <button type="button" className="cancel-button" onClick={closeTaskModal}>
                            Cancel
                        </button>
                        {selectedTask && (
                            <button type="button" className="delete-button" onClick={handleDelete}>
                                Delete
                            </button>
                        )}
                       
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TaskModal;