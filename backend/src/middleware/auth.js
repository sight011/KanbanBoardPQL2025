const pool = require('../db');

// Authentication middleware to require login
const requireLogin = async (req, res, next) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: 'You must be logged in.' });
    }

    try {
        const userId = req.session.userId;
        const { rows } = await pool.query('SELECT id, email, first_name, last_name, role, company_id FROM users WHERE id = $1', [userId]);
        
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

// Authentication middleware with tenant context setup
const requireLoginWithTenant = async (req, res, next) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: 'You must be logged in.' });
    }

    try {
        const userId = req.session.userId;
        const { rows } = await pool.query('SELECT id, email, first_name, last_name, role, company_id FROM users WHERE id = $1', [userId]);
        
        if (rows.length === 0) {
            return res.status(401).json({ error: 'User not found.' });
        }
        
        req.user = rows[0];
        console.log(`🔐 Authentication successful for user: ${req.user.first_name || 'dev_user'}`);
        
        // Set tenant context for audit logging
        if (req.user.company_id) {
            await setDatabaseTenantContext(req.user.company_id, req.user.id);
        }
        
        next();
    } catch (dbError) {
        console.error('Error fetching user from database', dbError);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};

// Enhanced authentication middleware with company isolation enforcement
const requireLoginWithCompanyIsolation = async (req, res, next) => {
    if (!req.session || !req.session.userId) {
        console.log('🚫 Unauthorized access attempt - no session');
        return res.status(401).json({ error: 'You must be logged in.' });
    }

    try {
        const userId = req.session.userId;
        const { rows } = await pool.query('SELECT id, email, first_name, last_name, role, company_id FROM users WHERE id = $1', [userId]);
        
        if (rows.length === 0) {
            console.log('🚫 Unauthorized access attempt - user not found:', userId);
            return res.status(401).json({ error: 'User not found.' });
        }
        
        req.user = rows[0];
        
        // Ensure company_id is always present for multi-tenant security
        if (!req.user.company_id) {
            console.log('🚫 Security violation - user without company_id:', req.user.id);
            return res.status(403).json({ error: 'User not assigned to any company.' });
        }
        
        // Only log authentication on first request or important events
        if (!req.session.authLogged) {
            console.log(`🔐 Authentication successful for user: ${req.user.first_name || 'dev_user'} (Company: ${req.user.company_id})`);
            req.session.authLogged = true;
        }
        
        // Set tenant context for audit logging
        await setDatabaseTenantContext(req.user.company_id, req.user.id);
        
        next();
    } catch (dbError) {
        console.error('❌ Database error in authentication:', dbError);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};

// Set database session context for audit logging
async function setDatabaseTenantContext(companyId, userId) {
    const client = await pool.connect();
    
    try {
        await client.query('SELECT set_tenant_context($1, $2)', [companyId, userId]);
    } finally {
        client.release();
    }
}

// Authorization middleware to require admin role
const requireAdmin = async (req, res, next) => {
    if (!req.user) { // Check req.user which is set by requireLogin
        // This middleware should run after requireLogin
        return res.status(401).json({ error: 'Unauthorized: User not authenticated.' });
    }

    if (req.user.role !== 'Admin') { // Check role from req.user
        console.log('🚫 Unauthorized admin access attempt by user:', req.user.id);
        return res.status(403).json({ error: 'Forbidden: You do not have permission to perform this action.' });
    }

    next();
};

// Security middleware to validate company ownership of resources
const validateCompanyOwnership = async (req, res, next) => {
    try {
        // This middleware should be used after requireLoginWithCompanyIsolation
        if (!req.user || !req.user.company_id) {
            console.log('🚫 Security violation - validateCompanyOwnership called without proper user context');
            return res.status(403).json({ error: 'Security violation: Invalid user context.' });
        }

        // Log security validation
        console.log(`🔒 Validating company ownership for user: ${req.user.id} (Company: ${req.user.company_id})`);
        
        next();
    } catch (error) {
        console.error('❌ Error in validateCompanyOwnership:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};

// Enhanced security middleware to prevent parameter tampering
const enforceCompanyIsolation = async (req, res, next) => {
    try {
        // This middleware should be used after requireLoginWithCompanyIsolation
        if (!req.user || !req.user.company_id) {
            console.log('🚫 Security violation - enforceCompanyIsolation called without proper user context');
            return res.status(403).json({ error: 'Security violation: Invalid user context.' });
        }

        const userCompanyId = req.user.company_id;
        
        // Only log security enforcement on first request or when tampering is detected
        if (!req.session.isolationLogged) {
            console.log(`🔒 Enforcing company isolation for user: ${req.user.id} (Company: ${userCompanyId})`);
            req.session.isolationLogged = true;
        }

        // Forcefully override any company_id in request body
        if (req.body) {
            if (req.body.company_id && req.body.company_id !== userCompanyId) {
                console.log(`🚫 Security warning - company_id tampering detected in body: ${req.body.company_id} -> ${userCompanyId}`);
            }
            req.body.company_id = userCompanyId;
        }

        // Forcefully override any company_id in request params
        if (req.params) {
            if (req.params.company_id && req.params.company_id !== userCompanyId) {
                console.log(`🚫 Security warning - company_id tampering detected in params: ${req.params.company_id} -> ${userCompanyId}`);
            }
            req.params.company_id = userCompanyId;
        }

        // Forcefully override any company_id in request query
        if (req.query) {
            if (req.query.company_id && req.query.company_id !== userCompanyId) {
                console.log(`🚫 Security warning - company_id tampering detected in query: ${req.query.company_id} -> ${userCompanyId}`);
            }
            req.query.company_id = userCompanyId;
        }

        // Also handle department_id if present (should belong to user's company)
        if (req.body && req.body.department_id) {
            // Validate that department belongs to user's company
            try {
                const { rows } = await pool.query(
                    'SELECT id FROM departments WHERE id = $1 AND company_id = $2',
                    [req.body.department_id, userCompanyId]
                );
                if (rows.length === 0) {
                    console.log(`🚫 Security warning - department_id tampering detected: ${req.body.department_id} not in company ${userCompanyId}`);
                    delete req.body.department_id;
                }
            } catch (error) {
                console.log('🚫 Security warning - invalid department_id, removing:', req.body.department_id);
                delete req.body.department_id;
            }
        }

        next();
    } catch (error) {
        console.error('❌ Error in enforceCompanyIsolation:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};

// Middleware to sanitize and validate company-related parameters
const sanitizeCompanyParams = async (req, res, next) => {
    try {
        // Remove any company_id from request body/params to prevent parameter tampering
        if (req.body && req.body.company_id) {
            console.log('🚫 Security warning - company_id in request body removed:', req.body.company_id);
            delete req.body.company_id;
        }
        
        if (req.params && req.params.company_id) {
            console.log('🚫 Security warning - company_id in request params removed:', req.params.company_id);
            delete req.params.company_id;
        }
        
        if (req.query && req.query.company_id) {
            console.log('🚫 Security warning - company_id in request query removed:', req.query.company_id);
            delete req.query.company_id;
        }
        
        next();
    } catch (error) {
        console.error('❌ Error in sanitizeCompanyParams:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};

module.exports = { 
    requireLogin, 
    requireLoginWithTenant, 
    requireLoginWithCompanyIsolation,
    requireAdmin,
    validateCompanyOwnership,
    sanitizeCompanyParams,
    enforceCompanyIsolation
}; 