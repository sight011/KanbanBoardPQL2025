const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { requireLoginWithCompanyIsolation, enforceCompanyIsolation } = require('../middleware/auth');

router.get('/', requireLoginWithCompanyIsolation, enforceCompanyIsolation, auditController.getAuditLogs);
router.get('/tasks-with-changes', requireLoginWithCompanyIsolation, enforceCompanyIsolation, auditController.getTasksWithChanges);

module.exports = router; 