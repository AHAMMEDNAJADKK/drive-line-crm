const leadService = require('../services/leadService');

const checkDuplicate = async (req, res) => {
  try {
    const { mobile } = req.query;
    if (!mobile) return res.status(400).json({ success: false, message: 'Mobile number is required' });
    const existing = await leadService.checkDuplicate(mobile);
    res.json({ success: true, isDuplicate: !!existing, existingLead: existing || null });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

const createLead = async (req, res) => {
  try {
    const lead = await leadService.createLead(req.body, req.user);
    res.status(201).json({ success: true, message: 'Lead created successfully', data: lead });
  } catch (err) {
    if (err.isDuplicate) {
      return res.status(409).json({ success: false, message: err.message, isDuplicate: true, existingLead: err.existingLead });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

const listLeads = async (req, res, next) => {
  try {
    const result = await leadService.listLeads(req.user, req.query);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
};

const getLead = async (req, res) => {
  try {
    const lead = await leadService.getLeadById(req.params.id, req.user);
    res.json({ success: true, data: lead });
  } catch (err) {
    if (err.message === 'Lead not found') return res.status(404).json({ success: false, message: err.message });
    if (err.message.includes('Unauthorized')) return res.status(403).json({ success: false, message: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateLead = async (req, res) => {
  try {
    const lead = await leadService.updateLead(req.params.id, req.body, req.user);
    res.json({ success: true, message: 'Lead updated successfully', data: lead });
  } catch (err) {
    if (err.message === 'Lead not found') return res.status(404).json({ success: false, message: err.message });
    if (err.message.includes('Unauthorized')) return res.status(403).json({ success: false, message: err.message });
    res.status(400).json({ success: false, message: err.message });
  }
};

const updateStatus = async (req, res) => {
  try {
    const lead = await leadService.updateLeadStatus(req.params.id, req.body, req.user);
    res.json({ success: true, message: 'Lead status updated', data: lead });
  } catch (err) {
    if (err.message === 'Lead not found') return res.status(404).json({ success: false, message: err.message });
    if (err.statusCode === 403 || err.message.includes('Unauthorized')) return res.status(403).json({ success: false, message: err.message });
    res.status(400).json({ success: false, message: err.message });
  }
};

const assignLead = async (req, res) => {
  try {
    const { assignedTo } = req.body;
    const lead = await leadService.assignLead(req.params.id, assignedTo, req.user);
    res.json({ success: true, message: 'Lead assigned successfully', data: lead });
  } catch (err) {
    if (err.message === 'Lead not found') return res.status(404).json({ success: false, message: err.message });
    if (err.message.includes('authorized')) return res.status(403).json({ success: false, message: err.message });
    res.status(400).json({ success: false, message: err.message });
  }
};

const deleteLead = async (req, res) => {
  try {
    const result = await leadService.deleteLead(req.params.id, req.user);
    res.json({ success: true, ...result });
  } catch (err) {
    if (err.message === 'Lead not found') return res.status(404).json({ success: false, message: err.message });
    if (err.message.includes('Only administrators')) return res.status(403).json({ success: false, message: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
};

const getActivity = async (req, res) => {
  try {
    const activities = await leadService.getLeadActivities(req.params.id, req.user);
    res.json({ success: true, data: activities });
  } catch (err) {
    if (err.message === 'Lead not found') return res.status(404).json({ success: false, message: err.message });
    if (err.statusCode === 403 || err.message.includes('Unauthorized')) return res.status(403).json({ success: false, message: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { checkDuplicate, createLead, listLeads, getLead, updateLead, updateStatus, assignLead, deleteLead, getActivity };
