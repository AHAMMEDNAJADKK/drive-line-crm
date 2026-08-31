const Lead = require('../models/Lead');
const LeadActivity = require('../models/LeadActivity');
const LeadFollowup = require('../models/LeadFollowup');
const User = require('../models/User');
const { normalizePhoneNumber, getCanonicalPhoneKey, isValidPhoneNumber } = require('../utils/phoneUtils');

/**
 * Check if a lead with the given mobile number exists
 */
const checkDuplicate = async (mobileNumber) => {
  if (!mobileNumber) return null;
  const canonicalKey = getCanonicalPhoneKey(mobileNumber);
  const normalized = normalizePhoneNumber(mobileNumber);

  const existing = await Lead.findOne({
    $or: [
      { canonicalPhoneKey: canonicalKey },
      { mobileNumber: normalized },
      { mobileNumber: { $regex: canonicalKey + '$' } }
    ]
  })
    .populate('assignedTo', 'name email employeeId phone')
    .populate('createdBy', 'name employeeId')
    .lean();

  return existing;
};

/**
 * Build Mongoose query based on user role and filters
 */
const buildLeadFilterQuery = (user, filters = {}) => {
  const query = {};

  // 1. Role-based scoping
  if (user.role === 'employee') {
    query.$or = [
      { assignedTo: user._id },
      { createdBy: user._id }
    ];
  } else if (user.role === 'manager') {
    // Managers can see all leads, or if team mapping is requested, their leads + team leads
    // For simplicity & flexibility, managers see company leads or filtered by team
    if (filters.assignedTo) {
      query.assignedTo = filters.assignedTo;
    }
  }

  // 2. Direct filters
  if (filters.assignedTo && user.role !== 'employee') {
    query.assignedTo = filters.assignedTo;
  }

  if (filters.status) {
    if (Array.isArray(filters.status)) {
      query.status = { $in: filters.status };
    } else {
      query.status = filters.status;
    }
  }

  if (filters.priority) {
    query.priority = filters.priority;
  }

  if (filters.customerType) {
    query.customerType = filters.customerType;
  }

  if (filters.source) {
    query.source = filters.source;
  }

  // 3. Search query
  if (filters.search) {
    const s = filters.search.trim();
    const searchConditions = [
      { customerName: { $regex: s, $options: 'i' } },
      { mobileNumber: { $regex: s, $options: 'i' } },
      { companyName: { $regex: s, $options: 'i' } },
      { partRequired: { $regex: s, $options: 'i' } },
      { partNumber: { $regex: s, $options: 'i' } },
      { vehicleModel: { $regex: s, $options: 'i' } },
      { location: { $regex: s, $options: 'i' } }
    ];

    if (query.$or) {
      query.$and = [
        { $or: query.$or },
        { $or: searchConditions }
      ];
      delete query.$or;
    } else {
      query.$or = searchConditions;
    }
  }

  // 4. Follow-up Filter
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const endOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59, 999);

  if (filters.followUp) {
    if (filters.followUp === 'today') {
      query.nextFollowUpDate = { $gte: startOfToday, $lte: endOfToday };
      query.status = { $nin: ['Converted', 'Lost'] };
    } else if (filters.followUp === 'tomorrow') {
      query.nextFollowUpDate = { $gte: startOfTomorrow, $lte: endOfTomorrow };
      query.status = { $nin: ['Converted', 'Lost'] };
    } else if (filters.followUp === 'overdue') {
      query.nextFollowUpDate = { $lt: startOfToday, $ne: null };
      query.status = { $nin: ['Converted', 'Lost'] };
    } else if (filters.followUp === 'upcoming') {
      query.nextFollowUpDate = { $gt: endOfToday };
      query.status = { $nin: ['Converted', 'Lost'] };
    } else if (filters.followUp === 'no_followup') {
      query.nextFollowUpDate = null;
      query.status = { $nin: ['Converted', 'Lost'] };
    }
  }

  // 5. Date filter (creation date)
  if (filters.date) {
    if (filters.date === 'today') {
      query.createdAt = { $gte: startOfToday, $lte: endOfToday };
    } else if (filters.date === 'this_week') {
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
      startOfWeek.setHours(0, 0, 0, 0);
      query.createdAt = { $gte: startOfWeek };
    } else if (filters.date === 'this_month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      query.createdAt = { $gte: startOfMonth };
    } else if (filters.date === 'custom' && (filters.startDate || filters.endDate)) {
      query.createdAt = {};
      if (filters.startDate) {
        query.createdAt.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }
  }

  return query;
};

