const express = require('express');
const { verifyToken } = require('../../middlewares/authMiddleware');
const controller = require('./email.controller');

const router = express.Router();

router.post('/send', verifyToken, controller.sendEmail);
router.get('/sent', verifyToken, controller.listSentEmails);
router.get('/templates', verifyToken, controller.listTemplates);
router.post('/templates', verifyToken, controller.saveTemplate);

module.exports = router;
