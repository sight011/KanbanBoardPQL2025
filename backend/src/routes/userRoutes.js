const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all users
router.get('/', async (req, res) => {
    try {
        const [users] = await db.query('SELECT id, username, firstName, lastName, email, role, created_at FROM users');
        res.json({ users });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Update user role
router.patch('/:userId/role', async (req, res) => {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['Admin', 'Project/Product', 'User'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
    }

    try {
        const [result] = await db.query(
            'UPDATE users SET role = ? WHERE id = ?',
            [role, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'User role updated successfully' });
    } catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).json({ error: 'Failed to update user role' });
    }
});

module.exports = router; 