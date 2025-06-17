import React, { useState, useRef, useEffect } from 'react';
import './Settings.css';
import api from '../api/axios';

const Settings = () => {
    const [activeTab, setActiveTab] = useState('general');
    const [imageError, setImageError] = useState('');
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [updatingUserId, setUpdatingUserId] = useState(null);
    const [profile, setProfile] = useState(null);
    const [nameForm, setNameForm] = useState({ firstName: '', lastName: '' });
    const [updateStatus, setUpdateStatus] = useState('');
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (activeTab === 'users') {
            fetchUsers();
        } else if (activeTab === 'profile') {
            fetchProfile();
        }
    }, [activeTab]);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const response = await api.get('/api/users/profile');
            setProfile(response.data.user);
            setNameForm({
                firstName: response.data.user.firstName,
                lastName: response.data.user.lastName
            });
            setError(null);
        } catch (err) {
            setError('Failed to load profile');
            console.error('Error fetching profile:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleNameChange = (e) => {
        const { name, value } = e.target;
        setNameForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleNameSubmit = async (e) => {
        e.preventDefault();
        setUpdateStatus('updating');
        try {
            const response = await api.patch('/api/users/profile/names', nameForm);
            setProfile(prev => ({
                ...prev,
                firstName: response.data.user.firstName,
                lastName: response.data.user.lastName
            }));
            setUpdateStatus('success');
            setTimeout(() => setUpdateStatus(''), 3000);
        } catch (err) {
            setError('Failed to update names');
            setUpdateStatus('error');
            console.error('Error updating names:', err);
        }
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await api.get('/api/users');
            setUsers(response.data.users);
            setError(null);
        } catch (err) {
            setError('Failed to load users');
            console.error('Error fetching users:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2MB in bytes
                setImageError('Image size must be less than 2MB');
                fileInputRef.current.value = ''; // Reset file input
                return;
            }
            setImageError('');
            // Here you would typically handle the file upload to your server
            console.log('File selected:', file);
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        setUpdatingUserId(userId);
        try {
            await api.patch(`/api/users/${userId}/role`, { role: newRole });
            // Update the local state with the new role
            setUsers(users.map(user => 
                user.id === userId ? { ...user, role: newRole } : user
            ));
            setError(null);
        } catch (err) {
            setError('Failed to update user role');
            console.error('Error updating user role:', err);
        } finally {
            setUpdatingUserId(null);
        }
    };

    const getRoleColor = (role) => {
        switch (role) {
            case 'Admin':
                return '#DC2626'; // red
            case 'Project/Product':
                return '#2563EB'; // blue
            case 'User':
                return '#059669'; // green
            default:
                return 'inherit';
        }
    };

    const DefaultAvatar = () => (
        <svg 
            className="default-avatar" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
        >
            <path 
                d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
            />
            <path 
                d="M20.5899 22C20.5899 18.13 16.7399 15 11.9999 15C7.25991 15 3.40991 18.13 3.40991 22" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
            />
        </svg>
    );

    const renderContent = () => {
        switch (activeTab) {
            case 'general':
                return (
                    <div className="settings-section">
                        <h2 className="settings-headline">General Settings</h2>
                        <div className="settings-section-content">
                            {/* Add your general settings content here */}
                            <p>Welcome to FlexFlex!</p>
                        </div>
                    </div>
                );
            case 'profile':
                return (
                    <div className="settings-section">
                        <h2 className="settings-headline">Profile Settings</h2>
                        <div className="settings-section-content">
                            <div className="profile-image-section">
                                <div className="profile-image-container">
                                    <DefaultAvatar />
                                </div>
                                <div className="profile-image-upload">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        ref={fileInputRef}
                                        className="profile-image-input"
                                        id="profile-image-input"
                                    />
                                    <label htmlFor="profile-image-input" className="upload-button">
                                        Upload Photo
                                    </label>
                                    {imageError && <p className="error-message">{imageError}</p>}
                                    <p className="file-requirements">Maximum file size: 2MB</p>
                                </div>
                            </div>
                            {loading ? (
                                <div className="loading-spinner">Loading profile...</div>
                            ) : error ? (
                                <div className="error-message">{error}</div>
                            ) : profile && (
                                <div className="profile-info">
                                    <form onSubmit={handleNameSubmit} className="name-form">
                                        <div className="info-group">
                                            <label>First Name</label>
                                            <input 
                                                type="text" 
                                                name="firstName"
                                                className="profile-input" 
                                                value={nameForm.firstName}
                                                onChange={handleNameChange}
                                            />
                                        </div>
                                        <div className="info-group">
                                            <label>Last Name</label>
                                            <input 
                                                type="text" 
                                                name="lastName"
                                                className="profile-input" 
                                                value={nameForm.lastName}
                                                onChange={handleNameChange}
                                            />
                                        </div>
                                        <div className="name-actions">
                                            <button 
                                                type="submit" 
                                                className="update-button"
                                                disabled={updateStatus === 'updating'}
                                            >
                                                {updateStatus === 'updating' ? 'Updating...' : 'Update Name'}
                                            </button>
                                        </div>
                                        {updateStatus === 'success' && (
                                            <div className="success-box">
                                                <div className="checkmark">
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="20 6 9 17 4 12" />
                                                    </svg>
                                                </div>
                                                <span className="message">Names updated successfully!</span>
                                            </div>
                                        )}
                                        {updateStatus === 'error' && (
                                            <p className="error-message">{error}</p>
                                        )}
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>
                );
            case 'users':
                return (
                    <div className="settings-section">
                        <h2 className="settings-headline">User Management</h2>
                        <div className="settings-section-content">
                            {loading ? (
                                <div className="loading-spinner">Loading users...</div>
                            ) : error ? (
                                <div className="error-message">{error}</div>
                            ) : (
                                <div className="users-list">
                                    <div className="users-list-header">
                                        <span>Name</span>
                                        <span>Email</span>
                                        <span>Role</span>
                                        <span>Created</span>
                                    </div>
                                    {users.map(user => (
                                        <div key={user.id} className="user-item">
                                            <div className="user-name">
                                                {user.firstName} {user.lastName}
                                            </div>
                                            <div className="user-email">
                                                {user.email}
                                            </div>
                                            <div className="user-role">
                                                <select
                                                    value={user.role || 'User'}
                                                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                    disabled={updatingUserId === user.id}
                                                    style={{ color: getRoleColor(user.role || 'User') }}
                                                    className="role-select"
                                                >
                                                    <option value="Admin">Admin</option>
                                                    <option value="Project/Product">Project/Product</option>
                                                    <option value="User">User</option>
                                                </select>
                                            </div>
                                            <div className="user-created">
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                );
            case 'timeRange':
                return (
                    <div className="settings-section">
                        <h2 className="settings-headline">Time Range Settings</h2>
                        <div className="settings-section-content">
                            <div className="time-range-settings">
                                <div className="setting-group">
                                    <label htmlFor="hours-per-day">Hours per day</label>
                                    <div className="input-with-unit">
                                        <input
                                            type="number"
                                            id="hours-per-day"
                                            min="1"
                                            max="24"
                                            defaultValue="8"
                                            className="settings-input"
                                        />
                                        <span className="unit">hours</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'logout':
                return (
                    <div className="settings-section">
                        <h2 className="settings-headline">Log Out</h2>
                        <div className="settings-section-content">
                            <p>Are you sure you want to log out?</p>
                            <button className="logout-button" onClick={() => {/* Add logout logic here */}}>
                                Confirm Log Out
                            </button>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="settings-layout">
            <nav className="settings-nav">
                <ul>
                    <li 
                        className={activeTab === 'general' ? 'active' : ''} 
                        onClick={() => setActiveTab('general')}
                    >
                        General
                    </li>
                    <li 
                        className={activeTab === 'profile' ? 'active' : ''} 
                        onClick={() => setActiveTab('profile')}
                    >
                        Profile
                    </li>
                    <li 
                        className={activeTab === 'users' ? 'active' : ''} 
                        onClick={() => setActiveTab('users')}
                    >
                        Users
                    </li>
                    <li 
                        className={activeTab === 'timeRange' ? 'active' : ''} 
                        onClick={() => setActiveTab('timeRange')}
                    >
                        Time Range
                    </li>
                    <li 
                        className={`${activeTab === 'logout' ? 'active' : ''} logout-nav-item`}
                        onClick={() => setActiveTab('logout')}
                    >
                        Log Out
                    </li>
                </ul>
            </nav>
            <section className="settings-content">
                {renderContent()}
            </section>
        </div>
    );
};

export default Settings; 