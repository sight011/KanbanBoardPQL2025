const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { requireLoginWithCompanyIsolation, enforceCompanyIsolation } = require('../middleware/auth');

// Apply middleware to all routes
router.use(requireLoginWithCompanyIsolation);
router.use(enforceCompanyIsolation);

// Get all projects for the current user's department
router.get('/', projectController.getAllProjects);

// Create a new project
router.post('/', projectController.createProject);

// Get a specific project by ID
router.get('/:id', projectController.getProjectById);

// Update a project
router.put('/:id', projectController.updateProject);

// Delete a project (soft delete)
router.delete('/:id', projectController.deleteProject);

// Reorder projects
router.post('/reorder', projectController.reorderProjects);

module.exports = router; 