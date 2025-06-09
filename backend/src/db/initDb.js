const fs = require('fs');
const path = require('path');
const pool = require('./db');

async function initializeDatabase() {
    try {
        // Read the SQL file
        const sqlFile = path.join(__dirname, 'init.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');

        // Execute the SQL
        await pool.query(sql);
        console.log('✅ Database initialized successfully');
    } catch (err) {
        console.error('❌ Error initializing database:', err);
        throw err;
    }
}

// Run if this file is executed directly
if (require.main === module) {
    initializeDatabase()
        .then(() => process.exit(0))
        .catch(err => {
            console.error(err);
            process.exit(1);
        });
}

module.exports = initializeDatabase; 