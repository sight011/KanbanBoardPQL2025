const pool = require('../db');

// Authentication middleware to require login
const requireLogin = async (req, res, next) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: 'You must be logged in.' });
    }

    try {
        const userId = req.session.userId;
        const { rows } = await pool.query('SELECT id, email, first_name, last_name, role FROM users WHERE id = $1', [userId]);
        
        if (rows.length === 0) {
            return res.status(401).json({ error: 'User not found.' });
        }
        
        req.user = rows[0];
        console.log(`🔐 Authentication successful for user: ${req.user.first_name || 'dev_user'}`);
        next();
    } catch (dbError) {
        console.error('Error fetching user from database', dbError);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};

// Authorization middleware to require admin role
const requireAdmin = async (req, res, next) => {
    if (!req.user) { // Check req.user which is set by requireLogin
        // This middleware should run after requireLogin
        return res.status(401).json({ error: 'Unauthorized: User not authenticated.' });
    }

    if (req.user.role !== 'Admin') { // Check role from req.user
        return res.status(403).json({ error: 'Forbidden: You do not have permission to perform this action.' });
    }

    next();
};

module.exports = { requireLogin, requireAdmin }; 