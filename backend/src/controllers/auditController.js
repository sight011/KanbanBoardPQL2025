const pool = require('../db');

const auditController = {
    getAuditLogs: async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM task_history ORDER BY changed_at DESC');
            res.status(200).json({
                success: true,
                logs: result.rows,
            });
        } catch (err) {
            console.error('Error in getAuditLogs:', err.message);
            res.status(500).json({
                error: 'Server error',
                message: err.message,
            });
        }
    },
};

module.exports = auditController; 