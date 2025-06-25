import { useEffect, useState } from 'react';
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

    const formatDetails = (details, actionType) => {
        if (!details) return 'N/A';
        
        try {
            const parsed = typeof details === 'string' ? JSON.parse(details) : details;
            
            if (actionType === 'INSERT') {
                return 'Created';
            } else if (actionType === 'UPDATE') {
                const changes = [];
                if (parsed.old_values && parsed.new_values) {
                    const oldVals = typeof parsed.old_values === 'string' ? JSON.parse(parsed.old_values) : parsed.old_values;
                    const newVals = typeof parsed.new_values === 'string' ? JSON.parse(parsed.new_values) : parsed.new_values;
                    
                    Object.keys(newVals).forEach(key => {
                        if (oldVals[key] !== newVals[key]) {
                            changes.push(`${key}: "${oldVals[key]}" → "${newVals[key]}"`);
                        }
                    });
                }
                return changes.length > 0 ? changes.join(', ') : 'Updated';
            } else if (actionType === 'DELETE') {
                return 'Deleted';
            }
            
            return 'Modified';
        } catch (e) {
            return 'N/A';
        }
    };

    const getEntityDisplayName = (entityType, entityId) => {
        switch (entityType) {
            case 'tasks':
                return `Task #${entityId}`;
            case 'projects':
                return `Project #${entityId}`;
            case 'sprints':
                return `Sprint #${entityId}`;
            case 'companies':
                return `Company #${entityId}`;
            case 'departments':
                return `Department #${entityId}`;
            default:
                return `${entityType} #${entityId}`;
        }
    };

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
                            <th>Entity</th>
                            <th>Action</th>
                            <th>User</th>
                            <th>Changes</th>
                            <th>Timestamp</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.length > 0 ? (
                            logs.map(log => (
                                <tr key={log.id}>
                                    <td>{log.id}</td>
                                    <td>{getEntityDisplayName(log.entity_type, log.entity_id)}</td>
                                    <td className={`action-${log.field_name?.toLowerCase()}`}>
                                        {log.field_name || 'N/A'}
                                    </td>
                                    <td>{log.username || 'N/A'}</td>
                                    <td className="changes-cell">
                                        {formatDetails(log.details, log.field_name)}
                                    </td>
                                    <td>{format(new Date(log.changed_at), 'yyyy-MM-dd HH:mm:ss')}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="no-logs-message">No audit logs found for your company.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AuditTrailView; 