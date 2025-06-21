const jwt = require('jsonwebtoken');
const pool = require('../db');

const auth = (req, res, next) => {
    try {
        // For development, we'll use a mock user
        // In production, you would verify the JWT token here
        const mockUser = {
            id: 1,
            username: 'dev_user',
            role: 'admin'
        };

        // Add user to request object
        req.user = mockUser;
        
        // Log authentication success
        console.log('🔐 Authentication successful for user:', mockUser.username);
        
        next();
    } catch (error) {
        console.error('❌ Authentication failed:', error.message);
        res.status(401).json({ 
            error: 'Authentication failed',
            message: error.message
        });
    }
};

// Authentication middleware to require login
function requireLogin(req, res, next) {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: 'Unauthorized: Please log in.' });
    }
    // If logged in, attach user ID to the request for convenience
    req.userId = req.session.userId;
    next();
}

// Authorization middleware to require admin role
async function requireAdmin(req, res, next) {
    if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized: User not authenticated.' });
    }

    try {
        const result = await pool.query('SELECT role FROM users WHERE id = $1', [req.userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const userRole = result.rows[0].role;
        if (userRole !== 'Admin') {
            return res.status(403).json({ error: 'Forbidden: You do not have permission to perform this action.' });
        }

        next();
    } catch (err) {
        console.error('Authorization error in requireAdmin:', err);
        return res.status(500).json({ error: 'Server error during authorization.' });
    }
}

module.exports = { auth, requireLogin, requireAdmin }; 