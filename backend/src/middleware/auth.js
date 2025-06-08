const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
    try {
        // For development, we'll skip authentication
        // In production, you would verify the JWT token here
        req.user = { id: 2 }; // Temporary user ID for development
        next();
    } catch (error) {
        res.status(401).json({ error: 'Authentication failed' });
    }
};

module.exports = auth; 