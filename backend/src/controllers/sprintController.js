const pool = require('../db/db');

const sprintController = {
    // List all sprints
    getAllSprints: async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM sprints ORDER BY start_date DESC, id DESC');
            res.json({ success: true, sprints: result.rows });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    // Get a single sprint
    getSprintById: async (req, res) => {
        try {
            const { id } = req.params;
            const result = await pool.query('SELECT * FROM sprints WHERE id = $1', [id]);
            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, error: 'Sprint not found' });
            }
            res.json({ success: true, sprint: result.rows[0] });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    // Create a new sprint
    createSprint: async (req, res) => {
        try {
            const { name, start_date, end_date } = req.body;
            if (!name) {
                return res.status(400).json({ success: false, error: 'Sprint name is required' });
            }
            const result = await pool.query(
                'INSERT INTO sprints (name, start_date, end_date, status) VALUES ($1, $2, $3, $4) RETURNING *',
                [name, start_date, end_date, 'planned']
            );
            res.status(201).json({ success: true, sprint: result.rows[0] });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    // Update a sprint
    updateSprint: async (req, res) => {
        try {
            const { id } = req.params;
            const { name, start_date, end_date, status } = req.body;
            const result = await pool.query(
                'UPDATE sprints SET name = $1, start_date = $2, end_date = $3, status = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *',
                [name, start_date, end_date, status, id]
            );
            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, error: 'Sprint not found' });
            }
            res.json({ success: true, sprint: result.rows[0] });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    // Delete a sprint
    deleteSprint: async (req, res) => {
        try {
            const { id } = req.params;
            // Unassign tasks from this sprint
            await pool.query('UPDATE tasks SET sprint_id = NULL WHERE sprint_id = $1', [id]);
            // Delete the sprint
            const result = await pool.query('DELETE FROM sprints WHERE id = $1 RETURNING *', [id]);
            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, error: 'Sprint not found' });
            }
            res.json({ success: true, message: 'Sprint deleted', sprint: result.rows[0] });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    // Start a sprint (set status to active, set all others to not active)
    startSprint: async (req, res) => {
        try {
            const { id } = req.params;
            // Set all other sprints to not active
            await pool.query("UPDATE sprints SET status = 'planned' WHERE status = 'active'");
            // Set this sprint to active
            const result = await pool.query("UPDATE sprints SET status = 'active' WHERE id = $1 RETURNING *", [id]);
            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, error: 'Sprint not found' });
            }
            res.json({ success: true, sprint: result.rows[0] });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    // Complete a sprint (set status to completed)
    completeSprint: async (req, res) => {
        try {
            const { id } = req.params;
            const result = await pool.query("UPDATE sprints SET status = 'completed' WHERE id = $1 RETURNING *", [id]);
            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, error: 'Sprint not found' });
            }
            // No longer move incomplete tasks to backlog; all tasks remain in the sprint
            res.json({ success: true, sprint: result.rows[0] });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
};

module.exports = sprintController; 