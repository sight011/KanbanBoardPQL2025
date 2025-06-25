const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { requireLoginWithCompanyIsolation, enforceCompanyIsolation } = require('../middleware/auth');

router.post('/', requireLoginWithCompanyIsolation, enforceCompanyIsolation, chatController.handleChat);
router.get('/status', requireLoginWithCompanyIsolation, enforceCompanyIsolation, chatController.checkStatus);

module.exports = router; 