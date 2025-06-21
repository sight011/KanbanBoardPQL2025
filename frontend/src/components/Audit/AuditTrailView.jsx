import React, { useEffect, useState } from 'react';
import './AuditTrailView.css';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

const AuditTrailView = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const isDarkMode = document.documentElement.classList.contains('dark-mode');

    useEffect(() => {
        const fetchAuditLogs = async () => {
            try {
                setLoading(true);
                const response = await fetch('/api/audit', {
                    credentials: 'include'
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch audit logs. Are you logged in?');
                }
                const data = await response.json();
                setLogs(data.logs || []);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchAuditLogs();
    }, []);

    if (loading) {
        return <div className="loading-message">Loading audit trail...</div>;
    }

    if (error) {
        return <div className="error-message">{error}</div>;
    }

    return (
        <div className={`audit-trail-view ${isDarkMode ? 'dark' : 'light'}`}>
            <div className="page-header">
                <h2>Audit Trail</h2>
                <Link to="/settings" className="back-to-settings-button">
                    &larr; Back to Settings
                </Link>
            </div>
            <div className="audit-table-container">
                <table className="audit-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Task ID</th>
                            <th>User ID</th>
                            <th>User Name</th>
                            <th>Field Changed</th>
                            <th>Old Value</th>
                            <th>New Value</th>
                            <th>Timestamp</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.length > 0 ? (
                            logs.map(log => (
                                <tr key={log.id}>
                                    <td>{log.id}</td>
                                    <td>{log.task_id}</td>
                                    <td>{log.user_id}</td>
                                    <td>{log.username || 'N/A'}</td>
                                    <td>{log.field_name}</td>
                                    <td className="value-cell">{log.old_value}</td>
                                    <td className="value-cell">{log.new_value}</td>
                                    <td>{format(new Date(log.changed_at), 'yyyy-MM-dd HH:mm:ss')}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7" className="no-logs-message">No audit logs found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AuditTrailView; 