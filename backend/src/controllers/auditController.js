const pool = require('../db');

const auditController = {
    getAuditLogs: async (req, res) => {
        try {
            // Get the current user's company_id
            const userResult = await pool.query('SELECT company_id FROM users WHERE id = $1', [req.user.id]);
            if (userResult.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            const userCompanyId = userResult.rows[0].company_id;

            const result = await pool.query(`
                SELECT 
                    al.id, 
                    al.entity_id as task_id, 
                    al.user_id, 
                    u.first_name || ' ' || u.last_name as username,
                    al.action_type as field_name, 
                    al.details->>'old_values' as old_value, 
                    al.details->>'new_values' as new_value, 
                    al.created_at as changed_at,
                    al.entity_type,
                    al.details
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.id
                WHERE al.company_id = $1
                ORDER BY al.created_at DESC
                LIMIT 1000
            `, [userCompanyId]);
            
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
            // Get the current user's company_id
            const userResult = await pool.query('SELECT company_id FROM users WHERE id = $1', [req.user.id]);
            if (userResult.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            const userCompanyId = userResult.rows[0].company_id;

            const { timeFrame } = req.query;
            
            let timeCondition = '';
            const now = new Date();
            
            switch (timeFrame) {
                case 'today':
                    timeCondition = "AND al.created_at >= CURRENT_DATE";
                    break;
                case 'yesterday':
                    timeCondition = "AND al.created_at >= CURRENT_DATE - INTERVAL '1 day' AND al.created_at < CURRENT_DATE";
                    break;
                case 'lastTwoDays':
                    timeCondition = "AND al.created_at >= CURRENT_DATE - INTERVAL '2 days'";
                    break;
                case 'last24h':
                    timeCondition = "AND al.created_at >= NOW() - INTERVAL '24 hours'";
                    break;
                case 'last7d':
                    timeCondition = "AND al.created_at >= NOW() - INTERVAL '7 days'";
                    break;
                case 'last14d':
                    timeCondition = "AND al.created_at >= NOW() - INTERVAL '14 days'";
                    break;
                default:
                    timeCondition = '';
            }

            const result = await pool.query(`
                SELECT DISTINCT t.id, t.title, t.status, t.priority, t.assignee_id, t.sprint_id
                FROM tasks t
                INNER JOIN audit_logs al ON t.id = al.entity_id
                WHERE al.company_id = $1 
                AND al.entity_type = 'tasks'
                AND (al.action_type = 'UPDATE' OR al.action_type = 'INSERT')
                ${timeCondition}
                ORDER BY t.id
            `, [userCompanyId]);

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