const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'kanban_board',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

async function runMigration() {
    const client = await pool.connect();
    
    try {
        console.log('🔄 Starting password reset tokens migration...');
        
        // Read the migration SQL file
        const migrationPath = path.join(__dirname, '../../db/migrations/add_password_reset_tokens.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Execute the migration
        await client.query(migrationSQL);
        
        console.log('✅ Password reset tokens migration completed successfully!');
        
        // Verify the table was created
        const result = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'password_reset_tokens'
        `);
        
        if (result.rows.length > 0) {
            console.log('✅ password_reset_tokens table created successfully');
        } else {
            console.log('❌ password_reset_tokens table not found');
        }
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the migration
runMigration().catch(console.error); 