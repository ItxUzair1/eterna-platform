const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/authMiddleware');
const { rbacGuard } = require('../middlewares/rbacGuard');
const requireEnterprise = require('../middlewares/planGuard');
const prisma = require('../config/db');
const { audit } = require('../utils/audit');
const { sendEmail } = require('../utils/email');
const crypto = require('crypto');
const { sha256 } = require('../utils/tokens');

router.use(verifyToken, requireEnterprise());

// List all teams
router.get('/', rbacGuard('admin', 'read'), async (req, res) => {
  try {
    const teams = await prisma.team.findMany({
      where: { tenantId: req.context.tenantId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, email: true, username: true, firstName: true, lastName: true, jobTitle: true, photo: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ teams });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create team
router.post('/', rbacGuard('admin', 'manage'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Team name is required' });
    
    const team = await prisma.team.create({
      data: { tenantId: req.context.tenantId, name },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, email: true, username: true, firstName: true, lastName: true, jobTitle: true, photo: true }
            }
          }
        }
      }
    });
    
    await audit({ tenantId: req.context.tenantId, userId: req.context.userId }, 'teams.create', 'Team', team.id, { name });
    res.status(201).json({ team });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update team
router.put('/:teamId', rbacGuard('admin', 'manage'), async (req, res) => {
  try {
    const { teamId } = req.params;
    const { name } = req.body;
    
    const team = await prisma.team.findFirst({
      where: { id: +teamId, tenantId: req.context.tenantId }
    });
    if (!team) return res.status(404).json({ error: 'Team not found' });
    
    const updated = await prisma.team.update({
      where: { id: +teamId },
      data: { name },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, email: true, username: true, firstName: true, lastName: true, jobTitle: true, photo: true }
            }
          }
        }
      }
    });
    
    await audit({ tenantId: req.context.tenantId, userId: req.context.userId }, 'teams.update', 'Team', updated.id, { name });
    res.json({ team: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete team
router.delete('/:teamId', rbacGuard('admin', 'manage'), async (req, res) => {
  try {
    const { teamId } = req.params;
    
    const team = await prisma.team.findFirst({
      where: { id: +teamId, tenantId: req.context.tenantId }
    });
    if (!team) return res.status(404).json({ error: 'Team not found' });
    
    await prisma.team.delete({ where: { id: +teamId } });
    await audit({ tenantId: req.context.tenantId, userId: req.context.userId }, 'teams.delete', 'Team', +teamId, {});
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add member to team
router.post('/:teamId/members', rbacGuard('admin', 'manage'), async (req, res) => {
  try {
    const { teamId } = req.params;
    const { userId } = req.body;
    
    const team = await prisma.team.findFirst({
      where: { id: +teamId, tenantId: req.context.tenantId }
    });
    if (!team) return res.status(404).json({ error: 'Team not found' });
    
    const user = await prisma.user.findFirst({
      where: { id: +userId, tenantId: req.context.tenantId }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const member = await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId: +teamId, userId: +userId } },
      update: {},
      create: { teamId: +teamId, userId: +userId }
    });
    
    await audit({ tenantId: req.context.tenantId, userId: req.context.userId }, 'teams.add_member', 'TeamMember', member.id, { teamId: +teamId, userId: +userId });
    res.json({ member });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove member from team
router.delete('/:teamId/members/:userId', rbacGuard('admin', 'manage'), async (req, res) => {
  try {
    const { teamId, userId } = req.params;
    
    const team = await prisma.team.findFirst({
      where: { id: +teamId, tenantId: req.context.tenantId }
    });
    if (!team) return res.status(404).json({ error: 'Team not found' });
    
    await prisma.teamMember.deleteMany({
      where: { teamId: +teamId, userId: +userId }
    });
    
    await audit({ tenantId: req.context.tenantId, userId: req.context.userId }, 'teams.remove_member', 'TeamMember', null, { teamId: +teamId, userId: +userId });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Invite member to team via email
router.post('/:teamId/invite', rbacGuard('admin', 'manage'), async (req, res) => {
  try {
    const { teamId } = req.params;
    const { email, roleName = 'Member' } = req.body;
    
    if (!email) return res.status(400).json({ error: 'Email is required' });
    
    const team = await prisma.team.findFirst({
      where: { id: +teamId, tenantId: req.context.tenantId }
    });
    if (!team) return res.status(404).json({ error: 'Team not found' });
    
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: { email, tenantId: req.context.tenantId }
    });
    
    if (existingUser) {
      // User exists, add them to team directly
      await prisma.teamMember.upsert({
        where: { teamId_userId: { teamId: +teamId, userId: existingUser.id } },
        update: {},
        create: { teamId: +teamId, userId: existingUser.id }
      });
      await audit({ tenantId: req.context.tenantId, userId: req.context.userId }, 'teams.add_member', 'TeamMember', null, { teamId: +teamId, userId: existingUser.id });
      return res.json({ ok: true, message: 'User added to team' });
    }
    
    // User doesn't exist, create invitation with team context
    const raw = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    await prisma.invitation.create({
      data: {
        tenantId: req.context.tenantId,
        email,
        roleName,
        inviterId: req.context.userId,
        hashedToken: sha256(raw),
        expiresAt
      }
    });
    
    // Store teamId in invitation metadata (we'll use a note field or extend invitation)
    // For now, we'll handle this in acceptInvite by checking if user should be added to team
    // This is a simplification - in production you might want a separate TeamInvitation table
    
    const url = `${process.env.WEB_URL || 'http://localhost:5173'}/accept-invite?token=${raw}&teamId=${teamId}`;
    const tenant = await prisma.tenant.findUnique({ where: { id: req.context.tenantId }, select: { name: true } });
    
    await sendEmail({
      tenantId: req.context.tenantId,
      to: email,
      subject: `You're invited to join ${team.name} on ${tenant?.name || 'Eterna'}`,
      bodyHtml: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4f46e5;">You're Invited!</h2>
          <p>You have been invited to join the team <strong>${team.name}</strong> on ${tenant?.name || 'Eterna'}.</p>
          <p>Click the button below to accept your invitation:</p>
          <a href="${url}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Accept Invitation</a>
          <p style="color: #666; font-size: 12px;">This link expires in 24 hours.</p>
          <p style="color: #666; font-size: 12px;">If the button doesn't work, copy and paste this URL into your browser:</p>
          <p style="color: #666; font-size: 12px; word-break: break-all;">${url}</p>
        </div>
      `,
      bodyText: `You have been invited to join the team ${team.name} on ${tenant?.name || 'Eterna'}. Visit: ${url}`
    });
    
    await audit({ tenantId: req.context.tenantId, userId: req.context.userId }, 'teams.invite_member', 'Team', +teamId, { email, teamName: team.name });
    res.json({ ok: true, message: 'Invitation sent' });
  } catch (err) {
    console.error('Team invite error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get team members
router.get('/:teamId/members', rbacGuard('admin', 'read'), async (req, res) => {
  try {
    const { teamId } = req.params;
    
    const team = await prisma.team.findFirst({
      where: { id: +teamId, tenantId: req.context.tenantId }
    });
    if (!team) return res.status(404).json({ error: 'Team not found' });
    
    const members = await prisma.teamMember.findMany({
      where: { teamId: +teamId },
      include: {
        user: {
          select: { id: true, email: true, username: true, firstName: true, lastName: true, jobTitle: true, photo: true }
        }
      }
    });
    
    res.json({ members });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
