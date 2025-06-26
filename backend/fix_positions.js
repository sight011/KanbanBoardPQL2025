const { Pool } = require('pg');

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/kanban_board'
});

async function fixTaskPositions() {
    const client = await pool.connect();
    
    try {
        console.log('🔧 Starting position fix for all tasks...');
        
        await client.query('BEGIN');
        
        // Get all companies
        const companiesResult = await client.query('SELECT DISTINCT company_id FROM users WHERE company_id IS NOT NULL');
        const companies = companiesResult.rows.map(row => row.company_id);
        
        console.log(`📊 Found ${companies.length} companies to process`);
        
        for (const companyId of companies) {
            console.log(`\n🏢 Processing company ${companyId}...`);
            
            // Get all statuses for this company
            const statusesResult = await client.query(
                `SELECT DISTINCT t.status 
                 FROM tasks t
                 JOIN users u ON t.reporter_id = u.id
                 WHERE u.company_id = $1
                 ORDER BY t.status`,
                [companyId]
            );
            
            const statuses = statusesResult.rows.map(row => row.status);
            console.log(`📋 Statuses found: ${statuses.join(', ')}`);
            
            for (const status of statuses) {
                console.log(`\n📝 Fixing positions for status: ${status}`);
                
                // Get all tasks for this status and company, ordered by current position and id
                const tasksResult = await client.query(
                    `SELECT t.id, t.position, t.title
                     FROM tasks t
                     JOIN users u ON t.reporter_id = u.id
                     WHERE t.status = $1 AND u.company_id = $2
                     ORDER BY t.position, t.id`,
                    [status, companyId]
                );
                
                const tasks = tasksResult.rows;
                console.log(`   Found ${tasks.length} tasks in ${status}`);
                
                // Reset positions to sequential numbers starting from 1
                for (let i = 0; i < tasks.length; i++) {
                    const newPosition = i + 1;
                    const task = tasks[i];
                    
                    if (task.position !== newPosition) {
                        console.log(`   Task ${task.id} (${task.title}): ${task.position} → ${newPosition}`);
                    }
                    
                    await client.query(
                        'UPDATE tasks SET position = $1 WHERE id = $2',
                        [newPosition, task.id]
                    );
                }
                
                console.log(`   ✅ Fixed ${tasks.length} tasks in ${status}`);
            }
        }
        
        await client.query('COMMIT');
        console.log('\n🎉 Position fix completed successfully!');
        
        // Verify no duplicates
        console.log('\n🔍 Verifying no duplicate positions...');
        const duplicatesResult = await client.query(
            `SELECT status, position, COUNT(*) as count 
             FROM tasks 
             GROUP BY status, position 
             HAVING COUNT(*) > 1 
             ORDER BY status, position`
        );
        
        if (duplicatesResult.rows.length === 0) {
            console.log('✅ No duplicate positions found!');
        } else {
            console.log('❌ Duplicate positions found:');
            console.log(duplicatesResult.rows);
        }
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error fixing positions:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the fix
fixTaskPositions()
    .then(() => {
        console.log('✅ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    }); 