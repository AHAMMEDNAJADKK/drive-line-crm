const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/branchController');

// All branch routes require authentication
router.use(authenticate);

// Active branches list for dropdowns (Admin only for management, but available to auth users where needed)
router.get('/active-list', ctrl.getActiveList);

// Admin-only branch management routes
router.use(authorize('admin'));

router.get('/', ctrl.listBranches);
router.post('/', ctrl.createBranch);
router.get('/:id', ctrl.getBranch);
router.put('/:id', ctrl.updateBranch);
router.patch('/:id', ctrl.updateBranch);
router.patch('/:id/status', ctrl.toggleStatus);
router.post('/:id/assign-user', ctrl.assignUser);
router.delete('/:id', ctrl.deleteBranch);

module.exports = router;
