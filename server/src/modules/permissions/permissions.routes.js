const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middlewares/authMiddleware');
const { rbacGuard } = require('../../middlewares/rbacGuard');
const requireEnterprise = require('../../middlewares/planGuard');
const rateLimiter = require('../../middlewares/rateLimiter');
const ctrl = require('../permissions/permissions.controller');

// Self apps for Sidebar - accessible to all authenticated users
router.get('/me/apps', verifyToken, ctrl.getMyApps);

// Debug endpoint - accessible to all authenticated users to check their permissions
router.get('/me/debug', verifyToken, ctrl.getMyDebug);

// Fix endpoint - seeds missing admin permissions for Enterprise tenants
router.post('/me/fix-permissions', verifyToken, ctrl.fixEnterprisePermissions);

// Admin routes - require enterprise plan
router.use(verifyToken, requireEnterprise());

// Admin read/manage permissions
router.get('/matrix/:userId', rbacGuard('admin', 'read'), ctrl.getUserMatrix);
router.post('/matrix/:userId', rateLimiter(r=>`perm:${r.context?.userId}`, 60, 60000), rbacGuard('admin', 'manage'), ctrl.updateUserMatrix);

router.get('/roles', rbacGuard('admin', 'read'), ctrl.listRoles);
router.post('/roles', rbacGuard('admin', 'manage'), ctrl.createRole);
router.put('/roles/:roleId', rbacGuard('admin', 'manage'), ctrl.updateRole);
router.delete('/roles/:roleId', rbacGuard('admin', 'manage'), ctrl.deleteRole);

router.get('/teams/:teamId/permissions', rbacGuard('admin', 'read'), ctrl.getTeamPermissions);
router.post('/teams/:teamId/permissions', rbacGuard('admin', 'manage'), ctrl.setTeamPermissions);

// Directory
router.get('/members', rbacGuard('admin', 'read'), ctrl.listMembers);
router.put('/members/:userId/role', rbacGuard('admin', 'manage'), ctrl.assignRole);
router.put('/members/:userId', rbacGuard('admin', 'manage'), ctrl.updateMember);
router.delete('/members/:userId', rbacGuard('admin', 'manage'), ctrl.deleteMember);

module.exports = router;
