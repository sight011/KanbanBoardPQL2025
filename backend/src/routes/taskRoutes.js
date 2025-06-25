const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const commentController = require('../controllers/commentController');
const { requireLoginWithTenant } = require('../middleware/auth');

// -- Comment Routes --
// NOTE: These must come before the generic /:id route to be matched correctly

// Get all comments for a task
router.get('/:taskId/comments', requireLoginWithTenant, commentController.getCommentsForTask);

// Add a new comment to a task
router.post('/:taskId/comments', requireLoginWithTenant, commentController.addCommentToTask);

// Get all tasks
router.get('/', requireLoginWithTenant, taskController.getAllTasks);

// Get task by ID
router.get('/:id', requireLoginWithTenant, taskController.getTaskById);

// Create new task
router.post('/', requireLoginWithTenant, taskController.createTask);

// Update task
router.put('/:id', requireLoginWithTenant, taskController.updateTask);

// Delete task
router.delete('/:id', requireLoginWithTenant, taskController.deleteTask);

// Update task position
router.patch('/:id/position', requireLoginWithTenant, taskController.updateTaskPosition);

// Get tasks by status
router.get('/status/:status', requireLoginWithTenant, taskController.getTasksByStatus);

// Duplicate task
router.post('/:id/duplicate', requireLoginWithTenant, taskController.duplicateTask);

module.exports = router; 