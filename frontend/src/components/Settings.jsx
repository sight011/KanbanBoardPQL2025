import React from 'react';
import './Settings.css';

const Settings = () => {
    return (
        <div className="settings-layout">
            <nav className="settings-nav">
                <ul>
                    <li className="active">General</li>
                    <li>Users</li>
                    <li>Time Range</li>
                </ul>
            </nav>
            <section className="settings-content">
                <h2 className="settings-headline">Settings</h2>
            </section>
        </div>
    );
};

export default Settings; 