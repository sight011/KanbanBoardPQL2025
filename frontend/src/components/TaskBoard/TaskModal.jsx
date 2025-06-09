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
        assignee_id: ''
    });

    useEffect(() => {
        if (selectedTask) {
            setFormData({
                title: selectedTask.title,
                description: selectedTask.description,
                status: selectedTask.status,
                priority: selectedTask.priority,
                assignee_id: selectedTask.assignee_id || ''
            });
        } else {
            // Reset form data when creating a new task
            setFormData({
                title: '',
                description: '',
                status: 'todo',
                priority: 'medium',
                assignee_id: ''
            });
        }
    }, [selectedTask, isModalOpen]); // Added isModalOpen as a dependency

    const handleSubmit = async (e) => {
        e.preventDefault();
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
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
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