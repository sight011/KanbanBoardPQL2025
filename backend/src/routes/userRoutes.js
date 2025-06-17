const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all users
router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT id, username, first_name as "firstName", last_name as "lastName", email, role, created_at FROM users');
        res.json({ users: result.rows });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Get current user profile
router.get('/profile', async (req, res) => {
    try {
        // TODO: Get actual user ID from session/token
        const userId = 1; // Temporary: using a default user ID
        const result = await db.query(
            'SELECT id, username, first_name as "firstName", last_name as "lastName", email, role, created_at FROM users WHERE id = $1',
            [userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ user: result.rows[0] });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: 'Failed to fetch user profile' });
    }
});

// Update user names
router.patch('/profile/names', async (req, res) => {
    try {
        const { firstName, lastName } = req.body;
        // TODO: Get actual user ID from session/token
        const userId = 1; // Temporary: using a default user ID

        if (!firstName || !lastName) {
            return res.status(400).json({ error: 'First name and last name are required' });
        }

        const result = await db.query(
            'UPDATE users SET first_name = $1, last_name = $2 WHERE id = $3 RETURNING id, first_name as "firstName", last_name as "lastName"',
            [firstName, lastName, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ 
            message: 'Names updated successfully',
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating user names:', error);
        res.status(500).json({ error: 'Failed to update names' });
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
        const result = await db.query(
            'UPDATE users SET role = $1 WHERE id = $2 RETURNING *',
            [role, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ 
            message: 'User role updated successfully',
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).json({ error: 'Failed to update user role' });
    }
});

module.exports = router; 