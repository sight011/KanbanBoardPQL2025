const pool = require('../db');
const ical = require('ical-generator');

const sprintController = {
    // List all sprints for the user's company
    getAllSprints: async (req, res) => {
        try {
            // Get user's company_id for multi-tenant filtering
            const userResult = await pool.query(
                'SELECT company_id FROM users WHERE id = $1',
                [req.user.id]
            );
            
            if (userResult.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            const userCompanyId = userResult.rows[0].company_id;
            
            // Filter sprints by company through project -> department relationship
            const result = await pool.query(
                `SELECT s.* FROM sprints s
                 JOIN projects p ON s.project_id = p.id
                 JOIN departments d ON p.department_id = d.id
                 WHERE d.company_id = $1
                 ORDER BY s.start_date DESC, s.id DESC`,
                [userCompanyId]
            );
            
            // Only log if there are sprints or on first request
            if (result.rows.length > 0 || !req.session.sprintQueryLogged) {
                console.log(`🔍 Found ${result.rows.length} sprints for company ${userCompanyId}`);
                req.session.sprintQueryLogged = true;
            }
            
            res.json({ success: true, sprints: result.rows });
        } catch (error) {
            console.error('❌ Error in getAllSprints:', error.message);
            res.status(500).json({ success: false, error: error.message });
        }
    },
    // Get a single sprint (with company validation)
    getSprintById: async (req, res) => {
        try {
            const { id } = req.params;
            
            // Get user's company_id for multi-tenant filtering
            const userResult = await pool.query(
                'SELECT company_id FROM users WHERE id = $1',
                [req.user.id]
            );
            
            if (userResult.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            const userCompanyId = userResult.rows[0].company_id;
            
            // Filter sprint by company through project -> department relationship
            const result = await pool.query(
                `SELECT s.* FROM sprints s
                 JOIN projects p ON s.project_id = p.id
                 JOIN departments d ON p.department_id = d.id
                 WHERE s.id = $1 AND d.company_id = $2`,
                [id, userCompanyId]
            );
            
            if (result.rows.length === 0) {
                console.log('❌ Sprint not found for ID:', id, 'in company:', userCompanyId);
                return res.status(404).json({ success: false, error: 'Sprint not found' });
            }
            
            console.log('✅ Sprint found:', result.rows[0]);
            res.json({ success: true, sprint: result.rows[0] });
        } catch (error) {
            console.error('❌ Error in getSprintById:', error.message);
            res.status(500).json({ success: false, error: error.message });
        }
    },
    // Create a new sprint (with company validation)
    createSprint: async (req, res) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const { name, start_date, end_date, project_id } = req.body;
            
            if (!name) {
                await client.query('ROLLBACK');
                return res.status(400).json({ success: false, error: 'Sprint name is required' });
            }

            if (!project_id) {
                await client.query('ROLLBACK');
                return res.status(400).json({ success: false, error: 'Project ID is required' });
            }

            // Get user's company_id for validation
            const userResult = await client.query(
                'SELECT company_id FROM users WHERE id = $1',
                [req.user.id]
            );
            
            if (userResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'User not found' });
            }
            
            const userCompanyId = userResult.rows[0].company_id;
            
            // Verify project belongs to user's company
            const projectCheckResult = await client.query(
                `SELECT p.id FROM projects p
                 JOIN departments d ON p.department_id = d.id
                 WHERE p.id = $1 AND d.company_id = $2`,
                [project_id, userCompanyId]
            );
            
            if (projectCheckResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Project not found or not accessible' });
            }
            
            console.log('🔍 Creating sprint for project_id:', project_id);
            
            const result = await client.query(
                'INSERT INTO sprints (name, start_date, end_date, status, project_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                [name, start_date, end_date, 'planned', project_id]
            );
            
            await client.query('COMMIT');
            console.log('✅ Sprint created successfully:', result.rows[0]);
            res.status(201).json({ success: true, sprint: result.rows[0] });
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Error in createSprint:', error.message);
            res.status(500).json({ success: false, error: error.message });
        } finally {
            client.release();
        }
    },
    // Update a sprint (with company validation)
    updateSprint: async (req, res) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const { id } = req.params;
            const { name, start_date, end_date, status } = req.body;
            
            // Get user's company_id for multi-tenant filtering
            const userResult = await client.query(
                'SELECT company_id FROM users WHERE id = $1',
                [req.user.id]
            );
            
            if (userResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'User not found' });
            }
            
            const userCompanyId = userResult.rows[0].company_id;
            
            // Verify sprint belongs to user's company
            const sprintCheckResult = await client.query(
                `SELECT s.id FROM sprints s
                 JOIN projects p ON s.project_id = p.id
                 JOIN departments d ON p.department_id = d.id
                 WHERE s.id = $1 AND d.company_id = $2`,
                [id, userCompanyId]
            );
            
            if (sprintCheckResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ success: false, error: 'Sprint not found' });
            }
            
            const result = await client.query(
                'UPDATE sprints SET name = $1, start_date = $2, end_date = $3, status = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *',
                [name, start_date, end_date, status, id]
            );
            
            await client.query('COMMIT');
            console.log('✅ Sprint updated successfully:', result.rows[0]);
            res.json({ success: true, sprint: result.rows[0] });
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Error in updateSprint:', error.message);
            res.status(500).json({ success: false, error: error.message });
        } finally {
            client.release();
        }
    },
    // Delete a sprint (with company validation)
    deleteSprint: async (req, res) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const { id } = req.params;
            
            // Get user's company_id for multi-tenant filtering
            const userResult = await client.query(
                'SELECT company_id FROM users WHERE id = $1',
                [req.user.id]
            );
            
            if (userResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'User not found' });
            }
            
            const userCompanyId = userResult.rows[0].company_id;
            
            // Verify sprint belongs to user's company
            const sprintCheckResult = await client.query(
                `SELECT s.id FROM sprints s
                 JOIN projects p ON s.project_id = p.id
                 JOIN departments d ON p.department_id = d.id
                 WHERE s.id = $1 AND d.company_id = $2`,
                [id, userCompanyId]
            );
            
            if (sprintCheckResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ success: false, error: 'Sprint not found' });
            }
            
            const result = await client.query(
                'DELETE FROM sprints WHERE id = $1 RETURNING *',
                [id]
            );
            
            await client.query('COMMIT');
            console.log('✅ Sprint deleted successfully:', result.rows[0]);
            res.json({ success: true, sprint: result.rows[0] });
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Error in deleteSprint:', error.message);
            res.status(500).json({ success: false, error: error.message });
        } finally {
            client.release();
        }
    },
    // Start a sprint (with company validation)
    startSprint: async (req, res) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const { id } = req.params;
            
            // Get user's company_id for multi-tenant filtering
            const userResult = await client.query(
                'SELECT company_id FROM users WHERE id = $1',
                [req.user.id]
            );
            
            if (userResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'User not found' });
            }
            
            const userCompanyId = userResult.rows[0].company_id;
            
            // Verify sprint belongs to user's company and get its project_id
            const sprintCheckResult = await client.query(
                `SELECT s.id, s.project_id FROM sprints s
                 JOIN projects p ON s.project_id = p.id
                 JOIN departments d ON p.department_id = d.id
                 WHERE s.id = $1 AND d.company_id = $2`,
                [id, userCompanyId]
            );
            
            if (sprintCheckResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ success: false, error: 'Sprint not found' });
            }
            
            const sprintProjectId = sprintCheckResult.rows[0].project_id;
            
            // Set all other active sprints in the SAME PROJECT to planned (not all sprints in company)
            await client.query(
                `UPDATE sprints SET status = 'planned' 
                 WHERE project_id = $1 
                 AND status = 'active' 
                 AND id != $2`,
                [sprintProjectId, id]
            );
            
            // Set this sprint to active
            const result = await client.query("UPDATE sprints SET status = 'active' WHERE id = $1 RETURNING *", [id]);
            
            await client.query('COMMIT');
            console.log('✅ Sprint started successfully:', result.rows[0]);
            res.json({ success: true, sprint: result.rows[0] });
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Error in startSprint:', error.message);
            res.status(500).json({ success: false, error: error.message });
        } finally {
            client.release();
        }
    },
    // Complete a sprint (with company validation)
    completeSprint: async (req, res) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const { id } = req.params;
            
            // Get user's company_id for multi-tenant filtering
            const userResult = await client.query(
                'SELECT company_id FROM users WHERE id = $1',
                [req.user.id]
            );
            
            if (userResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'User not found' });
            }
            
            const userCompanyId = userResult.rows[0].company_id;
            
            // Verify sprint belongs to user's company
            const sprintCheckResult = await client.query(
                `SELECT s.id FROM sprints s
                 JOIN projects p ON s.project_id = p.id
                 JOIN departments d ON p.department_id = d.id
                 WHERE s.id = $1 AND d.company_id = $2`,
                [id, userCompanyId]
            );
            
            if (sprintCheckResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ success: false, error: 'Sprint not found' });
            }
            
            const result = await client.query("UPDATE sprints SET status = 'completed' WHERE id = $1 RETURNING *", [id]);
            
            await client.query('COMMIT');
            console.log('✅ Sprint completed successfully:', result.rows[0]);
            res.json({ success: true, sprint: result.rows[0] });
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Error in completeSprint:', error.message);
            res.status(500).json({ success: false, error: error.message });
        } finally {
            client.release();
        }
    },
    // Get sprint burndown data (with company validation)
    getSprintBurndown: async (req, res) => {
        try {
            const { id } = req.params;
            const { priority, assignee } = req.query;
            
            // Get user's company_id for multi-tenant filtering
            const userResult = await pool.query(
                'SELECT company_id FROM users WHERE id = $1',
                [req.user.id]
            );
            
            if (userResult.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            const userCompanyId = userResult.rows[0].company_id;
            
            // Get sprint details (filtered by company)
            const sprintResult = await pool.query(
                `SELECT s.* FROM sprints s
                 JOIN projects p ON s.project_id = p.id
                 JOIN departments d ON p.department_id = d.id
                 WHERE s.id = $1 AND d.company_id = $2`,
                [id, userCompanyId]
            );
            
            if (sprintResult.rows.length === 0) {
                return res.status(404).json({ success: false, error: 'Sprint not found' });
            }
            const sprint = sprintResult.rows[0];

            // Fetch hoursPerDay from settings (fallback to 8)
            let hoursPerDay = 8;
            try {
                const settingsResult = await pool.query('SELECT hours FROM settings_hoursperday ORDER BY id DESC LIMIT 1');
                if (settingsResult.rows.length > 0 && settingsResult.rows[0].hours) {
                    hoursPerDay = parseFloat(settingsResult.rows[0].hours);
                }
            } catch (e) { /* fallback to 8 */ }

            // Build the query with filters (including company filtering)
            let query = `SELECT t.id, t.status, t.completed_at, t.effort 
                        FROM tasks t
                        JOIN users u ON t.reporter_id = u.id
                        WHERE t.sprint_id = $1 AND u.company_id = $2`;
            const queryParams = [id, userCompanyId];
            let paramIndex = 3;
            if (priority) {
                query += ` AND t.priority = $${paramIndex}`;
                queryParams.push(priority);
                paramIndex++;
            }
            if (assignee) {
                query += ` AND t.assignee_id = $${paramIndex}`;
                queryParams.push(assignee);
                paramIndex++;
            }
            
            // Get filtered tasks in the sprint
            const tasksResult = await pool.query(query, queryParams);
            const tasks = tasksResult.rows;

            // Calculate total points (sum of effort in hours)
            const totalHours = tasks.reduce((sum, task) => sum + (typeof task.effort === 'number' ? task.effort : Number(task.effort) || 0), 0);

            // Generate dates between sprint start and end
            const startDate = new Date(sprint.start_date);
            const endDate = new Date(sprint.end_date);
            const dates = [];
            const currentDate = new Date(startDate);
            while (currentDate <= endDate) {
                dates.push(new Date(currentDate));
                currentDate.setDate(currentDate.getDate() + 1);
            }

            // Calculate burndown data (in hours)
            const burndownData = dates.map(date => {
                // Sum effort for completed tasks up to this date
                const completedHours = tasks.reduce((sum, task) => {
                    if (!task.completed_at) return sum;
                    const completedDate = new Date(task.completed_at);
                    if (completedDate <= date) {
                        return sum + (typeof task.effort === 'number' ? task.effort : Number(task.effort) || 0);
                    }
                    return sum;
                }, 0);
                return {
                    date: date.toISOString().split('T')[0],
                    remainingPoints: Math.max(0, totalHours - completedHours), // in hours
                    idealBurndown: totalHours * (1 - (date - startDate) / (endDate - startDate))
                };
            });

            res.json({
                success: true,
                burndownData,
                sprint: {
                    id: sprint.id,
                    name: sprint.name,
                    start_date: sprint.start_date,
                    end_date: sprint.end_date,
                    totalPoints: totalHours, // in hours
                    hoursPerDay
                }
            });
        } catch (error) {
            console.error('❌ Error in getSprintBurndown:', error.message);
            res.status(500).json({ success: false, error: error.message });
        }
    },
    // Reactivate a completed sprint (with company validation)
    reactivateSprint: async (req, res) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const { id } = req.params;
            
            // Get user's company_id for multi-tenant filtering
            const userResult = await client.query(
                'SELECT company_id FROM users WHERE id = $1',
                [req.user.id]
            );
            
            if (userResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'User not found' });
            }
            
            const userCompanyId = userResult.rows[0].company_id;
            
            // Verify sprint belongs to user's company and get its project_id
            const sprintCheckResult = await client.query(
                `SELECT s.id, s.project_id FROM sprints s
                 JOIN projects p ON s.project_id = p.id
                 JOIN departments d ON p.department_id = d.id
                 WHERE s.id = $1 AND d.company_id = $2`,
                [id, userCompanyId]
            );
            
            if (sprintCheckResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ success: false, error: 'Sprint not found' });
            }
            
            const sprintProjectId = sprintCheckResult.rows[0].project_id;
            
            // First, set any active sprint in the SAME PROJECT to planned (not all sprints in company)
            await client.query(
                `UPDATE sprints SET status = 'planned' 
                 WHERE project_id = $1 
                 AND status = 'active' 
                 AND id != $2`,
                [sprintProjectId, id]
            );
            
            // Then set the completed sprint to active
            const result = await client.query(
                "UPDATE sprints SET status = 'active' WHERE id = $1 RETURNING *",
                [id]
            );
            
            await client.query('COMMIT');
            console.log('✅ Sprint reactivated successfully:', result.rows[0]);
            res.json({ success: true, sprint: result.rows[0] });
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Error in reactivateSprint:', error.message);
            res.status(500).json({ success: false, error: error.message });
        } finally {
            client.release();
        }
    },
    exportCompanyCalendarICS: async (req, res) => {
        try {
            const { companyId } = req.params;
            const userCompanyId = req.user.company_id;
            if (parseInt(companyId) !== userCompanyId) {
                return res.status(403).send('Forbidden: You do not have access to this company calendar.');
            }

            // Fetch all sprints for the company
            const sprintsResult = await pool.query(
                `SELECT s.id, s.name, s.start_date, s.end_date, s.status, p.name AS project_name
                 FROM sprints s
                 JOIN projects p ON s.project_id = p.id
                 JOIN departments d ON p.department_id = d.id
                 WHERE d.company_id = $1
                 ORDER BY s.start_date DESC, s.id DESC`,
                [userCompanyId]
            );
            const sprints = sprintsResult.rows;

            // Fetch all tasks for the company
            const tasksResult = await pool.query(
                `SELECT t.id, t.title, t.description, t.status, t.duedate, t.sprint_id, t.project_id, t.created_at, t.completed_at
                 FROM tasks t
                 JOIN users u ON t.reporter_id = u.id
                 WHERE u.company_id = $1
                 ORDER BY t.duedate, t.id`,
                [userCompanyId]
            );
            const tasks = tasksResult.rows;

            // Create calendar
            const cal = ical({ name: `Company ${userCompanyId} Kanban Calendar` });

            // Add sprints as all-day events
            sprints.forEach(sprint => {
                if (sprint.start_date && sprint.end_date) {
                    cal.createEvent({
                        start: new Date(sprint.start_date),
                        end: new Date(sprint.end_date),
                        allDay: true,
                        summary: `[Sprint] ${sprint.name} (${sprint.project_name})`,
                        description: `Sprint Status: ${sprint.status}`
                    });
                }
            });

            // Add tasks as events (use duedate if available, else created_at)
            tasks.forEach(task => {
                const start = task.duedate ? new Date(task.duedate) : new Date(task.created_at);
                const end = task.completed_at ? new Date(task.completed_at) : start;
                cal.createEvent({
                    start,
                    end,
                    summary: `[Task] ${task.title}`,
                    description: task.description || '',
                });
            });

            res.setHeader('Content-Type', 'text/calendar');
            res.setHeader('Content-Disposition', 'attachment; filename="calendar.ics"');
            cal.serve(res);
        } catch (error) {
            console.error('Error generating .ics calendar:', error);
            res.status(500).send('Failed to generate calendar.');
        }
    }
};

module.exports = sprintController; 