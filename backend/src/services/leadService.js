const Lead = require('../models/Lead');
const LeadActivity = require('../models/LeadActivity');
const LeadFollowup = require('../models/LeadFollowup');
const User = require('../models/User');
const {
  normalizePhoneNumber,
  getCanonicalPhoneKey,
  isValidPhoneNumber
} = require('../utils/phoneUtils');
const { isEmployee } = require('../utils/roles');
const { assertEmployeeLeadAccess } = require('../utils/leadAccess');
const {
  normalizeLeadStatus,
  isWritableLeadStatus,
  statusFilterQuery
} = require('../utils/leadStatus');

/**
 * Normalize requirements array
 *
 * Keeps the new multi-line requirement structure clean and safe.
 */
const normalizeRequirements = (requirements) => {
  if (!Array.isArray(requirements)) {
    return [];
  }

  return requirements
    .map((item) => ({
      vehicleName: item?.vehicleName
        ? String(item.vehicleName).trim()
        : '',

      // NEW: vehicle model for each requirement line
      vehicleModel: item?.vehicleModel
        ? String(item.vehicleModel).trim()
        : '',

      partName: item?.partName
        ? String(item.partName).trim()
        : '',

      partNumber: item?.partNumber
        ? String(item.partNumber).trim()
        : '',

      quantity:
        Number(item?.quantity) > 0
          ? Number(item.quantity)
          : 1,

      remarks: item?.remarks
        ? String(item.remarks).trim()
        : ''
    }))
    .filter(
      (item) =>
        item.vehicleName ||
        item.vehicleModel ||
        item.partName ||
        item.partNumber ||
        item.remarks
    );
};

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
    .populate('assignedTo', 'name email employeeId phone vehicleSpecialization')
    .populate('createdBy', 'name employeeId')
    .lean();

  return existing;
};

/**
 * Build Mongoose query based on user role and filters
 */
