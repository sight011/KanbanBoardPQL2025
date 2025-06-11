const fs = require('fs');
const path = require('path');
const pool = require('./db');

async function runMigration() {
    try {
        // Read the migration file
        const migrationFile = path.join(__dirname, 'migrations', 'add_effort_column.sql');
        const sql = fs.readFileSync(migrationFile, 'utf8');

        // Execute the migration
        await pool.query(sql);
        console.log('✅ Migration completed successfully');
    } catch (err) {
        console.error('❌ Error running migration:', err);
        throw err;
    }
}

// Run if this file is executed directly
if (require.main === module) {
    runMigration()
        .then(() => process.exit(0))
        .catch(err => {
            console.error(err);
            process.exit(1);
        });
}

module.exports = runMigration; 