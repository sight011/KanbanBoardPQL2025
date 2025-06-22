const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const commentController = require('../controllers/commentController');
const { requireLogin, auth } = require('../middleware/auth');

// -- Comment Routes --
// NOTE: These must come before the generic /:id route to be matched correctly

// Get all comments for a task
router.get('/:taskId/comments', requireLogin, commentController.getCommentsForTask);

// Add a new comment to a task
router.post('/:taskId/comments', requireLogin, commentController.addCommentToTask);

// Get all tasks
router.get('/', requireLogin, taskController.getAllTasks);

// Get task by ID
router.get('/:id', requireLogin, taskController.getTaskById);

// Create new task
router.post('/', requireLogin, taskController.createTask);

// Update task
router.put('/:id', requireLogin, taskController.updateTask);

// Delete task
router.delete('/:id', requireLogin, taskController.deleteTask);

// Update task position
router.patch('/:id/position', requireLogin, taskController.updateTaskPosition);

// Get tasks by status
router.get('/status/:status', requireLogin, taskController.getTasksByStatus);

// Duplicate task
router.post('/:id/duplicate', requireLogin, taskController.duplicateTask);

module.exports = router; 