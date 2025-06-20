const pool = require('./db');
const fs = require('fs').promises;
const path = require('path');

async function runSettingsMigration() {
    try {
        const migrationPath = path.join(__dirname, 'migrations/add_settings_table.sql');
        const migration = await fs.readFile(migrationPath, 'utf8');
        
        await pool.query(migration);
        console.log('Successfully created settings_hoursperday table');
    } catch (error) {
        console.error('Error running settings migration:', error);
    }
}

// Run if this file is executed directly
if (require.main === module) {
    runSettingsMigration()
        .then(() => process.exit(0))
        .catch(err => {
            console.error(err);
            process.exit(1);
        });
}

module.exports = runSettingsMigration; 