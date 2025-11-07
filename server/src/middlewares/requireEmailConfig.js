// middlewares/requireEmailConfig.js
const prisma = require('../config/db');

module.exports = function requireEmailConfig() {
  return async (req, res, next) => {
    try {
      const { tenantId } = req.context || {};
      if (!tenantId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Check if email account is configured
      const account = await prisma.mailAccount.findFirst({ 
        where: { tenantId } 
      });

      // Also check for environment fallback
      const hasEnvConfig = process.env.SMTP_HOST && process.env.SMTP_USER;

      if (!account && !hasEnvConfig) {
        return res.status(403).json({ 
          error: 'Email configuration required',
          detail: 'Please configure your email settings before using the email module.',
          code: 'EMAIL_CONFIG_REQUIRED',
          redirectTo: '/dashboard/email-settings'
        });
      }

      next();
    } catch (err) {
      console.error('requireEmailConfig error:', err);
      return res.status(500).json({ error: 'Email config check failed', detail: err.message });
    }
  };
};

