const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const auth = require('../middleware/auth');

router.post('/', auth, chatController.handleChat);
router.get('/status', auth, chatController.checkStatus);

module.exports = router; 