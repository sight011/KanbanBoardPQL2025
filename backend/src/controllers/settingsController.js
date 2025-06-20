const pool = require('../db');

const settingsController = {
    // Get hours per day setting
    getHoursPerDay: async (req, res) => {
        try {
            const result = await pool.query('SELECT hours FROM settings_hoursperday ORDER BY id DESC LIMIT 1');
            if (result.rows.length === 0) {
                // If no setting exists, create default
                await pool.query('INSERT INTO settings_hoursperday (hours) VALUES (8.0)');
                return res.json({ hours: 8.0 });
            }
            res.json({ hours: parseFloat(result.rows[0].hours) });
        } catch (error) {
            console.error('Error fetching hours per day setting:', error);
            res.status(500).json({ error: 'Failed to fetch hours per day setting' });
        }
    },

    // Update hours per day setting
    updateHoursPerDay: async (req, res) => {
        try {
            const { hours } = req.body;
            
            if (!hours || isNaN(hours) || hours < 1 || hours > 24) {
                return res.status(400).json({ error: 'Hours must be a number between 1 and 24' });
            }

            // Update the most recent setting or create a new one
            const result = await pool.query(
                'UPDATE settings_hoursperday SET hours = $1, updated_at = NOW() WHERE id = (SELECT id FROM settings_hoursperday ORDER BY id DESC LIMIT 1) RETURNING hours',
                [hours]
            );

            if (result.rows.length === 0) {
                // No existing setting, create new one
                const insertResult = await pool.query(
                    'INSERT INTO settings_hoursperday (hours) VALUES ($1) RETURNING hours',
                    [hours]
                );
                return res.json({ hours: parseFloat(insertResult.rows[0].hours) });
            }

            res.json({ hours: parseFloat(result.rows[0].hours) });
        } catch (error) {
            console.error('Error updating hours per day setting:', error);
            res.status(500).json({ error: 'Failed to update hours per day setting' });
        }
    }
};

module.exports = settingsController; 