const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all users
router.get('/', async (req, res) => {
    try {
        const [users] = await db.query('SELECT id, username, email, created_at FROM users');
        // Parse firstName and lastName from username
        const parsedUsers = users.map(user => {
            const [firstName, lastName] = user.username.split(' ');
            return {
                ...user,
                firstName: firstName || '',
                lastName: lastName || ''
            };
        });
        res.json({ users: parsedUsers });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

module.exports = router; 