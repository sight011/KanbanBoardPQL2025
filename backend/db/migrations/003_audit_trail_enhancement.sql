-- Multi-Tenant SaaS Database Migration
-- Phase 3: Audit Trail Enhancement
-- This script enhances the audit trail system for multi-tenant support

-- =====================================================
-- PART 1: ENHANCE EXISTING AUDIT TABLES
-- =====================================================

-- Add tenant context to task_history table
ALTER TABLE task_history ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id);
ALTER TABLE task_history ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id);

-- Add tenant context to comments table
ALTER TABLE comments ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id);
ALTER TABLE comments ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id);

-- =====================================================
-- PART 2: CREATE NEW AUDIT TABLES
-- =====================================================

-- Create comprehensive audit trail table
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL, -- 'create', 'update', 'delete', 'login', 'logout', etc.
    entity_type VARCHAR(50) NOT NULL, -- 'task', 'sprint', 'project', 'department', 'user', etc.
    entity_id INTEGER, -- ID of the affected entity
    old_values JSONB, -- Previous state
    new_values JSONB, -- New state
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create user activity tracking table
CREATE TABLE user_activities (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    company_id INTEGER REFERENCES companies(id),
    activity_type VARCHAR(50) NOT NULL, -- 'login', 'logout', 'task_view', 'task_edit', etc.
    activity_details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create company settings table
CREATE TABLE company_settings (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) UNIQUE,
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create project settings table
CREATE TABLE project_settings (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) UNIQUE,
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- PART 3: CREATE INDEXES FOR AUDIT TABLES
-- =====================================================

-- Audit logs indexes
CREATE INDEX idx_audit_logs_company_id ON audit_logs(company_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- User activities indexes
CREATE INDEX idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX idx_user_activities_company_id ON user_activities(company_id);
CREATE INDEX idx_user_activities_activity_type ON user_activities(activity_type);
CREATE INDEX idx_user_activities_created_at ON user_activities(created_at);

-- Settings indexes
CREATE INDEX idx_company_settings_company_id ON company_settings(company_id);
CREATE INDEX idx_project_settings_project_id ON project_settings(project_id);

-- =====================================================
-- PART 4: CREATE TRIGGERS FOR AUTOMATIC AUDIT LOGGING
-- =====================================================

-- Function to automatically log audit events
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id INTEGER;
    current_company_id INTEGER;
BEGIN
    -- Get current user and company context (you'll need to implement this in your app)
    -- For now, we'll use session variables or default values
    current_user_id := COALESCE(current_setting('app.current_user_id', TRUE)::INTEGER, 0);
    current_company_id := COALESCE(current_setting('app.current_company_id', TRUE)::INTEGER, 0);
    
    -- Only insert audit log if we have a valid company_id
    IF current_company_id > 0 THEN
        -- Insert audit log
        INSERT INTO audit_logs (
            company_id,
            user_id,
            action,
            entity_type,
            entity_id,
            old_values,
            new_values
        ) VALUES (
            current_company_id,
            current_user_id,
            TG_OP, -- 'INSERT', 'UPDATE', 'DELETE'
            TG_TABLE_NAME,
            COALESCE(NEW.id, OLD.id),
            CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
            CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for main tables
CREATE TRIGGER audit_tasks_trigger
    AFTER INSERT OR UPDATE OR DELETE ON tasks
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_sprints_trigger
    AFTER INSERT OR UPDATE OR DELETE ON sprints
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_projects_trigger
    AFTER INSERT OR UPDATE OR DELETE ON projects
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_departments_trigger
    AFTER INSERT OR UPDATE OR DELETE ON departments
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_companies_trigger
    AFTER INSERT OR UPDATE OR DELETE ON companies
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- =====================================================
-- PART 5: CREATE FUNCTIONS FOR AUDIT QUERIES
-- =====================================================

-- Function to get audit trail for a specific entity
CREATE OR REPLACE FUNCTION get_entity_audit_trail(
    p_entity_type VARCHAR(50),
    p_entity_id INTEGER,
    p_company_id INTEGER
)
RETURNS TABLE (
    action VARCHAR(100),
    user_name VARCHAR(100),
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.action,
        CONCAT(u.first_name, ' ', u.last_name)::VARCHAR(100) as user_name,
        al.old_values,
        al.new_values,
        al.created_at
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    WHERE al.entity_type = p_entity_type
      AND al.entity_id = p_entity_id
      AND al.company_id = p_company_id
    ORDER BY al.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get user activity summary
CREATE OR REPLACE FUNCTION get_user_activity_summary(
    p_user_id INTEGER,
    p_company_id INTEGER,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    activity_type VARCHAR(50),
    count BIGINT,
    last_activity TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ua.activity_type,
        COUNT(*) as count,
        MAX(ua.created_at) as last_activity
    FROM user_activities ua
    WHERE ua.user_id = p_user_id
      AND ua.company_id = p_company_id
      AND ua.created_at >= CURRENT_DATE - INTERVAL '1 day' * p_days
    GROUP BY ua.activity_type
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 6: MIGRATE EXISTING AUDIT DATA
-- =====================================================

-- Update existing task_history records with company and project context
UPDATE task_history 
SET 
    company_id = u.company_id,
    project_id = t.project_id
FROM tasks t
JOIN users u ON t.reporter_id = u.id
WHERE task_history.task_id = t.id
  AND task_history.company_id IS NULL;

-- Update existing comments with company and project context
UPDATE comments 
SET 
    company_id = u.company_id,
    project_id = t.project_id
FROM tasks t, users u
WHERE comments.task_id = t.id
  AND comments.user_id = u.id
  AND comments.company_id IS NULL;

-- =====================================================
-- PART 7: CREATE DEFAULT SETTINGS
-- =====================================================

-- Insert default company settings
INSERT INTO company_settings (company_id, settings)
SELECT 
    c.id,
    '{
        "time_tracking": {
            "enabled": true,
            "working_hours_per_day": 8,
            "working_days_per_week": 5
        },
        "notifications": {
            "email_enabled": true,
            "slack_enabled": false
        },
        "security": {
            "session_timeout_minutes": 480,
            "require_2fa": false
        },
        "features": {
            "kanban_enabled": true,
            "sprint_planning_enabled": true,
            "time_tracking_enabled": true,
            "audit_trail_enabled": true
        }
    }'::jsonb
FROM companies c
ON CONFLICT (company_id) DO NOTHING;

-- Insert default project settings
INSERT INTO project_settings (project_id, settings)
SELECT 
    p.id,
    '{
        "workflow": {
            "default_status": "todo",
            "allowed_statuses": ["todo", "in_progress", "review", "done"]
        },
        "estimation": {
            "story_points_enabled": true,
            "time_estimation_enabled": true
        },
        "permissions": {
            "allow_public_comments": true,
            "require_approval_for_status_change": false
        }
    }'::jsonb
FROM projects p
ON CONFLICT (project_id) DO NOTHING;

-- =====================================================
-- PART 8: CREATE TRIGGERS FOR SETTINGS UPDATED_AT
-- =====================================================

-- Create trigger for company_settings table
CREATE TRIGGER update_company_settings_updated_at
    BEFORE UPDATE ON company_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for project_settings table
CREATE TRIGGER update_project_settings_updated_at
    BEFORE UPDATE ON project_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 