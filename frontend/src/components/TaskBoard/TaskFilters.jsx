import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import api from '../../api/axios';
import './TaskFilters.css';

const TaskFilters = ({ filters, onFilterChange, activeSprintId, selectedProject, user }) => {
    const [users, setUsers] = useState([]);
    const [sprints, setSprints] = useState([]);
    const [projects, setProjects] = useState([]);
    const [usersError, setUsersError] = useState(null);

    useEffect(() => {
        const fetchUsers = async () => {
            // Only fetch users if user is authenticated
            if (!user) {
                setUsers([]);
                setUsersError('Authentication required to load users');
                return;
            }

            try {
                const res = await api.get('/api/users');
                const data = await res.data;
                setUsers(data.users || []);
                setUsersError(null);
            } catch (err) {
                console.error('Error fetching users:', err);
                setUsers([]);
                if (err.response?.status === 401) {
                    setUsersError('Authentication required to load users');
                } else {
                    setUsersError('Failed to load users');
                }
            }
        };
        fetchUsers();
    }, [user]); // Re-fetch when user changes

    useEffect(() => {
        const fetchSprints = async () => {
            try {
                const res = await api.get('/api/sprints');
                const data = await res.data;
                setSprints(data.sprints || []);
            } catch (err) {
                setSprints([]);
            }
        };
        fetchSprints();
    }, []);

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const res = await api.get('/api/projects');
                const data = await res.data;
                setProjects(data.projects || []);
            } catch (err) {
                setProjects([]);
            }
        };
        fetchProjects();
    }, []);

    // Filter sprints based on selected project
    const filteredSprints = sprints.filter(sprint => {
        // If no project is selected, show all sprints
        if (!selectedProject) {
            return true;
        }
        // Only show sprints that belong to the selected project
        return sprint.project_id === selectedProject.id;
    });

    // Sync project filter with selected project
    useEffect(() => {
        if (selectedProject && filters.project !== selectedProject.id) {
            // Only sync if the filter value is different from the selected project
            onFilterChange('project', selectedProject.id);
        }
    }, [selectedProject, filters.project, onFilterChange]);

    return (
        <div className="task-filters">
            <div className="filter-group">
                <input
                    id="filter-search"
                    type="text"
                    placeholder="Search tasks..."
                    className="filter-input"
                    value={filters.text || ''}
                    onChange={(e) => onFilterChange('text', e.target.value)}
                />
                <select
                    id="filter-project"
                    className="filter-select"
                    value={filters.project || ''}
                    onChange={(e) => onFilterChange('project', e.target.value)}
                >
                    <option value="">All Projects</option>
                    {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                            {project.name}
                        </option>
                    ))}
                </select>
                <select
                    id="filter-sprint"
                    className="filter-select"
                    value={filters.sprint || ''}
                    onChange={(e) => onFilterChange('sprint', e.target.value)}
                >
                    <option value="">All Sprints</option>
                    <option value="backlog">Backlog</option>
                    {filteredSprints.map((sprint) => (
                        <option key={sprint.id} value={sprint.id}>
                            {sprint.name}{activeSprintId === String(sprint.id) ? ' (active)' : ''}
                        </option>
                    ))}
                </select>
                <select
                    className="filter-select"
                    value={filters.changedInTime || ''}
                    onChange={(e) => onFilterChange('changedInTime', e.target.value)}
                >
                    <option value="">Changed in Time</option>
                    <option value="all">All</option>
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="lastTwoDays">Last Two Days</option>
                    <option value="last24h">Last 24h</option>
                    <option value="last7d">Last 7d</option>
                    <option value="last14d">Last 14d</option>
                </select>
                <select
                    className="filter-select"
                    value={filters.priority || ''}
                    onChange={(e) => onFilterChange('priority', e.target.value)}
                >
                    <option value="">Priority</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                </select>
                <select
                    className="filter-select"
                    value={filters.status || ''}
                    onChange={(e) => onFilterChange('status', e.target.value)}
                >
                    <option value="">Status</option>
                    <option value="todo">To Do</option>
                    <option value="inProgress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="done">Done</option>
                </select>
                <select
                    id="filter-assignee"
                    className="filter-select"
                    value={filters.assignee || ''}
                    onChange={(e) => onFilterChange('assignee', e.target.value)}
                    title={usersError || undefined}
                >
                    <option value="">
                        {usersError ? 'Users unavailable' : `Assignee (${users.length} users)`}
                    </option>
                    {users.map((user) => (
                        <option key={user.id} value={user.id}>{user.firstName} {user.lastName}</option>
                    ))}
                </select>
                <button
                    className="clear-filters-button"
                    onClick={() => {
                        onFilterChange('text', '');
                        onFilterChange('project', '');
                        onFilterChange('sprint', activeSprintId || '');
                        onFilterChange('changedInTime', '');
                        onFilterChange('priority', '');
                        onFilterChange('status', '');
                        onFilterChange('assignee', '');
                    }}
                >
                    Clear Filters
                </button>
            </div>
        </div>
    );
};

TaskFilters.propTypes = {
    filters: PropTypes.object.isRequired,
    onFilterChange: PropTypes.func.isRequired,
    activeSprintId: PropTypes.string,
    selectedProject: PropTypes.object,
    user: PropTypes.object
};

export default TaskFilters;
