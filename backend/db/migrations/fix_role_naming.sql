-- Standardize role names to match frontend conventions
UPDATE users SET role = 'User' WHERE role IN ('Users', 'users');
UPDATE users SET role = 'Admin' WHERE role = 'admin';

-- Drop and recreate the constraint to ensure only standardized values are allowed
ALTER TABLE users DROP CONSTRAINT IF EXISTS valid_role;
ALTER TABLE users ADD CONSTRAINT valid_role CHECK (role IN ('Admin', 'Project/Product', 'User')); 