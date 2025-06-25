-- Fix audit trigger for companies table
-- This prevents the audit log from trying to insert with company_id = 0 during company creation

-- Drop the existing trigger that fires on all operations
DROP TRIGGER IF EXISTS companies_audit_trigger ON companies;

-- Recreate the trigger to only fire on UPDATE and DELETE operations
-- This prevents the audit log from trying to log company creation (which would have company_id = 0)
CREATE TRIGGER companies_audit_trigger
AFTER UPDATE OR DELETE ON companies
FOR EACH ROW
EXECUTE FUNCTION log_audit_event();

-- Add a comment to document this change
COMMENT ON TRIGGER companies_audit_trigger ON companies IS 
'Audit trigger for companies table - only fires on UPDATE and DELETE to avoid company_id = 0 issues during creation'; 