/**
 * Create a new lead
 */
const createLead = async (leadData, currentUser) => {
  const {
    mobileNumber,
    customerName,
    alternateMobileNumber,
    companyName,
    customerType,
    location,
    vehicleMake,
    vehicleModel,
    vehicleYear,
    partRequired,
    partNumber,
    quantity,
    requirementDetails,
    source,
    status,
    priority,
    assignedTo,
    nextFollowUpDate,
    remarks,
    forceDuplicate = false
  } = leadData;

  if (!mobileNumber) {
    throw new Error('Mobile number is required');
  }

  if (!isValidPhoneNumber(mobileNumber)) {
    throw new Error('Invalid mobile number format. Please enter a valid 7-15 digit phone number.');
  }

  // Check duplicate unless explicitly forced
  if (!forceDuplicate) {
    const existing = await checkDuplicate(mobileNumber);
    if (existing) {
      const err = new Error('Lead with this mobile number already exists');
      err.isDuplicate = true;
      err.existingLead = existing;
      throw err;
    }
  }

  // Default assignment: if creator is employee and assignedTo is empty, assign to self
  let assignee = assignedTo;
  if (!assignee) {
    assignee = currentUser.role === 'employee' ? currentUser._id : currentUser._id;
  }

  const normalized = normalizePhoneNumber(mobileNumber);
  const canonicalKey = getCanonicalPhoneKey(mobileNumber);

  const newLead = new Lead({
    mobileNumber: normalized,
    canonicalPhoneKey: canonicalKey,
    customerName: customerName ? customerName.trim() : '',
    alternateMobileNumber: alternateMobileNumber ? normalizePhoneNumber(alternateMobileNumber) : '',
    companyName: companyName ? companyName.trim() : '',
    customerType: customerType || 'Other',
    location: location ? location.trim() : '',
    vehicleMake: vehicleMake ? vehicleMake.trim() : '',
    vehicleModel: vehicleModel ? vehicleModel.trim() : '',
    vehicleYear: vehicleYear ? vehicleYear.trim() : '',
    partRequired: partRequired ? partRequired.trim() : '',
    partNumber: partNumber ? partNumber.trim() : '',
    quantity: quantity ? Number(quantity) : 1,
    requirementDetails: requirementDetails ? requirementDetails.trim() : '',
    source: source || 'Phone',
    status: status || 'New',
    priority: priority || 'Medium',
    assignedTo: assignee,
    nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
    remarks: remarks ? remarks.trim() : '',
    createdBy: currentUser._id,
    lastContactedAt: nextFollowUpDate || remarks ? new Date() : null
  });

  await newLead.save();

  // Log activity
  await LeadActivity.create({
    leadId: newLead._id,
    action: 'Lead Created',
    performedBy: currentUser._id,
    remarks: `Lead created with mobile ${normalized}`,
    details: {
      initialStatus: newLead.status,
      assignedTo: assignee
    }
  });

  // If initial remarks or follow-up date was set, create a follow-up record
  if (remarks || nextFollowUpDate) {
    await LeadFollowup.create({
      leadId: newLead._id,
      remarks: remarks || 'Initial enquiry recorded',
      statusChangedTo: newLead.status,
      nextFollowUpDate: newLead.nextFollowUpDate,
      createdBy: currentUser._id
    });
  }

  const populated = await Lead.findById(newLead._id)
    .populate('assignedTo', 'name email employeeId phone')
    .populate('createdBy', 'name employeeId')
    .lean();

  return populated;
};

/**
 * List leads with filters and pagination
 */
const listLeads = async (currentUser, queryParams) => {
  const {
    page = 1,
    limit = 25,
    search = '',
    status,
    priority,
    assignedTo,
    customerType,
    source,
    followUp,
    date,
    startDate,
    endDate,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = queryParams;

  const query = buildLeadFilterQuery(currentUser, {
    search,
    status,
    priority,
    assignedTo,
    customerType,
    source,
    followUp,
    date,
    startDate,
    endDate
  });

  const skip = (Number(page) - 1) * Number(limit);
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [leads, total] = await Promise.all([
    Lead.find(query)
      .populate('assignedTo', 'name email employeeId phone')
      .populate('createdBy', 'name employeeId')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Lead.countDocuments(query)
  ]);

  return {
    leads,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit))
    }
  };
};

/**
 * Get single lead by ID
 */
