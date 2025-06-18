-- Migration: Convert effort and timespent columns to NUMERIC(4,1) and migrate data to hours

-- 1. Add temporary columns for numeric values
ALTER TABLE tasks ADD COLUMN effort_hours NUMERIC(4,1);
ALTER TABLE tasks ADD COLUMN timespent_hours NUMERIC(4,1);

-- 2. Update temporary columns by converting existing values
-- Assume 1d = 8h by default for migration; adjust if needed
UPDATE tasks SET effort_hours =
    CASE 
        WHEN effort IS NULL THEN NULL
        WHEN effort ~ '^\\d+(\\.\\d+)?h$' THEN CAST(REPLACE(effort, 'h', '') AS NUMERIC)
        WHEN effort ~ '^\\d+(\\.\\d+)?d$' THEN CAST(REPLACE(effort, 'd', '') AS NUMERIC) * 8
        WHEN effort ~ '^\\d+d \\d+h$' THEN (CAST(SPLIT_PART(effort, 'd', 1) AS NUMERIC) * 8) + CAST(REPLACE(SPLIT_PART(effort, ' ', 2), 'h', '') AS NUMERIC)
        ELSE NULL
    END;

UPDATE tasks SET timespent_hours =
    CASE 
        WHEN timespent IS NULL THEN NULL
        WHEN timespent ~ '^\\d+(\\.\\d+)?h$' THEN CAST(REPLACE(timespent, 'h', '') AS NUMERIC)
        WHEN timespent ~ '^\\d+(\\.\\d+)?d$' THEN CAST(REPLACE(timespent, 'd', '') AS NUMERIC) * 8
        WHEN timespent ~ '^\\d+d \\d+h$' THEN (CAST(SPLIT_PART(timespent, 'd', 1) AS NUMERIC) * 8) + CAST(REPLACE(SPLIT_PART(timespent, ' ', 2), 'h', '') AS NUMERIC)
        ELSE NULL
    END;

-- 3. Remove old columns and constraints
ALTER TABLE tasks DROP COLUMN effort;
ALTER TABLE tasks DROP COLUMN timespent;

-- 4. Rename new columns
ALTER TABLE tasks RENAME COLUMN effort_hours TO effort;
ALTER TABLE tasks RENAME COLUMN timespent_hours TO timespent;

-- 5. Add constraint for 0.5 step increments
ALTER TABLE tasks ADD CONSTRAINT effort_half_hour CHECK (effort IS NULL OR effort * 2 = FLOOR(effort * 2));
ALTER TABLE tasks ADD CONSTRAINT timespent_half_hour CHECK (timespent IS NULL OR timespent * 2 = FLOOR(timespent * 2)); 