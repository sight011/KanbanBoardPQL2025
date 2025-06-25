const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const { requireLoginWithCompanyIsolation, enforceCompanyIsolation } = require('../middleware/auth');

// Apply middleware to all routes
router.use(requireLoginWithCompanyIsolation);
router.use(enforceCompanyIsolation);

// Get all departments for the current user's company
router.get('/', departmentController.getAllDepartments);

module.exports = router; 