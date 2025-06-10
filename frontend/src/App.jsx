import React, { useState } from 'react';
import { TaskProvider } from './context/TaskContext';
import { ThemeProvider } from './context/ThemeContext';
import TaskBoard from './components/TaskBoard/TaskBoard';
import TaskModal from './components/TaskBoard/TaskModal';
import CreateTaskButton from './components/CreateTaskButton';
import ChatBubble from './components/Chat/ChatBubble';
import ChatWindow from './components/Chat/ChatWindow';
import ThemeToggle from './components/ThemeToggle';
import api from './api/axios'; // Import axios for API calls
import './App.css';

const App = () => {
    const [isChatOpen, setIsChatOpen] = useState(false);

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

    return (
        <ThemeProvider>
            <TaskProvider>
                <div className="app">
                    <header className="app-header">
                        <div className="app-logo-container">
                            <img src="/flexflex.png" alt="FlexFlex Logo" width="200" height="55" />
                        </div>
                        <div className="header-actions">
                            <ThemeToggle />
                            <CreateTaskButton />
                        </div>
                    </header>
                    <main className="app-main">
                        <TaskBoard />
                    </main>
                    <TaskModal />
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
        </ThemeProvider>
    );
};

export default App;
