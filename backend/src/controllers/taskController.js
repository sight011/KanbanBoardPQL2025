const pool = require('../db');
const { validationResult } = require('express-validator');
const { parseHours } = require('../utils');

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
                'SELECT * FROM tasks ORDER BY sprint_id, sprint_order, id'
            );
            console.log('✅ Query successful, found', result.rows.length, 'tasks');
            console.log('First task:', result.rows[0]);
            res.status(200).json({
                success: true,
                tasks: result.rows,
                message: 'Tasks retrieved successfully'
            });
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
            res.status(200).json({
                success: true,
                task: result.rows[0],
                message: 'Task retrieved successfully'
            });
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
            let { effort, timespent } = req.body;

            if (!req.user || !req.user.id) {
                console.log('❌ No authenticated user found');
                return res.status(401).json({ error: 'User not authenticated' });
            }
            
            // Fetch hoursPerDay from settings (fallback to 8)
            let hoursPerDay = 8;
            try {
                const settingsResult = await pool.query('SELECT hours FROM settings_hoursperday ORDER BY id DESC LIMIT 1');
                if (settingsResult.rows.length > 0 && settingsResult.rows[0].hours) {
                    hoursPerDay = parseFloat(settingsResult.rows[0].hours);
                }
            } catch (e) { console.warn('Could not fetch hoursPerDay from settings, using default 8'); }

            // Parse and validate effort and timespent
            try {
                effort = parseHours(effort, hoursPerDay);
            } catch (err) {
                return res.status(400).json({ error: 'Invalid effort: ' + err.message });
            }
            try {
                timespent = parseHours(timespent, hoursPerDay);
            } catch (err) {
                return res.status(400).json({ error: 'Invalid time spent: ' + err.message });
            }

            const reporter_id = req.user.id;
            console.log('Creating task for user ID:', reporter_id);

            // Generate ticket number
            const lastTicketResult = await pool.query(
                'SELECT ticket_number FROM tasks WHERE ticket_number IS NOT NULL ORDER BY ticket_number DESC LIMIT 1'
            );
            let nextTicketNumber = 1;
            if (lastTicketResult.rows.length > 0) {
                const lastTicket = lastTicketResult.rows[0].ticket_number;
                const lastNumber = parseInt(lastTicket.replace('PT-', ''), 10);
                nextTicketNumber = lastNumber + 1;
            }
            const formattedTicketNumber = `PT-${String(nextTicketNumber).padStart(4, '0')}`;
            console.log('Generated new ticket number:', formattedTicketNumber);

            // Get the highest position in the status column
            const positionResult = await pool.query(
                'SELECT COALESCE(MAX(position), 0) + 1 as new_position FROM tasks WHERE status = $1',
                [status]
            );
            const position = positionResult.rows[0].new_position;
            console.log('New position will be:', position);

            const result = await pool.query(
                'INSERT INTO tasks (title, description, status, priority, position, reporter_id, ticket_number, effort, timespent, sprint_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()) RETURNING *',
                [title, description, status, priority, position, reporter_id, formattedTicketNumber, effort, timespent, req.body.sprint_id || null]
            );

            console.log('✅ Task created successfully:', result.rows[0]);
            res.status(201).json({
                success: true,
                task: result.rows[0],
                message: 'Task created successfully'
            });
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
            const { title, description, status, priority, assignee_id, sprint_id, sprint_order, completed_at } = req.body;
            let { effort, timespent } = req.body;

            // Validate required fields
            if (!title || !status || !priority) {
                return res.status(400).json({
                    error: 'Missing required fields',
                    message: 'Title, status, and priority are required'
                });
            }

            // Fetch hoursPerDay from settings (fallback to 8)
            let hoursPerDay = 8;
            try {
                const settingsResult = await pool.query('SELECT hours FROM settings_hoursperday ORDER BY id DESC LIMIT 1');
                if (settingsResult.rows.length > 0 && settingsResult.rows[0].hours) {
                    hoursPerDay = parseFloat(settingsResult.rows[0].hours);
                }
            } catch (e) { console.warn('Could not fetch hoursPerDay from settings, using default 8'); }

            // Parse and validate effort and timespent
            try {
                effort = parseHours(effort, hoursPerDay);
            } catch (err) {
                return res.status(400).json({ error: 'Invalid effort: ' + err.message });
            }
            try {
                timespent = parseHours(timespent, hoursPerDay);
            } catch (err) {
                return res.status(400).json({ error: 'Invalid time spent: ' + err.message });
            }

            const sql = 'UPDATE tasks SET title = $1, description = $2, status = $3, priority = $4, effort = $5, timespent = $6, assignee_id = $7, sprint_id = $8, sprint_order = $9, completed_at = $10, updated_at = NOW() WHERE id = $11 RETURNING *';
            const params = [title, description, status, priority, effort, timespent, assignee_id || null, sprint_id || null, sprint_order || null, completed_at || null, id];
            console.log('Executing SQL:', sql);
            console.log('With parameters:', params);

            const result = await pool.query(sql, params);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    error: 'Task not found',
                    message: `No task found with ID ${id}`
                });
            }

            console.log('✅ Task updated successfully:', result.rows[0]);
            res.status(200).json({
                success: true,
                task: result.rows[0],
                message: 'Task updated successfully'
            });
        } catch (err) {
            console.error('❌ Error in updateTask:', err.message);
            console.error('Full error stack:', err.stack);
            if (err.detail) console.error('Error detail:', err.detail);
            if (err.hint) console.error('Error hint:', err.hint);
            res.status(500).json({
                error: 'Server error',
                message: err.message,
                details: err.detail,
                hint: err.hint
            });
        }
    },

    // Delete task
    deleteTask: async (req, res) => {
        console.log('🔍 deleteTask endpoint hit for ID:', req.params.id);
        
        try {
            const { id } = req.params;

            // First get the task to return it in the response
            const taskResult = await pool.query(
                'SELECT * FROM tasks WHERE id = $1',
                [id]
            );

            if (taskResult.rows.length === 0) {
                return res.status(404).json({
                    error: 'Task not found',
                    message: `No task found with ID ${id}`
                });
            }

            // Then delete the task
            const deleteResult = await pool.query(
                'DELETE FROM tasks WHERE id = $1 RETURNING *',
                [id]
            );

            console.log('✅ Task deleted successfully');
            res.status(200).json({
                success: true,
                task: taskResult.rows[0],
                message: 'Task deleted successfully'
            });
        } catch (err) {
            console.error('❌ Error in deleteTask:', err.message);
            console.error('Full error stack:', err.stack);
            res.status(500).json({
                error: 'Server error',
                message: err.message,
                details: err.detail,
                hint: err.hint
            });
        }
    },

    // Update task position
    updateTaskPosition: async (req, res) => {
        console.log('🔍 updateTaskPosition endpoint hit for ID:', req.params.id);
        console.log('Request body:', req.body);
        
        try {
            const { id } = req.params;
            const { newPosition, newStatus } = req.body;

            // Validate required fields
            if (typeof newPosition !== 'number' || !newStatus) {
                return res.status(400).json({
                    error: 'Invalid input',
                    message: 'newPosition must be a number and newStatus is required'
                });
            }

            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                console.log('Transaction started');

                // Get the current task's status and position
                const currentTask = await client.query(
                    'SELECT status, position FROM tasks WHERE id = $1',
                    [id]
                );

                if (currentTask.rows.length === 0) {
                    throw new Error('Task not found');
                }

                const { status: oldStatus, position: oldPosition } = currentTask.rows[0];

                // Position update logic
                if (oldStatus !== newStatus) {
                    await client.query(
                        `UPDATE tasks 
                         SET position = position - 1 
                         WHERE status = $1 
                         AND position > $2`,
                        [oldStatus, oldPosition]
                    );

                    await client.query(
                        `UPDATE tasks 
                         SET position = position + 1 
                         WHERE status = $1 
                         AND position >= $2`,
                        [newStatus, newPosition]
                    );
                } else {
                    if (oldPosition < newPosition) {
                        await client.query(
                            `UPDATE tasks 
                             SET position = position - 1 
                             WHERE status = $1 
                             AND position > $2 
                             AND position <= $3`,
                            [newStatus, oldPosition, newPosition]
                        );
                    } else if (oldPosition > newPosition) {
                        await client.query(
                            `UPDATE tasks 
                             SET position = position + 1 
                             WHERE status = $1 
                             AND position >= $2 
                             AND position < $3`,
                            [newStatus, newPosition, oldPosition]
                        );
                    }
                }

                // Update the task's position, status, and completed_at
                const completed_at = newStatus === 'done' ? 'NOW()' : 'NULL';
                const updatedTask = await client.query(
                    `UPDATE tasks SET position = $1, status = $2, completed_at = ${completed_at}, updated_at = NOW() WHERE id = $3 RETURNING *`,
                    [newPosition, newStatus, id]
                );

                // Get all tasks with updated positions
                const allTasks = await client.query('SELECT * FROM tasks ORDER BY status, position');

                await client.query('COMMIT');
                console.log('✅ Task position updated successfully');
                
                res.status(200).json({
                    success: true,
                    tasks: allTasks.rows,
                    updatedTask: updatedTask.rows[0],
                    message: 'Task position updated successfully'
                });
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
            res.status(500).json({
                error: 'Server error',
                message: err.message,
                details: err.detail,
                hint: err.hint
            });
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
            res.status(200).json({
                success: true,
                tasks: result.rows,
                message: 'Tasks retrieved successfully'
            });
        } catch (err) {
            console.error('❌ Error in getTasksByStatus:', err.message);
            console.error('Full error stack:', err.stack);
            res.status(500).json({ error: 'Server error', details: err.message });
        }
    },

    // Duplicate task
    duplicateTask: async (req, res) => {
        console.log('🔍 duplicateTask endpoint hit for ID:', req.params.id);
        const client = await pool.connect(); // Rented a connection from the pool

        try {
            await client.query('BEGIN'); // Start transaction

            const { id } = req.params;

            if (!req.user || !req.user.id) {
                console.log('❌ No authenticated user found');
                await client.query('ROLLBACK');
                return res.status(401).json({ error: 'User not authenticated' });
            }

            // Get the original task
            const originalTaskResult = await client.query(
                'SELECT * FROM tasks WHERE id = $1 FOR UPDATE', // Lock the row for update
                [id]
            );

            if (originalTaskResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({
                    error: 'Task not found',
                    message: `No task found with ID ${id}`
                });
            }

            const originalTask = originalTaskResult.rows[0];

            // Generate new ticket number
            const lastTicketResult = await client.query(
                'SELECT ticket_number FROM tasks WHERE ticket_number IS NOT NULL ORDER BY ticket_number DESC LIMIT 1'
            );
            let nextTicketNumber = 1;
            if (lastTicketResult.rows.length > 0) {
                const lastTicket = lastTicketResult.rows[0].ticket_number;
                const lastNumber = parseInt(lastTicket.replace('PT-', ''), 10);
                nextTicketNumber = lastNumber + 1;
            }
            const formattedTicketNumber = `PT-${String(nextTicketNumber).padStart(4, '0')}`;

            // === Start of new ordering logic ===
            const originalSprintOrder = originalTask.sprint_order; // Can be null
            let newSprintOrder;

            if (originalTask.sprint_id !== null && originalSprintOrder !== null) {
                // Task is in a sprint and has an order, shift subsequent tasks
                await client.query(
                    'UPDATE tasks SET sprint_order = sprint_order + 1 WHERE sprint_id = $1 AND sprint_order > $2',
                    [originalTask.sprint_id, originalSprintOrder]
                );
                newSprintOrder = originalSprintOrder + 1;
            } else if (originalTask.sprint_id !== null) {
                // Task is in a sprint but has no order, place it at the end
                const maxOrderResult = await client.query(
                    'SELECT MAX(sprint_order) as max_order FROM tasks WHERE sprint_id = $1',
                    [originalTask.sprint_id]
                );
                const maxOrder = maxOrderResult.rows[0].max_order || 0;
                newSprintOrder = maxOrder + 1;
            } else {
                // Task is not in a sprint (in backlog), so no sprint order.
                newSprintOrder = null;
            }
            
            // For Kanban board position, place it immediately after the original
            const originalPosition = originalTask.position;
            // Shift all tasks that come after the original task
            await client.query(
                'UPDATE tasks SET position = position + 1 WHERE status = $1 AND position > $2',
                [originalTask.status, originalPosition]
            );
            const newPosition = originalPosition + 1;
            // === End of new ordering logic ===

            // Create the duplicated task with "(Copy)" appended to title
            const duplicatedTitle = `${originalTask.title} (Copy)`;
            const reporter_id = req.user.id;

            const result = await client.query(
                `INSERT INTO tasks (
                    title, description, status, priority, position, reporter_id,
                    ticket_number, effort, timespent, sprint_id, assignee_id,
                    sprint_order, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
                RETURNING *`,
                [
                    duplicatedTitle,
                    originalTask.description,
                    originalTask.status,
                    originalTask.priority,
                    newPosition,
                    reporter_id,
                    formattedTicketNumber,
                    originalTask.effort,
                    originalTask.timespent,
                    originalTask.sprint_id,
                    originalTask.assignee_id,
                    newSprintOrder
                ]
            );

            await client.query('COMMIT'); // Commit transaction

            console.log('✅ Task duplicated successfully:', result.rows[0]);
            res.status(201).json({
                success: true,
                task: result.rows[0],
                message: 'Task duplicated successfully'
            });
        } catch (err) {
            await client.query('ROLLBACK'); // Rollback on error
            console.error('❌ Error in duplicateTask:', err.message);
            console.error('Full error stack:', err.stack);
            res.status(500).json({
                error: 'Server error',
                message: err.message,
                details: err.detail,
                hint: err.hint
            });
        } finally {
            client.release(); // Release the client back to the pool
        }
    }
};

module.exports = taskController;