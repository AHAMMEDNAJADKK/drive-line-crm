const LeadFollowup = require('../models/LeadFollowup');
const Lead = require('../models/Lead');
const LeadActivity = require('../models/LeadActivity');
const { upsertCustomerFromLead } = require('./customerService');
const { normalizeLeadStatus } = require('../utils/leadStatus');
const { assertLeadAccess } = require('../utils/leadAccess');

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

  // Authorize branch and employee ownership
  assertLeadAccess(lead, currentUser, 'add follow-up');

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

  // Link the converted lead to one customer, preserving idempotency.
  if (statusChangedTo && normalizeLeadStatus(statusChangedTo) === 'Converted' && !lead.customerId) {
    try {
      const customer = await upsertCustomerFromLead(
        lead.toObject(),
        currentUser
      );
      if (customer) {
        lead.customerId = customer._id;
        await lead.save();
      }
    } catch (customerErr) {
      console.error('[followupService] Failed to auto-create customer on conversion:', customerErr.message);
    }
  }

  // Log activity
  await LeadActivity.create({
    leadId,
    action: statusChangedTo ? 'Status Changed' : 'Follow-up Added',
    performedBy: currentUser._id,
    remarks: statusChangedTo
      ? `Status changed from ${previousStatus} to ${statusChangedTo}. Remarks: ${remarks}`
      : `Follow-up added: ${remarks}`,
    details: {
      statusChangedTo: statusChangedTo || null,
      previousStatus: statusChangedTo ? previousStatus : null,
      nextFollowUpDate: nextFollowUpDate || null,
      followupId: followup._id
    }
  });

  return followup;
};

/**
 * Get all follow-ups for a lead (with branch & RBAC check)
 */
const getFollowupsByLead = async (leadId, currentUser) => {
  const lead = await Lead.findById(leadId);
  if (!lead) {
    throw new Error('Lead not found');
  }

  // Verify branch and ownership access
  assertLeadAccess(lead, currentUser, 'view follow-ups');

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
