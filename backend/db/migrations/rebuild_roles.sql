-- Drop constraint and column if they exist to ensure a clean slate
ALTER TABLE users DROP CONSTRAINT IF EXISTS valid_role;
ALTER TABLE users DROP COLUMN IF EXISTS role;

-- Add the role column with a default value
ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'User';

-- Add the check constraint with all valid roles
ALTER TABLE users ADD CONSTRAINT valid_role CHECK (role IN ('Admin', 'Project/Product', 'User', 'Checker'));

-- Update existing users with default roles as needed
UPDATE users SET role = 'Admin' WHERE id = 1 AND role IS DISTINCT FROM 'Admin';
UPDATE users SET role = 'Project/Product' WHERE id = 2 AND role IS DISTINCT FROM 'Project/Product';
UPDATE users SET role = 'User' WHERE id = 3 AND role IS DISTINCT FROM 'User'; 