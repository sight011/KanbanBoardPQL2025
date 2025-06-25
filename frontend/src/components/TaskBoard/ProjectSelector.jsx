import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import EditProjectModal from './EditProjectModal';
import DeleteProjectModal from './DeleteProjectModal';
import './ProjectSelector.css';

const ProjectSelector = ({ projects, selectedProject, onProjectSelect, onProjectsChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedProjectForAction, setSelectedProjectForAction] = useState(null);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleSelect = (project) => {
        setIsOpen(false);
        onProjectSelect(project);
    };

    const handleEditClick = (project, e) => {
        e.stopPropagation();
        setSelectedProjectForAction(project);
        setIsEditModalOpen(true);
    };

    const handleDeleteClick = (project, e) => {
        e.stopPropagation();
        setSelectedProjectForAction(project);
        setIsDeleteModalOpen(true);
    };

    const handleProjectUpdated = (updatedProject) => {
        onProjectsChange(
            projects.map((p) => (p.id === updatedProject.id ? updatedProject : p))
        );
    };

    const handleProjectDeleted = (deletedProjectId) => {
        onProjectsChange(
            projects.filter((p) => p.id !== deletedProjectId)
        );
        if (selectedProject && selectedProject.id === deletedProjectId) {
            onProjectSelect(null);
        }
    };

    return (
        <div className="project-selector" ref={dropdownRef}>
            <button
                className="project-selector__button"
                onClick={() => setIsOpen((open) => !open)}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <span className="project-selector__selected">
                    {selectedProject ? selectedProject.name : 'Select Project'}
                </span>
                <svg 
                    className={`project-selector__chevron${isOpen ? ' open' : ''}`}
                    width="16" height="16" viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                    style={{ verticalAlign: 'middle' }}
                >
                    <polyline points="6,9 12,15 18,9"></polyline>
                </svg>
            </button>
            {isOpen && (
                <ul className="project-selector__dropdown" role="listbox">
                    {projects.length === 0 && (
                        <li className="project-selector__option empty">No projects</li>
                    )}
                    {projects.map((project) => (
                        <li
                            key={project.id}
                            className={`project-selector__option${selectedProject && selectedProject.id === project.id ? ' selected' : ''}`}
                            onClick={() => handleSelect(project)}
                            role="option"
                            aria-selected={selectedProject && selectedProject.id === project.id}
                        >
                            <span className="project-selector__option-name">{project.name}</span>
                            <span className="project-selector__icons">
                                <button
                                    className="project-selector__icon-btn"
                                    title="Edit project"
                                    onClick={(e) => handleEditClick(project, e)}
                                >
                                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M16.5 3.5a2.121 2.121 0 0 1 3 3l-11 11-4 1 1-4 11-11Z"/></svg>
                                </button>
                                <button
                                    className="project-selector__icon-btn"
                                    title="Delete project"
                                    onClick={(e) => handleDeleteClick(project, e)}
                                >
                                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M6 7h12M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7h12Z"/></svg>
                                </button>
                            </span>
                        </li>
                    ))}
                </ul>
            )}
            {isEditModalOpen && selectedProjectForAction && (
                <EditProjectModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    project={selectedProjectForAction}
                    onProjectUpdated={handleProjectUpdated}
                />
            )}
            {isDeleteModalOpen && selectedProjectForAction && (
                <DeleteProjectModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    project={selectedProjectForAction}
                    onProjectDeleted={handleProjectDeleted}
                />
            )}
        </div>
    );
};

ProjectSelector.propTypes = {
    projects: PropTypes.array.isRequired,
    selectedProject: PropTypes.object,
    onProjectSelect: PropTypes.func.isRequired,
    onProjectsChange: PropTypes.func.isRequired,
};

export default ProjectSelector; 