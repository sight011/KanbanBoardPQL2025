const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { requireLogin } = require('../middleware/auth');

// Apply authentication middleware to all settings routes
router.use(requireLogin);

// Get hours per day setting
router.get('/hoursperday', settingsController.getHoursPerDay);

// Update hours per day setting
router.put('/hoursperday', settingsController.updateHoursPerDay);

module.exports = router; 