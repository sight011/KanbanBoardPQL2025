import { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { DragDropContext } from '@hello-pangea/dnd';
import TaskColumn from './TaskColumn';
import TaskFilters from './TaskFilters';
import TaskModal from './TaskModal';
import ProjectSelector from './ProjectSelector';
import DepartmentSelector from './DepartmentSelector';
import { useTaskContext } from '../../context/TaskContext';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import './TaskBoard.css';
import SprintView from './SprintView';
import BurndownChart from './BurndownChart';
import CalendarView from '../CalendarView';
import api from '../../api/axios';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

// Custom plugin to draw text on pie slices
const textPlugin = {
    id: 'textPlugin',
    afterDraw: function(chart) {
        const ctx = chart.ctx;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = '#ffffff';

        chart.data.datasets.forEach((dataset, i) => {
            const meta = chart.getDatasetMeta(i);
            meta.data.forEach((element, index) => {
                const value = dataset.data[index];
                if (value > 0) {
                    const text = value.toString();
                    
                    // Get the center point of the slice
                    const centerX = element.x;
                    const centerY = element.y;
                    
                    // Calculate the angle of the slice
                    const startAngle = element.startAngle;
                    const endAngle = element.endAngle;
                    const midAngle = (startAngle + endAngle) / 2;
                    
                    // Calculate the distance from center (adjust this value to position text)
                    const distance = element.outerRadius * 0.7;
                    
                    // Calculate the new position
                    const x = centerX + Math.cos(midAngle) * distance;
                    const y = centerY + Math.sin(midAngle) * distance;
                    
                    ctx.fillText(text, x, y);
                }
            });
        });
        ctx.restore();
    }
};

// Register the custom plugin
ChartJS.register(textPlugin);

const TaskBoard = ({ viewMode, setViewMode, user }) => {
    const { tasks, updateTaskPosition, loading, error, openTaskModal, updateTask, fetchTasks, selectedTask, isModalOpen, closeTaskModal, deleteTask } = useTaskContext();
    const [selectedProject, setSelectedProject] = useState(null);
    const [projects, setProjects] = useState([]);
    const [projectsLoading, setProjectsLoading] = useState(true);
    const [selectedDepartment, setSelectedDepartment] = useState(null);
    const [departments, setDepartments] = useState([]);
    const [departmentsLoading, setDepartmentsLoading] = useState(true);
    const [selectedSprint, setSelectedSprint] = useState('');
    const [filters, setFilters] = useState({
        text: '',
        project: '',
        sprint: '',
        priority: '',
        assignee: '',
        status: '',
        changedInTime: ''
    });
    const [users, setUsers] = useState([]);
    const [tasksWithChanges, setTasksWithChanges] = useState([]);
    const [focusedSprintId, setFocusedSprintId] = useState(null);
    const [sortColumn, setSortColumn] = useState('priority');
    const [sortDirection, setSortDirection] = useState('asc');

    // Priority order mapping
    const priorityOrder = { high: 1, medium: 2, low: 3 };

    // Add a helper for default filters
    const defaultFilters = {
        text: '',
        project: '',
        sprint: '',
        priority: '',
        assignee: '',
        status: '',
        changedInTime: ''
    };

    // Fetch projects
    useEffect(() => {
        const fetchProjects = async () => {
            try {
                setProjectsLoading(true);
                const response = await api.get('/api/projects');
                if (response.data.success) {
                    const fetchedProjects = response.data.projects || [];
                    setProjects(fetchedProjects);
                    
                    // If no project is selected and we have projects, select the first one
                    if (!selectedProject && fetchedProjects.length > 0) {
                        setSelectedProject(fetchedProjects[0]);
                    }
                }
            } catch (err) {
                console.error('Error fetching projects:', err);
                setProjects([]);
            } finally {
                setProjectsLoading(false);
            }
        };
        
        fetchProjects();
    }, []);

    // Fetch departments
    useEffect(() => {
        const fetchDepartments = async () => {
            try {
                setDepartmentsLoading(true);
                const response = await api.get('/api/departments');
                if (response.data.success) {
                    const fetchedDepartments = response.data.departments || [];
                    setDepartments(fetchedDepartments);
                    
                    // If no department is selected and we have departments, select the first one
                    if (!selectedDepartment && fetchedDepartments.length > 0) {
                        setSelectedDepartment(fetchedDepartments[0]);
                    }
                }
            } catch (err) {
                console.error('Error fetching departments:', err);
                setDepartments([]);
            } finally {
                setDepartmentsLoading(false);
            }
        };
        
        fetchDepartments();
    }, []);

    // Fetch tasks when project changes
    useEffect(() => {
        // Always fetch all tasks for the company, let filters handle project selection
        fetchTasks();
    }, [fetchTasks]);

    // Update project filter when selected project changes
    useEffect(() => {
        // Only set project filter if no project filter is currently set
        if (selectedProject && !filters.project) {
            setFilters(prev => ({
                ...prev,
                project: String(selectedProject.id)
            }));
        }
    }, [selectedProject, filters.project]);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await api.get('/api/users');
                const data = response.data;
                if (data.users) {
                    // Keep users as an array for TaskModal compatibility
                    setUsers(data.users);
                }
            } catch (err) {
                console.error('Error fetching users:', err);
                setUsers([]);
            }
        };
        fetchUsers();
    }, []);

    // Fetch tasks with changes when changedInTime filter is applied
    useEffect(() => {
        const fetchTasksWithChanges = async () => {
            if (filters.changedInTime && filters.changedInTime !== 'all') {
                try {
                    const response = await api.get(`/api/audit/tasks-with-changes?timeFrame=${filters.changedInTime}`);
                    const data = response.data;
                    if (data.success) {
                        setTasksWithChanges(data.tasks.map(task => task.id));
                    } else {
                        setTasksWithChanges([]);
                    }
                } catch (err) {
                    console.error('Error fetching tasks with changes:', err);
                    setTasksWithChanges([]);
                }
            } else {
                setTasksWithChanges([]);
            }
        };

        fetchTasksWithChanges();
    }, [filters.changedInTime]);

    // Fetch sprints for the filter
    useEffect(() => {
        const fetchSprints = async () => {
            try {
                const res = await api.get('/api/sprints');
                const data = res.data;
                const newSprints = data.sprints || [];
                
                // Filter sprints for the selected project
                const projectSprints = selectedProject 
                    ? newSprints.filter(s => s.project_id === selectedProject.id)
                    : newSprints;
                
                // Find active sprint for the selected project
                const activeSprint = projectSprints.find(s => s.status === 'active');
                
                // Set the active sprint for the selected project
                setSelectedSprint(activeSprint ? String(activeSprint.id) : '');
                setFilters(prev => ({
                    ...prev,
                    sprint: activeSprint ? String(activeSprint.id) : ''
                }));
            } catch (err) {
                console.error('Error fetching sprints:', err);
            }
        };
        fetchSprints();
        // Poll for active sprint changes every 10 seconds
        const interval = setInterval(fetchSprints, 10000); // 10 seconds
        return () => clearInterval(interval);
    }, [selectedProject]);

    const handleFilterChange = (filterType, value) => {
        setFilters(prev => ({
            ...prev,
            [filterType]: value
        }));

        // Handle project filter change
        if (filterType === 'project') {
            if (value === '') {
                // "All Projects" selected - clear selected project
                setSelectedProject(null);
                sessionStorage.removeItem('selectedProjectId');
            } else {
                // Specific project selected - update selected project
                const project = projects.find(p => p.id === parseInt(value));
                if (project) {
                    setSelectedProject(project);
                    sessionStorage.setItem('selectedProjectId', project.id.toString());
                }
            }
        }
    };

    // Filter tasks based on current filters
    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            // Text filter
            if (filters.text && !task.title.toLowerCase().includes(filters.text.toLowerCase())) {
                return false;
            }

            // Project filter
            if (filters.project && task.project_id !== parseInt(filters.project)) {
                return false;
            }

            // Sprint filter
            if (filters.sprint && task.sprint_id !== parseInt(filters.sprint)) {
                return false;
            }

            // Priority filter
            if (filters.priority && task.priority !== filters.priority) {
                return false;
            }

            // Assignee filter
            if (filters.assignee && task.assignee_id !== parseInt(filters.assignee)) {
                return false;
            }

            // Status filter
            if (filters.status && task.status !== filters.status) {
                return false;
            }

            // Changed in time filter
            if (filters.changedInTime && filters.changedInTime !== 'all') {
                if (!tasksWithChanges.includes(task.id)) {
                    return false;
                }
            }

            return true;
        });
    }, [tasks, filters, tasksWithChanges]);

    // Group tasks by status
    const columns = useMemo(() => {
        const grouped = {
            todo: [],
            inProgress: [],
            review: [],
            done: []
        };

        filteredTasks.forEach(task => {
            if (grouped[task.status]) {
                grouped[task.status].push(task);
            }
        });

        // Sort tasks by position within each column
        Object.keys(grouped).forEach(status => {
            grouped[status].sort((a, b) => a.position - b.position);
        });

        return grouped;
    }, [filteredTasks]);

    const onDragStart = () => {
        // Optional: Add any logic needed when drag starts
    };

    const onDragEnd = async (result) => {
        if (!result.destination) return;

        const { draggableId, destination } = result;
        const taskId = parseInt(draggableId);
        const newStatus = destination.droppableId;
        const newPosition = destination.index + 1;

        try {
            await updateTaskPosition(taskId, newPosition, newStatus);
        } catch (error) {
            console.error('Failed to update task position:', error);
        }
    };

    const handleTaskClick = (task) => {
        openTaskModal(task);
    };

    const handleDeleteTask = async (taskId) => {
        try {
            await deleteTask(taskId);
        } catch (error) {
            console.error('Error deleting task:', error);
        }
    };

    const getAssigneeName = (assigneeId) => {
        if (!assigneeId) return 'Unassigned';
        const user = users.find(u => u.id === assigneeId);
        if (!user) return 'Unassigned';
        return `${user.firstName} ${user.lastName}`;
    };

    const formatStatus = (status) => {
        switch (status) {
            case 'inProgress':
                return 'In Progress';
            case 'todo':
                return 'To Do';
            case 'review':
                return 'Review';
            case 'done':
                return 'Done';
            default:
                return status.charAt(0).toUpperCase() + status.slice(1);
        }
    };

    // Handler for calendar double click
    const handleSprintDoubleClick = (sprintId) => {
        setFocusedSprintId(sprintId);
        setViewMode('sprint');
    };

    const handleProjectSelect = (project) => {
        setSelectedProject(project);
        // Store the selected project in sessionStorage for persistence
        if (project) {
            sessionStorage.setItem('selectedProjectId', project.id.toString());
        } else {
            sessionStorage.removeItem('selectedProjectId');
        }
    };

    const handleDepartmentSelect = (department) => {
        setSelectedDepartment(department);
        // Store the selected department in sessionStorage for persistence
        if (department) {
            sessionStorage.setItem('selectedDepartmentId', department.id.toString());
        } else {
            sessionStorage.removeItem('selectedDepartmentId');
        }
    };

    const handleProjectsChange = (updatedProjects) => {
        setProjects(updatedProjects);
        if (!selectedProject || !updatedProjects.some(p => p.id === selectedProject.id)) {
            setSelectedProject(updatedProjects[0] || null);
        }
    };

    // Load selected project from sessionStorage on component mount
    useEffect(() => {
        const savedProjectId = sessionStorage.getItem('selectedProjectId');
        if (savedProjectId && projects.length > 0) {
            const project = projects.find(p => p.id === parseInt(savedProjectId));
            if (project) {
                setSelectedProject(project);
            }
        }
    }, [projects]);

    // Load selected department from sessionStorage on component mount
    useEffect(() => {
        const savedDepartmentId = sessionStorage.getItem('selectedDepartmentId');
        if (savedDepartmentId && departments.length > 0) {
            const department = departments.find(d => d.id === parseInt(savedDepartmentId));
            if (department) {
                setSelectedDepartment(department);
            }
        }
    }, [departments]);

    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const sortTasks = (tasks) => {
        return tasks.slice().sort((a, b) => {
            let aValue, bValue;
            
            switch (sortColumn) {
                case 'title':
                    aValue = a.title.toLowerCase();
                    bValue = b.title.toLowerCase();
                    break;
                case 'priority':
                    aValue = priorityOrder[a.priority] || 4;
                    bValue = priorityOrder[b.priority] || 4;
                    break;
                case 'assignee':
                    aValue = getAssigneeName(a.assignee_id).toLowerCase();
                    bValue = getAssigneeName(b.assignee_id).toLowerCase();
                    break;
                case 'status':
                    aValue = formatStatus(a.status).toLowerCase();
                    bValue = formatStatus(b.status).toLowerCase();
                    break;
                default:
                    return 0;
            }
            
            if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    };

    if (loading || projectsLoading || departmentsLoading) {
        return (
            <div className="task-board-loading">
                <div className="loading-spinner"></div>
                <p>Loading tasks...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="task-board-error">
                <p>Error: {error}</p>
                <p>Please try again later.</p>
            </div>
        );
    }

    return (
        <div className="task-board">
            <div className="board-header">
                <div className="board-header-left">
                    <DepartmentSelector
                        departments={departments}
                        selectedDepartment={selectedDepartment}
                        onDepartmentSelect={handleDepartmentSelect}
                    />
                    <ProjectSelector
                        projects={projects}
                        selectedProject={selectedProject}
                        onProjectSelect={handleProjectSelect}
                        onProjectsChange={handleProjectsChange}
                    />
                </div>
                <div className="view-controls">
                    <button 
                        id="view-sprint"
                        className={`view-button ${viewMode === 'sprint' ? 'active' : ''}`}
                        onClick={() => {
                            setViewMode('sprint');
                            setFilters(defaultFilters);
                        }}
                        title="Sprint View"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
                            <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        <span>Sprint</span>
                    </button>
                    <button 
                        id="view-kanban"
                        className={`view-button ${viewMode === 'kanban' ? 'active' : ''}`}
                        onClick={() => {
                            setViewMode('kanban');
                            setFilters(defaultFilters);
                        }}
                        title="Kanban View"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="4" height="16" rx="1"/>
                          <rect x="10" y="4" width="4" height="16" rx="1"/>
                          <rect x="17" y="4" width="4" height="16" rx="1"/>
                        </svg>
                        Kanban
                    </button>
                    <button 
                        id="view-list"
                        className={`view-button ${viewMode === 'list' ? 'active' : ''}`}
                        onClick={() => {
                            setViewMode('list');
                            setFilters(defaultFilters);
                        }}
                        title="List View"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M4 6H20V8H4V6Z" fill="currentColor"/>
                            <path d="M4 10H20V12H4V10Z" fill="currentColor"/>
                            <path d="M4 14H20V16H4V14Z" fill="currentColor"/>
                        </svg>
                        <span>List</span>
                    </button>
                    <button 
                        id="view-diagram"
                        className={`view-button ${viewMode === 'diagram' ? 'active' : ''}`}
                        onClick={() => {
                            setViewMode('diagram');
                            setFilters(defaultFilters);
                        }}
                        title="Diagram View"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="currentColor"/>
                            <path d="M12 2v10l8-4c0-3.31-2.69-6-6-6z" fill="currentColor"/>
                        </svg>
                        <span>Diagram</span>
                    </button>
                    <button 
                        id="view-burndown"
                        className={`view-button ${viewMode === 'burndown' ? 'active' : ''}`}
                        onClick={() => {
                            setViewMode('burndown');
                            setFilters(defaultFilters);
                        }}
                        title="Burn Down View"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 17C4 13 8 11 12 7V3C16 7 20 11 20 17C20 20 17 21 12 21C7 21 4 20 4 17Z"/>
                          <polyline points="8 17 12 13 16 17"/>
                        </svg>
                        Burn Down
                    </button>
                    <button
                        id="view-calendar"
                        className={`view-button ${viewMode === 'calendar' ? 'active' : ''}`}
                        onClick={() => {
                            setViewMode('calendar');
                            setFilters(defaultFilters);
                        }}
                        title="Calendar View"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="3" y="4" width="18" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="2"/>
                            <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        <span>Calendar</span>
                    </button>
                </div>
            </div>

            {/* Show message if no project is selected */}
            {!selectedProject && (
                <div className="no-project-message">
                    <p>Please select a project to view tasks.</p>
                </div>
            )}

            {selectedProject && viewMode !== 'sprint' && viewMode !== 'calendar' && (
                <TaskFilters 
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    activeSprintId={selectedSprint}
                    selectedProject={selectedProject}
                    user={user}
                />
            )}

            {selectedProject && viewMode === 'sprint' ? (
                <SprintView focusedSprintId={focusedSprintId} user={user} />
            ) : selectedProject && viewMode === 'kanban' ? (
                <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
                    <div className="board-columns">
                        <TaskColumn
                            title="To Do"
                            tasks={columns.todo}
                            status="todo"
                            onTaskClick={handleTaskClick}
                        />
                        <TaskColumn
                            title="In Progress"
                            tasks={columns.inProgress}
                            status="inProgress"
                            onTaskClick={handleTaskClick}
                        />
                        <TaskColumn
                            title="Review"
                            tasks={columns.review}
                            status="review"
                            onTaskClick={handleTaskClick}
                        />
                        <TaskColumn
                            title="Done"
                            tasks={columns.done}
                            status="done"
                            onTaskClick={handleTaskClick}
                        />
                    </div>
                </DragDropContext>
            ) : selectedProject && viewMode === 'list' ? (
                <div className="list-view" style={{ 
                    width: '100%',
                    maxWidth: '1320px',
                    margin: '0 auto',
                    padding: '0'
                }}>
                    <table style={{ width: '100%' }}>
                        <thead>
                            <tr>
                                <th 
                                    className="sortable-header"
                                    onClick={() => handleSort('title')}
                                >
                                    Title
                                    {sortColumn === 'title' && (
                                        <span 
                                            className="sort-indicator"
                                            data-direction={sortDirection}
                                        />
                                    )}
                                </th>
                                <th 
                                    className="sortable-header"
                                    onClick={() => handleSort('priority')}
                                >
                                    Priority
                                    {sortColumn === 'priority' && (
                                        <span 
                                            className="sort-indicator"
                                            data-direction={sortDirection}
                                        />
                                    )}
                                </th>
                                <th 
                                    className="sortable-header"
                                    onClick={() => handleSort('assignee')}
                                >
                                    Assignee
                                    {sortColumn === 'assignee' && (
                                        <span 
                                            className="sort-indicator"
                                            data-direction={sortDirection}
                                        />
                                    )}
                                </th>
                                <th 
                                    className="sortable-header"
                                    onClick={() => handleSort('status')}
                                >
                                    Status
                                    {sortColumn === 'status' && (
                                        <span 
                                            className="sort-indicator"
                                            data-direction={sortDirection}
                                        />
                                    )}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortTasks(filteredTasks).map(task => (
                                <tr key={task.id} onClick={() => handleTaskClick(task)}>
                                    <td>{task.title}</td>
                                    <td>
                                        <span className={`priority-badge priority-${task.priority}`}>
                                            {task.priority}
                                        </span>
                                    </td>
                                    <td>
                                        {task.assignee_id ? (
                                            <span>{getAssigneeName(task.assignee_id)}</span>
                                        ) : (
                                            <span className="unassigned">Unassigned</span>
                                        )}
                                    </td>
                                    <td>
                                        <span className={`status-badge status-${task.status}`}>
                                            {formatStatus(task.status)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : selectedProject && viewMode === 'diagram' ? (
                <div className="diagram-view">
                    <div className="charts-grid">
                        {/* Priority Distribution Chart */}
                        <div className="chart-container">
                            <h3>Priority Distribution</h3>
                            <div className="chart-wrapper">
                                <Pie
                                    data={{
                                        labels: ['High', 'Medium', 'Low'],
                                        datasets: [{
                                            data: [
                                                filteredTasks.filter(task => task.priority === 'high').length,
                                                filteredTasks.filter(task => task.priority === 'medium').length,
                                                filteredTasks.filter(task => task.priority === 'low').length
                                            ],
                                            backgroundColor: [
                                                '#ef4444', // Red for High
                                                '#f59e0b', // Amber for Medium
                                                '#10b981'  // Green for Low
                                            ],
                                            borderWidth: 0
                                        }]
                                    }}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: {
                                            legend: {
                                                position: 'bottom',
                                                labels: {
                                                    usePointStyle: true,
                                                    padding: 15,
                                                    font: { size: 11 }
                                                }
                                            },
                                            tooltip: {
                                                callbacks: {
                                                    label: function(context) {
                                                        const label = context.label || '';
                                                        const value = context.parsed;
                                                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                                                        return `${label}: ${value} (${percentage}%)`;
                                                    }
                                                }
                                            }
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        {/* Status Distribution Chart */}
                    <div className="chart-container">
                            <h3>Status Distribution</h3>
                        <div className="chart-wrapper">
                            <Pie
                                data={{
                                    labels: ['To Do', 'In Progress', 'Review', 'Done'],
                                    datasets: [{
                                        data: [
                                            columns.todo.length,
                                            columns.inProgress.length,
                                            columns.review.length,
                                            columns.done.length
                                        ],
                                        backgroundColor: [
                                            '#3b82f6', // Blue for To Do
                                            '#f59e0b', // Amber for In Progress
                                            '#8b5cf6', // Purple for Review
                                            '#10b981'  // Green for Done
                                        ],
                                        borderWidth: 0
                                    }]
                                }}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                        legend: {
                                            position: 'bottom',
                                            labels: {
                                                usePointStyle: true,
                                                    padding: 15,
                                                    font: { size: 11 }
                                                }
                                            },
                                            tooltip: {
                                                callbacks: {
                                                    label: function(context) {
                                                        const label = context.label || '';
                                                        const value = context.parsed;
                                                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                                                        return `${label}: ${value} (${percentage}%)`;
                                                    }
                                                }
                                            }
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        {/* Assignment Distribution Chart */}
                        <div className="chart-container">
                            <h3>Assignment Distribution</h3>
                            <div className="chart-wrapper">
                                <Pie
                                    data={{
                                        labels: ['Assigned', 'Unassigned'],
                                        datasets: [{
                                            data: [
                                                filteredTasks.filter(task => task.assignee_id).length,
                                                filteredTasks.filter(task => !task.assignee_id).length
                                            ],
                                            backgroundColor: [
                                                '#8b5cf6', // Purple for Assigned
                                                '#6b7280'  // Gray for Unassigned
                                            ],
                                            borderWidth: 0
                                        }]
                                    }}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: {
                                            legend: {
                                                position: 'bottom',
                                                labels: {
                                                    usePointStyle: true,
                                                    padding: 15,
                                                    font: { size: 11 }
                                            }
                                        },
                                        tooltip: {
                                            callbacks: {
                                                label: function(context) {
                                                    const label = context.label || '';
                                                    const value = context.parsed;
                                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                                                    return `${label}: ${value} (${percentage}%)`;
                                                }
                                            }
                                        }
                                    }
                                }}
                            />
                            </div>
                        </div>
                    </div>
                </div>
            ) : selectedProject && viewMode === 'burndown' ? (
                <BurndownChart 
                    sprintId={selectedSprint} 
                    filters={filters}
                    selectedProject={selectedProject}
                />
            ) : selectedProject && viewMode === 'calendar' ? (
                <CalendarView onSprintDoubleClick={handleSprintDoubleClick} user={user} />
            ) : null}

            <TaskModal
                isOpen={isModalOpen}
                onClose={closeTaskModal}
                task={selectedTask}
                onUpdate={updateTask}
                onDelete={handleDeleteTask}
                users={users}
                selectedProjectId={selectedProject ? selectedProject.id : null}
                activeSprintId={selectedSprint}
                projects={projects}
            />
        </div>
    );
};

TaskBoard.propTypes = {
    viewMode: PropTypes.string.isRequired,
    setViewMode: PropTypes.func.isRequired,
    user: PropTypes.object.isRequired
};

export default TaskBoard;