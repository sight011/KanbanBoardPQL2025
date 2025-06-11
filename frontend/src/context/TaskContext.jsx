import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const TaskContext = createContext();

export const useTaskContext = () => useContext(TaskContext);

export const TaskProvider = ({ children }) => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedTaskId, setSelectedTaskId] = useState(null);
    const selectedTask = tasks.find(t => t.id === selectedTaskId) || null;
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchTasks = async (signal) => {
        console.log('Attempting to fetch tasks...');
        try {
            const response = await api.get('/api/tasks', { signal });
            console.log('Tasks fetched successfully:', response.data); // Log fetched data
            setTasks(response.data);
            setError(null);
        } catch (err) {
            if (err.code === "ERR_CANCELED") {
                console.log('TaskProvider unmounted before fetch completed. Aborting fetch.');
                return; // Ignore abort errors
            }
            setError('Failed to fetch tasks');
            console.error('Error fetching tasks:', err);
        }
        console.log('Fetch tasks complete. Loading:', false, 'Error:', error, 'Tasks count:', tasks.length); // Log final states
        setLoading(false);
    };

    useEffect(() => {
        const controller = new AbortController();
        fetchTasks(controller.signal);
        return () => controller.abort();
    }, []);

    const createTask = async (taskData) => {
        try {
            // Convert empty string to null for assignee_id and effort
            const cleanTaskData = {
                ...taskData,
                assignee_id: taskData.assignee_id === '' ? null : taskData.assignee_id,
                effort: taskData.effort === '' ? null : taskData.effort
            };
            console.log('Sending task data:', cleanTaskData); // Debug log
            const response = await api.post('/api/tasks', cleanTaskData);
            await fetchTasks(); // Fetch fresh list after create
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
            // Convert empty string to null for assignee_id and effort
            const cleanTaskData = {
                ...taskData,
                assignee_id: taskData.assignee_id === '' ? null : taskData.assignee_id,
                effort: taskData.effort === '' ? null : taskData.effort
            };
            const response = await api.put(`/api/tasks/${taskId}`, cleanTaskData);
            // Optimistically update the local state
            setTasks(prevTasks =>
                prevTasks.map(task =>
                    task.id === taskId ? { ...task, ...cleanTaskData } : task
                )
            );
            // setSelectedTask({ ...response.data }); // No longer needed
            // Fetch from backend to ensure consistency
            await fetchTasks();
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
        if (!task) {
            setSelectedTaskId(null);
        } else {
            setSelectedTaskId(task.id);
        }
        setIsModalOpen(true);
    };

    const closeTaskModal = () => {
        setSelectedTaskId(null);
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