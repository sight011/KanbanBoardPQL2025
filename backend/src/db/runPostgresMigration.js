const fs = require('fs');
const path = require('path');
const pool = require('./db');

async function runMigration() {
    // Get the migration filename from command-line arguments
    const migrationFile = process.argv[2];

    if (!migrationFile) {
        console.error('Migration failed: Please provide a migration filename to run.');
        console.log('Example: node src/db/runPostgresMigration.js your_migration_file.sql');
        process.exit(1);
    }

    const client = await pool.connect();
    try {
        console.log(`Running PostgreSQL migration: ${migrationFile}`);
        
        const migrationsDir = path.join(__dirname, 'migrations');
        const migrationPath = path.join(migrationsDir, migrationFile);

        if (!fs.existsSync(migrationPath)) {
            console.error(`Migration failed: File not found at ${migrationPath}`);
            process.exit(1);
        }
        
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        await client.query('BEGIN');
        await client.query(migrationSQL);
        await client.query('COMMIT');
        
        console.log('Migration completed successfully!');
    } catch (error) {
        if (client) {
            await client.query('ROLLBACK');
        }
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        if (client) {
            client.release();
        }
    }
}

runMigration().catch(err => console.error(err)); 