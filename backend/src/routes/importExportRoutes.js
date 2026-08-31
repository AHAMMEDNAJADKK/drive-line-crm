const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const ctrl = require('../controllers/importExportController');

router.use(authenticate);

// Template download (any role)
router.get('/template', ctrl.downloadTemplate);

// Upload + parse file for mapping preview (admin & manager)
router.post('/parse', authorize('admin', 'manager'), upload.single('file'), ctrl.parseFile);

// Execute import
router.post('/import', authorize('admin', 'manager'), ctrl.importLeads);

// Download error report
router.post('/error-report', authorize('admin', 'manager'), ctrl.downloadErrorReport);

module.exports = router;
