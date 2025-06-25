-- Multi-Tenant SaaS Database Migration
-- ORM Query Patterns and Helper Functions
-- This file provides recommended query patterns for maintaining tenant isolation

-- =====================================================
-- PART 1: HELPER FUNCTIONS FOR TENANT CONTEXT
-- =====================================================

-- Function to set current tenant context
CREATE OR REPLACE FUNCTION set_tenant_context(
    p_company_id INTEGER,
    p_user_id INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Set session variables for current tenant context
    PERFORM set_config('app.company_id', p_company_id::TEXT, FALSE);
    PERFORM set_config('app.user_id', COALESCE(p_user_id, 0)::TEXT, FALSE);
END;
$$ LANGUAGE plpgsql;

-- Function to get current tenant context
CREATE OR REPLACE FUNCTION get_tenant_context()
RETURNS TABLE (
    company_id INTEGER,
    user_id INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(current_setting('app.company_id', TRUE)::INTEGER, 0) as company_id,
        COALESCE(current_setting('app.user_id', TRUE)::INTEGER, 0) as user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to validate user access to company
CREATE OR REPLACE FUNCTION validate_user_company_access(
    p_user_id INTEGER,
    p_company_id INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    user_company_id INTEGER;
BEGIN
    SELECT company_id INTO user_company_id
    FROM users
    WHERE id = p_user_id AND deleted IS NOT TRUE;
    
    RETURN user_company_id = p_company_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 2: TENANT-ISOLATED QUERY FUNCTIONS
-- =====================================================

-- Get tasks for a company with optional project filter
CREATE OR REPLACE FUNCTION get_company_tasks(
    p_company_id INTEGER,
    p_project_id INTEGER DEFAULT NULL,
    p_status VARCHAR(50) DEFAULT NULL,
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id INTEGER,
    title VARCHAR(255),
    description TEXT,
    status VARCHAR(50),
    priority VARCHAR(20),
    "position" INTEGER,
    reporter_id INTEGER,
    assignee_id INTEGER,
    project_id INTEGER,
    epic_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    reporter_name VARCHAR(100),
    assignee_name VARCHAR(100),
    project_name VARCHAR(255)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.title,
        t.description,
        t.status,
        t.priority,
        t."position",
        t.reporter_id,
        t.assignee_id,
        t.project_id,
        t.epic_id,
        t.created_at,
        t.updated_at,
        CONCAT(ru.first_name, ' ', ru.last_name)::VARCHAR(100) as reporter_name,
        CONCAT(au.first_name, ' ', au.last_name)::VARCHAR(100) as assignee_name,
        p.name as project_name
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    JOIN departments d ON p.department_id = d.id
    LEFT JOIN users ru ON t.reporter_id = ru.id
    LEFT JOIN users au ON t.assignee_id = au.id
    WHERE d.company_id = p_company_id
      AND (p_project_id IS NULL OR t.project_id = p_project_id)
      AND (p_status IS NULL OR t.status = p_status)
    ORDER BY t."position", t.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Get sprints for a company with optional project filter
CREATE OR REPLACE FUNCTION get_company_sprints(
    p_company_id INTEGER,
    p_project_id INTEGER DEFAULT NULL,
    p_status VARCHAR(20) DEFAULT NULL,
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id INTEGER,
    name VARCHAR(100),
    start_date DATE,
    end_date DATE,
    status VARCHAR(20),
    project_id INTEGER,
    project_name VARCHAR(255),
    task_count BIGINT,
    completed_task_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.name,
        s.start_date,
        s.end_date,
        s.status,
        s.project_id,
        p.name as project_name,
        COUNT(t.id) as task_count,
        COUNT(CASE WHEN t.status = 'done' THEN 1 END) as completed_task_count
    FROM sprints s
    JOIN projects p ON s.project_id = p.id
    JOIN departments d ON p.department_id = d.id
    LEFT JOIN tasks t ON s.id = t.sprint_id
    WHERE d.company_id = p_company_id
      AND (p_project_id IS NULL OR s.project_id = p_project_id)
      AND (p_status IS NULL OR s.status = p_status)
    GROUP BY s.id, s.name, s.start_date, s.end_date, s.status, s.project_id, p.name
    ORDER BY s.start_date DESC, s.name
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Get users for a company with department information
CREATE OR REPLACE FUNCTION get_company_users(
    p_company_id INTEGER,
    p_department_id INTEGER DEFAULT NULL,
    p_role VARCHAR(20) DEFAULT NULL,
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id INTEGER,
    username VARCHAR(50),
    email VARCHAR(100),
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    role VARCHAR(32),
    is_company_admin BOOLEAN,
    last_login_at TIMESTAMP WITH TIME ZONE,
    department_id INTEGER,
    department_name VARCHAR(255),
    role_in_department VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.username,
        u.email,
        u.first_name,
        u.last_name,
        u.role,
        u.is_company_admin,
        u.last_login_at,
        ud.department_id,
        d.name as department_name,
        ud.role_in_department
    FROM users u
    LEFT JOIN user_departments ud ON u.id = ud.user_id
    LEFT JOIN departments d ON ud.department_id = d.id
    WHERE u.company_id = p_company_id
      AND u.deleted IS NOT TRUE
      AND (p_department_id IS NULL OR ud.department_id = p_department_id)
      AND (p_role IS NULL OR u.role = p_role)
    ORDER BY u.first_name, u.last_name
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Get project hierarchy for a company
CREATE OR REPLACE FUNCTION get_company_projects(
    p_company_id INTEGER,
    p_department_id INTEGER DEFAULT NULL,
    p_status VARCHAR(20) DEFAULT NULL,
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id INTEGER,
    name VARCHAR(255),
    description TEXT,
    start_date DATE,
    end_date DATE,
    status VARCHAR(20),
    department_id INTEGER,
    department_name VARCHAR(255),
    task_count BIGINT,
    sprint_count BIGINT,
    user_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.description,
        p.start_date,
        p.end_date,
        p.status,
        p.department_id,
        d.name as department_name,
        COUNT(DISTINCT t.id) as task_count,
        COUNT(DISTINCT s.id) as sprint_count,
        COUNT(DISTINCT ud.user_id) as user_count
    FROM projects p
    JOIN departments d ON p.department_id = d.id
    LEFT JOIN tasks t ON p.id = t.project_id
    LEFT JOIN sprints s ON p.id = s.project_id
    LEFT JOIN user_departments ud ON d.id = ud.department_id
    WHERE d.company_id = p_company_id
      AND p.deleted_at IS NULL
      AND (p_department_id IS NULL OR p.department_id = p_department_id)
      AND (p_status IS NULL OR p.status = p_status)
    GROUP BY p.id, p.name, p.description, p.start_date, p.end_date, p.status, p.department_id, d.name
    ORDER BY p.created_at DESC, p.name
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 3: AUDIT AND ACTIVITY FUNCTIONS
-- =====================================================

-- Log user activity
CREATE OR REPLACE FUNCTION log_user_activity(
    p_user_id INTEGER,
    p_company_id INTEGER,
    p_activity_type VARCHAR(50),
    p_activity_details JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    activity_id INTEGER;
BEGIN
    INSERT INTO user_activities (
        user_id,
        company_id,
        activity_type,
        activity_details,
        ip_address,
        user_agent
    ) VALUES (
        p_user_id,
        p_company_id,
        p_activity_type,
        p_activity_details,
        p_ip_address,
        p_user_agent
    ) RETURNING id INTO activity_id;
    
    RETURN activity_id;
END;
$$ LANGUAGE plpgsql;

-- Get company activity summary
CREATE OR REPLACE FUNCTION get_company_activity_summary(
    p_company_id INTEGER,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    activity_type VARCHAR(50),
    count BIGINT,
    unique_users BIGINT,
    last_activity TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ua.activity_type,
        COUNT(*) as count,
        COUNT(DISTINCT ua.user_id) as unique_users,
        MAX(ua.created_at) as last_activity
    FROM user_activities ua
    WHERE ua.company_id = p_company_id
      AND ua.created_at >= CURRENT_DATE - INTERVAL '1 day' * p_days
    GROUP BY ua.activity_type
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 4: SETTINGS MANAGEMENT FUNCTIONS
-- =====================================================

-- Get company settings
CREATE OR REPLACE FUNCTION get_company_settings(p_company_id INTEGER)
RETURNS JSONB AS $$
DECLARE
    settings JSONB;
BEGIN
    SELECT cs.settings INTO settings
    FROM company_settings cs
    WHERE cs.company_id = p_company_id;
    
    RETURN COALESCE(settings, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Update company settings
CREATE OR REPLACE FUNCTION update_company_settings(
    p_company_id INTEGER,
    p_settings JSONB
)
RETURNS JSONB AS $$
DECLARE
    updated_settings JSONB;
BEGIN
    INSERT INTO company_settings (company_id, settings)
    VALUES (p_company_id, p_settings)
    ON CONFLICT (company_id)
    DO UPDATE SET 
        settings = company_settings.settings || p_settings,
        updated_at = CURRENT_TIMESTAMP
    RETURNING settings INTO updated_settings;
    
    RETURN updated_settings;
END;
$$ LANGUAGE plpgsql;

-- Get project settings
CREATE OR REPLACE FUNCTION get_project_settings(p_project_id INTEGER)
RETURNS JSONB AS $$
DECLARE
    settings JSONB;
BEGIN
    SELECT ps.settings INTO settings
    FROM project_settings ps
    WHERE ps.project_id = p_project_id;
    
    RETURN COALESCE(settings, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Update project settings
CREATE OR REPLACE FUNCTION update_project_settings(
    p_project_id INTEGER,
    p_settings JSONB
)
RETURNS JSONB AS $$
DECLARE
    updated_settings JSONB;
BEGIN
    INSERT INTO project_settings (project_id, settings)
    VALUES (p_project_id, p_settings)
    ON CONFLICT (project_id)
    DO UPDATE SET 
        settings = project_settings.settings || p_settings,
        updated_at = CURRENT_TIMESTAMP
    RETURNING settings INTO updated_settings;
    
    RETURN updated_settings;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 5: PERMISSION CHECKING FUNCTIONS
-- =====================================================

-- Check if user has permission for project
CREATE OR REPLACE FUNCTION check_project_permission(
    p_user_id INTEGER,
    p_project_id INTEGER,
    p_permission VARCHAR(50) DEFAULT 'read'
)
RETURNS BOOLEAN AS $$
DECLARE
    user_company_id INTEGER;
    project_company_id INTEGER;
    user_role VARCHAR(20);
BEGIN
    -- Get user's company
    SELECT company_id INTO user_company_id
    FROM users
    WHERE id = p_user_id AND deleted IS NOT TRUE;
    
    -- Get project's company
    SELECT d.company_id INTO project_company_id
    FROM projects p
    JOIN departments d ON p.department_id = d.id
    WHERE p.id = p_project_id AND p.deleted_at IS NULL;
    
    -- Check if user belongs to same company
    IF user_company_id != project_company_id THEN
        RETURN FALSE;
    END IF;
    
    -- Get user's role in project's department
    SELECT ud.role_in_department INTO user_role
    FROM user_departments ud
    JOIN projects p ON ud.department_id = p.department_id
    WHERE ud.user_id = p_user_id AND p.id = p_project_id;
    
    -- Check permissions based on role
    CASE p_permission
        WHEN 'read' THEN
            RETURN user_role IS NOT NULL;
        WHEN 'write' THEN
            RETURN user_role IN ('lead', 'admin');
        WHEN 'admin' THEN
            RETURN user_role = 'admin';
        ELSE
            RETURN FALSE;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Get user's accessible projects
CREATE OR REPLACE FUNCTION get_user_accessible_projects(p_user_id INTEGER)
RETURNS TABLE (
    project_id INTEGER,
    project_name VARCHAR(255),
    department_name VARCHAR(255),
    role_in_department VARCHAR(20),
    permission_level VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as project_id,
        p.name as project_name,
        d.name as department_name,
        ud.role_in_department,
        CASE 
            WHEN ud.role_in_department = 'admin' THEN 'admin'
            WHEN ud.role_in_department = 'lead' THEN 'write'
            ELSE 'read'
        END as permission_level
    FROM projects p
    JOIN departments d ON p.department_id = d.id
    JOIN user_departments ud ON d.id = ud.department_id
    WHERE ud.user_id = p_user_id
      AND p.deleted_at IS NULL
      AND d.deleted_at IS NULL
    ORDER BY p.name;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 6: USAGE EXAMPLES
-- =====================================================

/*
-- Example usage in your application:

-- 1. Set tenant context at the beginning of each request
SELECT set_tenant_context(1, 123); -- company_id = 1, user_id = 123

-- 2. Get tasks for the current company
SELECT * FROM get_company_tasks(1, NULL, 'todo', 50, 0);

-- 3. Get sprints for a specific project
SELECT * FROM get_company_sprints(1, 5, 'active', 20, 0);

-- 4. Get users in a department
SELECT * FROM get_company_users(1, 3, 'User', 100, 0);

-- 5. Log user activity
SELECT log_user_activity(123, 1, 'task_view', '{"task_id": 456}'::jsonb, '192.168.1.1'::inet, 'Mozilla/5.0...');

-- 6. Check project permissions
SELECT check_project_permission(123, 5, 'write');

-- 7. Get user's accessible projects
SELECT * FROM get_user_accessible_projects(123);

-- 8. Get company settings
SELECT get_company_settings(1);

-- 9. Update company settings
SELECT update_company_settings(1, '{"time_tracking": {"enabled": true}}'::jsonb);
*/ 