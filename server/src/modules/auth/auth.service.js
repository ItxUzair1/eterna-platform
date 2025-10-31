// modules/auth/auth.service.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../../config/db');
const { sendEmail } = require('../../utils/email');
const { audit } = require('../../utils/audit');

const { signAccess, issueRefresh, rotateRefresh, revokeAllUserRefresh, sha256 } = require('../../utils/tokens');

const token24h = () => new Date(Date.now() + 24 * 60 * 60 * 1000);
const makeToken = () => crypto.randomBytes(32).toString('hex');

const createTenantWithOwner = async ({ email, username, password, roleName, profile }) => {
  return await prisma.$transaction(async (tx) => {
    const exists = await tx.user.findUnique({ where: { email } });
    if (exists) throw new Error('User already exists');

    const tenant = await tx.tenant.create({ data: { name: profile?.enterpriseName || `${username}'s Org` } });

    let role = await tx.role.findFirst({ where: { tenantId: tenant.id, name: roleName } });
    if (!role) role = await tx.role.create({ data: { tenantId: tenant.id, name: roleName, description: `${roleName} role` } });

    const hashed = await bcrypt.hash(password, 10);
    const user = await tx.user.create({
      data: {
        tenantId: tenant.id, email, username, passwordHash: hashed, roleId: role.id,
        firstName: profile?.firstName, lastName: profile?.lastName, jobTitle: profile?.jobTitle || null, photo: null
      },
      select: { id: true, tenantId: true, email: true, username: true, roleId: true, createdAt: true, emailVerifiedAt: true, tokenVersion: true },
    });

    const raw = makeToken();
    await tx.emailVerification.create({
      data: { tenantId: tenant.id, userId: user.id, hashedToken: sha256(raw), expiresAt: token24h() }
    });

    return { tenant, user, verifyToken: raw };
  });
};

const signup = async (data) => {
  const { email, username, password, role = 'Entrepreneur', firstName, lastName, enterpriseName } = data;
  const { user, verifyToken } = await createTenantWithOwner({
    email, username, password, roleName: role === 'Enterprise' ? 'Owner' : 'Entrepreneur',
    profile: { firstName, lastName, enterpriseName }
  });
  const verifyUrl = `${process.env.WEB_URL}/verify-email?token=${verifyToken}`;
  await sendEmail({ to: email, subject: 'Verify your Eterna email', html: `<p>Verify your email:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>` });
  return user;
};

const verifyEmail = async (token) => {
  const now = new Date();
  const rec = await prisma.emailVerification.findUnique({ where: { hashedToken: sha256(token) } });
  if (!rec || rec.expiresAt < now) throw new Error('Invalid or expired token');
  const user = await prisma.user.findUnique({ where: { id: rec.userId } });
  if (!user) throw new Error('User not found');

  if (!user.emailVerifiedAt) {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { emailVerifiedAt: now, tokenVersion: { increment: 1 } } });
      await tx.emailVerification.update({ where: { id: rec.id }, data: { usedAt: now } });
      await tx.emailVerification.deleteMany({ where: { userId: user.id, id: { not: rec.id } } });
    });
  }
  return { ok: true };
};

const signin = async ({ identifier, password, ip, userAgent }) => {
  const user = await prisma.user.findFirst({ where: { OR: [{ email: identifier }, { username: identifier }] } });
  if (!user) throw new Error('Invalid credentials');
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new Error('Invalid credentials');
  if (!user.emailVerifiedAt) throw new Error('Invalid credentials');

  const accessToken = signAccess({ id: user.id, tenantId: user.tenantId, roleId: user.roleId, tokenVersion: user.tokenVersion });
  const refreshToken = await issueRefresh({ user, ip, userAgent });
  const safeUser = { id: user.id, tenantId: user.tenantId, email: user.email, username: user.username, roleId: user.roleId };
  return { user: safeUser, accessToken, refreshToken };
};

const refreshSession = async ({ refreshToken, ip, userAgent }) => {
  const hashed = sha256(refreshToken);
  const rec = await prisma.refreshToken.findUnique({ where: { hashedToken: hashed } });
  if (!rec || rec.revokedAt || rec.expiresAt < new Date()) throw new Error('Invalid refresh');
  const user = await prisma.user.findUnique({ where: { id: rec.userId } });
  if (!user) throw new Error('Invalid refresh');

  const newRefresh = await rotateRefresh({ rawToken: refreshToken, user, ip, userAgent });
  const accessToken = signAccess({ id: user.id, tenantId: user.tenantId, roleId: user.roleId, tokenVersion: user.tokenVersion });
  return { accessToken, refreshToken: newRefresh };
};

const requestPasswordReset = async ({ email }) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { ok: true };
  const raw = makeToken();
  await prisma.passwordReset.create({ data: { tenantId: user.tenantId, userId: user.id, hashedToken: sha256(raw), expiresAt: token24h() } });
  const resetUrl = `${process.env.WEB_URL}/reset-password?token=${raw}`;
  await sendEmail({ to: user.email, subject: 'Reset your Eterna password', html: `<p>Reset link:</p><p><a href="${resetUrl}">${resetUrl}</a></p>` });
  return { ok: true };
};

const resetPassword = async ({ token, password }) => {
  const rec = await prisma.passwordReset.findUnique({ where: { hashedToken: sha256(token) } });
  if (!rec || rec.usedAt || rec.expiresAt < new Date()) throw new Error('Invalid or expired token');
  const hashed = await bcrypt.hash(password, 10);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: rec.userId }, data: { passwordHash: hashed, tokenVersion: { increment: 1 } } });
    await tx.passwordReset.update({ where: { id: rec.id }, data: { usedAt: new Date() } });
    await revokeAllUserRefresh(rec.userId);
  });
  return { ok: true };
};

const invite = async ({ inviterId, tenantId, email, roleName }) => {
  const raw = makeToken();
  await prisma.invitation.create({ data: { tenantId, email, roleName, inviterId, hashedToken: sha256(raw), expiresAt: token24h() } });
  const url = `${process.env.WEB_URL}/accept-invite?token=${raw}`;
  await sendEmail({ to: email, subject: 'You are invited to Eterna', html: `<p>You were invited to Eterna</p><a href="${url}">${url}</a>` });
  return { ok: true };
};

const acceptInvite = async ({ token, username, password }) => {
  const inv = await prisma.invitation.findUnique({ where: { hashedToken: sha256(token) } });
  if (!inv || inv.acceptedAt || inv.expiresAt < new Date()) throw new Error('Invalid or expired invitation');
  const existing = await prisma.user.findFirst({ where: { tenantId: inv.tenantId, email: inv.email } });
  if (existing) throw new Error('User already exists');

  const role = await prisma.role.findFirst({ where: { tenantId: inv.tenantId, name: inv.roleName } });
  if (!role) throw new Error('Role not found');

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { tenantId: inv.tenantId, email: inv.email, username, passwordHash: hashed, roleId: role.id, emailVerifiedAt: new Date(), tokenVersion: 1 }
  });
  await prisma.invitation.update({ where: { id: inv.id }, data: { acceptedAt: new Date() } });
  return { user };
};

const changePassword = async ({ userId, oldPassword, newPassword }) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const ok = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!ok) throw new Error('Invalid current password');
  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: hashed, tokenVersion: { increment: 1 } } });
  await revokeAllUserRefresh(userId);
  return { ok: true };
};

module.exports = {
  signup, verifyEmail, signin, refreshSession,
  requestPasswordReset, resetPassword,
  invite, acceptInvite,
  changePassword
};
