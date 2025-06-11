const pool = require('./db');

async function checkTable() {
    try {
        // Get table information
        const result = await pool.query(`
            SELECT column_name, data_type, character_maximum_length
            FROM information_schema.columns
            WHERE table_name = 'tasks'
            ORDER BY ordinal_position;
        `);
        
        console.log('Current tasks table structure:');
        console.log('------------------------------');
        result.rows.forEach(column => {
            console.log(`${column.column_name}: ${column.data_type}${column.character_maximum_length ? `(${column.character_maximum_length})` : ''}`);
        });
    } catch (err) {
        console.error('❌ Error checking table:', err);
        throw err;
    }
}

// Run if this file is executed directly
if (require.main === module) {
    checkTable()
        .then(() => process.exit(0))
        .catch(err => {
            console.error(err);
            process.exit(1);
        });
} 