const jwt = require('jsonwebtoken');

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

module.exports = auth; 