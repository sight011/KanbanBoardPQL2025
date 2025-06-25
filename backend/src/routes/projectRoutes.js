const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { requireLogin } = require('../middleware/auth');

// Apply authentication middleware to all project routes
router.use(requireLogin);

// Get all projects for the current user's department
router.get('/', projectController.getAllProjects);

// Create a new project
router.post('/', projectController.createProject);

// Get a specific project by ID
router.get('/:id', projectController.getProjectById);

module.exports = router; 