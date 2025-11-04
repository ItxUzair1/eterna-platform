// routes/email.routes.js
const express = require('express');
const { verifyToken } = require('../../middlewares/authMiddleware');
const controller = require('./email.controller');

const router = express.Router();

// Compose/Send
router.post('/send', verifyToken, controller.sendEmail);
router.post('/drafts', verifyToken, controller.saveDraft);
router.put('/drafts/:id', verifyToken, controller.updateDraft);
router.post('/drafts/:id/send', verifyToken, controller.sendDraft);

// Folders
router.get('/inbox', verifyToken, controller.listInbox);
router.post('/inbox/sync', verifyToken, controller.syncInbox);
router.get('/sent', verifyToken, controller.listSentEmails);
router.get('/drafts', verifyToken, controller.listDrafts);
router.get('/trash', verifyToken, controller.listTrash);
router.post('/messages/:id/move', verifyToken, controller.moveMessage);     // body: { toFolder }
router.post('/messages/:id/restore', verifyToken, controller.restoreMessage);
router.delete('/messages/:id', verifyToken, controller.hardDeleteMessage);

// Templates
router.get('/templates', verifyToken, controller.listTemplates);
router.post('/templates', verifyToken, controller.saveTemplate);
router.delete('/templates/:templateName', verifyToken, controller.deleteTemplate);
router.post('/templates/preview', verifyToken, controller.previewTemplate); // body: { subject, body, variables }
router.post('/templates/preview/lead', verifyToken, controller.previewTemplateForLead); // body: { templateName, leadId }

// MailAccount Management
router.post('/accounts', verifyToken, controller.createMailAccount);
router.put('/accounts/:id', verifyToken, controller.updateMailAccount);
router.get('/accounts', verifyToken, controller.getMailAccount);

// Seed default templates
router.post('/templates/seed', verifyToken, controller.seedDefaultTemplates);

// File attachments
router.post('/attachments', verifyToken, controller.uploadAttachment);

module.exports = router;
