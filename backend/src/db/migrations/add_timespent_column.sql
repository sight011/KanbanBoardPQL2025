-- Add timespent column to tasks table
ALTER TABLE tasks
ADD COLUMN timespent VARCHAR(10) CHECK (
    timespent IS NULL OR
    (timespent ~ '^\d+(\.\d+)?[hd]$' AND
     CASE 
         WHEN timespent LIKE '%h' THEN CAST(SPLIT_PART(timespent, 'h', 1) AS DECIMAL) >= 0.5
         WHEN timespent LIKE '%d' THEN CAST(SPLIT_PART(timespent, 'd', 1) AS DECIMAL) >= 1
     END)
); 