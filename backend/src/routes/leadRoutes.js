const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/leadController');
const { addFollowup, getFollowups } = require('../controllers/followupController');
const importExportCtrl = require('../controllers/importExportController');

router.use(authenticate);
router.use(authorize('admin', 'employee'));

// Duplicate check (quick, called in real time)
router.get('/check-duplicate', ctrl.checkDuplicate);

// Import/Export routes (must be before /:id)
router.get('/export/excel', importExportCtrl.exportExcel);
router.get('/export/pdf', importExportCtrl.exportPDF);

// Lead CRUD
router.post('/', ctrl.createLead);
router.get('/', ctrl.listLeads);
router.get('/:id', ctrl.getLead);
router.patch('/:id', ctrl.updateLead);
router.delete('/:id', authorize('admin'), ctrl.deleteLead);

// Lead-specific actions
router.patch('/:id/status', ctrl.updateStatus);
router.patch('/:id/assign', authorize('admin'), ctrl.assignLead);

// Follow-ups
router.post('/:id/followups', addFollowup);
router.get('/:id/followups', getFollowups);

// Activity timeline
router.get('/:id/activity', ctrl.getActivity);

// Single lead PDF export
router.get('/:id/export/pdf', importExportCtrl.exportSingleLeadPDF);

module.exports = router;
