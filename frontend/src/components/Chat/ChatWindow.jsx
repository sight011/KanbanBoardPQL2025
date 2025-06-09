import React, { useState, useRef, useEffect } from 'react';
import './ChatWindow.css';
import api from '../../api/axios';

const ChatWindow = ({ isOpen, onClose, onSendMessage }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isOnline, setIsOnline] = useState(false);
  const messagesEndRef = useRef(null);

  const defaultQuestions = [
    "How many items are \"in progress\"?",
    "How many items are assigned to JD?",
    "How many items are in the whole board?"
  ];

  const checkOllamaConnection = async () => {
    try {
      await api.get('/api/chat/status');
      setIsOnline(true);
    } catch (error) {
      setIsOnline(false);
    }
  };

  useEffect(() => {
    checkOllamaConnection();
    // Check connection status every 30 seconds
    const interval = setInterval(checkOllamaConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages(defaultQuestions.map(q => ({ text: q, sender: 'default-question' })));
    }
  }, [isOpen]);

  const handleSendMessage = (textToSend = message) => {
    if (textToSend.trim()) {
      const newMessage = { text: textToSend, sender: 'user' };
      setMessages((prevMessages) => [...prevMessages, newMessage]);
      onSendMessage(textToSend, (botResponse) => {
        setMessages((prevMessages) => [...prevMessages, { text: botResponse, sender: 'bot' }]);
      });
      setMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const handleDefaultQuestionClick = (question) => {
    handleSendMessage(question);
  };

  if (!isOpen) return null;

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div className="header-content">
          <h3>AI Assistant</h3>
          <span className={`status-indicator ${isOnline ? 'online' : 'offline'}`}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
        <button onClick={onClose} className="close-button">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="close-chat-icon">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M5.63603 5.63604C6.02656 5.24552 6.65972 5.24552 7.05025 5.63604L12 10.5858L16.9497 5.63604C17.3403 5.24552 17.9734 5.24552 18.364 5.63604C18.7545 6.02657 18.7545 6.65973 18.364 7.05025L13.4142 12L18.364 16.9497C18.7545 17.3403 18.7545 17.9734 18.364 18.364C17.9734 18.7545 17.3403 18.7545 16.9497 18.364L12 13.4142L7.05025 18.364C6.65972 18.7545 6.02656 18.7545 5.63603 18.364C5.24551 17.9734 5.24551 17.3403 5.63603 16.9497L10.5858 12L5.63603 7.05025C5.24551 6.65973 5.24551 6.02657 5.63603 5.63604Z"></path>
          </svg>
        </button>
      </div>
      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div 
            key={index} 
            className={`chat-message ${msg.sender} ${msg.sender === 'default-question' ? 'default-question' : ''}`}
            onClick={msg.sender === 'default-question' ? () => handleDefaultQuestionClick(msg.text) : null}
          >
            {msg.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
        />
        <button onClick={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" image-rendering="optimizeQuality" fill-rule="evenodd" clip-rule="evenodd" viewBox="0 0 511 512.32" className="send-icon">
            <path fill="#fff" d="M9.72 185.88L489.19 1.53c3.64-1.76 7.96-2.08 12.03-.53 7.83 2.98 11.76 11.74 8.78 19.57L326.47 502.56h-.02c-1.33 3.49-3.94 6.5-7.57 8.25-7.54 3.63-16.6.47-20.23-7.06l-73.78-152.97 146.67-209.97-209.56 146.3L8.6 213.64a15.117 15.117 0 01-7.6-8.25c-2.98-7.79.93-16.53 8.72-19.51z"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ChatWindow; 