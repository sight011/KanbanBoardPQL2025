import { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { DragDropContext } from '@hello-pangea/dnd';
import TaskColumn from './TaskColumn';
import TaskFilters from './TaskFilters';
import TaskModal from './TaskModal';
import ProjectSelector from './ProjectSelector';
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

const TaskBoard = ({ viewMode, setViewMode }) => {
    const { tasks, updateTaskPosition, loading, error, openTaskModal, updateTask, fetchTasks, selectedTask, isModalOpen, closeTaskModal } = useTaskContext();
    const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains('dark-mode'));
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [filters, setFilters] = useState({
        text: '',
        sprint: '',
        changedInTime: '',
        priority: '',
        assignee: '',
        status: ''
    });
    const [sprints, setSprints] = useState([]);
    const [selectedSprint, setSelectedSprint] = useState('');
    const [users, setUsers] = useState([]);
    const [tasksWithChanges, setTasksWithChanges] = useState([]);
    const [focusedSprintId, setFocusedSprintId] = useState(null);

    // Fetch tasks when project changes
    useEffect(() => {
        if (selectedProjectId) {
            fetchTasks(selectedProjectId);
        }
    }, [selectedProjectId, fetchTasks]);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await api.get('/api/users');
                const data = response.data;
                if (data.users) {
                    // Create a map of user IDs to user data for faster lookup
                    const usersMap = data.users.reduce((acc, user) => {
                        acc[user.id] = user;
                        return acc;
                    }, {});
                    setUsers(usersMap);
                }
            } catch (err) {
                console.error('Error fetching users:', err);
                setUsers({});
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

    // Add effect to handle theme changes
    useEffect(() => {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    setIsDarkMode(document.documentElement.classList.contains('dark-mode'));
                }
            });
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        });

        return () => observer.disconnect();
    }, []);

    // Fetch sprints for the filter
    useEffect(() => {
        const fetchSprints = async () => {
            try {
                const res = await api.get('/api/sprints');
                const data = res.data;
                const newSprints = data.sprints || [];
                setSprints(newSprints);
                // Only set default to active sprint on initial load
                if (sprints.length === 0) {
                    const active = newSprints.find(s => s.status === 'active');
                    setSelectedSprint(active ? String(active.id) : '');
                    setFilters(prev => ({
                        ...prev,
                        sprint: active ? String(active.id) : ''
                    }));
                } else {
                    // Check if active sprint has changed
                    const currentActive = sprints.find(s => s.status === 'active');
                    const newActive = newSprints.find(s => s.status === 'active');
                    if (currentActive?.id !== newActive?.id) {
                        setSelectedSprint(newActive ? String(newActive.id) : '');
                        setFilters(prev => ({
                            ...prev,
                            sprint: newActive ? String(newActive.id) : ''
                        }));
                    }
                }
            } catch (err) {
                setSprints([]);
            }
        };
        fetchSprints();
        // Poll for active sprint changes every 10 seconds
        const interval = setInterval(fetchSprints, 10000); // 10 seconds
        return () => clearInterval(interval);
    }, [sprints.length]);

    const handleFilterChange = (filterType, value) => {
        setFilters(prev => ({
            ...prev,
            [filterType]: value
        }));
    };

    // Filter tasks based on current filters
    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            // Text filter
            if (filters.text && !task.title.toLowerCase().includes(filters.text.toLowerCase()) && 
                !task.description?.toLowerCase().includes(filters.text.toLowerCase())) {
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
            if (filters.changedInTime && filters.changedInTime !== 'all' && !tasksWithChanges.includes(task.id)) {
                return false;
            }
            
            return true;
        });
    }, [tasks, filters, tasksWithChanges]);

    // Group tasks by status
    const columns = useMemo(() => {
        return {
            todo: filteredTasks.filter(task => task.status === 'todo'),
            inProgress: filteredTasks.filter(task => task.status === 'inProgress'),
            review: filteredTasks.filter(task => task.status === 'review'),
            done: filteredTasks.filter(task => task.status === 'done')
        };
    }, [filteredTasks]);

    const onDragStart = () => {
        console.log('Drag started');
    };

    const onDragEnd = async (result) => {
        if (!result.destination) return;

        const { source, destination, draggableId } = result;
        
        if (source.droppableId === destination.droppableId && 
            source.index === destination.index) {
            return;
        }

        const newStatus = destination.droppableId;
        const newPosition = destination.index + 1;

        try {
            await updateTaskPosition(parseInt(draggableId), newPosition, newStatus);
        } catch (error) {
            console.error('Failed to update task position:', error);
        }
    };

    const handleTaskClick = (task) => {
        openTaskModal(task);
    };

    const handleDeleteTask = (taskId) => {
        // This will be handled by the TaskModal component
        console.log('Delete task:', taskId);
    };

    const getAssigneeInitials = (assigneeId) => {
        if (!assigneeId || !users[assigneeId]) return '?';
        const user = users[assigneeId];
        return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase();
    };

    const getAssigneeColor = (assigneeId) => {
        if (!assigneeId || !users[assigneeId]) return '#e2e8f0';
        
        // Generate a consistent color based on user ID
        const colors = [
            '#3182ce', '#38a169', '#d69e2e', '#e53e3e', '#805ad5',
            '#dd6b20', '#319795', '#2b6cb0', '#38a169', '#d69e2e'
        ];
        return colors[assigneeId % colors.length];
    };

    const getAssigneeName = (assigneeId) => {
        if (!assigneeId || !users[assigneeId]) return 'Unassigned';
        const user = users[assigneeId];
        return `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown User';
    };

    // Prepare data for pie charts
    const priorityData = useMemo(() => {
        const counts = filteredTasks.reduce((acc, task) => {
            acc[task.priority] = (acc[task.priority] || 0) + 1;
            return acc;
        }, {});

        return {
            labels: ['High', 'Medium', 'Low'],
            datasets: [{
                data: [counts.high || 0, counts.medium || 0, counts.low || 0],
                backgroundColor: ['#ff5630', '#ffab00', '#00b8d9'],
                borderColor: ['#ff5630', '#ffab00', '#00b8d9'],
                borderWidth: 1
            }]
        };
    }, [filteredTasks]);

    const statusData = useMemo(() => {
        const counts = filteredTasks.reduce((acc, task) => {
            acc[task.status] = (acc[task.status] || 0) + 1;
            return acc;
        }, {});

        return {
            labels: ['To Do', 'In Progress', 'Review', 'Done'],
            datasets: [{
                data: [
                    counts.todo || 0,
                    counts.inProgress || 0,
                    counts.review || 0,
                    counts.done || 0
                ],
                backgroundColor: ['#4a5568', '#3182ce', '#805ad5', '#38a169'],
                borderColor: ['#4a5568', '#3182ce', '#805ad5', '#38a169'],
                borderWidth: 1
            }]
        };
    }, [filteredTasks]);

    const assignmentData = useMemo(() => {
        if (!filteredTasks || filteredTasks.length === 0) {
            return {
                labels: ['No Tasks'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['#e2e8f0'],
                    borderWidth: 0
                }]
            };
        }

        // Group tasks by assignee_id
        const assignments = filteredTasks.reduce((acc, task) => {
            const assigneeId = task.assignee_id;
            const key = assigneeId || 'unassigned';
            
            if (!acc[key]) {
                acc[key] = {
                    name: getAssigneeName(assigneeId),
                    count: 0,
                    color: assigneeId ? getAssigneeColor(assigneeId) : '#e2e8f0'
                };
            }
            acc[key].count += 1;
            return acc;
        }, {});

        // Sort by task count and convert to arrays for chart
        const sortedAssignees = Object.entries(assignments)
            .sort(([, a], [, b]) => b.count - a.count);

        return {
            labels: sortedAssignees.map(([, data]) => data.name),
            datasets: [{
                data: sortedAssignees.map(([, data]) => data.count),
                backgroundColor: sortedAssignees.map(([, data]) => data.color),
                borderWidth: 0,
                hoverOffset: 4
            }]
        };
    }, [filteredTasks, users]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    color: isDarkMode ? '#e2e8f0' : '#2d3748',
                    font: {
                        size: 12,
                        weight: '500'
                    },
                    padding: 15,
                    usePointStyle: true,
                    pointStyle: 'circle',
                    boxWidth: 8,
                    boxHeight: 8
                }
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const label = context.label || '';
                        const value = context.raw || 0;
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${label}: ${value} (${percentage}%)`;
                    }
                },
                titleColor: isDarkMode ? '#e2e8f0' : '#2d3748',
                bodyColor: isDarkMode ? '#e2e8f0' : '#2d3748',
                backgroundColor: isDarkMode ? '#2d3748' : '#ffffff',
                borderColor: isDarkMode ? '#4a5568' : '#e2e8f0',
                borderWidth: 1
            }
        },
        elements: {
            arc: {
                borderWidth: 0
            }
        },
        cutout: '0%',
        layout: {
            padding: {
                top: 20,
                bottom: 60
            }
        }
    };

    // Effect to set root width for all views
    useEffect(() => {
        const root = document.getElementById('root');
        root.style.width = '1426px';
        return () => {
            root.style.width = '';
        };
    }, []);

    // Handler for calendar double click
    const handleSprintDoubleClick = (sprintId) => {
        setFocusedSprintId(sprintId);
        setViewMode('sprint');
    };

    const handleProjectChange = (projectId) => {
        setSelectedProjectId(projectId);
        // Store the selected project in sessionStorage for persistence
        if (projectId) {
            sessionStorage.setItem('selectedProjectId', projectId.toString());
        } else {
            sessionStorage.removeItem('selectedProjectId');
        }
    };

    // Load selected project from sessionStorage on component mount
    useEffect(() => {
        const savedProjectId = sessionStorage.getItem('selectedProjectId');
        if (savedProjectId) {
            setSelectedProjectId(parseInt(savedProjectId));
        }
    }, []);

    if (loading) {
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
                    <h2>Task Board</h2>
                    <ProjectSelector
                        selectedProjectId={selectedProjectId}
                        onProjectChange={handleProjectChange}
                    />
                </div>
                <div className="view-controls">
                    <button 
                        className={`view-button ${viewMode === 'sprint' ? 'active' : ''}`}
                        onClick={() => setViewMode('sprint')}
                        title="Sprint View"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
                            <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        <span>Sprint</span>
                    </button>
                    <button 
                        className={`view-button ${viewMode === 'kanban' ? 'active' : ''}`}
                        onClick={() => setViewMode('kanban')}
                        title="Kanban View"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M4 6H20V8H4V6Z" fill="currentColor"/>
                            <path d="M4 10H20V12H4V10Z" fill="currentColor"/>
                            <path d="M4 14H20V16H4V14Z" fill="currentColor"/>
                        </svg>
                        <span>Kanban</span>
                    </button>
                    <button 
                        className={`view-button ${viewMode === 'list' ? 'active' : ''}`}
                        onClick={() => setViewMode('list')}
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
                        className={`view-button ${viewMode === 'diagram' ? 'active' : ''}`}
                        onClick={() => setViewMode('diagram')}
                        title="Diagram View"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="currentColor"/>
                            <path d="M12 2v10l8-4c0-3.31-2.69-6-6-6z" fill="currentColor"/>
                        </svg>
                        <span>Diagram</span>
                    </button>
                    <button
                        className={`view-button ${viewMode === 'burndown' ? 'active' : ''}`}
                        onClick={() => setViewMode('burndown')}
                        title="Burn Down View"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M4 20h16v-2H4v2zm0-4h10v-2H4v2zm0-4h7V6h3l-4-4-4 4h3v6z" fill="currentColor"/>
                        </svg>
                        <span>Burn Down</span>
                    </button>
                    <button
                        className={`view-button ${viewMode === 'calendar' ? 'active' : ''}`}
                        onClick={() => setViewMode('calendar')}
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
            {!selectedProjectId && (
                <div className="no-project-message">
                    <p>Please select a project to view tasks.</p>
                </div>
            )}

            {selectedProjectId && viewMode !== 'sprint' && viewMode !== 'calendar' && (
                <TaskFilters 
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    activeSprintId={selectedSprint}
                />
            )}

            {selectedProjectId && viewMode === 'sprint' ? (
                <SprintView focusedSprintId={focusedSprintId} />
            ) : selectedProjectId && viewMode === 'kanban' ? (
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
            ) : selectedProjectId && viewMode === 'list' ? (
                <div className="list-view" style={{ 
                    width: '100%',
                    maxWidth: '1320px',
                    margin: '0 auto',
                    padding: '0'
                }}>
                    <table style={{ width: '100%' }}>
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Priority</th>
                                <th>Assignee</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTasks.map(task => (
                                <tr key={task.id} onClick={() => handleTaskClick(task)}>
                                    <td>{task.title}</td>
                                    <td>
                                        <span className={`priority-badge priority-${task.priority}`}>
                                            {task.priority}
                                        </span>
                                    </td>
                                    <td>
                                        {task.assignee_id ? (
                                            <div className="assignee-bubble" style={{ backgroundColor: getAssigneeColor(task.assignee_id) }}>
                                                {getAssigneeInitials(task.assignee_id)}
                                            </div>
                                        ) : (
                                            <div className="assignee-bubble unassigned">UA</div>
                                        )}
                                    </td>
                                    <td className="status-cell">
                                        <span className={`status-badge status-${task.status.toLowerCase()}`}>
                                            {task.status === 'inProgress' ? 'In Progress' : task.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : selectedProjectId && viewMode === 'diagram' ? (
                <div className="diagram-view chart-container">
                    <div className="chart-wrapper">
                        <h3>Priority Distribution</h3>
                        <Pie data={priorityData} options={chartOptions} />
                    </div>
                    <div className="chart-wrapper">
                        <h3>Status Distribution</h3>
                        <Pie data={statusData} options={chartOptions} />
                    </div>
                    <div className="chart-wrapper">
                        <h3>Assignment Distribution</h3>
                        <Pie data={assignmentData} options={chartOptions} />
                    </div>
                </div>
            ) : selectedProjectId && viewMode === 'burndown' ? (
                <div className="burndown-view">
                    <BurndownChart sprintId={selectedSprint} filters={filters} />
                </div>
            ) : selectedProjectId && viewMode === 'calendar' ? (
                <CalendarView onSprintDoubleClick={handleSprintDoubleClick} />
            ) : null}

            <TaskModal
                isOpen={isModalOpen}
                onClose={closeTaskModal}
                task={selectedTask}
                onUpdate={updateTask}
                onDelete={handleDeleteTask}
                users={users}
                sprints={sprints}
                selectedProjectId={selectedProjectId}
            />
        </div>
    );
};

TaskBoard.propTypes = {
  viewMode: PropTypes.string.isRequired,
  setViewMode: PropTypes.func.isRequired,
};

export default TaskBoard;