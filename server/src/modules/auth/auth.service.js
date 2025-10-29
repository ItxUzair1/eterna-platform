const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../../config/db');
const { sendEmail } = require('../../utils/email');
const { sendWhatsAppCode } = require('../../utils/whatsapp');
const { audit } = require('../../utils/audit');

const token24h = () => new Date(Date.now() + 24 * 60 * 60 * 1000);
const makeToken = () => crypto.randomBytes(32).toString('hex');
const hash = (v) => bcrypt.hash(v, 10);

const seedTenantPerms = async (tenantId) => {
  // call your permissionService.seedPermissionRegistry here if you added it
};

const createTenantWithOwner = async ({ email, username, password, roleName, profile }) => {
  return await prisma.$transaction(async (tx) => {
    const exists = await tx.user.findUnique({ where: { email } });
    if (exists) throw new Error('User already exists');

    const tenant = await tx.tenant.create({ data: { name: profile?.enterpriseName || `${username}'s Org` } });

    let role = await tx.role.findFirst({ where: { tenantId: tenant.id, name: roleName } });
    if (!role) {
      role = await tx.role.create({ data: { tenantId: tenant.id, name: roleName, description: `${roleName} role` } });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await tx.user.create({
      data: {
        tenantId: tenant.id,
        email, username, passwordHash: hashed, roleId: role.id,
        firstName: profile?.firstName, lastName: profile?.lastName, jobTitle: profile?.jobTitle || null,
        photo: null,
      },
      select: { id: true, tenantId: true, email: true, username: true, roleId: true, createdAt: true, emailVerifiedAt: true },
    });

    await seedTenantPerms(tenant.id);

    // create email verification
    const token = makeToken();
    await tx.emailVerification.create({
      data: { tenantId: tenant.id, userId: user.id, token, expiresAt: token24h() }
    });

    return { tenant, user, verifyToken: token };
  });
};

const signup = async (data) => {
  const { email, username, password, role = 'Entrepreneur', firstName, lastName, enterpriseName } = data;
  const { user, verifyToken } = await createTenantWithOwner({
    email, username, password, roleName: role === 'Enterprise' ? 'Owner' : 'Entrepreneur',
    profile: { firstName, lastName, enterpriseName }
  });
  // send verification email
  const verifyUrl = `${process.env.WEB_URL}/verify-email?token=${verifyToken}`;
  await sendEmail({
    to: email,
    subject: 'Verify your Eterna email',
    html: `<p>Welcome to Eterna!</p><p>Verify your email: <a href="${verifyUrl}">${verifyUrl}</a></p><p>Link expires in 24 hours.</p>`
  });
  return user;
};

// auth.service.js
const verifyEmail = async (token) => {
  const now = new Date();
  const record = await prisma.emailVerification.findUnique({ where: { token } });
  if (!record || record.expiresAt < now) throw new Error('Invalid or expired token');

  const user = await prisma.user.findUnique({ where: { id: record.userId } });
  if (user?.emailVerifiedAt) {
    // already verified; treat as success even if link was used
    return { ok: true };
  }

  if (record.usedAt) {
    // token used but user not marked — recover gracefully
    await prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: now } });
    return { ok: true };
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: now } });
    await tx.emailVerification.update({ where: { id: record.id }, data: { usedAt: now } });
  });
  return { ok: true };
};

const signin = async ({ identifier, password }) => {
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier }, { username: identifier }] }
  });
  if (!user) throw new Error('Invalid credentials');
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new Error('Invalid credentials');

  // Require email verification
  if (!user.emailVerifiedAt) {
    throw new Error('Email not verified');
  }

  // 2FA: if enabled, issue 2FA challenge token (short-lived) and send WA code
  if (user.twofaEnabled) {
    const code = String(Math.floor(100000 + Math.random() * 900000)); // 6-digit
    const codeHash = await hash(code);
    const jti = makeToken();
    // store temp in TwofaSecret as lastChallenge (or a cache). For simplicity keep in DB:
    await prisma.twofaSecret.upsert({
      where: { userId_method: { userId: user.id, method: 'whatsapp' } },
      create: {
        tenantId: user.tenantId, userId: user.id, method: 'whatsapp',
        secret: codeHash, recoveryCodes: '[]', enabled: true
      },
      update: { secret: codeHash, enabled: true }
    });
    // send WhatsApp
    if (user.phone) {
      await sendWhatsAppCode({ to: user.phone, body: `Eterna 2FA code: ${code}. Expires in 5 minutes.` });
    }
    // return temp token to front for 2FA verify
    const twofaToken = jwt.sign({ id: user.id, tenantId: user.tenantId, stage: '2fa', jti }, process.env.JWT_SECRET, { expiresIn: '5m' });
    return { requires2fa: true, twofaToken };
  }

  const token = jwt.sign(
    { id: user.id, tenantId: user.tenantId, roleId: user.roleId, emailVerifiedAt: user.emailVerifiedAt },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
  const safeUser = { id: user.id, tenantId: user.tenantId, email: user.email, username: user.username, roleId: user.roleId };
  return { user: safeUser, token };
};

