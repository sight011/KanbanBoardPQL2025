import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import EditProjectModal from './EditProjectModal';
import DeleteProjectModal from './DeleteProjectModal';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import api from '../../api/axios';
import './ProjectSelector.css';

const ProjectSelector = ({ projects, selectedProject, onProjectSelect, onProjectsChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedProjectForAction, setSelectedProjectForAction] = useState(null);
    const [reordering, setReordering] = useState(false);
    const [reorderError, setReorderError] = useState('');
    const [reorderSuccess, setReorderSuccess] = useState(false);
    const [localProjects, setLocalProjects] = useState(projects);
    const dropdownRef = useRef(null);

    useEffect(() => {
        setLocalProjects(projects);
    }, [projects]);

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
            localProjects.map((p) => (p.id === updatedProject.id ? updatedProject : p))
        );
    };

    const handleProjectDeleted = (deletedProjectId) => {
        onProjectsChange(
            localProjects.filter((p) => p.id !== deletedProjectId)
        );
        if (selectedProject && selectedProject.id === deletedProjectId) {
            onProjectSelect(null);
        }
    };

    // Drag and Drop Handlers
    const onDragEnd = async (result) => {
        if (!result.destination) return;
        const from = result.source.index;
        const to = result.destination.index;
        if (from === to) return;

        const reordered = Array.from(localProjects);
        const [removed] = reordered.splice(from, 1);
        reordered.splice(to, 0, removed);
        setLocalProjects(reordered);
        setReordering(true);
        setReorderError('');
        setReorderSuccess(false);

        try {
            await api.post('/api/projects/reorder', {
                projectIds: reordered.map(p => p.id)
            });
            setReorderSuccess(true);
            setTimeout(() => setReorderSuccess(false), 1200);
            onProjectsChange(reordered);
            // If the top project changed, select it and store in sessionStorage
            if (to === 0) {
                onProjectSelect(reordered[0]);
                sessionStorage.setItem('selectedProjectId', reordered[0].id.toString());
            }
        } catch (err) {
            setReorderError('Failed to save project order');
            setLocalProjects(projects); // revert
            setTimeout(() => setReorderError(''), 2000);
        } finally {
            setReordering(false);
        }
    };

    // On mount or when localProjects changes, only select the top project if none is selected
    useEffect(() => {
        if (localProjects.length > 0 && (!selectedProject || !localProjects.some(p => p.id === selectedProject.id))) {
            onProjectSelect(localProjects[0]);
            sessionStorage.setItem('selectedProjectId', localProjects[0].id.toString());
        }
    }, [localProjects, selectedProject, onProjectSelect]);

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
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="project-list">
                        {(provided) => (
                            <ul className="project-selector__dropdown" role="listbox" ref={provided.innerRef} {...provided.droppableProps}>
                                {localProjects.length === 0 && (
                                    <li className="project-selector__option empty">No projects</li>
                                )}
                                {localProjects.map((project, idx) => (
                                    <Draggable key={project.id} draggableId={String(project.id)} index={idx}>
                                        {(dragProvided) => (
                                            <li
                                                className={`project-selector__option${selectedProject && selectedProject.id === project.id ? ' selected' : ''}${reordering ? ' reordering' : ''}${reorderSuccess ? ' success' : ''}${reorderError ? ' error' : ''}`}
                                                onClick={() => handleSelect(project)}
                                                role="option"
                                                aria-selected={selectedProject && selectedProject.id === project.id}
                                                ref={dragProvided.innerRef}
                                                {...dragProvided.draggableProps}
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
                                                    <span className="project-selector__drag-handle" {...dragProvided.dragHandleProps} title="Drag to reorder">≡</span>
                                                </span>
                                            </li>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </ul>
                        )}
                    </Droppable>
                </DragDropContext>
            )}
            {reorderError && <div className="project-selector__error">{reorderError}</div>}
            {reorderSuccess && <div className="project-selector__success">Order saved!</div>}
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