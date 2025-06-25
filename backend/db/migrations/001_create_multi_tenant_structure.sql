-- Multi-Tenant SaaS Database Migration
-- Phase 1: Create New Tables and Modify Existing Structure
-- This migration transforms the single-tenant application into a multi-tenant SaaS

-- =====================================================
-- PART 1: CREATE NEW HIERARCHICAL TABLES
-- =====================================================

-- Create Companies table
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    subscription_plan VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (subscription_plan IN ('free', 'starter', 'business', 'enterprise')),
    subscription_status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (subscription_status IN ('active', 'suspended', 'cancelled')),
    max_users INTEGER NOT NULL DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create Departments table
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create Projects table
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create User-Department junction table for many-to-many relationships
CREATE TABLE user_departments (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    role_in_department VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role_in_department IN ('member', 'lead', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, department_id)
);

-- =====================================================
-- PART 2: MODIFY EXISTING TABLES
-- =====================================================

-- Add multi-tenant fields to Users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_company_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;

-- Add hierarchical relationships to Tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS epic_id INTEGER REFERENCES tasks(id); -- for parent-child relationships

-- Add project relationship to Sprints table
ALTER TABLE sprints ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id);

-- =====================================================
-- PART 3: CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Company-level indexes
CREATE INDEX idx_companies_slug ON companies(slug);
CREATE INDEX idx_companies_subscription_status ON companies(subscription_status);
CREATE INDEX idx_companies_deleted_at ON companies(deleted_at);

-- Department-level indexes
CREATE INDEX idx_departments_company_id ON departments(company_id);
CREATE INDEX idx_departments_deleted_at ON departments(deleted_at);

-- Project-level indexes
CREATE INDEX idx_projects_department_id ON projects(department_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_deleted_at ON projects(deleted_at);

-- User-Department junction indexes
CREATE INDEX idx_user_departments_user_id ON user_departments(user_id);
CREATE INDEX idx_user_departments_department_id ON user_departments(department_id);

-- Multi-tenant composite indexes for tenant isolation
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_epic_id ON tasks(epic_id);
CREATE INDEX idx_sprints_project_id ON sprints(project_id);

-- =====================================================
-- PART 4: CREATE TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Create trigger for companies table
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for departments table
CREATE TRIGGER update_departments_updated_at
    BEFORE UPDATE ON departments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for projects table
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PART 5: CREATE VIEWS FOR EASIER QUERYING
-- =====================================================

-- View for user permissions across departments
CREATE VIEW user_permissions AS
SELECT 
    u.id as user_id,
    u.email,
    u.first_name,
    u.last_name,
    u.company_id,
    c.name as company_name,
    ud.department_id,
    d.name as department_name,
    ud.role_in_department,
    u.is_company_admin,
    u.role as global_role
FROM users u
JOIN companies c ON u.company_id = c.id
LEFT JOIN user_departments ud ON u.id = ud.user_id
LEFT JOIN departments d ON ud.department_id = d.id
WHERE u.deleted IS NOT TRUE AND c.deleted_at IS NULL;

-- View for project hierarchy
CREATE VIEW project_hierarchy AS
SELECT 
    p.id as project_id,
    p.name as project_name,
    p.status as project_status,
    d.id as department_id,
    d.name as department_name,
    c.id as company_id,
    c.name as company_name,
    c.slug as company_slug
FROM projects p
JOIN departments d ON p.department_id = d.id
JOIN companies c ON d.company_id = c.id
WHERE p.deleted_at IS NULL AND d.deleted_at IS NULL AND c.deleted_at IS NULL; 