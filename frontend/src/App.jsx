import React from 'react';
import { TaskProvider } from './context/TaskContext';
import TaskBoard from './components/TaskBoard/TaskBoard';
import TaskModal from './components/TaskBoard/TaskModal';
import CreateTaskButton from './components/CreateTaskButton';
import './App.css';

const App = () => {
    return (
        <TaskProvider>
            <div className="app">
                <header className="app-header">
                    <h1>Task Management</h1>
                    <CreateTaskButton />
                </header>
                <main className="app-main">
                    <TaskBoard />
                </main>
                <TaskModal />
            </div>
        </TaskProvider>
    );
};

export default App;
