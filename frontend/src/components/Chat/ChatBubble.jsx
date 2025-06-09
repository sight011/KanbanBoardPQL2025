import React from 'react';
import './ChatBubble.css';

const ChatBubble = ({ onClick }) => {
  return (
    <div className="chat-bubble" onClick={onClick}>
      💬
    </div>
  );
};

export default ChatBubble; 