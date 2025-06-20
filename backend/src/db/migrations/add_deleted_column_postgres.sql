-- Add deleted column to users table for soft delete functionality
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE;

-- Update existing records to have deleted = false
UPDATE users SET deleted = false WHERE deleted IS NULL; 