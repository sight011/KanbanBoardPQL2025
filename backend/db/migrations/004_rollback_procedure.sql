-- Multi-Tenant SaaS Database Migration
-- Rollback Procedure
-- This script provides a safe way to rollback the multi-tenant migration

-- =====================================================
-- WARNING: This rollback will permanently delete multi-tenant data
-- Only run this if you're sure you want to revert to single-tenant
-- =====================================================

-- Function to safely rollback multi-tenant migration
CREATE OR REPLACE FUNCTION rollback_multi_tenant_migration()
RETURNS TEXT AS $$
DECLARE
    result TEXT := '';
    default_company_id INTEGER;
    default_project_id INTEGER;
BEGIN
    -- Get the default company and project IDs
    SELECT id INTO default_company_id FROM companies WHERE slug = 'default-company';
    SELECT id INTO default_project_id FROM projects WHERE department_id IN (
        SELECT id FROM departments WHERE company_id = default_company_id
    ) LIMIT 1;
    
    -- Start transaction
    BEGIN
        -- =====================================================
        -- PART 1: REMOVE AUDIT TRIGGERS
        -- =====================================================
        
        DROP TRIGGER IF EXISTS audit_tasks_trigger ON tasks;
        DROP TRIGGER IF EXISTS audit_sprints_trigger ON sprints;
        DROP TRIGGER IF EXISTS audit_projects_trigger ON projects;
        DROP TRIGGER IF EXISTS audit_departments_trigger ON departments;
        DROP TRIGGER IF EXISTS audit_companies_trigger ON companies;
        
        -- =====================================================
        -- PART 2: REMOVE NEW TABLES
        -- =====================================================
        
        -- Drop audit and settings tables
        DROP TABLE IF EXISTS audit_logs CASCADE;
        DROP TABLE IF EXISTS user_activities CASCADE;
        DROP TABLE IF EXISTS company_settings CASCADE;
        DROP TABLE IF EXISTS project_settings CASCADE;
        
        -- Drop junction table
        DROP TABLE IF EXISTS user_departments CASCADE;
        
        -- Drop hierarchical tables
        DROP TABLE IF EXISTS projects CASCADE;
        DROP TABLE IF EXISTS departments CASCADE;
        DROP TABLE IF EXISTS companies CASCADE;
        
        -- =====================================================
        -- PART 3: REMOVE COLUMNS FROM EXISTING TABLES
        -- =====================================================
        
        -- Remove multi-tenant columns from users
        ALTER TABLE users DROP COLUMN IF EXISTS company_id;
        ALTER TABLE users DROP COLUMN IF EXISTS is_company_admin;
        ALTER TABLE users DROP COLUMN IF EXISTS last_login_at;
        
        -- Remove multi-tenant columns from tasks
        ALTER TABLE tasks DROP COLUMN IF EXISTS project_id;
        ALTER TABLE tasks DROP COLUMN IF EXISTS epic_id;
        
        -- Remove multi-tenant columns from sprints
        ALTER TABLE sprints DROP COLUMN IF EXISTS project_id;
        
        -- Remove multi-tenant columns from audit tables
        ALTER TABLE task_history DROP COLUMN IF EXISTS company_id;
        ALTER TABLE task_history DROP COLUMN IF EXISTS project_id;
        ALTER TABLE comments DROP COLUMN IF EXISTS company_id;
        ALTER TABLE comments DROP COLUMN IF EXISTS project_id;
        
        -- =====================================================
        -- PART 4: REMOVE INDEXES
        -- =====================================================
        
        -- Drop multi-tenant indexes
        DROP INDEX IF EXISTS idx_users_company_id;
        DROP INDEX IF EXISTS idx_tasks_project_id;
        DROP INDEX IF EXISTS idx_tasks_epic_id;
        DROP INDEX IF EXISTS idx_sprints_project_id;
        
        -- =====================================================
        -- PART 5: REMOVE FUNCTIONS
        -- =====================================================
        
        DROP FUNCTION IF EXISTS log_audit_event() CASCADE;
        DROP FUNCTION IF EXISTS get_entity_audit_trail(VARCHAR, INTEGER, INTEGER) CASCADE;
        DROP FUNCTION IF EXISTS get_user_activity_summary(INTEGER, INTEGER, INTEGER) CASCADE;
        
        -- =====================================================
        -- PART 6: REMOVE VIEWS
        -- =====================================================
        
        DROP VIEW IF EXISTS user_permissions;
        DROP VIEW IF EXISTS project_hierarchy;
        
        -- =====================================================
        -- PART 7: REMOVE CONSTRAINTS
        -- =====================================================
        
        -- Remove constraints (they should be dropped with columns, but just in case)
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_company_required;
        ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_project_required;
        ALTER TABLE sprints DROP CONSTRAINT IF EXISTS sprints_project_required;
        
        result := 'Multi-tenant migration successfully rolled back. Database is now single-tenant.';
        
        -- Commit transaction
        RETURN result;
        
    EXCEPTION WHEN OTHERS THEN
        -- Rollback transaction
        RAISE EXCEPTION 'Rollback failed: %', SQLERRM;
    END;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SAFETY CHECK FUNCTION
