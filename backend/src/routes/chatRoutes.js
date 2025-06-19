const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { requireLogin } = require('../middleware/auth');

router.post('/', requireLogin, chatController.handleChat);
router.get('/status', requireLogin, chatController.checkStatus);

module.exports = router; 