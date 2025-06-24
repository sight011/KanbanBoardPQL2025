const pool = require('../db');

async function resequencePositions(status, client = pool) {
    // Get all tasks for this status ordered by current position and id
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
}

module.exports = { resequencePositions }; 