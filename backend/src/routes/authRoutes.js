const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');

// Helper to generate a slug from company name
function generateSlug(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
}

// Helper to generate a username from first and last name
function generateUsername(firstName, lastName) {
    const base = `${firstName.toLowerCase()}${lastName.toLowerCase()}`;
    return base.replace(/[^a-z0-9]/g, '');
}

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
        // Use bcrypt to compare password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
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
        res.clearCookie('kanban_session');
        res.json({ message: 'Logged out successfully.' });
    });
});

// GET /api/session - Check if user is logged in
router.get('/session', (req, res) => {
    if (req.session && req.session.userId) {
        res.json({
            isLoggedIn: true,
            userId: req.session.userId,
            role: req.session.role
        });
    } else {
        res.json({
            isLoggedIn: false
        });
    }
});

// POST /api/auth/register - Register first user for a company
router.post('/register', async (req, res) => {
    const { companyName, departmentName, firstName, lastName, email, password } = req.body;
    
    // Validate required fields
    if (!companyName || !departmentName || !firstName || !lastName || !email || !password) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format.' });
    }

    // Validate password strength (minimum 6 characters)
    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const client = await db.connect();
    
    try {
        await client.query('BEGIN');

        // Check if email already exists
        const existingUser = await client.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );
        
        if (existingUser.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Email already registered.' });
        }

        // Check if company already exists
        let company = await client.query(
            'SELECT id FROM companies WHERE name = $1',
            [companyName]
        );

        let companyId;
        if (company.rows.length === 0) {
            // Create new company with slug
            const slug = generateSlug(companyName);
            const newCompany = await client.query(
                'INSERT INTO companies (name, slug, created_at) VALUES ($1, $2, CURRENT_TIMESTAMP) RETURNING id',
                [companyName, slug]
            );
            companyId = newCompany.rows[0].id;
        } else {
            companyId = company.rows[0].id;
        }

        // Set session variable for audit logging
        await client.query(`SET LOCAL app.current_company_id = ${companyId}`);

        // Check if department exists in this company
        let department = await client.query(
            'SELECT id FROM departments WHERE name = $1 AND company_id = $2',
            [departmentName, companyId]
        );

        let departmentId;
        if (department.rows.length === 0) {
            // Create new department
            const newDepartment = await client.query(
                'INSERT INTO departments (name, company_id, created_at) VALUES ($1, $2, CURRENT_TIMESTAMP) RETURNING id',
                [departmentName, companyId]
            );
            departmentId = newDepartment.rows[0].id;
        } else {
            departmentId = department.rows[0].id;
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create user (first user becomes admin)
        const username = generateUsername(firstName, lastName);
        const newUser = await client.query(
            `INSERT INTO users (
                first_name, last_name, email, username, password_hash, role, 
                company_id, is_company_admin, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP) 
            RETURNING id, first_name, last_name, email, role, company_id, is_company_admin`,
            [firstName, lastName, email, username, hashedPassword, 'Admin', companyId, true]
        );

        const user = newUser.rows[0];

        // Add user to department
        await client.query(
            'INSERT INTO user_departments (user_id, department_id, role_in_department, created_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)',
            [user.id, departmentId, 'admin']
        );

        // Create default project for the department
        const defaultProject = await client.query(
            'INSERT INTO projects (name, department_id, created_at) VALUES ($1, $2, CURRENT_TIMESTAMP) RETURNING id',
            ['Default Project', departmentId]
        );

        await client.query('COMMIT');

        // Set session
        req.session.userId = user.id;
        req.session.role = user.role;

        res.status(201).json({
            message: 'Account created successfully!',
            user: {
                id: user.id,
                firstName: user.first_name,
                lastName: user.last_name,
                email: user.email,
                role: user.role,
                companyId: user.company_id,
                companySlug: generateSlug(companyName),
                isCompanyAdmin: user.is_company_admin
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Failed to create account. Please try again.' });
    } finally {
        client.release();
    }
});

module.exports = router; 