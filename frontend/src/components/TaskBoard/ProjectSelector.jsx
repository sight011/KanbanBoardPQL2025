import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import api from '../../api/axios';
import CreateProjectModal from './CreateProjectModal';
import './ProjectSelector.css';

const ProjectSelector = ({ selectedProjectId, onProjectChange }) => {
    const [projects, setProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        setIsLoading(true);
        setError('');
        
        try {
            const response = await api.get('/api/projects');
            
            if (response.data.success) {
                setProjects(response.data.projects || []);
                
                // Auto-select the first project if none is selected
                if (!selectedProjectId && response.data.projects && response.data.projects.length > 0) {
                    onProjectChange(response.data.projects[0].id);
                }
            } else {
                setError(response.data.message || 'Failed to fetch projects');
            }
        } catch (err) {
            console.error('Error fetching projects:', err);
            setError('Failed to fetch projects');
        } finally {
            setIsLoading(false);
        }
    };

    const handleProjectChange = (e) => {
        const value = e.target.value;
        
        if (value === 'create-new') {
            setIsModalOpen(true);
        } else {
            onProjectChange(value ? parseInt(value) : null);
        }
    };

    const handleProjectCreated = (newProject) => {
        // Add the new project to the list
        setProjects(prev => [...prev, newProject]);
        
        // Auto-select the newly created project
        onProjectChange(newProject.id);
    };

    const getSelectedProjectName = () => {
        if (!selectedProjectId) return 'Select Project';
        const project = projects.find(p => p.id === selectedProjectId);
        return project ? project.name : 'Select Project';
    };

    if (isLoading) {
        return (
            <div className="project-selector">
                <select disabled className="project-select">
                    <option>Loading projects...</option>
                </select>
            </div>
        );
    }

    return (
        <div className="project-selector">
            <select 
                value={selectedProjectId || ''} 
                onChange={handleProjectChange}
                className="project-select"
                title={getSelectedProjectName()}
            >
                <option value="">Select Project</option>
                <option value="create-new" className="create-new-option">
                    + Create New Project
                </option>
                {projects.map(project => (
                    <option key={project.id} value={project.id}>
                        {project.name}
                    </option>
                ))}
            </select>
            
            {error && (
                <div className="project-selector-error">
                    {error}
                </div>
            )}

            <CreateProjectModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onProjectCreated={handleProjectCreated}
            />
        </div>
    );
};

ProjectSelector.propTypes = {
    selectedProjectId: PropTypes.number,
    onProjectChange: PropTypes.func.isRequired
};

export default ProjectSelector; 