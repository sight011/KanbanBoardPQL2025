const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const auth = require('../middleware/auth');

// Get all tasks
router.get('/', auth, taskController.getAllTasks);

// Get task by ID
router.get('/:id', auth, taskController.getTaskById);

// Create new task
router.post('/', auth, taskController.createTask);

// Update task
router.put('/:id', auth, taskController.updateTask);

// Delete task
router.delete('/:id', auth, taskController.deleteTask);

// Update task position
router.patch('/:id/position', auth, taskController.updateTaskPosition);

// Get tasks by status
router.get('/status/:status', auth, taskController.getTasksByStatus);

module.exports = router; 