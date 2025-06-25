-- Multi-Tenant SaaS Database Migration
-- Phase 2: Data Migration
-- This script migrates existing single-tenant data to the new multi-tenant structure

-- =====================================================
-- PART 1: CREATE DEFAULT TENANT STRUCTURE
-- =====================================================

-- Create a default company for existing data
INSERT INTO companies (name, slug, subscription_plan, subscription_status, max_users) 
VALUES (
    'Default Company', 
    'default-company', 
    'business', 
    'active', 
    50
) ON CONFLICT (slug) DO NOTHING;

-- Get the default company ID
DO $$
DECLARE
    default_company_id INTEGER;
BEGIN
    SELECT id INTO default_company_id FROM companies WHERE slug = 'default-company';
    
    -- Create a default department
    INSERT INTO departments (company_id, name, description) 
    VALUES (default_company_id, 'Default Department', 'Default department for existing data migration');
    
    -- Get the default department ID
    DECLARE
        default_department_id INTEGER;
    BEGIN
        SELECT id INTO default_department_id FROM departments WHERE company_id = default_company_id AND name = 'Default Department';
        
        -- Create a default project
        INSERT INTO projects (department_id, name, description, status) 
        VALUES (default_department_id, 'Default Project', 'Default project for existing data migration', 'active');
        
        -- Get the default project ID
        DECLARE
            default_project_id INTEGER;
        BEGIN
            SELECT id INTO default_project_id FROM projects WHERE department_id = default_department_id AND name = 'Default Project';
            
            -- =====================================================
            -- PART 2: MIGRATE EXISTING USERS
            -- =====================================================
            
            -- Link all existing users to the default company
            UPDATE users 
            SET company_id = default_company_id 
            WHERE company_id IS NULL;
            
            -- Set the first admin user as company admin
            UPDATE users 
            SET is_company_admin = TRUE 
            WHERE id = (
                SELECT id FROM users 
                WHERE role = 'Admin' AND company_id = default_company_id
                ORDER BY id ASC
                LIMIT 1
            );
            
            -- =====================================================
            -- PART 3: MIGRATE EXISTING TASKS
            -- =====================================================
            
            -- Link all existing tasks to the default project
            UPDATE tasks 
            SET project_id = default_project_id 
            WHERE project_id IS NULL;
            
            -- =====================================================
            -- PART 4: MIGRATE EXISTING SPRINTS
            -- =====================================================
            
            -- Link all existing sprints to the default project
            UPDATE sprints 
            SET project_id = default_project_id 
            WHERE project_id IS NULL;
            
            -- =====================================================
            -- PART 5: CREATE USER-DEPARTMENT RELATIONSHIPS
            -- =====================================================
            
            -- Link all users to the default department
            INSERT INTO user_departments (user_id, department_id, role_in_department)
            SELECT 
                u.id, 
                default_department_id,
                CASE 
                    WHEN u.role = 'Admin' THEN 'admin'
                    WHEN u.role = 'Project/Product' THEN 'lead'
                    ELSE 'member'
                END
            FROM users u
            WHERE u.company_id = default_company_id
            ON CONFLICT (user_id, department_id) DO NOTHING;
            
        END;
    END;
END $$;

-- =====================================================
-- PART 6: ADD CONSTRAINTS AFTER DATA MIGRATION
-- =====================================================

-- Now that all data has been migrated, add the constraints
-- Ensure users belong to a company
ALTER TABLE users ADD CONSTRAINT users_company_required CHECK (company_id IS NOT NULL);

-- Ensure tasks belong to a project
ALTER TABLE tasks ADD CONSTRAINT tasks_project_required CHECK (project_id IS NOT NULL);

-- Ensure sprints belong to a project
ALTER TABLE sprints ADD CONSTRAINT sprints_project_required CHECK (project_id IS NOT NULL);

-- =====================================================
-- PART 7: VALIDATE MIGRATION
-- =====================================================

-- Verify that all users have a company
SELECT 
    'Users without company' as check_type,
    COUNT(*) as count
FROM users 
WHERE company_id IS NULL

UNION ALL

-- Verify that all tasks have a project
SELECT 
    'Tasks without project' as check_type,
    COUNT(*) as count
FROM tasks 
WHERE project_id IS NULL

UNION ALL

-- Verify that all sprints have a project
SELECT 
    'Sprints without project' as check_type,
    COUNT(*) as count
FROM sprints 
WHERE project_id IS NULL;

