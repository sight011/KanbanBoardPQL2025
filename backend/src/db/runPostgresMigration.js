const fs = require('fs');
const path = require('path');
const pool = require('./db');

async function runMigration() {
    try {
        console.log('Running PostgreSQL migration...');
        
        // Read the migration file
        const migrationPath = path.join(__dirname, 'migrations', 'add_deleted_column_postgres.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Execute the migration
        await pool.query(migrationSQL);
        
        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration(); 