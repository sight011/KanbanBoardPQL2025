-- Add firstName and lastName columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS firstName VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS lastName VARCHAR(50);

-- Update existing users with default names
UPDATE users 
SET 
    firstName = SPLIT_PART(username, '.', 1),
    lastName = SPLIT_PART(username, '.', 2)
WHERE firstName IS NULL OR lastName IS NULL; 