ALTER TABLE projects ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

-- Set initial positions for existing projects per company/department
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY company_id, department_id ORDER BY id) AS rn
  FROM projects
)
UPDATE projects
SET position = ranked.rn
FROM ranked
WHERE projects.id = ranked.id; 