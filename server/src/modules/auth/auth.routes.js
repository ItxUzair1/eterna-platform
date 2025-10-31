const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middlewares/authMiddleware');
const rateLimiter = require('../../middlewares/rateLimiter');
const ctrl = require('../../modules/auth/auth.controller')

router.post('/signup', rateLimiter(r => `signup:${r.ip}`, 10, 60000), ctrl.registerUser);
router.get('/verify-email', ctrl.verifyEmail);

router.post('/signin', rateLimiter(r => `signin:${r.ip}`, 20, 60000), ctrl.loginUser);
router.post('/2fa/verify', ctrl.verify2fa);
router.post('/2fa/enable', verifyToken, ctrl.enable2fa);
router.post('/2fa/recovery', verifyToken, ctrl.useRecovery);

router.post('/password/forgot', rateLimiter(r => `forgot:${r.ip}`, 5, 60000), ctrl.requestReset);
router.post('/password/reset', ctrl.resetPassword);

router.post('/invite', verifyToken, ctrl.invite);
router.post('/invite/accept', ctrl.acceptInvite);

router.get('/me', verifyToken, ctrl.me);
router.put('/me/profile', verifyToken, ctrl.updateProfile);
router.post('/me/change-email', verifyToken, ctrl.changeEmail);
router.post('/me/change-password', verifyToken, ctrl.changePassword);
router.post('/refresh', rateLimiter(r => `refresh:${r.ip}`, 30, 60000), ctrl.refresh);


module.exports = router;
