// server/src/utils/email.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT) === 465, // SSL only for 465
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined,
});

const sendEmail = async ({ to, subject, html }) => {
  return transporter.sendMail({
    from: process.env.MAIL_FROM || 'Eterna <no-reply@eterna.app>',
    to,
    subject,
    html,
  });
};

module.exports = { sendEmail };