const verify2fa = async ({ twofaToken, code }) => {
  const decoded = jwt.verify(twofaToken, process.env.JWT_SECRET);
  if (decoded.stage !== '2fa') throw new Error('Invalid 2FA state');
  const tfs = await prisma.twofaSecret.findUnique({ where: { userId_method: { userId: decoded.id, method: 'whatsapp' } } });
  if (!tfs) throw new Error('2FA not initialized');
  const ok = await bcrypt.compare(code, tfs.secret);
  if (!ok) throw new Error('Invalid 2FA code');
  const user = await prisma.user.findUnique({ where: { id: decoded.id } });
  const token = jwt.sign(
    { id: user.id, tenantId: user.tenantId, roleId: user.roleId, emailVerifiedAt: user.emailVerifiedAt },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
  return { token };
};

const enable2fa = async ({ userId, tenantId, phone }) => {
  const codes = Array.from({ length: 8 }, () => makeToken().slice(0, 10));
  const hashed = await Promise.all(codes.map(c => hash(c)));
  await prisma.user.update({ where: { id: userId }, data: { phone, twofaEnabled: true } });
  await prisma.twofaSecret.upsert({
    where: { userId_method: { userId, method: 'whatsapp' } },
    create: { tenantId, userId, method: 'whatsapp', secret: '', recoveryCodes: JSON.stringify(hashed), enabled: true },
    update: { enabled: true, recoveryCodes: JSON.stringify(hashed) },
  });
  return { recoveryCodes: codes };
};

const useRecoveryCode = async ({ userId, code }) => {
  const tfs = await prisma.twofaSecret.findUnique({ where: { userId_method: { userId, method: 'whatsapp' } } });
  if (!tfs) throw new Error('No 2FA setup');
  const list = JSON.parse(tfs.recoveryCodes || '[]');
  let okIdx = -1;
  for (let i = 0; i < list.length; i++) {
    const ok = await bcrypt.compare(code, list[i]);
    if (ok) { okIdx = i; break; }
  }
  if (okIdx === -1) throw new Error('Invalid recovery code');
  list.splice(okIdx, 1);
  await prisma.twofaSecret.update({ where: { userId_method: { userId, method: 'whatsapp' } }, data: { recoveryCodes: JSON.stringify(list) } });
  return { ok: true };
};

const requestPasswordReset = async ({ email }) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { ok: true }; // do not disclose
  const token = makeToken();
  await prisma.passwordReset.create({
    data: { tenantId: user.tenantId, userId: user.id, token, expiresAt: token24h() }
  });
  const resetUrl = `${process.env.WEB_URL}/reset-password?token=${token}`;
  await sendEmail({ to: user.email, subject: 'Reset your Eterna password', html: `<p>Reset link:</p><p><a href="${resetUrl}">${resetUrl}</a></p>` });
  return { ok: true };
};

const resetPassword = async ({ token, password }) => {
  const rec = await prisma.passwordReset.findUnique({ where: { token } });
  if (!rec || rec.usedAt || rec.expiresAt < new Date()) throw new Error('Invalid or expired token');
  const hashed = await bcrypt.hash(password, 10);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: rec.userId }, data: { passwordHash: hashed } });
    await tx.passwordReset.update({ where: { id: rec.id }, data: { usedAt: new Date() } });
  });
  return { ok: true };
};

const invite = async ({ inviterId, tenantId, email, roleName }) => {
  const token = makeToken();
  await prisma.invitation.create({
    data: { tenantId, email, token, roleName, inviterId, expiresAt: token24h() }
  });
  const url = `${process.env.WEB_URL}/accept-invite?token=${token}`;
  await sendEmail({ to: email, subject: 'You are invited to Eterna', html: `<p>You were invited to Eterna</p><a href="${url}">${url}</a>` });
  return { ok: true };
};

const acceptInvite = async ({ token, username, password }) => {
  const inv = await prisma.invitation.findUnique({ where: { token } });
  if (!inv || inv.acceptedAt || inv.expiresAt < new Date()) throw new Error('Invalid or expired invitation');
  const existing = await prisma.user.findFirst({ where: { tenantId: inv.tenantId, email: inv.email } });
  if (existing) throw new Error('User already exists');

  const role = await prisma.role.findFirst({ where: { tenantId: inv.tenantId, name: inv.roleName } });
  if (!role) throw new Error('Role not found');

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { tenantId: inv.tenantId, email: inv.email, username, passwordHash: hashed, roleId: role.id, emailVerifiedAt: new Date() }
  });
  await prisma.invitation.update({ where: { id: inv.id }, data: { acceptedAt: new Date() } });
  return { user };
};

const updateProfile = async ({ userId, payload }) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      firstName: payload.firstName,
      lastName: payload.lastName,
      jobTitle: payload.jobTitle,
      photo: payload.photo || undefined,
    },
    select: { id: true, email: true, username: true, firstName: true, lastName: true, jobTitle: true, photo: true }
  });
  return user;
};

const changeEmail = async ({ userId, newEmail }) => {
  const token = makeToken();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  await prisma.emailVerification.create({ data: { tenantId: user.tenantId, userId, token, expiresAt: token24h() } });
  await sendEmail({ to: newEmail, subject: 'Verify your new Eterna email', html: `<a href="${process.env.WEB_URL}/verify-email?token=${token}">Verify</a>` });
  return { ok: true };
};

const changePassword = async ({ userId, oldPassword, newPassword }) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const ok = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!ok) throw new Error('Invalid current password');
  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: hashed } });
  return { ok: true };
};

module.exports = {
  signup, verifyEmail, signin, verify2fa, enable2fa, useRecoveryCode,
  requestPasswordReset, resetPassword,
  invite, acceptInvite,
  updateProfile, changeEmail, changePassword
};
