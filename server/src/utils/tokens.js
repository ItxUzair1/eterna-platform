// utils/tokens.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../config/db');

const ACCESS_TTL = process.env.ACCESS_TTL || '15m';
const REFRESH_TTL_MS = Number(process.env.REFRESH_TTL_MS || 1000 * 60 * 60 * 24 * 30); // 30d

const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex');

function signAccess({ id, tenantId, roleId, tokenVersion }) {
  return jwt.sign({ id, tenantId, roleId, tv: tokenVersion }, process.env.JWT_SECRET, { expiresIn: ACCESS_TTL });
}

async function issueRefresh({ user, ip, userAgent }) {
  const raw = crypto.randomBytes(32).toString('hex');
  const hashed = sha256(raw);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
  await prisma.refreshToken.create({
    data: { tenantId: user.tenantId, userId: user.id, hashedToken: hashed, ip: ip || null, userAgent: userAgent || null, expiresAt }
  });
  return raw;
}

async function rotateRefresh({ rawToken, user, ip, userAgent }) {
  const hashed = sha256(rawToken);
  const rec = await prisma.refreshToken.findUnique({ where: { hashedToken: hashed } });
  if (!rec || rec.revokedAt || rec.expiresAt < new Date()) throw new Error('Invalid refresh');
  await prisma.refreshToken.update({ where: { id: rec.id }, data: { revokedAt: new Date() } });
  return issueRefresh({ user, ip, userAgent });
}

async function revokeAllUserRefresh(userId) {
  await prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
}

module.exports = { signAccess, issueRefresh, rotateRefresh, revokeAllUserRefresh, sha256 };
