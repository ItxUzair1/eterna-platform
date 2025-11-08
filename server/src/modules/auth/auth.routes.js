const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middlewares/authMiddleware');
const rateLimiter = require('../../middlewares/rateLimiter');
const { spacesUploadMiddleware, getSignedDownloadUrl } = require('../../utils/spaces');
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
router.post('/me/photo', verifyToken, (req, res, next) => {
  const upload = spacesUploadMiddleware('photo', { prefix: 'profiles', maxCount: 1, maxFileSize: 5 * 1024 * 1024 });
  upload(req, res, (err) => {
    if (err) {
      console.error('[uploadPhoto] Multer error:', err);
      // Multer errors
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ error: 'Unexpected file field. Please use the "photo" field.' });
      }
      if (err.code === 'SPACES_CONFIG_MISSING') {
        return res.status(500).json({ error: err.message || 'DigitalOcean Spaces is not configured on the server.' });
      }
      if (err.message && err.message.includes('Spaces')) {
        return res.status(500).json({ error: 'Storage configuration error. Please check server logs.' });
      }
      return res.status(400).json({ error: err.message || 'File upload failed' });
    }
    next();
  });
}, ctrl.uploadPhoto);
router.post('/me/change-password', verifyToken, ctrl.changePassword);
router.post('/refresh', rateLimiter(r => `refresh:${r.ip}`, 30, 60000), ctrl.refresh);


module.exports = router;
