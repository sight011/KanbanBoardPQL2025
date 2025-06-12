const express = require('express');
const router = express.Router();
const sprintController = require('../controllers/sprintController');

// List all sprints
router.get('/', sprintController.getAllSprints);
// Get a single sprint
router.get('/:id', sprintController.getSprintById);
// Create a new sprint
router.post('/', sprintController.createSprint);
// Update a sprint
router.put('/:id', sprintController.updateSprint);
// Delete a sprint
router.delete('/:id', sprintController.deleteSprint);
// Start a sprint
router.post('/:id/start', sprintController.startSprint);
// Complete a sprint
router.post('/:id/complete', sprintController.completeSprint);

module.exports = router; 