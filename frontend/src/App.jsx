import { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { TaskProvider } from './context/TaskContext';
import { ThemeProvider as OriginalThemeProvider } from './context/ThemeContext';
import TaskBoard from './components/TaskBoard/TaskBoard';
import CreateTaskButton from './components/CreateTaskButton';
import ChatBubble from './components/Chat/ChatBubble';
import ChatWindow from './components/Chat/ChatWindow';
import ThemeToggle from './components/ThemeToggle';
import SettingsButton from './components/SettingsButton';
import Settings from './components/Settings';
import Login from './components/Login';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import AuditTrailView from './components/Audit/AuditTrailView';
import HealthCheck from './components/Health/HealthCheck';
import CreateAccount from './components/CreateAccount';
import api from './api/axios'; // Import axios for API calls
import './App.css';
import { Routes, Route, useNavigate } from 'react-router-dom';

const App = () => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [viewMode, setViewMode] = useState('kanban');
    const navigate = useNavigate();
    const [isDarkMode] = useState(false);

    // Create theme based on dark mode state
    const theme = createTheme({
        palette: {
            mode: isDarkMode ? 'dark' : 'light',
            primary: {
                main: '#3B82F6',
                light: '#60A5FA',
                dark: '#2563EB',
            },
            secondary: {
                main: '#10B981',
                light: '#34D399',
                dark: '#059669',
            },
            background: {
                default: isDarkMode ? '#121212' : '#f5f5f5',
                paper: isDarkMode ? '#1e1e1e' : '#ffffff',
            },
        },
        typography: {
            fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
            h1: {
                fontSize: '2.5rem',
                fontWeight: 500,
            },
            h2: {
                fontSize: '2rem',
                fontWeight: 500,
            },
            h3: {
                fontSize: '1.75rem',
                fontWeight: 500,
            },
            h4: {
                fontSize: '1.5rem',
                fontWeight: 500,
            },
            h5: {
                fontSize: '1.25rem',
                fontWeight: 500,
            },
            h6: {
                fontSize: '1rem',
                fontWeight: 500,
            },
        },
        spacing: 8,
        shape: {
            borderRadius: 8,
        },
    });

    // Check session on app startup
    useEffect(() => {
        const checkSession = async () => {
            try {
                const response = await api.get('/api/session', { withCredentials: true });
                if (response.data.isLoggedIn) {
                    // Fetch user details if session is valid
                    const userResponse = await api.get('/api/users/profile', { withCredentials: true });
                    setUser(userResponse.data.user);
                    // Reset view mode to kanban when user logs in
                    setViewMode('kanban');
                }
            } catch (error) {
                console.log('No valid session found');
            } finally {
                setIsLoading(false);
            }
        };

        checkSession();
    }, []);

    // Reset view mode to kanban when user logs in
    useEffect(() => {
        if (user) {
            setViewMode('kanban');
        }
    }, [user]);

    const handleLogoClick = () => {
        setViewMode('kanban');
        navigate('/');
    };

    const handleSendMessage = async (message, setBotResponse) => {
        try {
            // Fetch all tasks
            const tasksResponse = await api.get('/api/tasks');
            const tasks = tasksResponse.data;

            // Prepare prompt for Ollama with better structure
            const prompt = `You are a helpful assistant for a Kanban board. Your responses should be:
1. Concise and direct
2. Focused on the specific question
3. Include relevant numbers and statistics when applicable
4. Use bullet points for multiple items with line breaks between each point
5. Format numbers and percentages clearly

Here are the current tasks:
${JSON.stringify(tasks, null, 2)}

User query: ${message}

Based on the tasks above, please answer the user's question following the response structure guidelines.`;

            // Send prompt to Ollama endpoint
            const ollamaResponse = await api.post('/api/chat', { prompt });
            setBotResponse(ollamaResponse.data.response);
        } catch (error) {
            console.error('Error sending message to LLM:', error);
            setBotResponse('Sorry, I could not process your request. Please try again later.');
        }
    };

    // Show loading state while checking session
    if (isLoading) {
        return (
            <div style={{ 
                minHeight: '100vh', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                fontSize: '1.2rem'
            }}>
                Loading...
            </div>
        );
    }

    // If user is not authenticated, show auth pages
    if (!user) {
        return (
            <Routes>
                <Route path="/login" element={<Login onLogin={setUser} />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/create-account" element={<CreateAccount />} />
                <Route path="*" element={<Login onLogin={setUser} />} />
            </Routes>
        );
    }

    // If user is authenticated, show main app
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <OriginalThemeProvider>
                <TaskProvider>
                    <div className={`app ${isDarkMode ? 'dark-mode' : ''}`}>
                        <header className="app-header">
                            <div className="app-logo-container" onClick={handleLogoClick} style={{ cursor: 'pointer' }}>
                                <img src="/Multi.png" alt="Multi Logo" width="200" height="55" />
                            </div>
                            <div className="header-actions">
                                <ThemeToggle />
                                <SettingsButton />
                                <CreateTaskButton />
                            </div>
                        </header>
                        <main className="app-main">
                            <Routes>
                                <Route path="/" element={<TaskBoard viewMode={viewMode} setViewMode={setViewMode} user={user} />} />
                                <Route path="/settings" element={<Settings />} />
                                <Route path="/audit" element={<AuditTrailView />} />
                                <Route path="/health" element={<HealthCheck />} />
                            </Routes>
                        </main>
                        <ChatBubble
                            onClick={() => setIsChatOpen(!isChatOpen)}
                            isChatOpen={isChatOpen}
                        />
                        <ChatWindow
                            isOpen={isChatOpen}
                            onClose={() => setIsChatOpen(false)}
                            onSendMessage={handleSendMessage}
                        />
                    </div>
                </TaskProvider>
            </OriginalThemeProvider>
        </ThemeProvider>
    );
};

export default App;
