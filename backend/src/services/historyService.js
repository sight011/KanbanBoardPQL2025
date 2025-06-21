const pool = require('../db');

const historyService = {
    /**
     * Logs a change to the task_history table.
     * @param {object} details - The details of the change.
     * @param {number} details.taskId - The ID of the task that was changed.
     * @param {number} details.userId - The ID of the user who made the change.
     * @param {string} details.fieldName - The field that was changed (for 'update' type).
     * @param {any} [details.oldValue] - The old value of the field (for 'update' type).
     * @param {any} [details.newValue] - The new value of the field (for 'update' type).
     * @param {object} client - The database client to use for the transaction.
     */
    logChange: async (details, client) => {
        const { taskId, userId, fieldName, oldValue, newValue } = details;
        const db = client || pool;

        const query = `
            INSERT INTO task_history (task_id, user_id, field_name, old_value, new_value)
            VALUES ($1, $2, $3, $4, $5)
        `;
        
        const safeOldValue = oldValue !== undefined && oldValue !== null ? String(oldValue) : null;
        const safeNewValue = newValue !== undefined && newValue !== null ? String(newValue) : null;

        await db.query(query, [taskId, userId, fieldName, safeOldValue, safeNewValue]);
    }
};

module.exports = historyService; 