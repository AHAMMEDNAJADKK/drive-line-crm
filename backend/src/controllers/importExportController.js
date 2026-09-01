const importExportService = require('../services/importExportService');
const pdfService = require('../services/pdfService');
const fs = require('fs');

const parseFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const result = await importExportService.parseUploadedFile(req.file.path);
    res.json({ success: true, data: result, filePath: req.file.path });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(400).json({ success: false, message: err.message });
  }
};

const importLeads = async (req, res) => {
  try {
    const { filePath, mapping, options } = req.body;
    if (!filePath) return res.status(400).json({ success: false, message: 'File path is required' });
    if (!fs.existsSync(filePath)) return res.status(400).json({ success: false, message: 'Uploaded file not found. Please re-upload.' });
    const result = await importExportService.processLeadImport(filePath, mapping, options, req.user);
    res.json({ success: true, message: 'Import completed', data: result });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

const downloadTemplate = async (req, res) => {
  try {
    const buffer = importExportService.generateSampleTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="driveline_leads_import_template.xlsx"');
    res.send(buffer);
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

const exportExcel = async (req, res) => {
  try {
    const buffer = await importExportService.generateExcelExport(req.user, req.query);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="driveline_leads_${Date.now()}.xlsx"`);
    res.send(buffer);
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

const downloadErrorReport = async (req, res) => {
  try {
    const { errorRows } = req.body;
    if (!errorRows || !Array.isArray(errorRows)) return res.status(400).json({ success: false, message: 'No error rows provided' });
    const buffer = importExportService.generateErrorReportExcel(errorRows);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="import_errors.xlsx"');
    res.send(buffer);
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

const exportPDF = async (req, res) => {
  try {
    const pdfBuffer = await pdfService.generateLeadsLandscapePDF(req.user, req.query);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="driveline_leads_${Date.now()}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

const exportSingleLeadPDF = async (req, res) => {
  try {
    const pdfBuffer = await pdfService.generateSingleLeadPDF(req.params.id, req.user);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="lead_${req.params.id}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    if (err.message === 'Lead not found') return res.status(404).json({ success: false, message: err.message });
    if (err.message.includes('Unauthorized')) return res.status(403).json({ success: false, message: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { parseFile, importLeads, downloadTemplate, exportExcel, downloadErrorReport, exportPDF, exportSingleLeadPDF };
