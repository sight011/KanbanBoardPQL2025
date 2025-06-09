const pool = require('../db');
const { validationResult } = require('express-validator');

// Test database connection on startup
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
        console.error('Connection details:', {
            user: process.env.DB_USER,
            host: process.env.DB_HOST,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT
        });
    } else {
        console.log('✅ Database connected successfully at', res.rows[0].now);
    }
});

const taskController = {
    // Get all tasks
    getAllTasks: async (req, res) => {
        console.log('🔍 getAllTasks endpoint hit');
        try {
            console.log('📊 About to query database...');
            const result = await pool.query(
                'SELECT * FROM tasks ORDER BY status, position'
            );
            console.log('✅ Query successful, found', result.rows.length, 'tasks');
            console.log('First task:', result.rows[0]);
            res.json(result.rows);
        } catch (err) {
            console.error('❌ Error in getAllTasks:', err.message);
            console.error('Full error stack:', err.stack);
            res.status(500).json({ error: 'Server error', details: err.message });
        }
    },

    // Get task by ID
    getTaskById: async (req, res) => {
        console.log('🔍 getTaskById endpoint hit for ID:', req.params.id);
        try {
            const { id } = req.params;
            const result = await pool.query(
                'SELECT * FROM tasks WHERE id = $1',
                [id]
            );
            
            if (result.rows.length === 0) {
                console.log('❌ Task not found for ID:', id);
                return res.status(404).json({ error: 'Task not found' });
            }
            
            console.log('✅ Task found:', result.rows[0]);
            res.json(result.rows[0]);
        } catch (err) {
            console.error('❌ Error in getTaskById:', err.message);
            console.error('Full error stack:', err.stack);
            res.status(500).json({ error: 'Server error', details: err.message });
        }
    },

    // Create new task
    createTask: async (req, res) => {
        console.log('🔍 createTask endpoint hit');
        console.log('Request body:', req.body);
        console.log('User:', req.user);
        
        try {
            const { title, description, status, priority } = req.body;
            
            // Check if user exists
            if (!req.user || !req.user.id) {
                console.log('❌ No authenticated user found');
                return res.status(401).json({ error: 'User not authenticated' });
            }
            
            const reporter_id = req.user.id;
            console.log('Creating task for user ID:', reporter_id);

            // Get the highest position in the status column
            const positionResult = await pool.query(
                'SELECT COALESCE(MAX(position), 0) + 1 as new_position FROM tasks WHERE status = $1',
                [status]
            );
            const position = positionResult.rows[0].new_position;
            console.log('New position will be:', position);

            const result = await pool.query(
                'INSERT INTO tasks (title, description, status, priority, position, reporter_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
                [title, description, status, priority, position, reporter_id]
            );

            console.log('✅ Task created successfully:', result.rows[0]);
            res.status(201).json(result.rows[0]);
        } catch (err) {
            console.error('❌ Error in createTask:', err.message);
            console.error('Full error stack:', err.stack);
            res.status(500).json({ error: 'Server error', details: err.message });
        }
    },

    // Update task
    updateTask: async (req, res) => {
        console.log('🔍 updateTask endpoint hit for ID:', req.params.id);
        console.log('Request body:', req.body);
        
        try {
            const { id } = req.params;
            const { title, description, status, priority, assignee_id } = req.body;

            // Handle assignee_id
            let assigneeId = null;
            if (assignee_id && assignee_id !== 'unassigned') {
                const assigneeResult = await pool.query(
                    'SELECT id FROM users WHERE id = $1',
                    [assignee_id]
                );
                if (assigneeResult.rows.length > 0) {
                    assigneeId = assignee_id;
                } else {
                    console.log('⚠️ Assignee not found, setting to null');
                }
            }

            const result = await pool.query(
                'UPDATE tasks SET title = $1, description = $2, status = $3, priority = $4, assignee_id = $5 WHERE id = $6 RETURNING *',
                [title, description, status, priority, assigneeId, id]
            );

            if (result.rows.length === 0) {
                console.log('❌ Task not found for update, ID:', id);
                return res.status(404).json({ error: 'Task not found' });
            }

            console.log('✅ Task updated successfully:', result.rows[0]);
            res.json(result.rows[0]);
        } catch (err) {
            console.error('❌ Error in updateTask:', err.message);
            console.error('Full error stack:', err.stack);
            console.error('Error details:', {
                code: err.code,
                detail: err.detail,
                hint: err.hint,
                where: err.where
            });
            res.status(500).json({ 
                error: 'Server error', 
                details: err.message,
                code: err.code,
                hint: err.hint
            });
        }
    },

    // Delete task
    deleteTask: async (req, res) => {
        console.log('🔍 deleteTask endpoint hit for ID:', req.params.id);
        
        try {
            const { id } = req.params;
            const result = await pool.query(
                'DELETE FROM tasks WHERE id = $1 RETURNING *',
                [id]
            );

            if (result.rows.length === 0) {
                console.log('❌ Task not found for deletion, ID:', id);
                return res.status(404).json({ error: 'Task not found' });
            }

            console.log('✅ Task deleted successfully');
            res.json({ message: 'Task deleted successfully' });
        } catch (err) {
            console.error('❌ Error in deleteTask:', err.message);
            console.error('Full error stack:', err.stack);
            res.status(500).json({ error: 'Server error', details: err.message });
        }
    },

    // Update task position
    updateTaskPosition: async (req, res) => {
        console.log('🔍 updateTaskPosition endpoint hit for ID:', req.params.id);
        console.log('Request body:', req.body);
        
        try {
            const { id } = req.params;
            const { newPosition, newStatus } = req.body;

            // Start a transaction
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                console.log('Transaction started');

                // Update the task's position and status
                await client.query(
                    'UPDATE tasks SET position = $1, status = $2 WHERE id = $3',
                    [newPosition, newStatus, id]
                );

                // Reorder other tasks in the same status
                await client.query(
                    'UPDATE tasks SET position = position + 1 WHERE status = $1 AND position >= $2 AND id != $3',
                    [newStatus, newPosition, id]
                );

                await client.query('COMMIT');
                console.log('✅ Task position updated successfully');
                res.json({ message: 'Task position updated successfully' });
            } catch (err) {
                await client.query('ROLLBACK');
                console.log('Transaction rolled back');
                throw err;
            } finally {
                client.release();
            }
        } catch (err) {
            console.error('❌ Error in updateTaskPosition:', err.message);
            console.error('Full error stack:', err.stack);
            res.status(500).json({ error: 'Server error', details: err.message });
        }
    },

    // Get tasks by status
    getTasksByStatus: async (req, res) => {
        console.log('🔍 getTasksByStatus endpoint hit for status:', req.params.status);
        
        try {
            const { status } = req.params;
            const result = await pool.query(
                'SELECT * FROM tasks WHERE status = $1 ORDER BY position',
                [status]
            );
            console.log('✅ Found', result.rows.length, 'tasks with status:', status);
            res.json(result.rows);
        } catch (err) {
            console.error('❌ Error in getTasksByStatus:', err.message);
            console.error('Full error stack:', err.stack);
            res.status(500).json({ error: 'Server error', details: err.message });
        }
    }
};

module.exports = taskController;