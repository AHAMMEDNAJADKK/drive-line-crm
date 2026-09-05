const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const ctrl = require('../controllers/importExportController');

router.use(authenticate);

// Template download (any role)
router.get('/template', ctrl.downloadTemplate);

// Upload + parse file for mapping preview (admin only)
router.post('/parse', authorize('admin'), upload.single('file'), ctrl.parseFile);

// Execute import
router.post('/import', authorize('admin'), ctrl.importLeads);

// Download error report
router.post('/error-report', authorize('admin'), ctrl.downloadErrorReport);

module.exports = router;