const getLeadById = async (id, currentUser) => {
  const lead = await Lead.findById(id)
    .populate('assignedTo', 'name email employeeId phone')
    .populate('createdBy', 'name employeeId')
    .lean();

  if (!lead) {
    throw new Error('Lead not found');
  }

  // Check role authorization for single lead
  if (currentUser.role === 'employee') {
    const isAssigned = lead.assignedTo && lead.assignedTo._id.toString() === currentUser._id.toString();
    const isCreator = lead.createdBy && lead.createdBy._id.toString() === currentUser._id.toString();
    if (!isAssigned && !isCreator) {
      throw new Error('Unauthorized to view this lead');
    }
  }

  return lead;
};

/**
 * Update lead details
 */
const updateLead = async (id, updateData, currentUser) => {
  const lead = await Lead.findById(id);
  if (!lead) {
    throw new Error('Lead not found');
  }

  // Check role authorization
  if (currentUser.role === 'employee') {
    const isAssigned = lead.assignedTo && lead.assignedTo.toString() === currentUser._id.toString();
    const isCreator = lead.createdBy && lead.createdBy.toString() === currentUser._id.toString();
    if (!isAssigned && !isCreator) {
      throw new Error('Unauthorized to modify this lead');
    }
  }

  const previousStatus = lead.status;
  const previousAssignee = lead.assignedTo ? lead.assignedTo.toString() : null;

  // Handle phone change
  if (updateData.mobileNumber && updateData.mobileNumber !== lead.mobileNumber) {
    if (!isValidPhoneNumber(updateData.mobileNumber)) {
      throw new Error('Invalid mobile number format');
    }
    lead.mobileNumber = normalizePhoneNumber(updateData.mobileNumber);
    lead.canonicalPhoneKey = getCanonicalPhoneKey(updateData.mobileNumber);
  }

  if (updateData.customerName !== undefined) lead.customerName = updateData.customerName.trim();
  if (updateData.alternateMobileNumber !== undefined) lead.alternateMobileNumber = normalizePhoneNumber(updateData.alternateMobileNumber);
  if (updateData.companyName !== undefined) lead.companyName = updateData.companyName.trim();
  if (updateData.customerType !== undefined) lead.customerType = updateData.customerType;
  if (updateData.location !== undefined) lead.location = updateData.location.trim();
  if (updateData.vehicleMake !== undefined) lead.vehicleMake = updateData.vehicleMake.trim();
  if (updateData.vehicleModel !== undefined) lead.vehicleModel = updateData.vehicleModel.trim();
  if (updateData.vehicleYear !== undefined) lead.vehicleYear = updateData.vehicleYear.trim();
  if (updateData.partRequired !== undefined) lead.partRequired = updateData.partRequired.trim();
  if (updateData.partNumber !== undefined) lead.partNumber = updateData.partNumber.trim();
  if (updateData.quantity !== undefined) lead.quantity = Number(updateData.quantity) || 1;
  if (updateData.requirementDetails !== undefined) lead.requirementDetails = updateData.requirementDetails.trim();
  if (updateData.source !== undefined) lead.source = updateData.source;
  if (updateData.priority !== undefined) lead.priority = updateData.priority;
  if (updateData.remarks !== undefined) lead.remarks = updateData.remarks.trim();
  if (updateData.lostReason !== undefined) lead.lostReason = updateData.lostReason.trim();

  // Status updates
  if (updateData.status && updateData.status !== lead.status) {
    lead.status = updateData.status;
    if (updateData.status === 'Converted') {
      lead.convertedAt = new Date();
    } else {
      lead.convertedAt = null;
    }
  }

  // Assignment updates (Admin/Manager or if assigning)
  if (updateData.assignedTo !== undefined && currentUser.role !== 'employee') {
    lead.assignedTo = updateData.assignedTo || null;
  }

  if (updateData.nextFollowUpDate !== undefined) {
    lead.nextFollowUpDate = updateData.nextFollowUpDate ? new Date(updateData.nextFollowUpDate) : null;
  }

  lead.lastContactedAt = new Date();
  await lead.save();

  // Log activity
  if (previousStatus !== lead.status) {
    await LeadActivity.create({
      leadId: lead._id,
      action: 'Status Changed',
      performedBy: currentUser._id,
      remarks: `Status changed from ${previousStatus} to ${lead.status}`,
      details: { from: previousStatus, to: lead.status, reason: lead.lostReason }
    });
  }

  if (previousAssignee !== (lead.assignedTo ? lead.assignedTo.toString() : null)) {
    const newAssigneeUser = lead.assignedTo ? await User.findById(lead.assignedTo).select('name') : null;
    await LeadActivity.create({
      leadId: lead._id,
      action: previousAssignee ? 'Lead Reassigned' : 'Lead Assigned',
      performedBy: currentUser._id,
      remarks: `Assigned to ${newAssigneeUser ? newAssigneeUser.name : 'Unassigned'}`,
      details: { previousAssignee, newAssignee: lead.assignedTo }
    });
  }

  await LeadActivity.create({
    leadId: lead._id,
    action: 'Lead Updated',
    performedBy: currentUser._id,
    remarks: 'Lead details updated'
  });

  const updated = await Lead.findById(lead._id)
    .populate('assignedTo', 'name email employeeId phone')
    .populate('createdBy', 'name employeeId')
    .lean();

  return updated;
};

