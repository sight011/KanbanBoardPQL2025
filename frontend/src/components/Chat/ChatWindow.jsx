import React, { useState, useRef, useEffect } from 'react';
import './ChatWindow.css';

const ChatWindow = ({ isOpen, onClose, onSendMessage }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  const defaultQuestions = [
    "How many items are \"in progress\"?",
    "How many items are assigned to JD?",
    "How many items are in the whole board?"
  ];

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
        <h3>Kanban AI Assistant</h3>
        <button onClick={onClose} className="close-button">X</button>
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
        <button onClick={handleSendMessage}>Send</button>
      </div>
    </div>
  );
};

export default ChatWindow; 