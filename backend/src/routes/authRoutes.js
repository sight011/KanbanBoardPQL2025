const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /api/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }
    try {
        const result = await db.query(
            'SELECT id, email, role, password_hash, first_name as "firstName", last_name as "lastName", username FROM users WHERE email = $1',
            [email]
        );
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }
        const user = result.rows[0];
        // For now, compare plain text password
        if (user.password_hash !== password) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }
        // Store user info in session
        req.session.userId = user.id;
        req.session.role = user.role;
        res.json({
            id: user.id,
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to login.' });
    }
});

// POST /api/logout
router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ error: 'Failed to logout.' });
        }
        res.clearCookie('connect.sid');
        res.json({ message: 'Logged out successfully.' });
    });
});

module.exports = router; 