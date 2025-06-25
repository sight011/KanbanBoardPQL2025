import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import EmojiPicker from 'emoji-picker-react';
import './ActivityFeed.css';

const ActivityFeed = ({ task }) => {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(null);
    const commentsListRef = useRef(null);

    useEffect(() => {
        if (task && task.id) {
            fetchComments();
        }
    }, [task]);

    // Auto-scroll to bottom when comments change
    useEffect(() => {
        if (commentsListRef.current) {
            commentsListRef.current.scrollTop = commentsListRef.current.scrollHeight;
        }
    }, [comments]);

    const fetchComments = async () => {
        if (!task?.id) return;
        
        setLoading(true);
        try {
            const response = await fetch(`/api/tasks/${task.id}/comments`);
            if (response.ok) {
                const data = await response.json();
                setComments(data.comments || []);
            }
        } catch (error) {
            console.error('Error fetching comments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || !task?.id) return;

        try {
            const response = await fetch(`/api/tasks/${task.id}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content: newComment }),
            });

            if (response.ok) {
                setNewComment('');
                fetchComments(); // Refresh comments
            }
        } catch (error) {
            console.error('Error posting comment:', error);
        }
    };

    const handleEmojiClick = async (emojiObject, commentId) => {
        try {
            const response = await fetch(`/api/comments/${commentId}/reactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emoji: emojiObject.emoji }),
            });
            if (response.ok) {
                fetchComments();
            }
        } catch (error) {
            console.error('Error adding reaction:', error);
        }
        setShowEmojiPicker(null);
    };

    const handleReactionClick = async (reactionId) => {
        try {
            const response = await fetch(`/api/comments/0/reactions/${reactionId}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                fetchComments();
            }
        } catch (error) {
            console.error('Error removing reaction:', error);
        }
    };

    if (!task) {
        return (
            <div className="activity-feed">
                <div className="activity-title">Activity</div>
                <div className="comments-list">
                    <p>No task selected</p>
                </div>
            </div>
        );
    }

    return (
        <div className="activity-feed">
            <div className="activity-header">
                <div className="activity-title">Activity</div>
            </div>
            
            <div className="comments-list" ref={commentsListRef}>
                {loading ? (
                    <p>Loading comments...</p>
                ) : comments.length === 0 ? (
                    <p>No comments yet</p>
                ) : (
                    comments.map((comment) => (
                        <div key={comment.id} className="comment-wrapper">
                            <div className="comment-item">
                                <div className="comment-header">
                                    <span className="comment-author">
                                        {`${comment.firstName} ${comment.lastName}`}
                                    </span>
                                    <span className="comment-date">
                                        {new Date(comment.created_at).toLocaleString([], { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className="comment-body">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {comment.comment}
                                    </ReactMarkdown>
                                </div>
                                <div className="comment-reactions">
                                    {comment.reactions && comment.reactions.map(reaction => (
                                        <button 
                                            key={reaction.id}
                                            className="reaction"
                                            onClick={() => handleReactionClick(reaction.id)}
                                            title={`Reacted by ${reaction.firstName} ${reaction.lastName}`}
                                        >
                                            {reaction.emoji}
                                        </button>
                                    ))}
                                </div>
                                <div className="comment-footer">
                                    <div className="reaction-container">
                                        <button className="action-btn" title="Add reaction" onClick={() => setShowEmojiPicker(comment.id)}>
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{width: '15px', height: '15px', marginRight: '8px', color: 'var(--text-secondary)'}}>
                                                <path d="M7 10v12"></path>
                                                <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"></path>
                                            </svg>
                                        </button>
                                        {showEmojiPicker === comment.id && (
                                            <div className="emoji-picker-container">
                                                <EmojiPicker onEmojiClick={(e) => handleEmojiClick(e, comment.id)} />
                                            </div>
                                        )}
                                    </div>
                                    <button className="action-btn reply-btn">Reply</button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="comment-form-container">
                <form className="comment-form" onSubmit={handleSubmitComment}>
                    <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment... Markdown is supported."
                        disabled={!task?.id}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmitComment(e);
                            }
                        }}
                    />
                    <div className="form-actions">
                        <button type="submit" disabled={!newComment.trim() || !task?.id}>
                            Comment
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

ActivityFeed.propTypes = {
    task: PropTypes.object,
};

export default ActivityFeed; 