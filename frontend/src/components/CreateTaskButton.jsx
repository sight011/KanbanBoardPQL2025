import React from 'react';
import { useTaskContext } from '../context/TaskContext';

const CreateTaskButton = () => {
    const { openTaskModal } = useTaskContext();

    return (
        <button
            className="create-task-button"
            onClick={() => {
                openTaskModal(null);
            }}
        >
            Create Task
        </button>
    );
};

export default CreateTaskButton; 