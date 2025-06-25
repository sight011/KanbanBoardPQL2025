import { useState } from 'react';
import PropTypes from 'prop-types';
import api from '../../api/axios';
import './CreateProjectModal.css';

const CreateProjectModal = ({ isOpen, onClose, onProjectCreated }) => {
    const [projectName, setProjectName] = useState('');
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!projectName.trim()) {
            setError('Project name is required');
            return;
        }

        // Validate name format (letters, numbers, and spaces only)
        const nameRegex = /^[a-zA-Z0-9\s]+$/;
        if (!nameRegex.test(projectName.trim())) {
            setError('Project name can only contain letters, numbers, and spaces');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const response = await api.post('/api/projects', {
                name: projectName.trim(),
                description: description.trim() || null
            });

            if (response.data.success) {
                setProjectName('');
                setDescription('');
                onProjectCreated(response.data.project);
                onClose();
            } else {
                setError(response.data.message || response.data.error || 'Failed to create project');
            }
        } catch (err) {
            console.error('Error creating project:', err);
            setError('Failed to create project. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        setProjectName('');
        setDescription('');
        setError('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="create-project-modal-overlay">
            <div className="create-project-modal">
                <div className="create-project-modal-header">
                    <h3>Create New Project</h3>
                </div>
                
                <form onSubmit={handleSubmit} className="create-project-modal-form">
                    <div className="form-group">
                        <label htmlFor="projectName">Project Name *</label>
                        <input
                            type="text"
                            id="projectName"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            placeholder="Enter project name"
                            maxLength={50}
                            disabled={isLoading}
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="description">Description (Optional)</label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Enter project description"
                            maxLength={200}
                            rows={3}
                            disabled={isLoading}
                        />
                    </div>

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    <div className="create-project-modal-actions">
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="cancel-button"
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="create-button"
                            disabled={isLoading || !projectName.trim()}
                        >
                            {isLoading ? 'Creating...' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

CreateProjectModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onProjectCreated: PropTypes.func.isRequired
};

export default CreateProjectModal; 