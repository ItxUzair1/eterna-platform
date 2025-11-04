// email.controller.js
const emailService = require('./email.service');
const { withSingleFile, uploadFormFile } = require('../../utils/fileHandler');
const prisma = require('../../config/db');

const sendEmail = async (req, res) => {
  try {
    const { to, cc, bcc, subject, bodyHtml, bodyText, attachments, replyToMessageId, headers } = req.body;
    const result = await emailService.sendEmail({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      to, cc, bcc, subject, bodyHtml, bodyText, attachments,
      replyToMessageId,
      headers
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const saveDraft = async (req, res) => {
  try {
    const result = await emailService.saveDraft({ tenantId: req.user.tenantId, userId: req.user.id, ...req.body });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const updateDraft = async (req, res) => {
  try {
    const result = await emailService.updateDraft({ tenantId: req.user.tenantId, id: +req.params.id, ...req.body });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const sendDraft = async (req, res) => {
  try {
    const result = await emailService.sendDraft({ tenantId: req.user.tenantId, draftId: +req.params.id });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const listSentEmails = async (req, res) => {
  try {
    const emails = await emailService.listByFolder(req.user.tenantId, 'Sent');
    res.json(emails);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const listDrafts = async (req, res) => {
  try {
    const emails = await emailService.listByFolder(req.user.tenantId, 'Drafts');
    res.json(emails);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const listTrash = async (req, res) => {
  try {
    const emails = await emailService.listByFolder(req.user.tenantId, 'Trash');
    res.json(emails);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const moveMessage = async (req, res) => {
  try {
    const result = await emailService.moveMessage({ tenantId: req.user.tenantId, id: +req.params.id, toFolder: req.body.toFolder });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const restoreMessage = async (req, res) => {
  try {
    const result = await emailService.restoreMessage({ tenantId: req.user.tenantId, id: +req.params.id });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const hardDeleteMessage = async (req, res) => {
  try {
    const result = await emailService.hardDeleteMessage({ tenantId: req.user.tenantId, id: +req.params.id });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const listInbox = async (req, res) => {
  try {
    const limit = Number(req.query.limit || 50);
    const offset = Number(req.query.offset || 0);
    const emails = await emailService.listInbox({ tenantId: req.user.tenantId, limit, offset });
    res.json(emails);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const syncInbox = async (req, res) => {
  try {
    const sinceDays = Number(req.query.sinceDays || 7);
    const max = Number(req.query.max || 200);
    const result = await emailService.syncInbox({ tenantId: req.user.tenantId, sinceDays, max });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

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
    const template = await emailService.saveEmailTemplate({ tenantId: req.user.tenantId, name, subject, body });
    res.json(template);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const deleteTemplate = async (req, res) => {
  try {
    const { templateName } = req.params;
    const result = await emailService.deleteEmailTemplate({ tenantId: req.user.tenantId, templateName });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const previewTemplate = async (req, res) => {
  try {
    const { subject, body, variables } = req.body;
    const result = await emailService.renderTemplate({ subject, body, variables });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const previewTemplateForLead = async (req, res) => {
  try {
    const { templateName, leadId } = req.body;
    const result = await emailService.renderTemplateForLead({ tenantId: req.user.tenantId, templateName, leadId });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const createMailAccount = async (req, res) => {
  try {
    const { type, host, port, username, password, scope } = req.body;
    const account = await emailService.createMailAccount({
      tenantId: req.user.tenantId,
      type,
      host,
      port,
      username,
      password,
      scope
    });
    res.json({ id: account.id, message: 'SMTP account created successfully.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const updateMailAccount = async (req, res) => {
  try {
    const { host, port, username, password, scope } = req.body;
    const account = await emailService.updateMailAccount({
      tenantId: req.user.tenantId,
      id: +req.params.id,
      host,
      port,
      username,
      password,
      scope
    });
    res.json({ id: account.id, message: 'SMTP account updated successfully.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const getMailAccount = async (req, res) => {
  try {
    const account = await emailService.getMailAccount(req.user.tenantId);
    // Return null if no account exists (not an error)
    res.json(account);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const seedDefaultTemplates = async (req, res) => {
  try {
    const result = await emailService.seedDefaultTemplates(req.user.tenantId);
    res.json({ message: 'Default email templates seeded successfully.', templates: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const uploadAttachment = [
  withSingleFile('file'),
  async (req, res) => {
    try {
      const ctx = {
        tenantId: req.user.tenantId,
        userId: req.user.id
      };
      const fileRow = await uploadFormFile(ctx, req);
      res.json({ 
        fileId: fileRow.id, 
        originalName: req.file.originalname,
        size: req.file.size,
        mime: req.file.mimetype,
        message: 'File uploaded successfully.' 
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
];

module.exports = {
  sendEmail,
  saveDraft,
  updateDraft,
  sendDraft,
  listSentEmails,
  listDrafts,
  listTrash,
  moveMessage,
  restoreMessage,
  hardDeleteMessage,
  listTemplates,
  saveTemplate,
  deleteTemplate,
  previewTemplate,
  previewTemplateForLead,
  createMailAccount,
  updateMailAccount,
  getMailAccount,
  seedDefaultTemplates,
  uploadAttachment,
  listInbox,
  syncInbox
};
