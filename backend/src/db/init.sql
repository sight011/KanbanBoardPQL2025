-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert test users if they don't exist
INSERT INTO users (id, first_name, last_name, email)
VALUES 
    (1, 'John', 'Doe', 'john.doe@example.com'),
    (2, 'Jane', 'Smith', 'jane.smith@example.com'),
    (3, 'Bob', 'Johnson', 'bob.johnson@example.com')
ON CONFLICT (id) DO NOTHING;

-- Add foreign key constraint to tasks table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'tasks_assignee_id_fkey'
    ) THEN
        ALTER TABLE tasks
        ADD CONSTRAINT tasks_assignee_id_fkey
        FOREIGN KEY (assignee_id)
        REFERENCES users(id)
        ON DELETE SET NULL;
    END IF;
END $$; 