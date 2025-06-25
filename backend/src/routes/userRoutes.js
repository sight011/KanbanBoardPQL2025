const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireLogin } = require('../middleware/auth');
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10;

// Get all users (excluding deleted)
router.get('/', requireLogin, async (req, res) => {
    try {
        // Get the current user's company_id
        const userResult = await db.query('SELECT company_id FROM users WHERE id = $1', [req.user.id]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const userCompanyId = userResult.rows[0].company_id;
        const result = await db.query(`
            SELECT u.id, u.username, u.first_name as "firstName", u.last_name as "lastName", 
                   u.email, u.role, u.country, u.created_at, c.name as "companyName"
            FROM users u
            LEFT JOIN companies c ON u.company_id = c.id
            WHERE (u.deleted = false OR u.deleted IS NULL) AND u.company_id = $1
            ORDER BY u.created_at DESC
        `, [userCompanyId]);
        res.json({ users: result.rows });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Get current user profile
router.get('/profile', requireLogin, async (req, res) => {
    try {
        // TODO: Get actual user ID from session/token
        const userId = 1; // Temporary: using a default user ID
        const result = await db.query(
            'SELECT id, username, first_name as "firstName", last_name as "lastName", email, role, country, created_at FROM users WHERE id = $1',
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
router.patch('/profile/names', requireLogin, async (req, res) => {
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
router.patch('/:userId/role', requireLogin, async (req, res) => {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['Admin', 'Project/Product', 'User', 'Checker'].includes(role)) {
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

// Update user country
router.patch('/:userId/country', requireLogin, async (req, res) => {
    const { userId } = req.params;
    const { country } = req.body;

    try {
        const result = await db.query(
            'UPDATE users SET country = $1 WHERE id = $2 RETURNING *',
            [country, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ 
            message: 'User country updated successfully',
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating user country:', error);
        res.status(500).json({ error: 'Failed to update user country' });
    }
});

// Add user
router.post('/', async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;
        if (!firstName || !lastName || !email) {
            return res.status(400).json({ error: 'First name, last name, and email are required.' });
        }
        // Check if email already exists
        const exists = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (exists.rows.length > 0) {
            return res.status(400).json({ error: 'A user with this email already exists.' });
        }
        // Generate username from first and last name (lowercase, no spaces)
        const username = `${firstName}${lastName}`.replace(/\s+/g, '').toLowerCase();
        // Hash the password (use provided or default)
        const plainPassword = password || 'longpassword1';
        const password_hash = await bcrypt.hash(plainPassword, SALT_ROUNDS);
        // Set default role
        const role = 'User';
        const result = await db.query(
            'INSERT INTO users (first_name, last_name, email, username, password_hash, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, first_name as "firstName", last_name as "lastName", email, role, created_at',
            [firstName, lastName, email, username, password_hash, role]
        );
        res.status(201).json({ user: result.rows[0] });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// Delete user (soft delete)
router.delete('/:userId', requireLogin, async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Check if user exists
        const userExists = await db.query('SELECT id FROM users WHERE id = $1', [userId]);
        if (userExists.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Soft delete by setting deleted flag
        await db.query('UPDATE users SET deleted = true WHERE id = $1', [userId]);

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

module.exports = router; 