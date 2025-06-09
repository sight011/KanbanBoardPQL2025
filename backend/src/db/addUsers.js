const pool = require('./db');

async function addUsers() {
    try {
        // Add users if they don't exist
        await pool.query(`
            INSERT INTO users (id, username, email, password_hash)
            VALUES 
                (1, 'John Doe', 'john.doe@example.com', 'test'),
                (3, 'Bob Johnson', 'bob.johnson@example.com', 'test')
            ON CONFLICT (id) DO NOTHING
        `);
        
        console.log('✅ Users added successfully');
    } catch (err) {
        console.error('❌ Error adding users:', err);
        throw err;
    }
}

// Run if this file is executed directly
if (require.main === module) {
    addUsers()
        .then(() => process.exit(0))
        .catch(err => {
            console.error(err);
            process.exit(1);
        });
}

module.exports = addUsers; 