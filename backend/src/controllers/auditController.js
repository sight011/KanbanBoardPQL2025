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

    getTasksWithChanges: async (req, res) => {
        try {
            const { timeFrame } = req.query;
            
            let timeCondition = '';
            const now = new Date();
            
            switch (timeFrame) {
                case 'today':
                    timeCondition = "AND th.changed_at >= CURRENT_DATE";
                    break;
                case 'yesterday':
                    timeCondition = "AND th.changed_at >= CURRENT_DATE - INTERVAL '1 day' AND th.changed_at < CURRENT_DATE";
                    break;
                case 'lastTwoDays':
                    timeCondition = "AND th.changed_at >= CURRENT_DATE - INTERVAL '2 days'";
                    break;
                case 'last24h':
                    timeCondition = "AND th.changed_at >= NOW() - INTERVAL '24 hours'";
                    break;
                case 'last7d':
                    timeCondition = "AND th.changed_at >= NOW() - INTERVAL '7 days'";
                    break;
                case 'last14d':
                    timeCondition = "AND th.changed_at >= NOW() - INTERVAL '14 days'";
                    break;
                default:
                    timeCondition = '';
            }

            const result = await pool.query(`
                SELECT DISTINCT t.id, t.title, t.status, t.priority, t.assignee_id, t.sprint_id
                FROM tasks t
                INNER JOIN task_history th ON t.id = th.task_id
                WHERE (th.field_name = 'status' OR th.field_name = 'timespent')
                ${timeCondition}
                ORDER BY t.id
            `);

            res.status(200).json({
                success: true,
                tasks: result.rows,
            });
        } catch (err) {
            console.error('Error in getTasksWithChanges:', err.message);
            res.status(500).json({
                error: 'Server error',
                message: err.message,
            });
        }
    },
};

module.exports = auditController; 