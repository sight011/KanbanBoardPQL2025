const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'kanban_board',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
};

const pool = new Pool(dbConfig);

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting Multi-Tenant Migration...\n');
    
    // Step 1: Backup check
    console.log('📋 Step 1: Checking database connection...');
    const result = await client.query('SELECT version()');
    console.log('✅ Database connected successfully');
    console.log(`📊 Database: ${result.rows[0].version}\n`);
    
    // Step 2: Check existing data
    console.log('📋 Step 2: Analyzing existing data...');
    const userCount = await client.query('SELECT COUNT(*) FROM users');
    const taskCount = await client.query('SELECT COUNT(*) FROM tasks');
    const sprintCount = await client.query('SELECT COUNT(*) FROM sprints');
    
    console.log(`👥 Users: ${userCount.rows[0].count}`);
    console.log(`📝 Tasks: ${taskCount.rows[0].count}`);
    console.log(`🏃 Sprints: ${sprintCount.rows[0].count}\n`);
    
    // Step 3: Run migration files
    const migrationFiles = [
      '001_create_multi_tenant_structure.sql',
      '002_data_migration.sql',
      '003_audit_trail_enhancement.sql',
      '005_orm_query_patterns.sql'
    ];
    
    for (const file of migrationFiles) {
      console.log(`📋 Step 3: Running ${file}...`);
      const filePath = path.join(__dirname, 'db', 'migrations', file);
      
      try {
        const sql = await fs.readFile(filePath, 'utf8');
        await client.query(sql);
        console.log(`✅ ${file} completed successfully`);
      } catch (error) {
        console.error(`❌ Error in ${file}:`, error.message);
        throw error;
      }
    }
    
    // Step 4: Verify migration
    console.log('\n📋 Step 4: Verifying migration...');
    const verificationQueries = [
      { name: 'Companies', query: 'SELECT COUNT(*) FROM companies' },
      { name: 'Departments', query: 'SELECT COUNT(*) FROM departments' },
      { name: 'Projects', query: 'SELECT COUNT(*) FROM projects' },
      { name: 'Users with Company', query: 'SELECT COUNT(*) FROM users WHERE company_id IS NOT NULL' },
      { name: 'Tasks with Project', query: 'SELECT COUNT(*) FROM tasks WHERE project_id IS NOT NULL' },
      { name: 'Sprints with Project', query: 'SELECT COUNT(*) FROM sprints WHERE project_id IS NOT NULL' }
    ];
    
    for (const { name, query } of verificationQueries) {
      const result = await client.query(query);
      console.log(`✅ ${name}: ${result.rows[0].count}`);
    }
    
    // Step 5: Test helper functions
    console.log('\n📋 Step 5: Testing helper functions...');
    
    // Test company tasks function
    const testTasks = await client.query('SELECT * FROM get_company_tasks(1, NULL, NULL, 5, 0)');
    console.log(`✅ get_company_tasks: ${testTasks.rows.length} tasks returned`);
    
    // Test company users function
    const testUsers = await client.query('SELECT * FROM get_company_users(1, NULL, NULL, 5, 0)');
    console.log(`✅ get_company_users: ${testUsers.rows.length} users returned`);
    
    // Test project hierarchy
    const testProjects = await client.query('SELECT * FROM get_company_projects(1, NULL, NULL, 5, 0)');
    console.log(`✅ get_company_projects: ${testProjects.rows.length} projects returned`);
    
    console.log('\n🎉 Multi-Tenant Migration Completed Successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Update your application code to use tenant context');
    console.log('2. Implement company-based authentication');
    console.log('3. Add company management UI');
    console.log('4. Test multi-tenant functionality');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\n💡 To rollback, run: SELECT rollback_multi_tenant_migration();');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Safety check before running
async function safetyCheck() {
  const client = await pool.connect();
  
  try {
    // Check if migration has already been run
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'companies'
      )
    `);
    
    if (result.rows[0].exists) {
      console.log('⚠️  Companies table already exists. Migration may have already been run.');
      console.log('💡 To check migration status, run the verification queries manually.');
      console.log('💡 To re-run migration, first run: SELECT rollback_multi_tenant_migration();');
      return false;
    }
    
    return true;
  } finally {
    client.release();
  }
}

// Main execution
async function main() {
  try {
    const shouldProceed = await safetyCheck();
    
    if (shouldProceed) {
      console.log('🔍 Safety check passed. Proceeding with migration...\n');
      await runMigration();
    } else {
      console.log('\n🛑 Migration aborted. Please check the status manually.');
    }
  } catch (error) {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { runMigration, safetyCheck }; 