import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import './Settings.css';
import api from '../api/axios';
import { Link } from 'react-router-dom';
import SearchableSelect from './SearchableSelect';

const countries = [
    'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua & Deps', 'Argentina', 'Armenia', 'Australia', 'Austria',
    'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan',
    'Bolivia', 'Bosnia Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina', 'Burundi', 'Cambodia', 'Cameroon',
    'Canada', 'Cape Verde', 'Central African Rep', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Congo {Democratic Rep}',
    'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'East Timor',
    'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Ethiopia', 'Fiji', 'Finland', 'France',
    'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau',
    'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland {Republic}',
    'Israel', 'Italy', 'Ivory Coast', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Korea North',
    'Korea South', 'Kosovo', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya',
    'Liechtenstein', 'Lithuania', 'Luxembourg', 'Macedonia', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta',
    'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco',
    'Mozambique', 'Myanmar, {Burma}', 'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria',
    'Norway', 'Oman', 'Pakistan', 'Palau', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland',
    'Portugal', 'Qatar', 'Romania', 'Russian Federation', 'Rwanda', 'St Kitts & Nevis', 'St Lucia', 'Saint Vincent & the Grenadines', 'Samoa', 'San Marino',
    'Sao Tome & Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands',
    'Somalia', 'South Africa', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Swaziland', 'Sweden', 'Switzerland',
    'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Togo', 'Tonga', 'Trinidad & Tobago', 'Tunisia', 'Turkey',
    'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu',
    'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
];

