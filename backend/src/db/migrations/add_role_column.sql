-- Add role column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'User';

-- Create type check constraint
ALTER TABLE users ADD CONSTRAINT valid_role CHECK (role IN ('Admin', 'Project/Product', 'User', 'Checker'));

-- Update existing users with default roles
UPDATE users SET role = 'Admin' WHERE id = 1;  -- Set first user as Admin
UPDATE users SET role = 'Project/Product' WHERE id = 2;  -- Set second user as Project/Product
UPDATE users SET role = 'User' WHERE id = 3;  -- Set third user as regular User 