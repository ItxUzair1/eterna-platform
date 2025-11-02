// email.service.js
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const prisma = require('../../config/db');
const Mustache = require('mustache');
const { encrypt, decrypt } = require('../../utils/encryption');

// Build transporter per-tenant
async function getTransporter(account) {
  let password;
  
  // If account has no id, it's from environment variables (plain text)
  if (account.id === null) {
    password = account.encryptedSecret; // Already plain text from env
  } else {
    try {
      password = decrypt(account.encryptedSecret);
    } catch (decryptError) {
      // If decryption fails, it might be plain text (legacy) or wrong key
      // Check if it looks encrypted (has colon separator)
      if (account.encryptedSecret && account.encryptedSecret.includes(':')) {
        // It's encrypted but can't be decrypted - key mismatch
        const errorMsg = decryptError.message || 'Decryption failed';
        throw new Error(errorMsg + ' This usually means the encryption key changed. Please update your SMTP account password in Settings to re-encrypt it with the current key.');
      } else {
        // Legacy: assume it's plain text (not recommended but backward compatible)
        console.warn(`Warning: Using plain text password for account ${account.id}. Please update your SMTP account to use encrypted password.`);
        password = account.encryptedSecret;
      }
    }
  }
  
  return nodemailer.createTransport({
    host: account.host,
    port: account.port,
    secure: account.port === 465, // TLS from start on 465, STARTTLS on 587/25
    auth: { user: account.username, pass: password },
    // Optional hardening: set tls.servername when host is an IP or custom SNI
    tls: account.tlsServername ? { servername: account.tlsServername } : undefined
  });
}

// RFC 5322 header chain from a parent
function buildReplyHeaders(parent) {
  if (!parent) return {};
  const inReplyTo = parent.messageId || undefined;
  const priorRefs = (parent.references || '').trim();
  const references = [priorRefs, parent.messageId].filter(Boolean).join(' ').trim();
  return { inReplyTo, references };
}

async function resolveAccount(tenantId) {
  const account = await prisma.mailAccount.findFirst({ where: { tenantId } });
  if (!account) {
    // Fallback to environment variables if no account configured
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      return {
        id: null,
        tenantId: null,
        type: 'SMTP',
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        username: process.env.SMTP_USER,
        encryptedSecret: process.env.SMTP_PASS, // Plain text for env fallback
        scope: 'send'
      };
    }
    throw new Error('No SMTP configuration found. Please configure your email settings first by going to /dashboard/email-settings');
  }
  return account;
}

function validateRecipients({ to }) {
  if (!to || typeof to !== 'string') throw new Error('Recipient "to" is required.');
}

// Render with Mustache (escapes by default)
function renderMustache(str, variables = {}) {
  return Mustache.render(str || '', variables);
}

