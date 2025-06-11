-- Add effort column to tasks table
ALTER TABLE tasks
ADD COLUMN effort VARCHAR(10) CHECK (
    effort IS NULL OR
    (effort ~ '^\d+(\.\d+)?[hd]$' AND
     CASE 
         WHEN effort LIKE '%h' THEN CAST(SPLIT_PART(effort, 'h', 1) AS DECIMAL) >= 0.5
         WHEN effort LIKE '%d' THEN CAST(SPLIT_PART(effort, 'd', 1) AS DECIMAL) >= 1
     END)
); 