const Settings = ({ onLogout }) => {
    const [activeTab, setActiveTab] = useState('profile');
    const [imageError, setImageError] = useState('');
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [updatingUserId, setUpdatingUserId] = useState(null);
    const [profile, setProfile] = useState(null);
    const [nameForm, setNameForm] = useState({ firstName: '', lastName: '' });
    const [updateStatus, setUpdateStatus] = useState('');
    const fileInputRef = useRef(null);
    const [addUserForm, setAddUserForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
    const [addUserError, setAddUserError] = useState('');
    const [addUserLoading, setAddUserLoading] = useState(false);
    const [deletingUserId, setDeletingUserId] = useState(null);

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

    const handleCountryChange = async (userId, newCountry) => {
        setUpdatingUserId(userId);
        try {
            await api.patch(`/api/users/${userId}/country`, { country: newCountry });
            // Update the local state with the new country
            setUsers(users.map(user => 
                user.id === userId ? { ...user, country: newCountry } : user
            ));
            setError(null);
        } catch (err) {
            setError('Failed to update user country');
            console.error('Error updating user country:', err);
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
            case 'Checker':
                return '#ca8a04'; // yellow
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

    const handleAddUserChange = (e) => {
        const { name, value } = e.target;
        setAddUserForm(prev => ({ ...prev, [name]: value }));
    };

    const handleAddUserSubmit = async (e) => {
        e.preventDefault();
        setAddUserError('');
        setAddUserLoading(true);
        try {
            if (!addUserForm.firstName || !addUserForm.lastName || !addUserForm.email || !addUserForm.password) {
                setAddUserError('All fields are required.');
                setAddUserLoading(false);
                return;
            }
            await api.post('/api/users', addUserForm);
            setAddUserForm({ firstName: '', lastName: '', email: '', password: '' });
            fetchUsers();
        } catch (err) {
            setAddUserError(err.response?.data?.error || 'Failed to add user');
        } finally {
            setAddUserLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await api.post('/api/logout');
            if (onLogout) onLogout();
            else window.location.reload();
        } catch (err) {
            alert('Failed to log out.');
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            return;
        }
        
        setDeletingUserId(userId);
        try {
            await api.delete(`/api/users/${userId}`);
            // Update the local state to remove the deleted user
            setUsers(users.filter(user => user.id !== userId));
            setError(''); // Clear any existing errors
        } catch (err) {
            console.error('Error deleting user:', err);
            setError('Failed to delete user');
        } finally {
            setDeletingUserId(null);
        }
    };

    const renderContent = () => {
        switch (activeTab) {
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
                        <h2 className="settings-headline" style={{ marginBottom: 24 }}>User Management</h2>
                        <div className="user-management-card" style={{ maxWidth: 800, margin: '0 auto', background: 'rgba(0,0,0,0.04)', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', padding: 32 }}>
                            <form onSubmit={handleAddUserSubmit} className="add-user-form" style={{ display: 'flex', gap: 24, marginBottom: 32, alignItems: 'flex-end', padding: 16, background: 'rgba(255,255,255,0.08)', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                                <div style={{ flex: 1 }}>
                                    <label>First Name</label>
                                    <input
                                        type="text"
                                        name="firstName"
                                        value={addUserForm.firstName}
                                        onChange={handleAddUserChange}
                                        required
                                        className="profile-input"
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label>Last Name</label>
                                    <input
                                        type="text"
                                        name="lastName"
                                        value={addUserForm.lastName}
                                        onChange={handleAddUserChange}
                                        required
                                        className="profile-input"
                                    />
                                </div>
                                <div style={{ flex: 2 }}>
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={addUserForm.email}
                                        onChange={handleAddUserChange}
                                        required
                                        className="profile-input"
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label>Password</label>
                                    <input
                                        type="password"
                                        name="password"
                                        value={addUserForm.password}
                                        onChange={handleAddUserChange}
                                        required
                                        className="profile-input"
                                    />
                                </div>
                                <button type="submit" disabled={addUserLoading} className="update-button" style={{ height: 42, minWidth: 120, marginLeft: 8 }}>
                                    {addUserLoading ? 'Adding...' : 'Add User'}
                                </button>
                            </form>
                            {addUserError && <div className="error-message" style={{ marginBottom: 16 }}>{addUserError}</div>}
                            <div style={{ borderTop: '1px solid var(--border-color)', margin: '24px 0' }} />
                            {loading ? (
                                <div className="loading-spinner">Loading users...</div>
                            ) : error ? (
                                <div className="error-message">{error}</div>
                            ) : (
                                <div className="users-list" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
                                    <div className="users-list-header">
                                        <span>Name</span>
                                        <span>Email</span>
                                        <span>Role</span>
                                        <span>Company</span>
                                        <span>Country</span>
                                        <span>Created</span>
                                        <span>Actions</span>
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
                                                    className="role-select"
                                                    value={user.role || 'User'} 
                                                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                    disabled={updatingUserId === user.id}
                                                    style={{ color: getRoleColor(user.role || 'User') }}
                                                >
                                                    <option value="Admin">Admin</option>
                                                    <option value="Project/Product">Project/Product</option>
                                                    <option value="User">User</option>
                                                    <option value="Checker">Checker</option>
                                                </select>
                                            </div>
                                            <div className="user-company">
                                                {user.companyName || 'N/A'}
                                            </div>
                                            <div className="user-country">
                                                <SearchableSelect
                                                    options={countries}
                                                    value={user.country || ''}
                                                    onChange={(country) => handleCountryChange(user.id, country)}
                                                    placeholder="Select country..."
                                                    disabled={updatingUserId === user.id}
                                                />
                                            </div>
                                            <div className="user-created">
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </div>
                                            <div className="user-actions">
                                                <button
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    disabled={deletingUserId === user.id}
                                                    className="delete-button"
                                                >
                                                    {deletingUserId === user.id ? 'Deleting...' : 'Delete'}
                                                </button>
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
            case 'maintenance':
                return (
                    <div className="settings-section">
                        <h2 className="settings-headline">Maintenance</h2>
                        <div className="maintenance-menu">
                            <Link to="/audit" className="maintenance-button">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15.5 2H8.6c-.4 0-.8.2-1.1.5-.3.3-.5.7-.5 1.1V21c0 .4.2.8.5 1.1.3.3.7.5 1.1.5h7.8c.4 0 .8-.2 1.1-.5.3-.3.5-.7.5-1.1V6.5L15.5 2z"></path><path d="M15 2v5h5"></path><path d="M10 16s.8-1 2-1 2 1 2 1"></path><path d="M12 12a1 1 0 100-2 1 1 0 000 2z"></path></svg>
                                Audit Trail
                            </Link>
                            <Link to="/health" className="maintenance-button">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"></path></svg>
                                Health
                            </Link>
                        </div>
                    </div>
                );
            case 'logout':
                return (
                    <div className="settings-section">
                        <h2 className="settings-headline">Log Out</h2>
                        <div className="settings-section-content">
                            <p>Are you sure you want to log out?</p>
                            <button className="logout-button" onClick={handleLogout}>
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
                        className={activeTab === 'maintenance' ? 'active' : ''} 
                        onClick={() => setActiveTab('maintenance')}
                    >
                        Maintenance
                    </li>
                </ul>
                <button className="logout-nav-item" onClick={handleLogout} style={{ marginTop: 32, background: '#e53e3e', color: 'white', border: 'none', borderRadius: 6, padding: '12px 0', fontWeight: 600, fontSize: '1.1rem', cursor: 'pointer' }}>
                    Log Out
                </button>
            </nav>
            <section className="settings-content">
                {renderContent()}
            </section>
        </div>
    );
};

Settings.propTypes = {
    onLogout: PropTypes.func.isRequired
};

export default Settings; 