import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const CreateAccount = () => {
    const [firstName, setFirstName] = useState('Hans');
    const [lastName, setLastName] = useState('Peter');
    const [email, setEmail] = useState('example@gmx.de');
    const [password, setPassword] = useState('Longenough22!!');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [companyName, setCompanyName] = useState('Sirus');
    const [departmentName, setDepartmentName] = useState('Product');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setMessage('');
        try {
            const response = await api.post('/api/register', {
                companyName, 
                departmentName, 
                firstName, 
                lastName, 
                email, 
                password
            });
            
            const data = response.data;
            if (response.status === 201) {
                setMessage('Account created successfully! Redirecting to dashboard...');
                
                // Store company context for multi-tenant support
                const companySlug = data.user.companySlug || 'sirus'; // Default to the test company slug
                localStorage.setItem('companySlug', companySlug);
                localStorage.setItem('userCompanyId', data.user.companyId);
                
                setCompanyName('');
                setDepartmentName('');
                setFirstName('');
                setLastName('');
                setEmail('');
                setPassword('');
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
            } else {
                setError(data.message || 'Failed to create account');
            }
        } catch (err) {
            console.error('Registration error:', err);
            setError(err.response?.data?.message || 'Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="create-account-container">
            <div className="forgot-password-card">
                <h2>Create Account</h2>
                <form onSubmit={handleSubmit} className="forgot-password-form">
                    <div className="form-group">
                        <label htmlFor="companyName">Company Name</label>
                        <input
                            type="text"
                            id="companyName"
                            value={companyName}
                            onChange={e => setCompanyName(e.target.value)}
                            placeholder="Enter your company name"
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="departmentName">Department Name</label>
                        <input
                            type="text"
                            id="departmentName"
                            value={departmentName}
                            onChange={e => setDepartmentName(e.target.value)}
                            placeholder="Enter your department name"
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="firstName">First Name</label>
                        <input
                            type="text"
                            id="firstName"
                            value={firstName}
                            onChange={e => setFirstName(e.target.value)}
                            placeholder="Enter your first name"
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="lastName">Last Name</label>
                        <input
                            type="text"
                            id="lastName"
                            value={lastName}
                            onChange={e => setLastName(e.target.value)}
                            placeholder="Enter your last name"
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="Enter your email"
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Enter a password"
                            required
                            disabled={isLoading}
                        />
                    </div>
                    {error && <div className="error-message">{error}</div>}
                    {message && <div className="success-message">{message}</div>}
                    <button 
                        type="submit" 
                        className="submit-button"
                        disabled={isLoading || !companyName || !departmentName || !firstName || !lastName || !email || !password}
                    >
                        {isLoading ? 'Creating...' : 'Create Account'}
                    </button>
                </form>
                <div className="links">
                    <button 
                        onClick={() => navigate('/login')}
                        className="back-to-login"
                    >
                        ← Back to Login
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateAccount; 