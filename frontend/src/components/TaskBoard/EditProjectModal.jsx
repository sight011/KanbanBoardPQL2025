import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import api from '../../api/axios';
import './EditProjectModal.css';

const EditProjectModal = ({ isOpen, onClose, project, onProjectUpdated }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (project) {
            setFormData({
                name: project.name || '',
                description: project.description || ''
            });
        }
    }, [project]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            setError('Project name is required');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const response = await api.put(`/api/projects/${project.id}`, {
                name: formData.name.trim(),
                description: formData.description.trim()
            });

            if (response.data.success) {
                onProjectUpdated(response.data.project);
                onClose();
            } else {
                setError(response.data.message || 'Failed to update project');
            }
        } catch (err) {
            console.error('Error updating project:', err);
            setError(err.response?.data?.message || 'Failed to update project');
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        if (error) setError('');
    };

    if (!isOpen || !project) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="edit-project-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Edit Project</h2>
                    <button className="close-button" onClick={onClose}>&times;</button>
                </div>
                
                <form onSubmit={handleSubmit} className="edit-project-form">
                    <div className="form-group">
                        <label htmlFor="name">Project Name *</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            placeholder="Enter project name"
                            required
                            disabled={isLoading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="description">Description</label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            placeholder="Enter project description"
                            rows="3"
                            disabled={isLoading}
                        />
                    </div>

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    <div className="modal-actions">
                        <button
                            type="button"
                            className="cancel-button"
                            onClick={onClose}
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="save-button"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

EditProjectModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    project: PropTypes.object,
    onProjectUpdated: PropTypes.func.isRequired
};

export default EditProjectModal; 