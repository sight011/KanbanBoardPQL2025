import React, { useState, useRef, useEffect } from 'react';
import './ChatWindow.css';
import api from '../../api/axios';
import DNA from './DNA';
import DNASimple from './DNASimple';
import DNASpinner from './DNASpinner';

const defaultQuestions = [
    "How many items are \"in progress\"?",
    "What is the average completion time?",
    "Which tasks have high priority?"
];

const ChatWindow = ({ isOpen, onClose, onSendMessage }) => {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const chatMessagesRef = useRef(null);

    const scrollToBottom = () => {
        if (chatMessagesRef.current) {
            chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
        }
    };

    // Scroll to bottom whenever messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = (e) => {
        e?.preventDefault();
        if (inputMessage.trim()) {
            const newMessage = {
                type: 'user',
                content: inputMessage
            };
            setMessages(prev => [...prev, newMessage]);
            setIsLoading(true);
            onSendMessage(inputMessage, (response) => {
                setMessages(prev => [...prev, {
                    type: 'bot',
                    content: response
                }]);
                setIsLoading(false);
            });
            setInputMessage('');
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(e);
        }
    };

    const handleDefaultQuestionClick = (question) => {
        const newMessage = {
            type: 'user',
            content: question
        };
        setMessages(prev => [...prev, newMessage]);
        setIsLoading(true);
        onSendMessage(question, (response) => {
            setMessages(prev => [...prev, {
                type: 'bot',
                content: response
            }]);
            setIsLoading(false);
        });
    };

    if (!isOpen) return null;

    return (
        <div className="chat-window">
            <div className="chat-header">
                <div className="header-content">
                    <svg id="Ebene_2" data-name="Ebene 2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 507.89 510.59" className="robot-chat-icon">
                        <g id="Ebene_1-2" data-name="Ebene 1">
                            <path fill="#fff" d="M505.5,249.77c-4.3-19.1-13.5-30.9-28.5-36.5-6-2.3-8.4-5.1-11-13.1-10.3-31.9-33-58.5-62.5-73.2-17.1-8.5-43-15.7-69-19.2-8.8-1.2-16.9-2.3-18-2.6-1.1-.2-4.6-2.3-7.7-4.6-7.4-5.6-17.9-9.5-30.3-11.4-5.5-.8-10.4-1.9-10.9-2.4-.6-.6-1.7-7-2.7-14.2-1.7-13.4-1.4-16.8,1.5-16.8,2.3,0,11.6-9,13.8-13.4,3.1-6,3.6-16.9,1.2-23.7-2.6-7.2-9.3-14-16.7-16.7-14.3-5.4-29.6.6-37,14.3-2.9,5.4-3.1,20.3-.4,25.3,2.8,5,8.6,11.1,12.8,13.3,2.1,1,4,2.3,4.4,2.8.8,1.3-2.6,27.3-3.7,28.8-.5.6-4.1,1.6-8.1,2.3-16.3,2.5-26.5,6.3-35.2,13-3.8,2.8-5.5,3.3-21,5.5-50.9,7.2-81.2,19.8-104.5,43.4-13.1,13.2-23.4,30.2-29.5,48.6-2.5,7.5-5.6,12.5-7.8,12.5-2.7,0-13.8,6.5-17.9,10.4C5.1,233.67,0,251.67,0,282.07c0,38.1,8.5,57.6,29.2,67.1,4,1.8,8.1,4.2,9,5.2.9,1.1,3.1,6,4.9,10.9,11.8,33.5,31.3,55.7,62.4,70.9,20.8,10.2,38.3,15.2,68,19.2,23.5,3.2,22.6,3,25,4.8,1.9,1.4,2,2.7,2.2,23.7.2,21.4.3,22.3,2.5,24.6,3,3.3,5.9,2.9,20-2.3,6.7-2.5,14.6-5.4,17.3-6.4,5-1.8,15-5.6,29.3-10.9,4.2-1.6,15.1-5.7,24.2-9.1,34.6-13,89.2-34.4,100-39.2,18-7.9,30.4-16.1,42-27.8,13.1-13.1,23.1-29.6,29.6-48.6,1.5-4.3,3.4-8.7,4.3-9.8.9-1,4.8-3.3,8.7-5.1,16.4-7.5,24.7-20.5,28.5-44.6,1.6-10.7.6-45-1.6-54.9ZM398.5,372.47c-22.6,24.4-75,34.7-163.5,32.2-43.1-1.2-67.6-4.3-89-11.1-21-6.7-33.3-15-42.6-28.8-12.3-18.2-18.3-50.1-17.1-91.3,1.5-52.5,13.1-80.6,39.2-95.3,19.1-10.6,50.6-17.2,93-19.3,39.1-2,86.8-.3,113.5,4,42.1,6.8,65.1,19.4,76.4,41.7,9.1,18.1,13.6,43.4,13.6,77.2,0,44.7-7.5,73.5-23.5,90.7Z"/>
                        </g>
                    </svg>
                    <h3>AI Assistant</h3>
                </div>
                <div className="header-right">
                    <span className="status-indicator online">Online</span>
                    <button onClick={onClose} className="close-button">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="close-chat-icon">
                            <path fillRule="evenodd" clipRule="evenodd" d="M5.63603 5.63604C6.02656 5.24552 6.65972 5.24552 7.05025 5.63604L12 10.5858L16.9497 5.63604C17.3403 5.24552 17.9734 5.24552 18.364 5.63604C18.7545 6.02657 18.7545 6.65973 18.364 7.05025L13.4142 12L18.364 16.9497C18.7545 17.3403 18.7545 17.9734 18.364 18.364C17.9734 18.7545 17.3403 18.7545 16.9497 18.364L12 13.4142L7.05025 18.364C6.65972 18.7545 6.02656 18.7545 5.63603 18.364C5.24551 17.9734 5.24551 17.3403 5.63603 16.9497L10.5858 12L5.63603 7.05025C5.24551 6.65973 5.24551 6.02657 5.63603 5.63604Z"></path>
                        </svg>
                    </button>
                </div>
            </div>
            <div className="chat-messages" ref={chatMessagesRef}>
                {defaultQuestions.length > 0 && (
                    <>
                        <div className="default-questions-header">Suggested Questions</div>
                        {defaultQuestions.map((question, index) => (
                            <div
                                key={index}
                                className="chat-message default-question"
                                onClick={() => handleDefaultQuestionClick(question)}
                            >
                                {question}
                            </div>
                        ))}
                        <div className="default-questions-separator"></div>
                    </>
                )}
                {messages.map((message, index) => (
                    <div
                        key={index}
                        className={`chat-message ${message.type === 'user' ? 'user' : 'bot'}`}
                    >
                        {message.content}
                    </div>
                ))}
            </div>
            <div className="chat-input">
                <input
                    type="text"
                    id="chat-input-field"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                />
                <button id="send-message-button" onClick={handleSendMessage} disabled={isLoading}>
                    {isLoading ? (
                        <DNASpinner />
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                    )}
                </button>
            </div>
        </div>
    );
};

export default ChatWindow; 