const pool = require('../db');

const auditController = {
    getAuditLogs: async (req, res) => {
        try {
            const result = await pool.query(`
                SELECT 
                    th.id, 
                    th.task_id, 
                    th.user_id, 
                    u.username,
                    th.field_name, 
                    th.old_value, 
                    th.new_value, 
                    th.changed_at 
                FROM task_history th
                LEFT JOIN users u ON th.user_id = u.id
                ORDER BY th.changed_at DESC
            `);
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