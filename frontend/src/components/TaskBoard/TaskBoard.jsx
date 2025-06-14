import React, { useState, useEffect, useMemo } from 'react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import TaskColumn from './TaskColumn';
import TaskFilters from './TaskFilters';
import { useTaskContext } from '../../context/TaskContext';
import TaskModal from './TaskModal';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import './TaskBoard.css';
import SprintView from './SprintView';
import BurndownChart from './BurndownChart';

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

const TaskBoard = () => {
    const { tasks, updateTaskPosition, loading, error, updateTaskStatus, openTaskModal, isModalOpen, updateTask } = useTaskContext();
    const [viewMode, setViewMode] = useState('sprint'); // 'sprint', 'kanban', 'list', or 'diagram'
    const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains('dark-mode'));
    const [filters, setFilters] = useState({
        text: '',
        sprint: '',
        priority: '',
        assignee: '',
        status: ''
    });
    const [sprints, setSprints] = useState([]);
    const [selectedSprint, setSelectedSprint] = useState('');
    const [users, setUsers] = useState([]);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await fetch('/api/users');
                const data = await res.json();
                setUsers(data.users || []);
            } catch (err) {
                console.error('Error fetching users:', err);
                setUsers([]);
            }
        };
        fetchUsers();
    }, []);

    // Define userMap at component level
    const userMap = {
        1: 'John Doe',
        2: 'Jane Smith',
        3: 'Bob Johnson'
    };

    // Add toggleTheme function
    const toggleTheme = () => {
        document.documentElement.classList.toggle('dark-mode');
        setIsDarkMode(prev => !prev);
    };

    // Add toggleViewMode function
    const toggleViewMode = () => {
        setViewMode(prevMode => {
            switch (prevMode) {
                case 'kanban':
                    return 'list';
                case 'list':
                    return 'diagram';
                case 'diagram':
                    return 'kanban';
                default:
                    return 'kanban';
            }
        });
    };

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
                const res = await fetch('/api/sprints');
                const data = await res.json();
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
        // Poll for active sprint changes every 2 seconds
        const interval = setInterval(fetchSprints, 2000);
        return () => clearInterval(interval);
    }, []);

    // Use useMemo to efficiently filter tasks
    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            const matchesText = task.title.toLowerCase().includes(filters.text.toLowerCase()) ||
                              task.description.toLowerCase().includes(filters.text.toLowerCase());
            const matchesPriority = !filters.priority || task.priority === filters.priority;
            const matchesAssignee = !filters.assignee || task.assignee_id === parseInt(filters.assignee);
            const matchesSprint = !filters.sprint || String(task.sprint_id) === filters.sprint;
            const matchesStatus = !filters.status || task.status === filters.status;
            return matchesText && matchesPriority && matchesAssignee && matchesSprint && matchesStatus;
        });
    }, [tasks, filters]);

    // Add handleClearFilters function
    const handleClearFilters = () => {
        // Reset sprint filter to active sprint only if a different sprint is selected
        const active = sprints.find(s => s.status === 'active');
        setFilters(prev => ({
            text: '',
            sprint: prev.sprint === (active ? String(active.id) : '') ? prev.sprint : (active ? String(active.id) : ''),
            priority: '',
            assignee: '',
            status: ''
        }));
    };

    const handleFilterChange = (filterType, value) => {
        setFilters(prev => ({
            ...prev,
            [filterType]: value
        }));
    };

    // Organize filtered tasks into columns
    const columns = useMemo(() => {
        const organizedTasks = {
            todo: [],
            inProgress: [],
            review: [],
            done: []
        };

        filteredTasks.forEach(task => {
            if (organizedTasks[task.status]) {
                organizedTasks[task.status].push(task);
            }
        });

        // Sort tasks by position within each column
        Object.keys(organizedTasks).forEach(status => {
            organizedTasks[status].sort((a, b) => a.position - b.position);
        });

        return organizedTasks;
    }, [filteredTasks]);

    const sortedTasks = useMemo(() => {
        if (viewMode === 'list') {
            return [...filteredTasks].sort((a, b) => {
                const priorityOrder = { high: 3, medium: 2, low: 1 };
                return priorityOrder[b.priority] - priorityOrder[a.priority];
            });
        }
        return filteredTasks;
    }, [filteredTasks, viewMode]);

    const onDragStart = () => {
        // Add a class to the body when drag starts
        document.body.classList.add('dragging');
    };

    const onDragEnd = async (result) => {
        // Remove the dragging class from body
        document.body.classList.remove('dragging');

        const { source, destination, draggableId } = result;

        // Dropped outside a valid destination
        if (!destination) return;

        // Dropped in the same position
        if (
            source.droppableId === destination.droppableId &&
            source.index === destination.index
        ) return;

        const taskId = parseInt(draggableId);
        const newStatus = destination.droppableId;
        const newPosition = destination.index + 1;

        try {
            await updateTaskPosition(taskId, newPosition, newStatus);
            // If moved to 'done', set completed_at
            if (newStatus === 'done') {
                await updateTask(taskId, { status: 'done', completed_at: new Date().toISOString() });
            } else if (source.droppableId === 'done') {
                // If moved out of 'done', clear completed_at
                await updateTask(taskId, { status: newStatus, completed_at: null });
            }
        } catch (error) {
            console.error('Error updating task position:', error);
        }
    };

    const handleTaskClick = (task) => {
        openTaskModal(task);
    };

    const handleCloseModal = () => {
        // Implement the logic to close the modal
        console.log('Closing modal');
    };

    const handleUpdateTask = (updatedTask) => {
        // Implement the logic to update the task
        console.log('Updating task:', updatedTask);
        handleCloseModal();
    };

    const handleDeleteTask = (taskId) => {
        // Implement the logic to delete the task
        console.log('Deleting task with id:', taskId);
        handleCloseModal();
    };

    const getAssigneeInitials = (assigneeId) => {
        if (!assigneeId) return 'UA';
        
        const user = users.find(u => u.id === assigneeId);
        if (!user) return '?';
        
        return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    };

    const getAssigneeColor = (assigneeId) => {
        const colors = [
            '#0052cc', // Blue
            '#36b37e', // Green
            '#ff5630', // Red
            '#ffab00', // Yellow
            '#6554c0', // Purple
            '#00b8d9', // Cyan
            '#ff7452', // Orange
            '#8777d9', // Lavender
            '#57d9a3', // Mint
            '#00a3bf'  // Teal
        ];
        return colors[(assigneeId - 1) % colors.length];
    };

    const assignmentData = useMemo(() => {
        const assignments = tasks.reduce((acc, task) => {
            const assignee = task.assignee_name || 'Unassigned';
            acc[assignee] = (acc[assignee] || 0) + 1;
            return acc;
        }, {});

        return {
            labels: Object.keys(assignments),
            datasets: [{
                data: Object.values(assignments),
                backgroundColor: [
                    '#8884d8',
                    '#82ca9d',
                    '#ffc658',
                    '#ff8042',
                    '#0088fe',
                    '#00c49f',
                    '#ffbb28',
                    '#ff8042',
                    '#a4de6c',
                    '#d0ed57'
                ],
                borderWidth: 0,
                hoverOffset: 4
            }]
        };
    }, [tasks]);

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

    const assigneeData = useMemo(() => {
        const counts = filteredTasks.reduce((acc, task) => {
            const assigneeId = task.assignee_id;
            const assignee = assigneeId ? 
                users.find(u => u.id === assigneeId)?.firstName + ' ' + users.find(u => u.id === assigneeId)?.lastName : 
                'Unassigned';
            acc[assignee] = (acc[assignee] || 0) + 1;
            return acc;
        }, {});

        return {
            labels: Object.keys(counts),
            datasets: [{
                data: Object.values(counts),
                backgroundColor: Object.keys(counts).map((assignee) => {
                    if (assignee === 'Unassigned') return '#e0e0e0';
                    const userId = users.find(u => `${u.firstName} ${u.lastName}` === assignee)?.id;
                    return userId ? getAssigneeColor(userId) : '#e0e0e0';
                }),
                borderColor: Object.keys(counts).map((assignee) => {
                    if (assignee === 'Unassigned') return '#e0e0e0';
                    const userId = users.find(u => `${u.firstName} ${u.lastName}` === assignee)?.id;
                    return userId ? getAssigneeColor(userId) : '#e0e0e0';
                }),
                borderWidth: 1
            }]
        };
    }, [filteredTasks, users]);

    // Effect to set root width for all views
    useEffect(() => {
        const root = document.getElementById('root');
        root.style.width = '1426px';
        return () => {
            root.style.width = '';
        };
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
                <h2>Task Board</h2>
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
                </div>
            </div>

            {viewMode !== 'sprint' && (
                <TaskFilters 
                    filters={filters}
                    onFilterChange={handleFilterChange}
                />
            )}

            {viewMode === 'sprint' ? (
                <SprintView />
            ) : viewMode === 'kanban' ? (
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
            ) : viewMode === 'list' ? (
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
                            {sortedTasks.map(task => (
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
            ) : viewMode === 'diagram' ? (
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
            ) : (
                <div className="burndown-view">
                    <BurndownChart sprintId={selectedSprint} filters={filters} />
                </div>
            )}
        </div>
    );
};

export default TaskBoard;