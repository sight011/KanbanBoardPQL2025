import React from 'react';

const DeleteConfirmationModal = ({ open, onClose, onConfirm, taskTitle, isDarkMode }) => {
    if (!open) return null;

    return (
        <div className="modal-backdrop">
            <div className={`modal-content ${isDarkMode ? 'dark' : 'light'}`}>
                <h3>Confirm Deletion</h3>
                <p>
                    Are you sure you want to delete the task: <strong>{taskTitle}</strong>?
                </p>
                <p>This action cannot be undone.</p>
                <div className="modal-actions">
                    <button
                        className={`modal-button secondary ${isDarkMode ? 'dark' : 'light'}`}
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        className={`modal-button delete ${isDarkMode ? 'dark' : 'light'}`}
                        onClick={onConfirm}
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteConfirmationModal; 