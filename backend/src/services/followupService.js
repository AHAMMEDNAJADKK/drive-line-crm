const LeadFollowup = require('../models/LeadFollowup');
const Lead = require('../models/Lead');
const { normalizeLeadStatus } = require('../utils/leadStatus');

/**
 * Add a new follow-up interaction to a lead
 */
const addFollowup = async ({ leadId, remarks, statusChangedTo, nextFollowUpDate }, currentUser) => {
  if (!leadId) throw new Error('Lead ID is required');
  if (!remarks) throw new Error('Follow-up remarks are required');

  const lead = await Lead.findById(leadId);
  if (!lead) {
    throw new Error('Lead not found');
  }

  // Authorization check
  if (currentUser.role === 'employee') {
    const isAssigned = lead.assignedTo && lead.assignedTo.toString() === currentUser._id.toString();
    if (!isAssigned) {
      throw new Error('Unauthorized to add follow-up to this lead');
    }
  }

  const previousStatus = lead.status;

  // Create followup document
  const followup = new LeadFollowup({
    leadId,
    remarks: remarks.trim(),
    statusChangedTo: statusChangedTo || null,
    nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
    createdBy: currentUser._id
  });

  await followup.save();

  // Update lead's next follow-up and last contacted
  lead.lastContactedAt = new Date();
  if (nextFollowUpDate !== undefined) {
    lead.nextFollowUpDate = nextFollowUpDate ? new Date(nextFollowUpDate) : null;
  }
  if (statusChangedTo && statusChangedTo !== lead.status) {
    const nextStatus = normalizeLeadStatus(statusChangedTo);
    lead.status = nextStatus;
    if (nextStatus === 'Converted') {
      lead.convertedAt = new Date();
    } else {
      lead.convertedAt = null;
    }
  }
  await lead.save();

  // Log activity
  await LeadActivity.create({
    leadId,
    action: 'Follow-up Added',
    performedBy: currentUser._id,
    remarks: remarks.trim(),
    details: {
      statusChangedTo: statusChangedTo || lead.status,
      nextFollowUpDate: followup.nextFollowUpDate
    }
  });

  if (statusChangedTo && statusChangedTo !== previousStatus) {
    await LeadActivity.create({
      leadId,
      action: statusChangedTo === 'Converted' ? 'Lead Converted' : statusChangedTo === 'Lost' ? 'Lead Lost' : 'Status Changed',
      performedBy: currentUser._id,
      remarks: `Status updated to ${statusChangedTo} during follow-up`,
      details: { from: previousStatus, to: statusChangedTo }
    });
  }

  const populated = await LeadFollowup.findById(followup._id)
    .populate('createdBy', 'name employeeId role')
    .lean();

  return populated;
};

/**
 * Get all follow-ups for a lead (with RBAC check)
 */
const getFollowupsByLead = async (leadId, currentUser) => {
  const Lead = require('../models/Lead');
  const lead = await Lead.findById(leadId);
  if (!lead) {
    throw new Error('Lead not found');
  }

  // Check role authorization for single lead
  if (currentUser && currentUser.role === 'employee') {
    const isAssigned = lead.assignedTo && lead.assignedTo.toString() === currentUser._id.toString();
    if (!isAssigned) {
      throw new Error('Unauthorized to view follow-ups for this lead');
    }
  }

  const followups = await LeadFollowup.find({ leadId })
    .populate('createdBy', 'name employeeId role')
    .sort({ createdAt: -1 })
    .lean();

  return followups;
};

module.exports = {
  addFollowup,
  getFollowupsByLead
};
