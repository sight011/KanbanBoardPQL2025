import React from 'react';
import './ContextMenu.css';

const ContextMenu = ({ x, y, onClose, onDuplicate, isVisible }) => {
    if (!isVisible) return null;

    const isDarkMode = document.documentElement.classList.contains('dark-mode') ||
                      document.body.classList.contains('dark-mode');

    return (
        <div 
            className="context-menu-backdrop" 
            onClick={onClose}
        >
            <div 
                className={`context-menu ${isDarkMode ? 'dark' : 'light'}`}
                style={{ 
                    left: x, 
                    top: y,
                    position: 'fixed',
                    zIndex: 1000
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="context-menu-item" onClick={onDuplicate}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 2V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M16 2V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M3 10H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M19 4H5C3.89543 4 3 4.89543 3 6V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V6C21 4.89543 20.1046 4 19 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M8 14H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M8 18H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Duplicate Task
                </div>
            </div>
        </div>
    );
};

export default ContextMenu; 