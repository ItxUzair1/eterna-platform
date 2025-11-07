// routes/email.routes.js
const express = require('express');
const { verifyToken } = require('../../middlewares/authMiddleware');
const requireEmailConfig = require('../../middlewares/requireEmailConfig');
const controller = require('./email.controller');

const router = express.Router();

// MailAccount Management (no config check needed - this is where you configure)
router.post('/accounts', verifyToken, controller.createMailAccount);
router.put('/accounts/:id', verifyToken, controller.updateMailAccount);
router.get('/accounts', verifyToken, controller.getMailAccount);

// All other routes require email configuration
router.use(verifyToken, requireEmailConfig());

// Compose/Send
router.post('/send', controller.sendEmail);
router.post('/drafts', controller.saveDraft);
router.put('/drafts/:id', controller.updateDraft);
router.post('/drafts/:id/send', controller.sendDraft);

// Folders
router.get('/inbox', controller.listInbox);
router.post('/inbox/sync', controller.syncInbox);
router.get('/sent', controller.listSentEmails);
router.get('/drafts', controller.listDrafts);
router.get('/trash', controller.listTrash);
router.post('/messages/:id/move', controller.moveMessage);     // body: { toFolder }
router.post('/messages/:id/restore', controller.restoreMessage);
router.delete('/messages/:id', controller.hardDeleteMessage);

// Templates
router.get('/templates', controller.listTemplates);
router.post('/templates', controller.saveTemplate);
router.delete('/templates/:templateName', controller.deleteTemplate);
router.post('/templates/preview', controller.previewTemplate); // body: { subject, body, variables }
router.post('/templates/preview/lead', controller.previewTemplateForLead); // body: { templateName, leadId }

// Seed default templates
router.post('/templates/seed', controller.seedDefaultTemplates);

// File attachments
router.post('/attachments', controller.uploadAttachment);

module.exports = router;
