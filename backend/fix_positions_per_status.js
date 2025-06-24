const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function resequenceAllStatuses() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const statusesResult = await client.query('SELECT DISTINCT status FROM tasks');
    const statuses = statusesResult.rows.map(row => row.status);

    for (const status of statuses) {
      const tasksResult = await client.query(
        'SELECT id FROM tasks WHERE status = $1 ORDER BY position, id',
        [status]
      );
      const tasks = tasksResult.rows;
      for (let i = 0; i < tasks.length; i++) {
        const newPosition = i + 1;
        await client.query(
          'UPDATE tasks SET position = $1 WHERE id = $2',
          [newPosition, tasks[i].id]
        );
      }
      console.log(`Resequenced ${tasks.length} tasks for status "${status}"`);
    }

    await client.query('COMMIT');
    console.log('✅ All statuses resequenced successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error resequencing:', err);
  } finally {
    client.release();
    pool.end();
  }
}

resequenceAllStatuses(); 