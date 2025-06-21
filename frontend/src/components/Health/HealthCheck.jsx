import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import './HealthCheck.css';
import { Link } from 'react-router-dom';

const HealthCheck = () => {
    const [healthStatus, setHealthStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const isDarkMode = document.documentElement.classList.contains('dark-mode');

    useEffect(() => {
        const fetchHealthStatus = async () => {
            try {
                setLoading(true);
                const response = await api.get('/health');
                setHealthStatus(response.data);
            } catch (err) {
                setError('Failed to fetch health status. The server may be down.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchHealthStatus();
    }, []);

    const StatusIndicator = ({ status }) => {
        const statusClassName = status === 'up' ? 'healthy' : 'unhealthy';
        return (
            <div className={`status-indicator ${statusClassName}`}>
                <span className="status-dot"></span>
                <span className="status-text">{status}</span>
            </div>
        );
    };

    if (loading) {
        return <div className="loading-message">Checking system health...</div>;
    }

    if (error) {
        return <div className="error-message">{error}</div>;
    }

    return (
        <div className={`health-check-view ${isDarkMode ? 'dark' : 'light'}`}>
            <div className="page-header">
                <h2>System Health Status</h2>
                <Link to="/settings" className="back-to-settings-button">
                    &larr; Back to Settings
                </Link>
            </div>
            {healthStatus && (
                <div className="health-status-container">
                    <div className="health-item">
                        <span className="item-name">API Status</span>
                        <StatusIndicator status={healthStatus.status} />
                    </div>
                    <div className="health-item">
                        <span className="item-name">Database Status</span>
                        <StatusIndicator status={healthStatus.dbStatus} />
                    </div>
                    <div className="health-item">
                        <span className="item-name">Uptime</span>
                        <span className="uptime-value">{healthStatus.uptime}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HealthCheck; 