const buildLeadFilterQuery = (user, filters = {}) => {
  const query = {};

  // 1. Role-based scoping — employees see only leads assigned to them
  if (isEmployee(user)) {
    query.assignedTo = user._id;
  } else if (filters.assignedTo) {
    query.assignedTo = filters.assignedTo;
  }

  if (filters.status) {
    query.status = statusFilterQuery(filters.status);
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

      // Existing legacy fields
      { partRequired: { $regex: s, $options: 'i' } },
      { partNumber: { $regex: s, $options: 'i' } },
      { vehicleMake: { $regex: s, $options: 'i' } },
      { vehicleModel: { $regex: s, $options: 'i' } },

      // New multi-line requirement fields
      { 'requirements.vehicleName': { $regex: s, $options: 'i' } },
      { 'requirements.vehicleModel': { $regex: s, $options: 'i' } },
      { 'requirements.partName': { $regex: s, $options: 'i' } },
      { 'requirements.partNumber': { $regex: s, $options: 'i' } },

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

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const endOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999
  );

  const startOfTomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1
  );

  const endOfTomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    23,
    59,
    59,
    999
  );

  const followUpVal = filters.followUp || filters.followup;

  if (followUpVal) {
    if (followUpVal === 'today') {
      query.nextFollowUpDate = {
        $gte: startOfToday,
        $lte: endOfToday
      };

      query.status = {
        $nin: ['Converted', 'Lost']
      };
    } else if (followUpVal === 'tomorrow') {
      query.nextFollowUpDate = {
        $gte: startOfTomorrow,
        $lte: endOfTomorrow
      };

      query.status = {
        $nin: ['Converted', 'Lost']
      };
    } else if (followUpVal === 'overdue') {
      query.nextFollowUpDate = {
        $lt: startOfToday,
        $ne: null
      };

      query.status = {
        $nin: ['Converted', 'Lost']
      };
    } else if (followUpVal === 'upcoming') {
      query.nextFollowUpDate = {
        $gt: endOfToday
      };

      query.status = {
        $nin: ['Converted', 'Lost']
      };
    } else if (followUpVal === 'no_followup') {
      query.nextFollowUpDate = null;

      query.status = {
        $nin: ['Converted', 'Lost']
      };
    }
  }

  // 5. Date filter
  const startDateVal =
    filters.startDate || filters.dateFrom;

  const endDateVal =
    filters.endDate || filters.dateTo;

  if (filters.date === 'today') {
    query.createdAt = {
      $gte: startOfToday,
      $lte: endOfToday
    };
  } else if (filters.date === 'this_week') {
    const startOfWeek = new Date(now);

    startOfWeek.setDate(
      startOfWeek.getDate() - startOfWeek.getDay()
    );

    startOfWeek.setHours(0, 0, 0, 0);

    query.createdAt = {
      $gte: startOfWeek
    };
  } else if (filters.date === 'this_month') {
    const startOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

    query.createdAt = {
      $gte: startOfMonth
    };
  } else if (startDateVal || endDateVal) {
    query.createdAt = {};

    if (startDateVal) {
      query.createdAt.$gte = new Date(startDateVal);
    }

    if (endDateVal) {
      const end = new Date(endDateVal);

      end.setHours(
        23,
        59,
        59,
        999
      );

      query.createdAt.$lte = end;
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

    // Legacy single vehicle fields
    vehicleMake,
    vehicleModel,
    vehicleYear,

    // Legacy single part fields
    partRequired,
    partNumber,
    quantity,

    // New multi-line requirements
    requirements,

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
    throw new Error(
      'Invalid mobile number format. Please enter a valid 7-15 digit phone number.'
    );
  }

  // Check duplicate unless explicitly forced
  if (!forceDuplicate) {
    const existing = await checkDuplicate(mobileNumber);

    if (existing) {
      const err = new Error(
        'Lead with this mobile number already exists'
      );

      err.isDuplicate = true;
      err.existingLead = existing;

      throw err;
    }
  }

  // Default assignment — employees may only assign to themselves
  let assignee = assignedTo;

  if (isEmployee(currentUser)) {
    assignee = currentUser._id;
  } else if (!assignee) {
    assignee = currentUser._id;
  }

  let initialStatus = status || 'New';
  if (initialStatus) {
    if (!isWritableLeadStatus(initialStatus)) {
      throw new Error(
        'Invalid lead status. Allowed values: New, Contacted, Quotation, Followup, Converted, Lost'
      );
    }
    initialStatus = normalizeLeadStatus(initialStatus);
  }

  const normalized =
    normalizePhoneNumber(mobileNumber);

  const canonicalKey =
    getCanonicalPhoneKey(mobileNumber);

  const normalizedRequirements =
    normalizeRequirements(requirements);

  /*
   * Backward compatibility:
   *
   * If the new form sends requirements[],
   * we save that structure.
   *
   * We also populate the old fields using
   * the first requirement so existing listing,
   * export and older functionality continue working.
   */
  const firstRequirement =
    normalizedRequirements[0] || null;

  const finalVehicleMake =
    vehicleMake?.trim() ||
    firstRequirement?.vehicleName ||
    '';

  // NEW: use vehicle model from first requirement
  // when legacy vehicleModel is not supplied.
  const finalVehicleModel =
    vehicleModel?.trim() ||
    firstRequirement?.vehicleModel ||
    '';

  const finalPartRequired =
    partRequired?.trim() ||
    firstRequirement?.partName ||
    '';

  const finalPartNumber =
    partNumber?.trim() ||
    firstRequirement?.partNumber ||
    '';

  const finalQuantity =
    quantity ||
    firstRequirement?.quantity ||
    1;

  const newLead = new Lead({
    mobileNumber: normalized,

    canonicalPhoneKey: canonicalKey,

    customerName: customerName
      ? customerName.trim()
      : '',

    alternateMobileNumber:
      alternateMobileNumber
        ? normalizePhoneNumber(
            alternateMobileNumber
          )
        : '',

    companyName: companyName
      ? companyName.trim()
      : '',

    customerType:
      customerType || 'Other',

    location: location
      ? location.trim()
      : '',

    // Legacy fields
    vehicleMake: finalVehicleMake,
    vehicleModel: finalVehicleModel,

    vehicleYear: vehicleYear
      ? vehicleYear.trim()
      : '',

    partRequired: finalPartRequired,

    partNumber: finalPartNumber,

    quantity:
      Number(finalQuantity) > 0
        ? Number(finalQuantity)
        : 1,

    // New multiple requirements
    requirements:
      normalizedRequirements,

    requirementDetails:
      requirementDetails
        ? requirementDetails.trim()
        : '',

    source:
      source || 'Phone',

    status:
      initialStatus || 'New',

    priority:
      priority || 'Medium',

    assignedTo:
      assignee,

    nextFollowUpDate:
      nextFollowUpDate
        ? new Date(nextFollowUpDate)
        : null,

    remarks:
      remarks
        ? remarks.trim()
        : '',

    createdBy:
      currentUser._id,

    lastContactedAt:
      nextFollowUpDate || remarks
        ? new Date()
        : null
  });

  await newLead.save();

  // Log activity
  await LeadActivity.create({
    leadId: newLead._id,

    action: 'Lead Created',

    performedBy:
      currentUser._id,

    remarks:
      `Lead created with mobile ${normalized}`,

    details: {
      initialStatus:
        newLead.status,

      assignedTo:
        assignee,

      requirementCount:
        normalizedRequirements.length
    }
  });

  // Initial follow-up record
  if (remarks || nextFollowUpDate) {
    await LeadFollowup.create({
      leadId: newLead._id,

      remarks:
        remarks ||
        'Initial enquiry recorded',

      statusChangedTo:
        newLead.status,

      nextFollowUpDate:
        newLead.nextFollowUpDate,

      createdBy:
        currentUser._id
    });
  }

  const populated =
    await Lead.findById(newLead._id)
      .populate(
        'assignedTo',
        'name email employeeId phone vehicleSpecialization'
      )
      .populate(
        'createdBy',
        'name employeeId'
      )
      .lean();

  return populated;
};

