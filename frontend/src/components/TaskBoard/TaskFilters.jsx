import React from 'react';
import './TaskFilters.css';

const TaskFilters = ({ filters, onFilterChange }) => {
    const userMap = {
        1: { firstName: 'John', lastName: 'Doe' },
        2: { firstName: 'Jane', lastName: 'Smith' },
        3: { firstName: 'Bob', lastName: 'Johnson' }
    };

    const handleClearFilters = () => {
        onFilterChange('text', '');
        onFilterChange('priority', '');
        onFilterChange('assignee', '');
    };

    return (
        <div className="task-filters">
            <div className="filter-group">
                <input
                    type="text"
                    placeholder="Search tasks..."
                    value={filters.text}
                    onChange={(e) => onFilterChange('text', e.target.value)}
                    className="filter-input"
                />
            </div>
            <div className="filter-group">
                <select
                    value={filters.priority}
                    onChange={(e) => onFilterChange('priority', e.target.value)}
                    className="filter-select"
                >
                    <option value="">All Priorities</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                </select>
                <select
                    value={filters.assignee}
                    onChange={(e) => onFilterChange('assignee', e.target.value)}
                    className="filter-select"
                >
                    <option value="">All Assignees</option>
                    <option value="unassigned">Unassigned</option>
                    {Object.entries(userMap).map(([id, user]) => (
                        <option key={id} value={id}>
                            {`${user.firstName} ${user.lastName}`}
                        </option>
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