async function sendEmail({
  tenantId, userId,
  to, cc = '', bcc = '',
  subject, bodyHtml, bodyText,
  attachments = [],
  replyToMessageId,
  headers = {}
}) {
  validateRecipients({ to });

  const account = await resolveAccount(tenantId);
  const transporter = await getTransporter(account);

  // For replies, fetch parent and construct RFC headers
  let parent = null;
  if (replyToMessageId) {
    parent = await prisma.mailMessage.findFirst({
      where: { tenantId, id: replyToMessageId }
    });
  }
  const replyHeaders = buildReplyHeaders(parent);

  // Prepare attachments for nodemailer
  const nodemailerAttachments = [];
  if (attachments && attachments.length > 0) {
    // Get attachment metadata if available (from frontend) or fetch from database
    const attachmentMap = new Map(attachments.map(a => [a.id, a]));
    
    const files = await prisma.file.findMany({
      where: {
        id: { in: attachments.map(a => a.id) },
        tenantId
      }
    });

    for (const file of files) {
      if (fs.existsSync(file.path)) {
        const attachmentMeta = attachmentMap.get(file.id);
        // Use original name from attachment metadata if available, otherwise use basename
        const filename = attachmentMeta?.name || attachmentMeta?.originalName || path.basename(file.path);
        nodemailerAttachments.push({
          filename: filename,
          path: file.path,
          contentType: file.mime
        });
      }
    }
  }

  // Build options; Nodemailer generates Message-ID and protected headers itself
  const mailOptions = {
    from: account.id === null 
      ? (process.env.MAIL_FROM || `${account.username} <${account.username}>`)
      : account.username,
    to, cc, bcc,
    subject,
    text: bodyText,
    html: bodyHtml,
    attachments: nodemailerAttachments,
    headers: {
      // Custom grouping headers are allowed; do not override protected headers
      'X-App-Tenant': String(tenantId),
      // RFC 5322 threading headers (FR-MAIL-5)
      ...(replyHeaders.inReplyTo ? { 'In-Reply-To': replyHeaders.inReplyTo } : {}),
      ...(replyHeaders.references ? { 'References': replyHeaders.references } : {}),
      ...(headers || {})
    }
  };

  let info;
  try {
    info = await transporter.sendMail(mailOptions);
  } catch (smtpError) {
    // Provide actionable error messages for common SMTP failures
    let errorMessage = smtpError.message || 'Failed to send email.';
    
    // Common SMTP error patterns
    if (smtpError.code === 'EAUTH' || smtpError.message?.includes('authentication')) {
      errorMessage = 'SMTP authentication failed. Please check your email credentials in Settings. Verify username and password (app password for Gmail) are correct.';
    } else if (smtpError.code === 'ETIMEDOUT' || smtpError.code === 'ECONNREFUSED') {
      errorMessage = 'Cannot connect to SMTP server. Please check your SMTP host and port settings. Common ports: 587 (TLS) or 465 (SSL).';
    } else if (smtpError.message?.includes('Invalid login')) {
      errorMessage = 'Invalid email credentials. For Gmail, use an App Password instead of your regular password.';
    } else if (smtpError.message?.includes('Connection timeout')) {
      errorMessage = 'Connection timeout. Check your internet connection and firewall settings. Ensure ports 587/465 are not blocked.';
    } else if (smtpError.message?.includes('self signed certificate')) {
      errorMessage = 'SSL/TLS certificate error. Please verify your SMTP server settings.';
    } else if (smtpError.responseCode === 535 || smtpError.message?.includes('535')) {
      errorMessage = 'Authentication failed. Incorrect username or password. For Gmail, ensure 2-Step Verification is enabled and use an App Password.';
    } else if (smtpError.message?.includes('550') || smtpError.message?.includes('rejected')) {
      errorMessage = 'Email rejected by server. Check recipient address or sender reputation.';
    }
    
    throw new Error(errorMessage);
  }

  // Nodemailer exposes info.messageId for the final generated Message-ID
  // Only save to database if account is configured (not from env fallback)
  let message = null;
  if (account.id !== null) {
    message = await prisma.mailMessage.create({
      data: {
        tenantId,
        mailAccountId: account.id,
        folder: 'Sent',
        from: account.username,
        to,
        cc, bcc,
        subject,
        bodyHtml,
        bodyText,
        messageId: info.messageId || null,
        inReplyTo: replyHeaders.inReplyTo || null,
        references: replyHeaders.references || null,
        headers: mailOptions.headers || {},
        // Threading: link to root if replying, else self-root
        threadId: parent?.threadId || parent?.id || null,
        sentAt: new Date()
      }
    });

    if (!message.threadId) {
      await prisma.mailMessage.update({
        where: { id: message.id },
        data: { threadId: message.id }
      });
    }

    if (attachments.length > 0) {
      for (const file of attachments) {
        await prisma.mailAttachment.create({
          data: { messageId: message.id, fileId: file.id }
        });
      }
    }
  }

  return { message: 'Email sent successfully.', id: message?.id || null };
}

async function saveDraft({ tenantId, userId, to = '', cc = '', bcc = '', subject = '', bodyHtml = '', bodyText = '', attachments = [] }) {
  const account = await resolveAccount(tenantId);
  // Drafts require a configured account (not env fallback)
  if (account.id === null) {
    throw new Error('No SMTP configuration found. Please configure your email settings first by going to /dashboard/email-settings');
  }
  const draft = await prisma.mailMessage.create({
    data: {
      tenantId,
      mailAccountId: account.id,
      folder: 'Drafts',
      from: account.username,
      to, cc, bcc,
      subject,
      bodyHtml,
      bodyText
    }
  });
  if (attachments.length) {
    for (const file of attachments) {
      await prisma.mailAttachment.create({
        data: { messageId: draft.id, fileId: file.id }
      });
    }
  }
  return { id: draft.id };
}

async function updateDraft({ tenantId, id, ...fields }) {
  // Verify draft belongs to tenant and is in Drafts folder
  const existing = await prisma.mailMessage.findFirst({
    where: { id, tenantId, folder: 'Drafts' }
  });
  if (!existing) throw new Error('Draft not found or access denied.');
  
  const draft = await prisma.mailMessage.update({
    where: { id },
    data: { ...fields }
  });
  return draft;
}

async function sendDraft({ tenantId, draftId }) {
  const draft = await prisma.mailMessage.findFirst({ 
    where: { tenantId, id: draftId, folder: 'Drafts' }, 
    include: { attachments: { include: { file: true } } } 
  });
  if (!draft) throw new Error('Draft not found.');
  
  // Validate required fields
  if (!draft.to || draft.to.trim() === '') {
    throw new Error('Draft is missing recipient email address. Please edit the draft to add a recipient.');
  }
  
  // Handle attachments safely
  const attachments = (draft.attachments && Array.isArray(draft.attachments))
    ? draft.attachments.map(a => ({ id: a.fileId })).filter(a => a.id)
    : [];
  
  return sendEmail({
    tenantId,
    userId: null,
    to: draft.to.trim(),
    cc: draft.cc || '',
    bcc: draft.bcc || '',
    subject: draft.subject || '',
    bodyHtml: draft.bodyHtml || '',
    bodyText: draft.bodyText || '',
    attachments,
    replyToMessageId: draft.threadId && draft.threadId !== draft.id ? draft.threadId : null
  }).then(async (result) => {
    // Move draft to Sent or delete draft and keep the sent copy
    await prisma.mailMessage.delete({ where: { id: draftId } });
    return result;
  });
}

