# Multi-Tenant SaaS Database Migration Guide

## Overview

This migration transforms your single-tenant project management application into a multi-tenant SaaS platform with a hierarchical structure: **Companies → Departments → Projects → Work Items**.

## Migration Files

### 1. `001_create_multi_tenant_structure.sql`
- Creates new hierarchical tables (companies, departments, projects)
- Modifies existing tables to support multi-tenancy
- Adds indexes for performance
- Creates views for easier querying

### 2. `002_data_migration.sql`
- Migrates existing data to the new structure
- Creates default tenant for existing data
- Adds sample data for testing
- Validates migration success

### 3. `003_audit_trail_enhancement.sql`
- Enhances audit trail with multi-tenant support
- Creates comprehensive audit logging system
- Adds company and project settings
- Implements automatic audit triggers

### 4. `004_rollback_procedure.sql`
- Provides safe rollback functionality
- Includes safety checks before rollback
- Complete cleanup procedures

## New Database Structure

### Hierarchical Tables

```sql
companies
├── departments
    ├── projects
        ├── tasks
        ├── sprints
        └── comments
```

### Key Features

- **Tenant Isolation**: All data is scoped by company
- **Hierarchical Organization**: Companies → Departments → Projects
- **User Permissions**: Multi-level role system
- **Audit Trail**: Comprehensive activity tracking
- **Settings Management**: Company and project-level configurations

## Running the Migration

### Prerequisites

1. **Backup your database** before running any migration
2. Ensure you have PostgreSQL 12+ with JSONB support
3. Verify your application is not running during migration

### Step-by-Step Process

```bash
# 1. Backup your database
pg_dump your_database > backup_before_migration.sql

# 2. Run migrations in order
psql your_database -f 001_create_multi_tenant_structure.sql
psql your_database -f 002_data_migration.sql
psql your_database -f 003_audit_trail_enhancement.sql

# 3. Verify migration
psql your_database -c "SELECT * FROM check_migration_status();"
```

### Verification Queries

```sql
-- Check migration status
SELECT 
    'Companies' as table_name,
    COUNT(*) as record_count
FROM companies

UNION ALL

SELECT 
    'Users with Company' as table_name,
    COUNT(*) as record_count
FROM users 
WHERE company_id IS NOT NULL

UNION ALL

SELECT 
    'Tasks with Project' as table_name,
    COUNT(*) as record_count
FROM tasks 
WHERE project_id IS NOT NULL;
```

## Application Changes Required

### 1. Middleware for Tenant Context

```javascript
// Add to your Express middleware
app.use((req, res, next) => {
  // Extract company context from subdomain, header, or JWT
  const companySlug = req.subdomains[0] || req.headers['x-company-slug'];
  
  if (companySlug) {
    req.companyContext = { slug: companySlug };
  }
  
  next();
});
```

### 2. Database Query Patterns

```javascript
// Always include company context in queries
const getTasks = async (companyId, projectId = null) => {
  const query = `
    SELECT t.*, u.firstName, u.lastName
    FROM tasks t
    JOIN users u ON t.reporter_id = u.id
    WHERE u.company_id = $1
    ${projectId ? 'AND t.project_id = $2' : ''}
  `;
  
  return db.query(query, projectId ? [companyId, projectId] : [companyId]);
};
```

### 3. Row-Level Security (Optional)

```sql
-- Enable RLS on tables
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY tasks_company_policy ON tasks
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE department_id IN (
        SELECT id FROM departments 
        WHERE company_id = current_setting('app.company_id')::INTEGER
      )
    )
  );
```

## Tenant Isolation Best Practices

### 1. Always Filter by Company

```javascript
// ✅ Good - Always include company context
const tasks = await db.query(
  'SELECT * FROM tasks WHERE project_id IN (SELECT id FROM projects WHERE department_id IN (SELECT id FROM departments WHERE company_id = $1))',
  [companyId]
);

// ❌ Bad - No tenant isolation
const tasks = await db.query('SELECT * FROM tasks');
```

### 2. Use Database Views

```sql
-- Use the provided views for common queries
SELECT * FROM user_permissions WHERE company_id = $1;
SELECT * FROM project_hierarchy WHERE company_id = $1;
```

