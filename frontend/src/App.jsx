import React, { useState } from 'react';
import { TaskProvider } from './context/TaskContext';
import TaskBoard from './components/TaskBoard/TaskBoard';
import TaskModal from './components/TaskBoard/TaskModal';
import CreateTaskButton from './components/CreateTaskButton';
import ChatBubble from './components/Chat/ChatBubble';
import ChatWindow from './components/Chat/ChatWindow';
import api from './api/axios'; // Import axios for API calls
import './App.css';

const App = () => {
    const [isChatOpen, setIsChatOpen] = useState(false);

    const handleSendMessage = async (message, setBotResponse) => {
        try {
            // Fetch all tasks
            const tasksResponse = await api.get('/api/tasks');
            const tasks = tasksResponse.data;

            // Prepare prompt for Ollama
            const prompt = `You are a helpful assistant for a Kanban board. Here are the current tasks:
${JSON.stringify(tasks, null, 2)}

User query: ${message}

Based on the tasks above, please answer the user's question.`;

            // Send prompt to Ollama endpoint
            const ollamaResponse = await api.post('/api/chat', { prompt });
            setBotResponse(ollamaResponse.data.response); // Assuming Ollama response is in data.response
        } catch (error) {
            console.error('Error sending message to LLM:', error);
            setBotResponse('Sorry, I could not process your request. Please try again later.');
        }
    };

    return (
        <TaskProvider>
            <div className="app">
                <header className="app-header">
                    <div className="app-logo-container">
                        <span role="img" aria-label="robot-icon" className="robot-icon">🤖</span>
                        <h1>Task Management</h1>
                    </div>
                    <CreateTaskButton />
                </header>
                <main className="app-main">
                    <TaskBoard />
                </main>
                <TaskModal />
                <ChatBubble onClick={() => setIsChatOpen(!isChatOpen)} />
                <ChatWindow
                    isOpen={isChatOpen}
                    onClose={() => setIsChatOpen(false)}
                    onSendMessage={handleSendMessage}
                />
            </div>
        </TaskProvider>
    );
};

export default App;
