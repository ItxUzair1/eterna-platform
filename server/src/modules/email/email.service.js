const nodemailer = require('nodemailer');
const prisma = require('../../config/db');

// ======== SEND EMAIL ========
async function sendEmail({ tenantId, to, subject, bodyHtml, bodyText, cc = '', attachments = [] }) {
  const account = await prisma.mailAccount.findFirst({ where: { tenantId } });
  if (!account) throw new Error('No SMTP configuration found for this tenant.');

  const transporter = nodemailer.createTransport({
    host: account.host,
    port: account.port,
    secure: account.port === 465,
    auth: { user: account.username, pass: account.encryptedSecret }
  });

  const mailOptions = {
    from: account.username,
    to,
    cc,
    subject,
    text: bodyText,
    html: bodyHtml,
    attachments: attachments.map(file => ({
      filename: file.name,
      path: file.path
    }))
  };

  await transporter.sendMail(mailOptions);

  const message = await prisma.mailMessage.create({
    data: {
      tenantId,
      mailAccountId: account.id,
      folder: 'Sent',
      from: account.username,
      to,
      cc,
      subject,
      bodyHtml,
      bodyText,
      sentAt: new Date()
    }
  });

  if (attachments.length > 0) {
    for (const file of attachments) {
      await prisma.mailAttachment.create({
        data: {
          messageId: message.id,
          fileId: file.id
        }
      });
    }
  }

  return { message: 'Email sent successfully.', id: message.id };
}

// ======== GET SENT EMAILS ========
async function getAllSentEmails(tenantId) {
  return prisma.mailMessage.findMany({
    where: { tenantId, folder: 'Sent' },
    include: {
      attachments: { include: { file: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
}

// ======== EMAIL TEMPLATES ========
async function getEmailTemplates(tenantId) {
  return prisma.mailTemplate.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' }
  });
}

// ======== CREATE OR UPDATE TEMPLATE ========
async function saveEmailTemplate({ tenantId, name, subject, body }) {
  return prisma.mailTemplate.upsert({
    where: { tenantId_name: { tenantId, name } },
    update: { subject, body, updatedAt: new Date() },
    create: { tenantId, name, subject, body }
  });
}

module.exports = {
  sendEmail,
  getAllSentEmails,
  getEmailTemplates,
  saveEmailTemplate
};
