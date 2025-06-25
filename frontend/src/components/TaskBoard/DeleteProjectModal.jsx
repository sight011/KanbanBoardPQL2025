import { useState } from 'react';
import PropTypes from 'prop-types';
import api from '../../api/axios';
import './DeleteProjectModal.css';

const DeleteProjectModal = ({ isOpen, onClose, project, onProjectDeleted }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleDelete = async () => {
        setIsLoading(true);
        setError('');

        try {
            const response = await api.delete(`/api/projects/${project.id}`);

            if (response.data.success) {
                onProjectDeleted(project.id);
                onClose();
            } else {
                setError(response.data.message || 'Failed to delete project');
            }
        } catch (err) {
            console.error('Error deleting project:', err);
            setError(err.response?.data?.message || 'Failed to delete project');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen || !project) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="delete-project-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Delete Project</h2>
                    <button className="close-button" onClick={onClose}>&times;</button>
                </div>
                
                <div className="modal-content">
                    <div className="warning-icon">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                    </div>
                    
                    <h3>Are you sure you want to delete this project?</h3>
                    
                    <div className="project-info">
                        <strong>Project Name:</strong> {project.name}
                        {project.description && (
                            <div className="project-description">
                                <strong>Description:</strong> {project.description}
                            </div>
                        )}
                    </div>
                    
                    <div className="warning-message">
                        <p>
                            <strong>Warning:</strong> This action will:
                        </p>
                        <ul>
                            <li>Mark the project as deleted (soft delete)</li>
                            <li>Hide the project from the project list</li>
                            <li>Preserve all project data for potential recovery</li>
                            <li>Tasks in this project will also be hidden</li>
                        </ul>
                        <p>
                            <em>This action can be undone by an administrator.</em>
                        </p>
                    </div>

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}
                </div>

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
                        type="button"
                        className="delete-button"
                        onClick={handleDelete}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Deleting...' : 'Delete Project'}
                    </button>
                </div>
            </div>
        </div>
    );
};

DeleteProjectModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    project: PropTypes.object,
    onProjectDeleted: PropTypes.func.isRequired
};

export default DeleteProjectModal; 