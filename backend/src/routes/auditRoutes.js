const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { requireLogin } = require('../middleware/auth');

router.get('/', requireLogin, auditController.getAuditLogs);
router.get('/tasks-with-changes', requireLogin, auditController.getTasksWithChanges);

module.exports = router; 