async function listByFolder(tenantId, folder) {
  return prisma.mailMessage.findMany({
    where: { tenantId, folder },
    include: { attachments: { include: { file: true } } },
    orderBy: { createdAt: 'desc' }
  });
}

async function moveMessage({ tenantId, id, toFolder }) {
  const msg = await prisma.mailMessage.update({
    where: { id },
    data: { folder: toFolder }
  });
  return { id: msg.id, folder: msg.folder };
}

async function restoreMessage({ tenantId, id }) {
  const msg = await prisma.mailMessage.update({
    where: { id },
    data: { folder: 'Drafts' }
  });
  return { id: msg.id, folder: msg.folder };
}

async function hardDeleteMessage({ tenantId, id }) {
  await prisma.mailAttachment.deleteMany({ where: { messageId: id } });
  await prisma.mailMessage.delete({ where: { id } });
  return { id };
}

// Templates
async function getEmailTemplates(tenantId) {
  return prisma.mailTemplate.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' }
  });
}

async function saveEmailTemplate({ tenantId, name, subject, body }) {
  return prisma.mailTemplate.upsert({
    where: { tenantId_name: { tenantId, name } },
    update: { subject, body, updatedAt: new Date() },
    create: { tenantId, name, subject, body }
  });
}

async function deleteEmailTemplate({ tenantId, templateName }) {
  const template = await prisma.mailTemplate.findFirst({
    where: { tenantId, name: templateName }
  });
  if (!template) {
    throw new Error('Template not found.');
  }
  await prisma.mailTemplate.delete({
    where: { id: template.id }
  });
  return { message: 'Template deleted successfully.' };
}

// Rendering helpers
async function renderTemplate({ subject, body, variables }) {
  return {
    subject: renderMustache(subject || '', variables),
    bodyHtml: renderMustache(body || '', variables),
    bodyText: renderMustache((body || '').replace(/<[^>]+>/g, ''), variables)
  };
}

async function renderTemplateForLead({ tenantId, templateName, leadId }) {
  const [tpl, lead] = await Promise.all([
    prisma.mailTemplate.findFirst({ where: { tenantId, name: templateName } }),
    prisma.lead.findFirst({ where: { id: leadId, tenantId } })
  ]);
  if (!tpl) throw new Error('Template not found.');
  if (!lead) throw new Error('Lead not found.');
  const variables = {
    leadName: lead.name,
    firstName: (lead.name || '').split(' ')[0],
    company: lead.company || '',
    email: lead.email || '',
    phone: lead.phone || ''
  };
  return renderTemplate({ subject: tpl.subject, body: tpl.body, variables });
}

// MailAccount Management
async function createMailAccount({ tenantId, type = 'SMTP', host, port, username, password, scope = 'send' }) {
  if (!host || !port || !username || !password) {
    throw new Error('Host, port, username, and password are required.');
  }
  const encryptedSecret = encrypt(password);
  return prisma.mailAccount.create({
    data: {
      tenantId,
      type,
      host,
      port: parseInt(port),
      username,
      encryptedSecret,
      scope
    }
  });
}

async function updateMailAccount({ tenantId, id, ...updates }) {
  if (updates.password) {
    updates.encryptedSecret = encrypt(updates.password);
    delete updates.password;
  }
  if (updates.port) {
    updates.port = parseInt(updates.port);
  }
  const account = await prisma.mailAccount.findFirst({
    where: { id, tenantId }
  });
  if (!account) {
    throw new Error('Mail account not found.');
  }
  return prisma.mailAccount.update({
    where: { id },
    data: updates
  });
}

async function getMailAccount(tenantId) {
  const account = await prisma.mailAccount.findFirst({ where: { tenantId } });
  if (!account) return null;
  // Return account without exposing encrypted password
  return {
    id: account.id,
    tenantId: account.tenantId,
    type: account.type,
    host: account.host,
    port: account.port,
    username: account.username,
    scope: account.scope,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt
  };
}

// Seed default email templates for a tenant (disabled by default - no templates seeded automatically)
async function seedDefaultTemplates(tenantId) {
  // Default templates removed - users should create their own templates
  // This function is kept for backward compatibility but returns empty array
  return [];
}

module.exports = {
  sendEmail,
  saveDraft,
  updateDraft,
  sendDraft,
  listByFolder,
  moveMessage,
  restoreMessage,
  hardDeleteMessage,
  getEmailTemplates,
  saveEmailTemplate,
  deleteEmailTemplate,
  renderTemplate,
  renderTemplateForLead,
  createMailAccount,
  updateMailAccount,
  getMailAccount,
  seedDefaultTemplates
};