### 3. Implement Proper Error Handling

```javascript
// Handle tenant not found scenarios
const getCompany = async (slug) => {
  const company = await db.query(
    'SELECT * FROM companies WHERE slug = $1 AND deleted_at IS NULL',
    [slug]
  );
  
  if (!company.rows[0]) {
    throw new Error('Company not found or access denied');
  }
  
  return company.rows[0];
};
```

## Performance Considerations

### 1. Indexes

The migration includes essential indexes:
- `idx_companies_slug` - Fast company lookup by slug
- `idx_users_company_id` - Fast user filtering by company
- `idx_tasks_project_id` - Fast task filtering by project
- Composite indexes for common query patterns

### 2. Query Optimization

```sql
-- Use EXPLAIN ANALYZE to optimize queries
EXPLAIN ANALYZE 
SELECT t.* FROM tasks t
JOIN projects p ON t.project_id = p.id
JOIN departments d ON p.department_id = d.id
WHERE d.company_id = 1;
```

### 3. Partitioning (For Large Scale)

Consider table partitioning for companies with large datasets:

```sql
-- Example: Partition tasks by company_id
CREATE TABLE tasks_partitioned (
  LIKE tasks INCLUDING ALL
) PARTITION BY HASH (company_id);

CREATE TABLE tasks_part_0 PARTITION OF tasks_partitioned
  FOR VALUES WITH (modulus 4, remainder 0);
```

## Rollback Procedure

### Safety Check

```sql
-- Check if rollback is safe
SELECT * FROM check_rollback_safety();
```

### Perform Rollback

```sql
-- Only run if you're sure you want to revert
SELECT rollback_multi_tenant_migration();
```

### Verify Rollback

```sql
-- Check that multi-tenant tables are gone
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('companies', 'departments', 'projects');
```

## Monitoring and Maintenance

### 1. Audit Trail Monitoring

```sql
-- Monitor audit log growth
SELECT 
  DATE(created_at) as date,
  COUNT(*) as audit_events
FROM audit_logs 
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date;
```

### 2. User Activity Tracking

```sql
-- Monitor user activity
SELECT 
  u.email,
  COUNT(ua.id) as activity_count,
  MAX(ua.created_at) as last_activity
FROM users u
LEFT JOIN user_activities ua ON u.id = ua.user_id
WHERE ua.created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY u.id, u.email
ORDER BY activity_count DESC;
```

### 3. Database Maintenance

```sql
-- Regular maintenance tasks
VACUUM ANALYZE;
REINDEX DATABASE your_database;
```

## Troubleshooting

### Common Issues

1. **Migration Fails on Constraints**
   - Check for existing data that violates new constraints
   - Use `IF NOT EXISTS` clauses in migration

2. **Performance Degradation**
   - Verify indexes are created properly
   - Check query execution plans
   - Consider query optimization

3. **Tenant Isolation Issues**
   - Verify all queries include company context
   - Check middleware implementation
   - Review application logs for missing context

### Support Queries

```sql
-- Check for orphaned records
SELECT 'Tasks without project' as issue, COUNT(*) as count
FROM tasks WHERE project_id IS NULL

UNION ALL

SELECT 'Users without company' as issue, COUNT(*) as count
FROM users WHERE company_id IS NULL;

-- Check for data integrity
SELECT 
  c.name as company,
  COUNT(DISTINCT d.id) as departments,
  COUNT(DISTINCT p.id) as projects,
  COUNT(DISTINCT u.id) as users
FROM companies c
LEFT JOIN departments d ON c.id = d.company_id
LEFT JOIN projects p ON d.id = p.department_id
LEFT JOIN users u ON c.id = u.company_id
GROUP BY c.id, c.name;
```

## Next Steps

After successful migration:

1. **Update Application Code** to include tenant context
2. **Implement Authentication** with company context
3. **Add Company Management** UI/API
4. **Set Up Monitoring** for multi-tenant metrics
5. **Plan Scaling Strategy** for multiple tenants

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review PostgreSQL logs for detailed error messages
3. Use the verification queries to diagnose issues
4. Consider the rollback procedure if needed

---

**Important**: Always test migrations in a development environment before applying to production! 