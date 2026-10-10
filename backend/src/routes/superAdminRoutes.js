const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/superAdminController');

// All Super Admin routes require authentication and dedicated superadmin role
router.use(authenticate);
router.use(authorize('superadmin'));

// Dashboard & system health
router.get('/dashboard', ctrl.getDashboard);

// User & Role Management
router.get('/users', ctrl.listUsers);
router.post('/users', ctrl.createUser);
router.patch('/users/:id', ctrl.updateUser);
router.patch('/users/:id/status', ctrl.toggleStatus);
router.patch('/users/:id/reset-password', ctrl.resetPassword);

// Branch Relationship Health & Integrity Audit
router.get('/branches/audit', ctrl.getBranchAudit);
router.post('/branches/fix-assignments', ctrl.fixAssignments);

// Audit Logging
router.get('/audit-logs', ctrl.getAuditLogs);

module.exports = router;
