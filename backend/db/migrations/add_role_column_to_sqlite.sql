-- Add role column to users table
ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'User';

-- Create type check constraint (SQLite doesn't support CHECK constraints the same way as PostgreSQL)
-- We'll handle validation in the application code instead 