-- =====================================================
-- PART 8: CREATE SAMPLE DATA FOR TESTING
-- =====================================================

-- Create additional sample companies for testing multi-tenancy
INSERT INTO companies (name, slug, subscription_plan, subscription_status, max_users) VALUES
('Acme Corporation', 'acme-corp', 'enterprise', 'active', 100),
('Startup Inc', 'startup-inc', 'starter', 'active', 10),
('Tech Solutions', 'tech-solutions', 'business', 'active', 25)
ON CONFLICT (slug) DO NOTHING;

-- Create sample departments for each company
DO $$
DECLARE
    company_record RECORD;
    dept_id INTEGER;
BEGIN
    FOR company_record IN SELECT id, name FROM companies WHERE slug != 'default-company' LOOP
        -- Engineering department
        INSERT INTO departments (company_id, name, description) 
        VALUES (company_record.id, 'Engineering', 'Software development and technical operations')
        RETURNING id INTO dept_id;
        
        -- Product department
        INSERT INTO departments (company_id, name, description) 
        VALUES (company_record.id, 'Product', 'Product management and design');
        
        -- Sales department
        INSERT INTO departments (company_id, name, description) 
        VALUES (company_record.id, 'Sales', 'Sales and customer success');
        
        -- Create sample projects for engineering department
        INSERT INTO projects (department_id, name, description, status, start_date, end_date) VALUES
        (dept_id, 'Mobile App Development', 'iOS and Android app development', 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '6 months'),
        (dept_id, 'API Redesign', 'REST API modernization project', 'planning', CURRENT_DATE + INTERVAL '1 month', CURRENT_DATE + INTERVAL '4 months');
    END LOOP;
END $$;

-- =====================================================
-- PART 9: CREATE SAMPLE USERS FOR NEW COMPANIES
-- =====================================================

-- Create sample users for Acme Corporation
DO $$
DECLARE
    acme_company_id INTEGER;
    acme_eng_dept_id INTEGER;
BEGIN
    SELECT id INTO acme_company_id FROM companies WHERE slug = 'acme-corp';
    SELECT id INTO acme_eng_dept_id FROM departments WHERE company_id = acme_company_id AND name = 'Engineering';
    
    -- Create sample users
    INSERT INTO users (username, email, password_hash, first_name, last_name, role, company_id, is_company_admin) VALUES
    ('alice.dev', 'alice@acme-corp.com', '$2b$10$dummy.hash.for.testing', 'Alice', 'Developer', 'User', acme_company_id, FALSE),
    ('bob.lead', 'bob@acme-corp.com', '$2b$10$dummy.hash.for.testing', 'Bob', 'Lead', 'Project/Product', acme_company_id, FALSE),
    ('carol.admin', 'carol@acme-corp.com', '$2b$10$dummy.hash.for.testing', 'Carol', 'Admin', 'Admin', acme_company_id, TRUE)
    ON CONFLICT (email) DO NOTHING;
    
    -- Link users to engineering department
    INSERT INTO user_departments (user_id, department_id, role_in_department)
    SELECT u.id, acme_eng_dept_id, 
        CASE 
            WHEN u.role = 'Admin' THEN 'admin'
            WHEN u.role = 'Project/Product' THEN 'lead'
            ELSE 'member'
        END
    FROM users u 
    WHERE u.company_id = acme_company_id
    ON CONFLICT (user_id, department_id) DO NOTHING;
END $$;

-- =====================================================
-- PART 10: FINAL VALIDATION QUERY
-- =====================================================

-- Display migration summary
SELECT 
    'Migration Summary' as section,
    '' as detail

UNION ALL

SELECT 
    'Companies' as section,
    COUNT(*)::TEXT as detail
FROM companies

UNION ALL

SELECT 
    'Departments' as section,
    COUNT(*)::TEXT as detail
FROM departments

UNION ALL

SELECT 
    'Projects' as section,
    COUNT(*)::TEXT as detail
FROM projects

UNION ALL

SELECT 
    'Users with Company' as section,
    COUNT(*)::TEXT as detail
FROM users 
WHERE company_id IS NOT NULL

UNION ALL

SELECT 
    'Tasks with Project' as section,
    COUNT(*)::TEXT as detail
FROM tasks 
WHERE project_id IS NOT NULL

UNION ALL

SELECT 
    'Sprints with Project' as section,
    COUNT(*)::TEXT as detail
FROM sprints 
WHERE project_id IS NOT NULL; 