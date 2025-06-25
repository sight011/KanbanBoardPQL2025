-- Fix all audit triggers to prevent company_id = 0 issues during registration
-- This prevents audit logging from failing when creating companies, departments, and projects

-- Drop all existing audit triggers
DROP TRIGGER IF EXISTS audit_tasks_trigger ON tasks;
DROP TRIGGER IF EXISTS audit_sprints_trigger ON sprints;
DROP TRIGGER IF EXISTS audit_projects_trigger ON projects;
DROP TRIGGER IF EXISTS audit_departments_trigger ON departments;
DROP TRIGGER IF EXISTS audit_companies_trigger ON companies;

-- Recreate triggers with better logic to avoid company_id = 0 issues
-- For companies: only log UPDATE and DELETE (not INSERT)
CREATE TRIGGER audit_companies_trigger
    AFTER UPDATE OR DELETE ON companies
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- For departments: only log UPDATE and DELETE (not INSERT)
CREATE TRIGGER audit_departments_trigger
    AFTER UPDATE OR DELETE ON departments
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- For projects: only log UPDATE and DELETE (not INSERT)
CREATE TRIGGER audit_projects_trigger
    AFTER UPDATE OR DELETE ON projects
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- For sprints: only log UPDATE and DELETE (not INSERT)
CREATE TRIGGER audit_sprints_trigger
    AFTER UPDATE OR DELETE ON sprints
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- For tasks: only log UPDATE and DELETE (not INSERT)
CREATE TRIGGER audit_tasks_trigger
    AFTER UPDATE OR DELETE ON tasks
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Add comments to document these changes
COMMENT ON TRIGGER audit_companies_trigger ON companies IS 
'Audit trigger for companies - only fires on UPDATE and DELETE to avoid company_id = 0 issues during creation';

COMMENT ON TRIGGER audit_departments_trigger ON departments IS 
'Audit trigger for departments - only fires on UPDATE and DELETE to avoid company_id = 0 issues during creation';

COMMENT ON TRIGGER audit_projects_trigger ON projects IS 
'Audit trigger for projects - only fires on UPDATE and DELETE to avoid company_id = 0 issues during creation';

COMMENT ON TRIGGER audit_sprints_trigger ON sprints IS 
'Audit trigger for sprints - only fires on UPDATE and DELETE to avoid company_id = 0 issues during creation';

COMMENT ON TRIGGER audit_tasks_trigger ON tasks IS 
'Audit trigger for tasks - only fires on UPDATE and DELETE to avoid company_id = 0 issues during creation'; 