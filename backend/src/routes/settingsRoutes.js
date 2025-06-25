const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { requireLoginWithCompanyIsolation, enforceCompanyIsolation } = require('../middleware/auth');

// Apply authentication middleware to all settings routes
router.use(requireLoginWithCompanyIsolation);
router.use(enforceCompanyIsolation);

// Get hours per day setting
router.get('/hoursperday', settingsController.getHoursPerDay);

// Update hours per day setting
router.put('/hoursperday', settingsController.updateHoursPerDay);

module.exports = router; 