const pool = require('./db');
const fs = require('fs').promises;
const path = require('path');

async function runMigration() {
    try {
        const migrationPath = path.join(__dirname, '../../db/migrations/add_deleted_column.sql');
        const migration = await fs.readFile(migrationPath, 'utf8');
        
        await pool.query(migration);
        console.log('Successfully added deleted column to users table');
    } catch (error) {
        console.error('Error running migration:', error);
    }
}

runMigration()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });

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