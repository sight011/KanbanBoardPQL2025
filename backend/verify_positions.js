const { Pool } = require('pg');

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/kanban_board'
});

async function verifyPositions() {
    const client = await pool.connect();
    
    try {
        console.log('🔍 Verifying task positions per company...');
        
        // Get all companies
        const companiesResult = await client.query('SELECT DISTINCT company_id FROM users WHERE company_id IS NOT NULL ORDER BY company_id');
        const companies = companiesResult.rows.map(row => row.company_id);
        
        console.log(`📊 Found ${companies.length} companies to verify`);
        
        let totalIssues = 0;
        
        for (const companyId of companies) {
            console.log(`\n🏢 Verifying company ${companyId}...`);
            
            // Check for duplicates within this company
            const duplicatesResult = await client.query(
                `SELECT t.status, t.position, COUNT(*) as count 
                 FROM tasks t
                 JOIN users u ON t.reporter_id = u.id
                 WHERE u.company_id = $1
                 GROUP BY t.status, t.position 
                 HAVING COUNT(*) > 1 
                 ORDER BY t.status, t.position`,
                [companyId]
            );
            
            if (duplicatesResult.rows.length === 0) {
                console.log(`   ✅ No duplicate positions found in company ${companyId}`);
            } else {
                console.log(`   ❌ Found ${duplicatesResult.rows.length} duplicate position groups in company ${companyId}:`);
                duplicatesResult.rows.forEach(row => {
                    console.log(`      Status: ${row.status}, Position: ${row.position}, Count: ${row.count}`);
                });
                totalIssues += duplicatesResult.rows.length;
            }
            
            // Check for gaps in position sequences
            const gapsResult = await client.query(
                `WITH ranked_tasks AS (
                    SELECT t.status, t.position, 
                           ROW_NUMBER() OVER (PARTITION BY t.status ORDER BY t.position) as expected_position
                    FROM tasks t
                    JOIN users u ON t.reporter_id = u.id
                    WHERE u.company_id = $1
                )
                SELECT status, position, expected_position
                FROM ranked_tasks
                WHERE position != expected_position
                ORDER BY status, position`,
                [companyId]
            );
            
            if (gapsResult.rows.length === 0) {
                console.log(`   ✅ No position gaps found in company ${companyId}`);
            } else {
                console.log(`   ⚠️  Found ${gapsResult.rows.length} position gaps in company ${companyId}:`);
                gapsResult.rows.forEach(row => {
                    console.log(`      Status: ${row.status}, Current: ${row.position}, Expected: ${row.expected_position}`);
                });
                totalIssues += gapsResult.rows.length;
            }
        }
        
        if (totalIssues === 0) {
            console.log('\n🎉 All positions are correct! No issues found.');
        } else {
            console.log(`\n⚠️  Found ${totalIssues} total issues across all companies.`);
        }
        
    } catch (error) {
        console.error('❌ Error verifying positions:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the verification
verifyPositions()
    .then(() => {
        console.log('✅ Verification completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Verification failed:', error);
        process.exit(1);
    }); 