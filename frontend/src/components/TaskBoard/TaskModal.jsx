import React, { useState, useEffect } from 'react';
import { useTaskContext } from '../../context/TaskContext';
import './TaskModal.css';

const TaskModal = () => {
    const {
        selectedTask,
        isModalOpen,
        closeTaskModal,
        createTask,
        updateTask,
        deleteTask
    } = useTaskContext();

    // User mapping for consistent display across components
    const userMap = {
        1: { firstName: 'John', lastName: 'Doe' },
        2: { firstName: 'Jane', lastName: 'Smith' },
        3: { firstName: 'Bob', lastName: 'Johnson' }
    };

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        assignee_id: '',
        effort: '',
        time_spent: '',
        sprint_id: ''
    });

    const [effortError, setEffortError] = useState('');
    const [timeSpentError, setTimeSpentError] = useState('');
    const [sprints, setSprints] = useState([]);
    const [sprintsLoading, setSprintsLoading] = useState(false);
    const [sprintsError, setSprintsError] = useState(null);

    useEffect(() => {
        console.log('selectedTask in modal:', selectedTask);
        if (selectedTask) {
            setFormData({
                title: selectedTask.title,
                description: selectedTask.description,
                status: selectedTask.status,
                priority: selectedTask.priority,
                assignee_id: selectedTask.assignee_id || '',
                effort: selectedTask.effort || '',
                time_spent: selectedTask.time_spent || '',
                sprint_id: selectedTask.sprint_id ?? ''
            });
        } else {
            // Reset form data when creating a new task
            setFormData({
                title: '',
                description: '',
                status: 'todo',
                priority: 'medium',
                assignee_id: '',
                effort: '',
                time_spent: '',
                sprint_id: ''
            });
        }
    }, [selectedTask, isModalOpen]);

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

    const validateEffort = (value) => {
        if (!value) return true; // Empty value is allowed
        const regex = /^\d+(\.\d+)?[hd]$/;
        if (!regex.test(value)) return false;
        const number = parseFloat(value);
        const unit = value.slice(-1);
        if (unit === 'h' && number < 0.5) return false;
        if (unit === 'd' && number < 1) return false;
        return true;
    };

    // Reuse validateEffort for time spent
    const validateTimeSpent = validateEffort;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (effortError || timeSpentError) return;
        try {
            if (selectedTask) {
                await updateTask(selectedTask.id, formData);
            } else {
                await createTask(formData);
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

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'sprint_id') {
            setFormData(prev => ({ ...prev, sprint_id: value }));
        } else if (name === 'effort') {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
            if (!validateEffort(value) && value) {
                setEffortError('Invalid format. Use e.g. 2h, 0.5h, 1d. Min: 0.5h or 1d');
            } else {
                setEffortError('');
            }
        } else if (name === 'time_spent') {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
            if (!validateTimeSpent(value) && value) {
                setTimeSpentError('Invalid format. Use e.g. 2h, 0.5h, 1d. Min: 0.5h or 1d');
            } else {
                setTimeSpentError('');
            }
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    if (!isModalOpen) return null;

    return (
        <div 
            className="modal-overlay" 
            onClick={closeTaskModal}
            onKeyPress={handleKeyPress}
            tabIndex={0}
        >
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="form-group">
                    <label htmlFor="sprint_id"><b>Sprint/Backlog</b></label>
                    <select
                        id="sprint_id"
                        name="sprint_id"
                        value={formData.sprint_id ?? ''}
                        onChange={handleChange}
                        disabled={sprintsLoading}
                    >
                        <option value="">Backlog</option>
                        {sprints.map(sprint => (
                            <option key={sprint.id} value={sprint.id}>{sprint.name}</option>
                        ))}
                    </select>
                    {sprintsError && <div style={{ color: 'red', marginTop: 4 }}>{sprintsError}</div>}
                </div>
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
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="description">Description</label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows="4"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="effort">Effort Estimation</label>
                        <input
                            type="text"
                            id="effort"
                            name="effort"
                            value={formData.effort}
                            onChange={handleChange}
                            placeholder="e.g., 2h, 0.5h, 1d, 5d"
                        />
                        <small className="modal-description">
                            Format: number + unit (h for hours, d for days). Minimum: 0.5h or 1d
                        </small>
                        {effortError && <div style={{ color: 'red', marginTop: 4 }}>{effortError}</div>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="time_spent">Time spend</label>
                        <input
                            type="text"
                            id="time_spent"
                            name="time_spent"
                            value={formData.time_spent}
                            onChange={handleChange}
                            placeholder="e.g., 2h, 0.5h, 1d, 5d"
                        />
                        <small className="modal-description">
                            Format: number + unit (h for hours, d for days). Minimum: 0.5h or 1d
                        </small>
                        {timeSpentError && <div style={{ color: 'red', marginTop: 4 }}>{timeSpentError}</div>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="status">Status</label>
                        <select
                            id="status"
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                        >
                            <option value="todo">To Do</option>
                            <option value="inProgress">In Progress</option>
                            <option value="review">Review</option>
                            <option value="done">Done</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="priority">Priority</label>
                        <select
                            id="priority"
                            name="priority"
                            value={formData.priority}
                            onChange={handleChange}
                        >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="assignee_id">Assignee</label>
                        <select
                            id="assignee_id"
                            name="assignee_id"
                            value={formData.assignee_id}
                            onChange={handleChange}
                        >
                            <option value="">Unassigned</option>
                            {Object.entries(userMap).map(([id, user]) => (
                                <option key={id} value={id}>
                                    {`${user.firstName} ${user.lastName}`}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="modal-footer">
                        {selectedTask && (
                            <button 
                                type="button" 
                                className="delete-button" 
                                onClick={handleDelete}
                            >
                                Delete
                            </button>
                        )}
                        <button type="button" className="cancel-button" onClick={closeTaskModal}>
                            Cancel
                        </button>
                        <button type="submit" className="submit-button">
                            {selectedTask ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TaskModal; 