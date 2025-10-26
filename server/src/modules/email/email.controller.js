const emailService = require('./email.service');

// ======== SEND EMAIL ========
const sendEmail = async (req, res) => {
  try {
    const { to, subject, bodyHtml, bodyText, cc, attachments } = req.body;
    const result = await emailService.sendEmail({
      tenantId: req.user.tenantId,
      to,
      subject,
      bodyHtml,
      bodyText,
      cc,
      attachments
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// ======== SENT EMAILS ========
const listSentEmails = async (req, res) => {
  try {
    const emails = await emailService.getAllSentEmails(req.user.tenantId);
    res.json(emails);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// ======== EMAIL TEMPLATES ========
const listTemplates = async (req, res) => {
  try {
    const templates = await emailService.getEmailTemplates(req.user.tenantId);
    res.json(templates);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const saveTemplate = async (req, res) => {
  try {
    const { name, subject, body } = req.body;
    const template = await emailService.saveEmailTemplate({
      tenantId: req.user.tenantId,
      name,
      subject,
      body
    });
    res.json(template);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

module.exports = { sendEmail, listSentEmails, listTemplates, saveTemplate };
