import { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import api from '../../api/axios';
import './BurndownChart.css';
import { useContext } from 'react';
import { TaskContext } from '../../context/TaskContext';

const BurndownChart = ({ sprintId, filters, selectedProject }) => {
    const { tasks } = useContext(TaskContext) || {};
    const [burndownData, setBurndownData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isDarkMode] = useState(false);

    // Find the current active sprint for the selected project
    const currentSprint = useMemo(() => {
        if (!sprintId) return null;
        // For now, use the sprintId prop directly
        return { id: sprintId };
    }, [sprintId]);

    // Filter tasks for the current sprint and selected project
    const sprintTasks = useMemo(() => {
        if (!tasks || !currentSprint || !selectedProject) return [];
        return tasks.filter(t => 
            Number(t.sprint_id) === Number(currentSprint.id) && 
            Number(t.project_id) === Number(selectedProject.id)
        );
    }, [tasks, currentSprint, selectedProject]);

    // Count tickets with and without effort estimation
    const ticketsWithEE = sprintTasks.filter(
        t => t.effort !== null && t.effort !== '' && Number(t.effort) > 0
    ).length;
    const ticketsWithoutEE = sprintTasks.filter(
        t => t.effort === null || t.effort === '' || Number(t.effort) === 0
    ).length;

    // Memoize the query parameters to prevent unnecessary re-renders
    const queryParams = useMemo(() => {
        const params = new URLSearchParams();
        if (filters) {
            if (filters.priority) params.append('priority', filters.priority);
            if (filters.assignee) params.append('assignee', filters.assignee);
        }
        return params.toString();
    }, [filters]);

    useEffect(() => {
        const fetchBurndownData = async () => {
            try {
                setLoading(true);
                const response = await api.get(`/api/sprints/${sprintId}/burndown?${queryParams}`);
                const data = await response.data;
                if (data.success) {
                    setBurndownData(data);
                } else {
                    setError(data.error);
                }
            } catch (err) {
                setError('Failed to fetch burndown data');
            } finally {
                setLoading(false);
            }
        };

        if (sprintId) {
            fetchBurndownData();
        }
    }, [sprintId, queryParams]);

    useEffect(() => {
        const observer = new MutationObserver(() => {
            setIsDarkMode(
                document.documentElement.classList.contains('dark-mode') ||
                document.body.classList.contains('dark-mode')
            );
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    // Memoize the chart data to prevent unnecessary re-renders
    const chartData = useMemo(() => {
        if (!burndownData) return null;
        return burndownData.burndownData;
    }, [burndownData]);

    if (!sprintId) {
        return <div className={`burndown-no-data${isDarkMode ? ' dark' : ''}`}>Please select a sprint to view the burndown chart</div>;
    }

    if (loading) {
        return <div className={`burndown-loading${isDarkMode ? ' dark' : ''}`}>Loading burndown data...</div>;
    }

    if (error) {
        return <div className={`burndown-error${isDarkMode ? ' dark' : ''}`}>Error: {error}</div>;
    }

    if (!burndownData) {
        return <div className={`burndown-no-data${isDarkMode ? ' dark' : ''}`}>No burndown data available</div>;
    }

    const { sprint } = burndownData;

    return (
        <div className={`burndown-chart-container${isDarkMode ? ' dark' : ''}`} style={{ position: 'relative' }}>
            <div className="sprint-effort-sum" style={{ position: 'absolute', top: 16, right: 24, zIndex: 2 }}>
                Tickets with and without EE: {ticketsWithEE}/{ticketsWithoutEE}
            </div>
            <h3>{sprint.name} Burndown Chart</h3>
            <div className={`burndown-info${isDarkMode ? ' dark' : ''}`}>
                <p>Start Date: {new Date(sprint.start_date).toLocaleDateString()}</p>
                <p>End Date: {new Date(sprint.end_date).toLocaleDateString()}</p>
                <p>Total Points: {sprint.totalPoints}</p>
            </div>
            <div className="burndown-chart">
                <ResponsiveContainer width="100%" height={400}>
                    <LineChart
                        data={chartData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                        className={isDarkMode ? 'dark' : ''}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#ffffff' : '#0e64d5'} opacity={isDarkMode ? 0.1 : 0.2} />
                        <XAxis
                            dataKey="date"
                            tickFormatter={date => new Date(date).toLocaleDateString()}
                            stroke={isDarkMode ? '#ffffff' : '#0e64d5'}
                            tick={{ fill: isDarkMode ? '#ffffff' : '#0e64d5' }}
                        />
                        <YAxis
                            stroke={isDarkMode ? '#ffffff' : '#0e64d5'}
                            tick={{ fill: isDarkMode ? '#ffffff' : '#0e64d5' }}
                        />
                        <Tooltip
                            labelFormatter={date => new Date(date).toLocaleDateString()}
                            formatter={(value, name) => [value, name === 'remainingPoints' ? 'Remaining Points' : 'Ideal Burndown']}
                            contentStyle={{
                                backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
                                borderColor: isDarkMode ? '#ffffff' : '#0e64d5',
                                color: isDarkMode ? '#ffffff' : '#0e64d5',
                                fontSize: '12px',
                                fontWeight: 500
                            }}
                        />
                        <Legend
                            wrapperStyle={{
                                color: isDarkMode ? '#ffffff' : '#0e64d5',
                                fontSize: '12px',
                                fontWeight: 500
                            }}
                        />
                        <Line
                            type="monotone"
                            dataKey="remainingPoints"
                            stroke="#8884d8"
                            name="Actual Burndown"
                            dot={true}
                            strokeWidth={2}
                        />
                        <Line
                            type="monotone"
                            dataKey="idealBurndown"
                            stroke="#82ca9d"
                            name="Ideal Burndown"
                            strokeDasharray="5 5"
                            strokeWidth={2}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

BurndownChart.propTypes = {
    sprintId: PropTypes.string.isRequired,
    filters: PropTypes.object,
    selectedProject: PropTypes.object
};

export default BurndownChart; 