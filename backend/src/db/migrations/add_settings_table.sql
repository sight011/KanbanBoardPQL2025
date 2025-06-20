-- Migration: Add settings_hoursperday table
-- This table stores the hours per day setting used for time calculations

CREATE TABLE IF NOT EXISTS settings_hoursperday (
    id SERIAL PRIMARY KEY,
    hours NUMERIC(3,1) NOT NULL DEFAULT 8.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default value
INSERT INTO settings_hoursperday (hours) VALUES (8.0) ON CONFLICT DO NOTHING;

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_settings_hoursperday_updated_at
    BEFORE UPDATE ON settings_hoursperday
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 