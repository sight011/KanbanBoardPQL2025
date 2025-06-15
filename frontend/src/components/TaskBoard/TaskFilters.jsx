import React, { useEffect, useState } from 'react';
import './TaskFilters.css';

const TaskFilters = ({ filters, onFilterChange }) => {
    const [users, setUsers] = useState([]);
    const [sprints, setSprints] = useState([]);
    const [activeSprintId, setActiveSprintId] = useState(null);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await fetch('/api/users');
                const data = await res.json();
                setUsers(data.users || []);
            } catch (err) {
                setUsers([]);
            }
        };
        fetchUsers();
    }, []);

    useEffect(() => {
        const fetchSprints = async () => {
            try {
                const res = await fetch('/api/sprints');
                const data = await res.json();
                setSprints(data.sprints || []);
                const active = (data.sprints || []).find(s => s.status === 'active');
                setActiveSprintId(active ? String(active.id) : null);
            } catch (err) {
                setSprints([]);
                setActiveSprintId(null);
            }
        };
        fetchSprints();
    }, []);

    const handleInputChange = (e) => {
        onFilterChange('text', e.target.value);
    };

    const handleSprintChange = (e) => {
        onFilterChange('sprint', e.target.value);
    };

    const handlePriorityChange = (e) => {
        onFilterChange('priority', e.target.value);
    };

    const handleStatusChange = (e) => {
        onFilterChange('status', e.target.value);
    };

    const handleAssigneeChange = (e) => {
        onFilterChange('assignee', e.target.value);
    };

    const handleClearFilters = () => {
        onFilterChange('text', '');
        onFilterChange('sprint', '');
        onFilterChange('priority', '');
        onFilterChange('status', '');
        onFilterChange('assignee', '');
    };

    return (
        <div className="task-filters">
            <div className="filter-group">
                <input
                    type="text"
                    id="task-search-input"
                    placeholder="Search tasks..."
                    className="filter-input"
                    value={filters.text || ''}
                    onChange={handleInputChange}
                />
                <select
                    className="filter-select"
                    value={filters.sprint || ''}
                    onChange={handleSprintChange}
                >
                    <option value="">All Sprints</option>
                    <option value="backlog">Backlog</option>
                    {sprints.map((sprint) => (
                        <option key={sprint.id} value={sprint.id}>
                            {sprint.name}{activeSprintId === String(sprint.id) ? ' (active)' : ''}
                        </option>
                    ))}
                </select>
                <select
                    className="filter-select"
                    value={filters.priority || ''}
                    onChange={handlePriorityChange}
                >
                    <option value="">Priority</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                </select>
                <select
                    className="filter-select"
                    value={filters.status || ''}
                    onChange={handleStatusChange}
                >
                    <option value="">Status</option>
                    <option value="todo">To Do</option>
                    <option value="inProgress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="done">Done</option>
                </select>
                <select
                    className="filter-select"
                    value={filters.assignee || ''}
                    onChange={handleAssigneeChange}
                >
                    <option value="">Assignee</option>
                    {users.map((user) => (
                        <option key={user.id} value={user.id}>{user.firstName} {user.lastName}</option>
                    ))}
                </select>
                <button
                    className="clear-filters-button"
                    onClick={handleClearFilters}
                >
                    Clear Filters
                </button>
            </div>
        </div>
    );
};

export default TaskFilters;