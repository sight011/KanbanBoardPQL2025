import React, { useState, useEffect, useMemo } from 'react';
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
import './BurndownChart.css';

const BurndownChart = ({ sprintId, filters }) => {
    const [burndownData, setBurndownData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isDarkMode, setIsDarkMode] = useState(() =>
        document.documentElement.classList.contains('dark-mode') ||
        document.body.classList.contains('dark-mode')
    );

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
                const response = await fetch(`/api/sprints/${sprintId}/burndown?${queryParams}`);
                const data = await response.json();
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
        <div className={`burndown-chart-container${isDarkMode ? ' dark' : ''}`}>
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
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey="date"
                            tickFormatter={date => new Date(date).toLocaleDateString()}
                        />
                        <YAxis />
                        <Tooltip
                            labelFormatter={date => new Date(date).toLocaleDateString()}
                            formatter={(value, name) => [value, name === 'remainingPoints' ? 'Remaining Points' : 'Ideal Burndown']}
                        />
                        <Legend />
                        <Line
                            type="monotone"
                            dataKey="remainingPoints"
                            stroke="#8884d8"
                            name="Actual Burndown"
                            dot={true}
                        />
                        <Line
                            type="monotone"
                            dataKey="idealBurndown"
                            stroke="#82ca9d"
                            name="Ideal Burndown"
                            strokeDasharray="5 5"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default BurndownChart; 