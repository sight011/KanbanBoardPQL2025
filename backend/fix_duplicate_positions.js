const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function fixDuplicatePositions() {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        console.log('🔍 Checking for duplicate positions...');
        
        // Get all statuses
        const statusesResult = await client.query('SELECT DISTINCT status FROM tasks ORDER BY status');
        const statuses = statusesResult.rows.map(row => row.status);
        
        console.log('📊 Found statuses:', statuses);
        
        for (const status of statuses) {
            console.log(`\n🔄 Fixing positions for status: ${status}`);
            
            // Get all tasks for this status ordered by current position and id
            const tasksResult = await client.query(
                'SELECT id, position FROM tasks WHERE status = $1 ORDER BY position, id',
                [status]
            );
            
            const tasks = tasksResult.rows;
            console.log(`   Found ${tasks.length} tasks with status '${status}'`);
            
            // Reassign positions sequentially
            for (let i = 0; i < tasks.length; i++) {
                const newPosition = i + 1;
                const taskId = tasks[i].id;
                const oldPosition = tasks[i].position;
                
                if (oldPosition !== newPosition) {
                    console.log(`   Task ${taskId}: position ${oldPosition} → ${newPosition}`);
                    await client.query(
                        'UPDATE tasks SET position = $1 WHERE id = $2',
                        [newPosition, taskId]
                    );
                }
            }
        }
        
        await client.query('COMMIT');
        console.log('\n✅ Successfully fixed all duplicate positions!');
        
        // Verify the fix
        console.log('\n🔍 Verifying fix...');
        const duplicatesResult = await client.query(`
            SELECT status, position, COUNT(*) as count 
            FROM tasks 
            GROUP BY status, position 
            HAVING COUNT(*) > 1 
            ORDER BY status, position
        `);
        
        if (duplicatesResult.rows.length === 0) {
            console.log('✅ No duplicate positions found!');
        } else {
            console.log('❌ Still found duplicate positions:', duplicatesResult.rows);
        }
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error fixing duplicate positions:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Run the fix
fixDuplicatePositions()
    .then(() => {
        console.log('🎉 Position fix completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Position fix failed:', error);
        process.exit(1);
    }); 