/**
 * Quick status update
 */
const updateLeadStatus = async (id, { status, lostReason }, currentUser) => {
  const lead = await Lead.findById(id);
  if (!lead) {
    throw new Error('Lead not found');
  }

  if (currentUser.role === 'employee') {
    const isAssigned = lead.assignedTo && lead.assignedTo.toString() === currentUser._id.toString();
    const isCreator = lead.createdBy && lead.createdBy.toString() === currentUser._id.toString();
    if (!isAssigned && !isCreator) {
      throw new Error('Unauthorized to modify this lead');
    }
  }

  const previousStatus = lead.status;
  lead.status = status;

  if (status === 'Converted') {
    lead.convertedAt = new Date();
  } else {
    lead.convertedAt = null;
  }

  if (status === 'Lost') {
    lead.lostReason = lostReason ? lostReason.trim() : 'Customer not interested';
  }

  lead.lastContactedAt = new Date();
  await lead.save();

  await LeadActivity.create({
    leadId: lead._id,
    action: status === 'Converted' ? 'Lead Converted' : status === 'Lost' ? 'Lead Lost' : 'Status Changed',
    performedBy: currentUser._id,
    remarks: `Status changed from ${previousStatus} to ${status}${status === 'Lost' ? ` (${lead.lostReason})` : ''}`,
    details: { from: previousStatus, to: status, lostReason: lead.lostReason }
  });

  const updated = await Lead.findById(lead._id)
    .populate('assignedTo', 'name email employeeId phone')
    .populate('createdBy', 'name employeeId')
    .lean();

  return updated;
};

/**
 * Assign / Reassign lead
 */
const assignLead = async (id, assignedToUserId, currentUser) => {
  if (currentUser.role === 'employee') {
    throw new Error('Employees are not authorized to reassign leads');
  }

  const lead = await Lead.findById(id);
  if (!lead) {
    throw new Error('Lead not found');
  }

  const previousAssignee = lead.assignedTo ? lead.assignedTo.toString() : null;
  lead.assignedTo = assignedToUserId || null;
  await lead.save();

  const newAssigneeUser = assignedToUserId ? await User.findById(assignedToUserId).select('name') : null;

  await LeadActivity.create({
    leadId: lead._id,
    action: previousAssignee ? 'Lead Reassigned' : 'Lead Assigned',
    performedBy: currentUser._id,
    remarks: `Lead assigned to ${newAssigneeUser ? newAssigneeUser.name : 'Unassigned'}`,
    details: { previousAssignee, newAssignee: assignedToUserId }
  });

  const updated = await Lead.findById(lead._id)
    .populate('assignedTo', 'name email employeeId phone')
    .populate('createdBy', 'name employeeId')
    .lean();

  return updated;
};

/**
 * Delete lead (Admin only)
 */
const deleteLead = async (id, currentUser) => {
  if (currentUser.role !== 'admin') {
    throw new Error('Only administrators can delete leads');
  }

  const lead = await Lead.findById(id);
  if (!lead) {
    throw new Error('Lead not found');
  }

  await Promise.all([
    Lead.findByIdAndDelete(id),
    LeadFollowup.deleteMany({ leadId: id }),
    LeadActivity.deleteMany({ leadId: id })
  ]);

  return { message: 'Lead and associated history deleted successfully' };
};

/**
 * Get lead activity history
 */
const getLeadActivities = async (leadId, currentUser) => {
  // Check authorization
  await getLeadById(leadId, currentUser);

  const activities = await LeadActivity.find({ leadId })
    .populate('performedBy', 'name employeeId role')
    .sort({ createdAt: -1 })
    .lean();

  return activities;
};

module.exports = {
  checkDuplicate,
  createLead,
  listLeads,
  getLeadById,
  updateLead,
  updateLeadStatus,
  assignLead,
  deleteLead,
  getLeadActivities,
  buildLeadFilterQuery
};
