import React, { useState, useEffect } from 'react';
import { useTaskContext } from '../../context/TaskContext';
import './ListView.css';

const ListView = ({ tasks, onEdit, onDelete }) => {
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

    return (
        <div className="list-view">
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Title</th>
                        <th>Status</th>
                        <th>Priority</th>
                        <th>Assignee</th>
                        <th>EE</th>
                        <th>TS</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {tasks.map(task => (
                        <tr key={task.id}>
                            <td>{task.id}</td>
                            <td>{task.title}</td>
                            <td>
                                <span className={`status-badge status-${task.status}`}>
                                    {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                                </span>
                            </td>
                            <td>
                                <span className={`priority-badge priority-${task.priority}`}>
                                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
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
                            <td>{task.effort ? `${task.effort}d` : '–'}</td>
                            <td>{task.timespent ? `${task.timespent}d` : '–'}</td>
                            <td>
                                <div className="task-actions">
                                    <button onClick={() => onEdit(task)} className="edit-button">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            <path d="M18.5 2.5C18.8978 2.10217 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10217 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </button>
                                    <button onClick={() => onDelete(task.id)} className="delete-button">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            <path d="M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ListView; 