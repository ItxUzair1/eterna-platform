const svc = require('../auth/auth.service')
const prisma = require('../../config/db')

const registerUser = async (req, res) => {
  try {
    console.log(req.body)
    const user = await svc.signup(req.body);
    res.status(201).json({ message: 'User created, verify email sent', user });
  } catch (err) { res.status(400).json({ error: err.message }); }
};

const verifyEmail = async (req, res) => {
  try {
    const { token, newEmail } = req.query;
    await svc.verifyEmail(token, newEmail ? decodeURIComponent(newEmail) : null);
    const message = newEmail ? 'Email changed and verified successfully' : 'Email verified. You can sign in now.';
    res.json({ ok: true, message });
  } catch (err) { res.status(400).json({ error: err.message }); }
};

const loginUser = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) return res.status(400).json({ error: 'Identifier and password are required' });
    const out = await svc.signin({ identifier, password, ip: req.ip, userAgent: req.headers['user-agent'] });
    res.json(out);
  } catch (err) { res.status(401).json({ error: err.message }); }
};

const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Missing refreshToken' });
    const out = await svc.refreshSession({ refreshToken, ip: req.ip, userAgent: req.headers['user-agent'] });
    res.json(out);
  } catch (err) { res.status(401).json({ error: err.message }); }
};

const verify2fa = async (req, res) => {
  try {
    const { twofaToken, code } = req.body;
    const out = await svc.verify2fa({ twofaToken, code });
    res.json(out);
  } catch (err) { res.status(400).json({ error: err.message }); }
};

const requestReset = async (req, res) => {
  try {
    await svc.requestPasswordReset({ email: req.body.email });
    res.json({ ok: true });
  } catch { res.json({ ok: true }); }
};

const resetPassword = async (req, res) => {
  try {
    await svc.resetPassword({ token: req.body.token, password: req.body.password });
    res.json({ ok: true });
  } catch (err) { res.status(400).json({ error: err.message }); }
};

const enable2fa = async (req, res) => {
  try {
    const out = await svc.enable2fa({ userId: req.context.userId, tenantId: req.context.tenantId, phone: req.body.phone });
    res.json(out);
  } catch (err) { res.status(400).json({ error: err.message }); }
};

const useRecovery = async (req, res) => {
  try {
    await svc.useRecoveryCode({ userId: req.context.userId, code: req.body.code });
    res.json({ ok: true });
  } catch (err) { res.status(400).json({ error: err.message }); }
};

const invite = async (req, res) => {
  try {
    const { email, roleName } = req.body;
    await svc.invite({ inviterId: req.context.userId, tenantId: req.context.tenantId, email, roleName });
    res.json({ ok: true });
  } catch (err) { res.status(400).json({ error: err.message }); }
};

const acceptInvite = async (req, res) => {
  try {
    const { token, username, password, teamId } = req.body;
    console.log(`[acceptInvite] token present: ${!!token}, username: ${username}, teamId: ${teamId}`);
    const { user } = await svc.acceptInvite({ token, username, password, teamId });
    res.json({ user });
  } catch (err) { 
    console.error(`[acceptInvite] Error:`, err.message);
    res.status(400).json({ error: err.message }); 
  }
};

const me = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.context.userId },
    select: { id: true, email: true, username: true, firstName: true, lastName: true, jobTitle: true, photo: true, emailVerifiedAt: true }
  });
  
  // Generate signed URL for photo if it exists
  if (user.photo) {
    const { getSignedDownloadUrl } = require('../../utils/spaces');
    try {
      user.photoUrl = await getSignedDownloadUrl(user.photo, 3600); // 1 hour expiry
    } catch (err) {
      console.error('Error generating photo URL:', err);
    }
  }
  
  res.json({ user });
};

const updateProfile = async (req, res) => {
  try {
    const out = await svc.updateProfile({ userId: req.context.userId, payload: req.body });
    res.json({ user: out });
  } catch (err) { res.status(400).json({ error: err.message }); }
};

const changeEmail = async (req, res) => {
  try {
    await svc.changeEmail({ userId: req.context.userId, newEmail: req.body.email });
    res.json({ ok: true, message: 'Verify new email from inbox' });
  } catch (err) { res.status(400).json({ error: err.message }); }
};

const changePassword = async (req, res) => {
  try {
    await svc.changePassword({ userId: req.context.userId, oldPassword: req.body.oldPassword, newPassword: req.body.newPassword });
    res.json({ ok: true });
  } catch (err) { res.status(400).json({ error: err.message }); }
};

const uploadPhoto = async (req, res) => {
  try {
    console.log('[uploadPhoto] Controller reached');
    console.log('[uploadPhoto] req.file:', req.file ? { key: req.file.key, originalname: req.file.originalname, size: req.file.size } : 'null');
    console.log('[uploadPhoto] Content-Type:', req.headers['content-type']);
    console.log('[uploadPhoto] Has body:', !!req.body);
    
    // multer-s3 with .single() stores file in req.file, not req.files
    const file = req.file;
    if (!file) {
      console.error('[uploadPhoto] No file found. req.file:', req.file, 'req.files:', req.files);
      // Check if multer rejected the file
      if (req.multerError) {
        return res.status(400).json({ error: req.multerError.message || 'File upload rejected' });
      }
      return res.status(400).json({ 
        error: 'No file uploaded. Please select an image file and try again.',
        debug: {
          hasFile: !!req.file,
          hasFiles: !!req.files,
          contentType: req.headers['content-type']
        }
      });
    }
    
    const photoKey = file.key; // S3 key from multer-s3
    if (!photoKey) {
      console.error('[uploadPhoto] File uploaded but no key found:', file);
      return res.status(500).json({ error: 'File uploaded but failed to get storage key' });
    }
    
    // Generate signed URL for the photo
    const { getSignedDownloadUrl } = require('../../utils/spaces');
    let photoUrl = null;
    try {
      photoUrl = await getSignedDownloadUrl(photoKey, 3600); // 1 hour expiry
    } catch (err) {
      console.error('Error generating photo URL:', err);
    }
    
    // Update user profile with photo key
    const user = await prisma.user.update({
      where: { id: req.context.userId },
      data: { photo: photoKey },
      select: { id: true, email: true, username: true, firstName: true, lastName: true, jobTitle: true, photo: true, emailVerifiedAt: true }
    });
    
    // Add photoUrl to response
    user.photoUrl = photoUrl;
    
    res.json({ user });
  } catch (err) {
    console.error('Upload photo error:', err);
    res.status(400).json({ error: err.message || 'Failed to upload photo' });
  }
};

module.exports = {
  registerUser, verifyEmail, loginUser, verify2fa,
  requestReset, resetPassword,
  enable2fa, useRecovery,
  invite, acceptInvite,
  me, updateProfile, uploadPhoto, changeEmail, changePassword, refresh
};
