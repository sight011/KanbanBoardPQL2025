import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const TaskContext = createContext();

export const useTaskContext = () => useContext(TaskContext);

// Helper function for logging API responses
const logApiResponse = (response, operation) => {
    console.log(`📡 ${operation} Response:`, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data
    });
};

export const TaskProvider = ({ children }) => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedTaskId, setSelectedTaskId] = useState(null);
    const selectedTask = tasks.find(t => t.id === selectedTaskId) || null;
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Add debug logging
    useEffect(() => {
        console.log('🔄 Tasks state changed:', tasks.length, 'tasks');
        console.log('📋 Current tasks:', tasks.map(t => ({ id: t.id, title: t.title, status: t.status, position: t.position })));
    }, [tasks]);

    const fetchTasks = async (signal) => {
        console.log('🔍 Fetching tasks from server...');
        try {
            const response = await api.get('/api/tasks', { signal });
            logApiResponse(response, 'Fetch Tasks');
            
            setTasks(response.data.tasks);
            setError(null);
        } catch (err) {
            if (err.code === "ERR_CANCELED") {
                console.log('❌ Fetch canceled');
                return;
            }
            console.error('💥 Error fetching tasks:', {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status
            });
            setError('Failed to fetch tasks');
        }
        setLoading(false);
    };

    useEffect(() => {
        const controller = new AbortController();
        fetchTasks(controller.signal);
        return () => controller.abort();
    }, []);

    const createTask = async (taskData) => {
        console.log('➕ Creating task:', taskData);
        try {
            const cleanTaskData = {
                ...taskData,
                assignee_id: taskData.assignee_id === '' ? null : taskData.assignee_id,
                effort: taskData.effort === '' ? null : taskData.effort
            };
            
            const response = await api.post('/api/tasks', cleanTaskData);
            logApiResponse(response, 'Create Task');
            
            // Optimistic update
            setTasks(prevTasks => [...prevTasks, response.data.task]);
            
            return response.data.task;
        } catch (err) {
            console.error('💥 Create task failed:', {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status
            });
            setError('Failed to create task');
            throw err;
        }
    };

    const updateTask = async (taskId, taskData) => {
        console.log('✏️ Updating task:', taskId, taskData);
        
        const cleanTaskData = {
            ...taskData,
            assignee_id: taskData.assignee_id === '' ? null : taskData.assignee_id,
            effort: taskData.effort === '' ? null : taskData.effort
        };

        // Optimistic update
        setTasks(prevTasks => 
            prevTasks.map(task => 
                task.id === taskId ? { ...task, ...cleanTaskData } : task
            )
        );

        try {
            const response = await api.put(`/api/tasks/${taskId}`, cleanTaskData);
            logApiResponse(response, 'Update Task');
            
            // Update with server response
            setTasks(prevTasks => 
                prevTasks.map(task => 
                    task.id === taskId ? response.data.task : task
                )
            );
            
            return response.data.task;
        } catch (err) {
            console.error('💥 Update task failed:', {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status
            });
            setError('Failed to update task');
            // Revert optimistic update
            await fetchTasks();
            throw err;
        }
    };

    const deleteTask = async (taskId) => {
        console.log('🗑️ Deleting task:', taskId);
        
        // Optimistic delete
        setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));

        try {
            const response = await api.delete(`/api/tasks/${taskId}`);
            logApiResponse(response, 'Delete Task');
            
            // No need to update state as we already removed the task optimistically
            return response.data;
        } catch (err) {
            console.error('💥 Delete task failed:', {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status
            });
            setError('Failed to delete task');
            // Revert optimistic delete
            await fetchTasks();
            throw err;
        }
    };

    const updateTaskPosition = async (taskId, newPosition, newStatus) => {
        console.log('🔄 Updating task position:', { taskId, newPosition, newStatus });
        
        // Optimistic update
        setTasks(prevTasks => {
            const taskToMove = prevTasks.find(t => t.id === taskId);
            if (!taskToMove) return prevTasks;

            return prevTasks.map(task => {
                if (task.id === taskId) {
                    return { ...task, position: newPosition, status: newStatus };
                }
                return task;
            });
        });

        try {
            const response = await api.patch(`/api/tasks/${taskId}/position`, {
                newPosition,
                newStatus
            });
            logApiResponse(response, 'Update Task Position');
            
            // Update with server response
            setTasks(response.data.tasks);
            
            return response.data;
        } catch (err) {
            console.error('💥 Update position failed:', {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status
            });
            setError('Failed to update task position');
            // Revert optimistic update
            await fetchTasks();
            throw err;
        }
    };

    const openTaskModal = (task) => {
        console.log('📝 Opening modal for task:', task?.id);
        if (!task) {
            setSelectedTaskId(null);
        } else {
            setSelectedTaskId(task.id);
        }
        setIsModalOpen(true);
    };

    const closeTaskModal = () => {
        console.log('❌ Closing modal');
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