/**
 * List leads with filters and pagination
 */
const listLeads = async (
  currentUser,
  queryParams
) => {
  const {
    page = 1,
    limit = 25,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = queryParams;

  const query =
    buildLeadFilterQuery(
      currentUser,
      queryParams
    );

  const skip =
    (Number(page) - 1) *
    Number(limit);

  const sort = {
    [sortBy]:
      sortOrder === 'asc'
        ? 1
        : -1
  };

  const [leads, total] =
    await Promise.all([
      Lead.find(query)
        .populate(
          'assignedTo',
          'name email employeeId phone vehicleSpecialization'
        )
        .populate(
          'createdBy',
          'name employeeId'
        )
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .lean(),

      Lead.countDocuments(query)
    ]);

  return {
    leads,

    data: leads,

    total,

    page: Number(page),

    pages:
      Math.ceil(
        total / Number(limit)
      ) || 1,

    pagination: {
      page: Number(page),

      limit: Number(limit),

      total,

      totalPages:
        Math.ceil(
          total / Number(limit)
        ) || 1
    }
  };
};

/**
 * Get single lead by ID
 */
const getLeadById = async (
  id,
  currentUser
) => {
  const lead =
    await Lead.findById(id)
      .populate(
        'assignedTo',
        'name email employeeId phone vehicleSpecialization'
      )
      .populate(
        'createdBy',
        'name employeeId'
      )
      .lean();

  if (!lead) {
    throw new Error(
      'Lead not found'
    );
  }

  assertEmployeeLeadAccess(lead, currentUser, 'view');

  return lead;
};

/**
 * Update lead details
 */
const updateLead = async (
  id,
  updateData,
  currentUser
) => {
  const lead =
    await Lead.findById(id);

  if (!lead) {
    throw new Error(
      'Lead not found'
    );
  }

  assertEmployeeLeadAccess(lead, currentUser, 'modify');

  const previousStatus =
    lead.status;

  const previousAssignee =
    lead.assignedTo
      ? lead.assignedTo.toString()
      : null;

  // Phone
  if (
    updateData.mobileNumber &&
    updateData.mobileNumber !==
      lead.mobileNumber
  ) {
    if (
      !isValidPhoneNumber(
        updateData.mobileNumber
      )
    ) {
      throw new Error(
        'Invalid mobile number format'
      );
    }

    lead.mobileNumber =
      normalizePhoneNumber(
        updateData.mobileNumber
      );

    lead.canonicalPhoneKey =
      getCanonicalPhoneKey(
        updateData.mobileNumber
      );
  }

  // Customer
  if (
    updateData.customerName !== undefined
  ) {
    lead.customerName =
      updateData.customerName.trim();
  }

  if (
    updateData.alternateMobileNumber !==
    undefined
  ) {
    lead.alternateMobileNumber =
      updateData.alternateMobileNumber
        ? normalizePhoneNumber(
            updateData.alternateMobileNumber
          )
        : '';
  }

  if (
    updateData.companyName !== undefined
  ) {
    lead.companyName =
      updateData.companyName.trim();
  }

  if (
    updateData.customerType !== undefined
  ) {
    lead.customerType =
      updateData.customerType;
  }

  if (
    updateData.location !== undefined
  ) {
    lead.location =
      updateData.location.trim();
  }

  // Legacy vehicle fields
  if (
    updateData.vehicleMake !== undefined
  ) {
    lead.vehicleMake =
      updateData.vehicleMake.trim();
  }

  if (
    updateData.vehicleModel !== undefined
  ) {
    lead.vehicleModel =
      updateData.vehicleModel.trim();
  }

  if (
    updateData.vehicleYear !== undefined
  ) {
    lead.vehicleYear =
      updateData.vehicleYear.trim();
  }

  // Legacy part fields
  if (
    updateData.partRequired !== undefined
  ) {
    lead.partRequired =
      updateData.partRequired.trim();
  }

  if (
    updateData.partNumber !== undefined
  ) {
    lead.partNumber =
      updateData.partNumber.trim();
  }

  if (
    updateData.quantity !== undefined
  ) {
    lead.quantity =
      Number(updateData.quantity) || 1;
  }

  // NEW MULTI-LINE REQUIREMENTS
  if (
    updateData.requirements !== undefined
  ) {
    if (
      !Array.isArray(
        updateData.requirements
      )
    ) {
      throw new Error(
        'Requirements must be an array'
      );
    }

    lead.requirements =
      normalizeRequirements(
        updateData.requirements
      );

    /*
     * Keep legacy fields synchronized
     * with the first requirement.
     */
    const firstRequirement =
      lead.requirements[0];

    if (firstRequirement) {
      lead.vehicleMake =
        firstRequirement.vehicleName ||
        lead.vehicleMake ||
        '';

      // NEW: synchronize first requirement
      // vehicle model with legacy vehicleModel.
      lead.vehicleModel =
        firstRequirement.vehicleModel ||
        lead.vehicleModel ||
        '';

      lead.partRequired =
        firstRequirement.partName ||
        lead.partRequired ||
        '';

      lead.partNumber =
        firstRequirement.partNumber ||
        lead.partNumber ||
        '';

      lead.quantity =
        firstRequirement.quantity ||
        lead.quantity ||
        1;
    }
  }

  // Requirement details
  if (
    updateData.requirementDetails !==
    undefined
  ) {
    lead.requirementDetails =
      updateData.requirementDetails.trim();
  }

  // Sales
  if (
    updateData.source !== undefined
  ) {
    lead.source =
      updateData.source;
  }

  if (
    updateData.priority !== undefined
  ) {
    lead.priority =
      updateData.priority;
  }

  if (
    updateData.remarks !== undefined
  ) {
    lead.remarks =
      updateData.remarks.trim();
  }

  if (
    updateData.lostReason !== undefined
  ) {
    lead.lostReason =
      updateData.lostReason.trim();
  }

  // Status
  if (
    updateData.status &&
    updateData.status !==
      lead.status
  ) {
    if (!isWritableLeadStatus(updateData.status)) {
      throw new Error(
        'Invalid lead status. Allowed values: New, Contacted, Quotation, Followup, Converted, Lost'
      );
    }

    lead.status =
      normalizeLeadStatus(updateData.status);

    if (
      updateData.status ===
      'Converted'
    ) {
      lead.convertedAt =
        new Date();
    } else {
      lead.convertedAt =
        null;
    }
  }

  // Assignment
  if (
    updateData.assignedTo !==
      undefined &&
    !isEmployee(currentUser)
  ) {
    lead.assignedTo =
      updateData.assignedTo ||
      null;
  }

  // Follow-up
  if (
    updateData.nextFollowUpDate !==
    undefined
  ) {
    lead.nextFollowUpDate =
      updateData.nextFollowUpDate
        ? new Date(
            updateData.nextFollowUpDate
          )
        : null;
  }

  lead.lastContactedAt =
    new Date();

  await lead.save();

  // Status activity
  if (
    previousStatus !==
    lead.status
  ) {
    await LeadActivity.create({
      leadId: lead._id,

      action:
        'Status Changed',

      performedBy:
        currentUser._id,

      remarks:
        `Status changed from ${previousStatus} to ${lead.status}`,

      details: {
        from:
          previousStatus,

        to:
          lead.status,

        reason:
          lead.lostReason
      }
    });
  }

  // Assignment activity
  if (
    previousAssignee !==
    (
      lead.assignedTo
        ? lead.assignedTo.toString()
        : null
    )
  ) {
    const newAssigneeUser =
      lead.assignedTo
        ? await User.findById(
            lead.assignedTo
          ).select('name')
        : null;

    await LeadActivity.create({
      leadId: lead._id,

      action:
        previousAssignee
          ? 'Lead Reassigned'
          : 'Lead Assigned',

      performedBy:
        currentUser._id,

      remarks:
        `Assigned to ${
          newAssigneeUser
            ? newAssigneeUser.name
            : 'Unassigned'
        }`,

      details: {
        previousAssignee,

        newAssignee:
          lead.assignedTo
      }
    });
  }

  await LeadActivity.create({
    leadId: lead._id,

    action:
      'Lead Updated',

    performedBy:
      currentUser._id,

    remarks:
      'Lead details updated'
  });

  const updated =
    await Lead.findById(
      lead._id
    )
      .populate(
        'assignedTo',
        'name email employeeId phone vehicleSpecialization'
      )
      .populate(
        'createdBy',
        'name employeeId'
      )
      .lean();

  return updated;
};

/**
 * Quick status update
 */
const updateLeadStatus = async (
  id,
  { status, lostReason },
  currentUser
) => {
  const lead =
    await Lead.findById(id);

  if (!lead) {
    throw new Error(
      'Lead not found'
    );
  }

  assertEmployeeLeadAccess(lead, currentUser, 'modify');

  if (!isWritableLeadStatus(status)) {
    throw new Error(
      'Invalid lead status. Allowed values: New, Contacted, Quotation, Followup, Converted, Lost'
    );
  }

  status = normalizeLeadStatus(status);

  const previousStatus =
    lead.status;

  lead.status =
    status;

  if (
    status === 'Converted'
  ) {
    lead.convertedAt =
      new Date();
  } else {
    lead.convertedAt =
      null;
  }

  if (
    status === 'Lost'
  ) {
    lead.lostReason =
      lostReason
        ? lostReason.trim()
        : 'Customer not interested';
  }

  lead.lastContactedAt =
    new Date();

  await lead.save();

  await LeadActivity.create({
    leadId: lead._id,

    action:
      status === 'Converted'
        ? 'Lead Converted'
        : status === 'Lost'
        ? 'Lead Lost'
        : 'Status Changed',

    performedBy:
      currentUser._id,

    remarks:
      `Status changed from ${previousStatus} to ${status}${
        status === 'Lost'
          ? ` (${lead.lostReason})`
          : ''
      }`,

    details: {
      from:
        previousStatus,

      to:
        status,

      lostReason:
        lead.lostReason
    }
  });

  const updated =
    await Lead.findById(
      lead._id
    )
      .populate(
        'assignedTo',
        'name email employeeId phone vehicleSpecialization'
      )
      .populate(
        'createdBy',
        'name employeeId'
      )
      .lean();

  return updated;
};

/**
 * Assign / Reassign lead
 */
const assignLead = async (
  id,
  assignedToUserId,
  currentUser
) => {
  if (isEmployee(currentUser)) {
    throw new Error(
      'Employees are not authorized to reassign leads'
    );
  }

  const lead =
    await Lead.findById(id);

  if (!lead) {
    throw new Error(
      'Lead not found'
    );
  }

  const previousAssignee =
    lead.assignedTo
      ? lead.assignedTo.toString()
      : null;

  lead.assignedTo =
    assignedToUserId || null;

  await lead.save();

  const newAssigneeUser =
    assignedToUserId
      ? await User.findById(
          assignedToUserId
        ).select('name')
      : null;

  await LeadActivity.create({
    leadId: lead._id,

    action:
      previousAssignee
        ? 'Lead Reassigned'
        : 'Lead Assigned',

    performedBy:
      currentUser._id,

    remarks:
      `Lead assigned to ${
        newAssigneeUser
          ? newAssigneeUser.name
          : 'Unassigned'
      }`,

    details: {
      previousAssignee,

      newAssignee:
        assignedToUserId
    }
  });

  const updated =
    await Lead.findById(
      lead._id
    )
      .populate(
        'assignedTo',
        'name email employeeId phone vehicleSpecialization'
      )
      .populate(
        'createdBy',
        'name employeeId'
      )
      .lean();

  return updated;
};

/**
 * Delete lead (Admin only)
 */
const deleteLead = async (
  id,
  currentUser
) => {
  if (
    currentUser.role !==
    'admin'
  ) {
    throw new Error(
      'Only administrators can delete leads'
    );
  }

  const lead =
    await Lead.findById(id);

  if (!lead) {
    throw new Error(
      'Lead not found'
    );
  }

  await Promise.all([
    Lead.findByIdAndDelete(id),

    LeadFollowup.deleteMany({
      leadId: id
    }),

    LeadActivity.deleteMany({
      leadId: id
    })
  ]);

  return {
    message:
      'Lead and associated history deleted successfully'
  };
};

/**
 * Get lead activity history
 */
const getLeadActivities = async (
  leadId,
  currentUser
) => {
  await getLeadById(
    leadId,
    currentUser
  );

  const activities =
    await LeadActivity.find({
      leadId
    })
      .populate(
        'performedBy',
        'name employeeId role'
      )
      .sort({
        createdAt: -1
      })
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