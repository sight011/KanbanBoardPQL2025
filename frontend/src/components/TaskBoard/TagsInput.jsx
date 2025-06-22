import React, { useState } from 'react';
import './TagsInput.css';

const TagsInput = ({ tags, setTags }) => {
    const [inputValue, setInputValue] = useState('');

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const newTag = inputValue.trim();
            if (newTag && !tags.includes(newTag)) {
                setTags([...tags, newTag]);
            }
            setInputValue('');
        }
    };

    const removeTag = (tagToRemove) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    return (
        <div className="tags-input-container">
            {tags.map((tag, index) => (
                <div key={index} className="tag-item">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="remove-tag-button">×</button>
                </div>
            ))}
            <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add a tag..."
                className="tags-input"
            />
        </div>
    );
};

export default TagsInput; 