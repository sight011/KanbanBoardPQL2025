const { Pool } = require('pg');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'kanban_board',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
};

const pool = new Pool(dbConfig);

/**
 * Middleware to extract and validate tenant context
 * Supports multiple methods of tenant identification:
 * 1. Subdomain (e.g., acme-corp.yourdomain.com)
 * 2. Header (X-Company-Slug)
 * 3. JWT token (company_id claim)
 * 4. Query parameter (company_slug)
 */
const tenantContextMiddleware = async (req, res, next) => {
  try {
    // Extract company identifier from various sources
    const companySlug = extractCompanySlug(req);
    
    if (!companySlug) {
      // For public routes or routes that don't require tenant context
      req.tenantContext = { 
        companyId: null, 
        companySlug: null,
        isMultiTenant: false 
      };
      return next();
    }
    
    // Validate and get company details
    const company = await getCompanyBySlug(companySlug);
    
    if (!company) {
      return res.status(404).json({ 
        error: 'Company not found', 
        message: `Company with slug '${companySlug}' does not exist` 
      });
    }
    
    // Check if company is active
    if (company.subscription_status !== 'active') {
      return res.status(403).json({ 
        error: 'Company access denied', 
        message: `Company subscription is ${company.subscription_status}` 
      });
    }
    
    // Set tenant context
    req.tenantContext = {
      companyId: company.id,
      companySlug: company.slug,
      companyName: company.name,
      subscriptionPlan: company.subscription_plan,
      subscriptionStatus: company.subscription_status,
      maxUsers: company.max_users,
      isMultiTenant: true
    };
    
    // Set database session context for audit logging
    if (req.user && req.user.id) {
      await setDatabaseTenantContext(company.id, req.user.id);
    }
    
    next();
  } catch (error) {
    console.error('Tenant context middleware error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: 'Failed to establish tenant context' 
    });
  }
};

/**
 * Extract company slug from request
 */
function extractCompanySlug(req) {
  // Method 1: Subdomain
  if (req.subdomains && req.subdomains.length > 0) {
    return req.subdomains[0];
  }
  
  // Method 2: Header
  if (req.headers['x-company-slug']) {
    return req.headers['x-company-slug'];
  }
  
  // Method 3: JWT token (if using JWT)
  if (req.user && req.user.company_slug) {
    return req.user.company_slug;
  }
  
  // Method 4: Query parameter
  if (req.query.company_slug) {
    return req.query.company_slug;
  }
  
  // Method 5: Body parameter (for POST requests)
  if (req.body && req.body.company_slug) {
    return req.body.company_slug;
  }
  
  return null;
}

/**
 * Get company by slug
 */
async function getCompanyBySlug(slug) {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      'SELECT * FROM companies WHERE slug = $1 AND deleted_at IS NULL',
      [slug]
    );
    
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

/**
 * Set database session context for audit logging
 */
async function setDatabaseTenantContext(companyId, userId) {
  const client = await pool.connect();
  
  try {
    await client.query('SELECT set_tenant_context($1, $2)', [companyId, userId]);
  } finally {
    client.release();
  }
}

/**
 * Middleware to validate user access to current tenant
 */
const validateTenantAccess = async (req, res, next) => {
  try {
    if (!req.tenantContext || !req.tenantContext.isMultiTenant) {
      return res.status(400).json({ 
        error: 'Tenant context required', 
        message: 'This endpoint requires valid tenant context' 
      });
    }
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        error: 'Authentication required', 
        message: 'User must be authenticated' 
      });
    }
    
    // Validate user belongs to the company
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'SELECT validate_user_company_access($1, $2) as has_access',
        [req.user.id, req.tenantContext.companyId]
      );
      
      if (!result.rows[0].has_access) {
        return res.status(403).json({ 
          error: 'Access denied', 
          message: 'User does not have access to this company' 
        });
      }
    } finally {
      client.release();
    }
    
    next();
  } catch (error) {
    console.error('Tenant access validation error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: 'Failed to validate tenant access' 
    });
  }
};

/**
 * Middleware to check project permissions
 */
const checkProjectPermission = (permission = 'read') => {
  return async (req, res, next) => {
    try {
      const projectId = req.params.projectId || req.body.projectId || req.query.projectId;
      
      if (!projectId) {
        return res.status(400).json({ 
          error: 'Project ID required', 
          message: 'Project ID must be provided' 
        });
      }
      
      if (!req.user || !req.user.id) {
        return res.status(401).json({ 
          error: 'Authentication required', 
          message: 'User must be authenticated' 
        });
      }
      
      // Check project permission
      const client = await pool.connect();
      
      try {
        const result = await client.query(
          'SELECT check_project_permission($1, $2, $3) as has_permission',
          [req.user.id, projectId, permission]
        );
        
        if (!result.rows[0].has_permission) {
          return res.status(403).json({ 
            error: 'Permission denied', 
            message: `User does not have ${permission} permission for this project` 
          });
        }
      } finally {
        client.release();
      }
      
      next();
    } catch (error) {
      console.error('Project permission check error:', error);
      res.status(500).json({ 
        error: 'Internal server error', 
        message: 'Failed to check project permissions' 
      });
    }
  };
};

/**
 * Helper function to get user's accessible projects
 */
async function getUserAccessibleProjects(userId) {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      'SELECT * FROM get_user_accessible_projects($1)',
      [userId]
    );
    
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Helper function to log user activity
 */
async function logUserActivity(userId, companyId, activityType, activityDetails = null, req = null) {
  const client = await pool.connect();
  
  try {
    const ipAddress = req ? req.ip : null;
    const userAgent = req ? req.get('User-Agent') : null;
    
    await client.query(
      'SELECT log_user_activity($1, $2, $3, $4, $5, $6)',
      [userId, companyId, activityType, activityDetails, ipAddress, userAgent]
    );
  } finally {
    client.release();
  }
}

module.exports = {
  tenantContextMiddleware,
  validateTenantAccess,
  checkProjectPermission,
  getUserAccessibleProjects,
  logUserActivity,
  getCompanyBySlug
}; 