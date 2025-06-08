import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const TaskContext = createContext();

export const useTaskContext = () => useContext(TaskContext);

export const TaskProvider = ({ children }) => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedTask, setSelectedTask] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchTasks = async () => {
        try {
            const response = await api.get('/api/tasks');
            setTasks(response.data);
            setError(null);
        } catch (err) {
            setError('Failed to fetch tasks');
            console.error('Error fetching tasks:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const createTask = async (taskData) => {
        try {
            console.log('Sending task data:', taskData); // Debug log
            const response = await api.post('/api/tasks', taskData);
            setTasks(prevTasks => [...prevTasks, response.data]);
            return response.data;
        } catch (err) {
            console.error('Create task error details:', {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status,
                taskData
            });
            setError('Failed to create task');
            throw err;
        }
    };

    const updateTask = async (taskId, taskData) => {
        try {
            const response = await api.put(`/api/tasks/${taskId}`, taskData);
            setTasks(prevTasks =>
                prevTasks.map(task =>
                    task.id === taskId ? response.data : task
                )
            );
            return response.data;
        } catch (err) {
            setError('Failed to update task');
            throw err;
        }
    };

    const deleteTask = async (taskId) => {
        try {
            await api.delete(`/api/tasks/${taskId}`);
            setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
        } catch (err) {
            setError('Failed to delete task');
            throw err;
        }
    };

    const updateTaskPosition = async (taskId, newPosition, newStatus) => {
        try {
            await api.patch(`/api/tasks/${taskId}/position`, {
                newPosition,
                newStatus
            });
            await fetchTasks(); // Refresh tasks to get updated positions
        } catch (err) {
            setError('Failed to update task position');
            throw err;
        }
    };

    const openTaskModal = (task) => {
        setSelectedTask(task);
        setIsModalOpen(true);
    };

    const closeTaskModal = () => {
        setSelectedTask(null);
        setIsModalOpen(false);
    };

    const value = {
        tasks,
        loading,
        error,
        selectedTask,
        isModalOpen,
        createTask,
        updateTask,
        deleteTask,
        updateTaskPosition,
        openTaskModal,
        closeTaskModal
    };

    return (
        <TaskContext.Provider value={value}>
            {children}
        </TaskContext.Provider>
    );
}; 