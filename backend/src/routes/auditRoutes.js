const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { requireLogin } = require('../middleware/auth');

router.get('/', requireLogin, auditController.getAuditLogs);

module.exports = router; 