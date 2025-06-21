const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { requireLogin, auth } = require('../middleware/auth');

// Get all tasks
router.get('/', requireLogin, taskController.getAllTasks);

// Get task by ID
router.get('/:id', requireLogin, taskController.getTaskById);

// Create new task
router.post('/', auth, taskController.createTask);

// Update task
router.put('/:id', auth, taskController.updateTask);

// Delete task
router.delete('/:id', auth, taskController.deleteTask);

// Update task position
router.patch('/:id/position', auth, taskController.updateTaskPosition);

// Get tasks by status
router.get('/status/:status', requireLogin, taskController.getTasksByStatus);

// Duplicate task
router.post('/:id/duplicate', auth, taskController.duplicateTask);

module.exports = router; 