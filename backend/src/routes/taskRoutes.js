const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { requireLogin } = require('../middleware/auth');

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

module.exports = router; 