-- =====================================================

-- Function to check if rollback is safe
CREATE OR REPLACE FUNCTION check_rollback_safety()
RETURNS TABLE (
    check_type TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- Check if there are multiple companies
    RETURN QUERY
    SELECT 
        'Multiple Companies' as check_type,
        CASE 
            WHEN COUNT(*) > 1 THEN 'WARNING: Multiple companies exist'
            ELSE 'OK: Only default company exists'
        END as status,
        COUNT(*)::TEXT || ' companies found' as details
    FROM companies;
    
    -- Check if there are multiple departments
    RETURN QUERY
    SELECT 
        'Multiple Departments' as check_type,
        CASE 
            WHEN COUNT(*) > 1 THEN 'WARNING: Multiple departments exist'
            ELSE 'OK: Only default department exists'
        END as status,
        COUNT(*)::TEXT || ' departments found' as details
    FROM departments;
    
    -- Check if there are multiple projects
    RETURN QUERY
    SELECT 
        'Multiple Projects' as check_type,
        CASE 
            WHEN COUNT(*) > 1 THEN 'WARNING: Multiple projects exist'
            ELSE 'OK: Only default project exists'
        END as status,
        COUNT(*)::TEXT || ' projects found' as details
    FROM projects;
    
    -- Check if there are users in multiple companies
    RETURN QUERY
    SELECT 
        'Users in Multiple Companies' as check_type,
        CASE 
            WHEN COUNT(DISTINCT company_id) > 1 THEN 'WARNING: Users in multiple companies'
            ELSE 'OK: All users in same company'
        END as status,
        COUNT(DISTINCT company_id)::TEXT || ' companies have users' as details
    FROM users 
    WHERE company_id IS NOT NULL;
    
    -- Check if there are tasks in multiple projects
    RETURN QUERY
    SELECT 
        'Tasks in Multiple Projects' as check_type,
        CASE 
            WHEN COUNT(DISTINCT project_id) > 1 THEN 'WARNING: Tasks in multiple projects'
            ELSE 'OK: All tasks in same project'
        END as status,
        COUNT(DISTINCT project_id)::TEXT || ' projects have tasks' as details
    FROM tasks 
    WHERE project_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- USAGE INSTRUCTIONS
-- =====================================================

/*
-- To check if rollback is safe:
SELECT * FROM check_rollback_safety();

-- To perform the rollback:
SELECT rollback_multi_tenant_migration();

-- To verify rollback:
-- Check that all multi-tenant tables are gone
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('companies', 'departments', 'projects', 'user_departments', 'audit_logs', 'user_activities', 'company_settings', 'project_settings');

-- Should return no rows if rollback was successful
*/ 