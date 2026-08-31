const followupService = require('../services/followupService');

const addFollowup = async (req, res) => {
  try {
    const followup = await followupService.addFollowup({ leadId: req.params.id, ...req.body }, req.user);
    res.status(201).json({ success: true, message: 'Follow-up recorded successfully', data: followup });
  } catch (err) {
    if (err.message === 'Lead not found') return res.status(404).json({ success: false, message: err.message });
    if (err.message.includes('Unauthorized')) return res.status(403).json({ success: false, message: err.message });
    res.status(400).json({ success: false, message: err.message });
  }
};

const getFollowups = async (req, res) => {
  try {
    const followups = await followupService.getFollowupsByLead(req.params.id);
    res.json({ success: true, data: followups });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

module.exports = { addFollowup, getFollowups };
