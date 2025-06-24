import React, { useState, useEffect } from 'react';
import { useTaskContext } from '../../context/TaskContext';
import './TaskModal.css';
import './DueDate.css';
import { formatHours } from '../../utils/timeFormat';
import {
    StatusIcon, PriorityIcon, AssigneeIcon, SprintIcon,
    TimeEstimateIcon, TimeTrackIcon, DatesIcon, TagsIcon, RelationshipsIcon
} from './TaskIcons';
import TagsInput from './TagsInput';
import DueDate from './DueDate';
import ActivityFeed from './ActivityFeed';

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
        sprint_id: '',
        tags: [],
        duedate: null
    });

    const [effortError, setEffortError] = useState('');
    const [timeSpentError, setTimeSpentError] = useState('');
    const [sprints, setSprints] = useState([]);
    const [sprintsLoading, setSprintsLoading] = useState(false);
    const [sprintsError, setSprintsError] = useState(null);
    const [hoursPerDay, setHoursPerDay] = useState(8);
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);

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

    useEffect(() => {
        if (isModalOpen) {
            if (selectedTask) {
                // Edit mode
                setFormData({
                    title: selectedTask.title,
                    description: selectedTask.description,
                    status: selectedTask.status,
                    priority: selectedTask.priority,
                    assignee_id: selectedTask.assignee_id || '',
                    effort: selectedTask.effort || '',
                    timespent: selectedTask.timespent || '',
                    sprint_id: selectedTask.sprint_id ?? '',
                    tags: selectedTask.tags || [],
                    duedate: selectedTask.duedate || null
                });
            } else {
                // Create mode
                let defaultSprintId = '';
                if (["kanban", "list", "diagram", "burndown"].includes(viewMode) && activeSprintId && sprints.length > 0) {
                    if (sprints.some(s => String(s.id) === String(activeSprintId))) {
                        defaultSprintId = String(activeSprintId);
                    }
                }
                setFormData({
                    title: '',
                    description: '',
                    status: 'todo',
                    priority: 'medium',
                    assignee_id: '',
                    effort: '',
                    timespent: '',
                    sprint_id: defaultSprintId,
                    tags: [],
                    duedate: null
                });
            }
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

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                // Check if the focused element is the comment textarea
                const activeElement = document.activeElement;
                const isCommentTextarea = activeElement && 
                    activeElement.tagName === 'TEXTAREA' && 
                    activeElement.closest('.comment-form');
                
                if (!isCommentTextarea) {
                    e.preventDefault();
                    handleSubmit(e);
                }
            }
        };

        if (isModalOpen) {
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isModalOpen, formData, effortError, timeSpentError]);

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

    const handleAddTemplate = (e) => {
        e.preventDefault();
        const template = `View: \nWhat: \nWhy: \n\nDescription:\nThe ability for the user to\n\nAcceptance criteria:\n· `;

        if (formData.description && formData.description.trim() !== '') {
            if (window.confirm('The description is not empty. Are you sure you want to replace it with the template?')) {
                setFormData(prev => ({ ...prev, description: template }));
            }
        } else {
            setFormData(prev => ({ ...prev, description: template }));
        }
    };

    if (!isModalOpen) return null;

    const getAssigneeName = (assigneeId) => {
        if (!users.length || !assigneeId) return 'Empty';
        const user = users.find(u => u.id === parseInt(assigneeId));
        return user ? `${user.firstName} ${user.lastName}` : 'Empty';
    };

    const getSprintName = (sprintId) => {
        if (!sprints.length || !sprintId) return 'Backlog';
        const sprint = sprints.find(s => s.id === parseInt(sprintId));
        return sprint ? sprint.name : 'Backlog';
    };

    const renderMetadataRow = ({ icon, label, children }) => (
        <div className="metadata-row">
            <div className="metadata-label">
                {icon}
                <span>{label}</span>
            </div>
            <div className="metadata-value">{children}</div>
        </div>
    );
    
    return (
        <div className="modal-overlay" onClick={closeTaskModal}>
            {!showConfirmDelete ? (
                <div className="modal-content-reborn" onClick={e => e.stopPropagation()}>
                    <div className="modal-main-content">
                        <div className="modal-header">
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleInputChange}
                                className="modal-title-input"
                                placeholder="Task Title"
                            />
                        </div>

                        {selectedTask && selectedTask.id && (
                            <div className="ai-bar">
                                ✨ <a href="#" onClick={handleAddTemplate}>Create Template for description below</a>
                            </div>
                        )}
                        
                        <div className="modal-body">
                            <div className="metadata-grid">
                                {renderMetadataRow({ icon: <StatusIcon />, label: "Status", children: (
                                    <select name="status" value={formData.status} onChange={handleInputChange}>
                                        <option value="todo">To Do</option>
                                        <option value="inProgress">In Progress</option>
                                        <option value="review">Review</option>
                                        <option value="done">Done</option>
                                    </select>
                                )})}
                                {renderMetadataRow({ icon: <AssigneeIcon />, label: "Assignees", children: (
                                    <select name="assignee_id" value={formData.assignee_id} onChange={handleInputChange}>
                                        <option value="">Empty</option>
                                        {users.map(user => <option key={user.id} value={user.id}>{user.firstName} {user.lastName}</option>)}
                                    </select>
                                )})}

                                {renderMetadataRow({ icon: <DatesIcon />, label: "Due Date", children: (
                                    <DueDate duedate={formData.duedate} setDuedate={(date) => setFormData(prev => ({ ...prev, duedate: date }))} />
                                )})}
                                
                                {renderMetadataRow({ icon: <PriorityIcon />, label: "Priority", children: (
                                     <select name="priority" value={formData.priority} onChange={handleInputChange}>
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                )})}

                                {renderMetadataRow({ icon: <TimeEstimateIcon />, label: "Time Estimate", children: (
                                    <input type="text" name="effort" value={formData.effort} onChange={handleInputChange} placeholder="Empty" />
                                )})}
                                
                                {renderMetadataRow({ icon: <TimeTrackIcon />, label: "Track Time", children: (
                                     <input type="text" name="timespent" value={formData.timespent} onChange={handleInputChange} placeholder="Add Time" />
                                )})}

                                {renderMetadataRow({ icon: <TagsIcon />, label: "Tags", children: (
                                    <TagsInput 
                                        tags={formData.tags}
                                        setTags={(newTags) => setFormData(prev => ({ ...prev, tags: newTags }))}
                                    />
                                )})}
                                
                                {renderMetadataRow({ icon: <RelationshipsIcon />, label: "Relationships", children: <div className="metadata-placeholder">Empty</div> })}
                                
                                {renderMetadataRow({ icon: <SprintIcon />, label: "Sprint", children: (
                                     <select name="sprint_id" value={formData.sprint_id} onChange={handleInputChange}>
                                        <option value="">Backlog</option>
                                        {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                )})}
                            </div>
                            <div className="description-area">
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    placeholder="Add a description..."
                                />
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button onClick={() => setShowConfirmDelete(true)} className="delete-button">Delete</button>
                            <button onClick={closeTaskModal} className="cancel-button">Cancel</button>
                            <button onClick={handleSubmit} className="save-button">Save Changes</button>
                        </div>
                    </div>

                    <div className="modal-sidebar">
                        <ActivityFeed task={selectedTask} />
                    </div>
                </div>
            ) : (
                <div
                    className="confirm-delete-content"
                    role="dialog"
                    aria-modal="true"
                    tabIndex={-1}
                    onClick={e => e.stopPropagation()}
                >
                    <h2>Are you sure you want to delete this task?</h2>
                    <div className="subtitle">This action cannot be undone.</div>
                    <div className="confirm-delete-buttons">
                        <button onClick={async () => { await handleDelete(); closeTaskModal(); }} className="confirm-delete-button">Yes, delete</button>
                        <button onClick={() => setShowConfirmDelete(false)} className="cancel-delete-button">Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TaskModal;