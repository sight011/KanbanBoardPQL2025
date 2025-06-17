-- Add role column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
        ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'User';
        ALTER TABLE users ADD CONSTRAINT valid_role CHECK (role IN ('Admin', 'Project/Product', 'User'));
    END IF;
END $$;

-- Update existing users with default roles if role is null
UPDATE users SET role = 'User' WHERE role IS NULL;

-- Set specific roles for existing users
UPDATE users SET role = 'Admin' WHERE id = 10;  -- Matthew Tennent
UPDATE users SET role = 'Project/Product' WHERE id = 9;  -- Samantha Charles
UPDATE users SET role = 'User' WHERE id = 1;  -- John Doe 