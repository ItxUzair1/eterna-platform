module.exports = function requireVerified(req, res, next) {
  // if endpoint requires verified email
  if (!req.user?.emailVerifiedAt) {
    return res.status(403).json({ error: 'Email not verified' });
  }
  next();
};
