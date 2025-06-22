const pool = require('../db/db');

const commentController = {
    getCommentsForTask: async (req, res) => {
        const { taskId } = req.params;
        try {
            const commentsResult = await pool.query(
                `SELECT c.id, c.content as comment, c.created_at, 
                        COALESCE(u.first_name, 'Unknown') as first_name, 
                        COALESCE(u.last_name, 'User') as last_name
                 FROM comments c
                 LEFT JOIN users u ON c.user_id = u.id
                 WHERE c.task_id = $1 
                 ORDER BY c.created_at ASC`,
                [taskId]
            );
            
            const comments = commentsResult.rows;

            if (comments.length > 0) {
                const commentIds = comments.map(c => c.id);
                const reactionsResult = await pool.query(
                    `SELECT cr.id, cr.comment_id, cr.user_id, cr.emoji, 
                            u.first_name, u.last_name
                     FROM comment_reactions cr
                     JOIN users u ON cr.user_id = u.id
                     WHERE cr.comment_id = ANY($1::int[])`,
                    [commentIds]
                );

                const reactionsByCommentId = reactionsResult.rows.reduce((acc, reaction) => {
                    if (!acc[reaction.comment_id]) {
                        acc[reaction.comment_id] = [];
                    }
                    acc[reaction.comment_id].push(reaction);
                    return acc;
                }, {});

                comments.forEach(comment => {
                    comment.reactions = reactionsByCommentId[comment.id] || [];
                });
            }

            res.status(200).json({ comments: comments });
        } catch (err) {
            console.error('Error fetching comments:', err.message);
            res.status(500).json({ message: 'Error fetching comments', error: err.message });
        }
    },

    addCommentToTask: async (req, res) => {
        const { taskId } = req.params;
        const { content } = req.body;
        const userId = req.user.id; // Get user ID from authenticated request

        if (!content || !content.trim()) {
            return res.status(400).json({ message: 'Comment text is required.' });
        }

        try {
            // Directly fetch all necessary info in one go after inserting
            const result = await pool.query(
                `WITH new_comment AS (
                    INSERT INTO comments (task_id, user_id, content) 
                    VALUES ($1, $2, $3) 
                    RETURNING id, task_id, user_id, content, created_at
                 )
                 SELECT nc.id, nc.content as comment, nc.created_at, 
                        COALESCE(u.first_name, 'Unknown') as first_name, 
                        COALESCE(u.last_name, 'User') as last_name
                 FROM new_comment nc
                 LEFT JOIN users u ON nc.user_id = u.id`,
                [taskId, userId, content.trim()]
            );

            res.status(201).json(result.rows[0]);
        } catch (err) {
            console.error('Error adding comment:', err.message);
            res.status(500).json({ message: 'Error adding comment', error: err.message });
        }
    },

    addReaction: async (req, res) => {
        const { id } = req.params;
        const { emoji } = req.body;
        const userId = req.user.id;

        try {
            const result = await pool.query(
                'INSERT INTO comment_reactions (comment_id, user_id, emoji) VALUES ($1, $2, $3) RETURNING *',
                [id, userId, emoji]
            );
            res.status(201).json(result.rows[0]);
        } catch (err) {
            console.error('Error adding reaction:', err.message);
            if (err.code === '23505') { // unique_violation
                return res.status(409).json({ message: 'Reaction already exists' });
            }
            res.status(500).json({ message: 'Error adding reaction', error: err.message });
        }
    },

    removeReaction: async (req, res) => {
        const { reactionId } = req.params;
        const userId = req.user.id;

        try {
            const result = await pool.query(
                'DELETE FROM comment_reactions WHERE id = $1 AND user_id = $2 RETURNING *',
                [reactionId, userId]
            );

            if (result.rowCount === 0) {
                return res.status(404).json({ message: 'Reaction not found or user not authorized' });
            }
            res.status(200).json({ message: 'Reaction removed' });
        } catch (err) {
            console.error('Error removing reaction:', err.message);
            res.status(500).json({ message: 'Error removing reaction', error: err.message });
        }
    }
};

module.exports = commentController; 