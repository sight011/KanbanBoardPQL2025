const pool = require('../db');
const fs = require('fs');
const path = require('path');

const runMigrations = async () => {
    const client = await pool.connect();
    try {
        // Create migrations table if it doesn't exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                run_on TIMESTAMP NOT NULL DEFAULT NOW()
            );
        `);

        // Get all migration files
        const migrationsDir = path.join(__dirname, 'migrations');
        const allFiles = fs.readdirSync(migrationsDir).sort();
        
        // Get already run migrations from DB
        const ranMigrationsResult = await client.query('SELECT name FROM migrations');
        const ranMigrations = ranMigrationsResult.rows.map(row => row.name);

        // Determine which migrations to run
        const migrationsToRun = allFiles.filter(file => 
            file.endsWith('.sql') && !ranMigrations.includes(file)
        );

        if (migrationsToRun.length === 0) {
            console.log('✅ All migrations are up to date.');
            return;
        }

        console.log('🏃 Running new migrations...');
        for (const migrationFile of migrationsToRun) {
            console.log(`   - Applying: ${migrationFile}`);
            const sql = fs.readFileSync(path.join(migrationsDir, migrationFile), 'utf8');
            
            await client.query('BEGIN');
            try {
                await client.query(sql);
                await client.query('INSERT INTO migrations (name) VALUES ($1)', [migrationFile]);
                await client.query('COMMIT');
                console.log(`   ✔ Success: ${migrationFile}`);
            } catch (err) {
                await client.query('ROLLBACK');
                console.error(`   ❌ Error running migration ${migrationFile}:`, err.message);
                throw err; // Stop if one migration fails
            }
        }
        console.log('🎉 All new migrations applied successfully.');

    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        client.release();
    }
};

// Run if this file is executed directly
if (require.main === module) {
    runMigrations()
        .then(() => process.exit(0))
        .catch(err => {
            console.error(err);
            process.exit(1);
        });
}

module.exports = runMigrations; 