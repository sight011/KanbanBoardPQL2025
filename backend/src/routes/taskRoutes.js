const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const commentController = require('../controllers/commentController');
const { requireLoginWithCompanyIsolation, enforceCompanyIsolation } = require('../middleware/auth');

// -- Comment Routes --
// NOTE: These must come before the generic /:id route to be matched correctly

// Get all comments for a task
router.get('/:taskId/comments', requireLoginWithCompanyIsolation, enforceCompanyIsolation, commentController.getCommentsForTask);

// Add a new comment to a task
router.post('/:taskId/comments', requireLoginWithCompanyIsolation, enforceCompanyIsolation, commentController.addCommentToTask);

// Get all tasks
router.get('/', requireLoginWithCompanyIsolation, enforceCompanyIsolation, taskController.getAllTasks);

// Get task by ID
router.get('/:id', requireLoginWithCompanyIsolation, enforceCompanyIsolation, taskController.getTaskById);

// Create new task
router.post('/', requireLoginWithCompanyIsolation, enforceCompanyIsolation, taskController.createTask);

// Update task
router.put('/:id', requireLoginWithCompanyIsolation, enforceCompanyIsolation, taskController.updateTask);

// Delete task
router.delete('/:id', requireLoginWithCompanyIsolation, enforceCompanyIsolation, taskController.deleteTask);

// Update task position
router.patch('/:id/position', requireLoginWithCompanyIsolation, enforceCompanyIsolation, taskController.updateTaskPosition);

// Get tasks by status
router.get('/status/:status', requireLoginWithCompanyIsolation, enforceCompanyIsolation, taskController.getTasksByStatus);

// Duplicate task
router.post('/:id/duplicate', requireLoginWithCompanyIsolation, enforceCompanyIsolation, taskController.duplicateTask);

module.exports = router; 