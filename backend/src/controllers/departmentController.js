const pool = require('../db');

const departmentController = {
    // Get all departments for the current user's company
    getAllDepartments: async (req, res) => {
        console.log('🔍 getAllDepartments endpoint hit');
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
            console.log('🔍 Filtering departments for company_id:', userCompanyId);
            
            const result = await pool.query(
                'SELECT id, name, created_at FROM departments WHERE company_id = $1 ORDER BY name ASC',
                [userCompanyId]
            );
            
            console.log('✅ Found', result.rows.length, 'departments for company', userCompanyId);
            res.status(200).json({
                success: true,
                departments: result.rows,
                message: 'Departments retrieved successfully'
            });
        } catch (err) {
            console.error('❌ Error in getAllDepartments:', err.message);
            console.error('Full error stack:', err.stack);
            res.status(500).json({ error: 'Server error', details: err.message });
        }
    }
};

module.exports = departmentController; 