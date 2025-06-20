-- Add deleted column to users table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'deleted'
    ) THEN
        ALTER TABLE users ADD COLUMN deleted BOOLEAN DEFAULT FALSE;
    END IF;
END $$; 