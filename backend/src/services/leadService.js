const Lead = require('../models/Lead');
const LeadActivity = require('../models/LeadActivity');
const LeadFollowup = require('../models/LeadFollowup');
const User = require('../models/User');
const { upsertCustomerFromLead } = require('./customerService');
const {
  normalizePhoneNumber,
  getCanonicalPhoneKey,
  isValidPhoneNumber
} = require('../utils/phoneUtils');
const { isEmployee, isAdmin, isHrStaff } = require('../utils/roles');
const { assertLeadAccess, assertEmployeeLeadAccess } = require('../utils/leadAccess');
const { getBranchFilter, getUserBranchId, assertBranchAccess } = require('../utils/branchAccess');
const {
  normalizeLeadStatus,
  isWritableLeadStatus,
  statusFilterQuery,
  CLOSED_LEAD_STATUSES
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
    isDeleted: { $ne: true },
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
  const now = new Date();

  // 0a. Branch isolation & scoping
  const branchFilter = getBranchFilter(user, filters.branchId || filters.branch);
  Object.assign(query, branchFilter);

  // 0. Deleted scope handling
  const isDeletedScope =
    filters.scope === 'deleted' ||
    filters.isDeleted === 'true' ||
    filters.isDeleted === true;

  if (isDeletedScope) {
    query.isDeleted = true;
  } else {
    query.isDeleted = { $ne: true };
  }

  // 1. Role-based scoping — employees see only leads assigned to them
  if (isEmployee(user)) {
    query.assignedTo = user._id;
  } else if (filters.assignedTo) {
    query.assignedTo = filters.assignedTo;
  }

  // 2. Status handling — Closed leads (Converted & Lost) vs Active leads
  const isClosed =
    filters.scope === 'closed' ||
    filters.isClosed === 'true' ||
    filters.isClosed === true;

  if (filters.status) {
    // Explicit status filter requested (e.g. Converted, Lost, New, Followup, etc.)
    query.status = statusFilterQuery(filters.status);
  } else if (isClosed) {
    // Default closed view: all Converted and Lost leads
    query.status = { $in: CLOSED_LEAD_STATUSES };
  } else if (!isDeletedScope) {
    // Default active view: non-closed statuses
    query.status = { $nin: CLOSED_LEAD_STATUSES };
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

    query.$and = query.$and || [];
    query.$and.push({ $or: searchConditions });
  }

  // 4. Follow-up Filter

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
    } else if (followUpVal === 'tomorrow') {
      query.nextFollowUpDate = {
        $gte: startOfTomorrow,
        $lte: endOfTomorrow
      };
    } else if (followUpVal === 'overdue') {
      query.nextFollowUpDate = {
        $lt: startOfToday,
        $ne: null
      };
    } else if (followUpVal === 'upcoming') {
      query.nextFollowUpDate = {
        $gt: endOfToday
      };
    } else if (followUpVal === 'no_followup') {
      query.nextFollowUpDate = null;
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

  // Resolve branch ID safely and securely
  let finalBranchId = null;

  if (isAdmin(currentUser)) {
    if (leadData.branchId) {
      finalBranchId = leadData.branchId;
    } else if (assignee && assignee.toString() !== currentUser._id.toString()) {
      const assignedUser = await User.findById(assignee).select('branchId');
      if (assignedUser && assignedUser.branchId) {
        finalBranchId = assignedUser.branchId;
      }
    }
  } else {
    // HR and Employee MUST use their assigned branch; never trust frontend input!
    const userBranch = getUserBranchId(currentUser);
    if (!userBranch) {
      throw new Error('Your account is not assigned to a branch. Please contact an administrator.');
    }
    finalBranchId = userBranch;

    // If HR assigns to someone, verify that user belongs to the same branch
    if (isHrStaff(currentUser) && assignee && assignee.toString() !== currentUser._id.toString()) {
      const assignedUser = await User.findById(assignee).select('branchId');
      if (!assignedUser || !assignedUser.branchId || assignedUser.branchId.toString() !== userBranch.toString()) {
        throw new Error('Cannot assign leads to staff outside your branch.');
      }
    }
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

    branchId:
      finalBranchId,

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

    convertedAt:
      initialStatus === 'Converted' ? new Date() : null,

    closedAt:
      initialStatus === 'Converted' || initialStatus === 'Lost'
        ? new Date()
        : null,

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
      .populate('branchId', 'name code')
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
        .populate('branchId', 'name code')
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
      .populate('branchId', 'name code address phone')
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

  // Branch updating is exclusively restricted to Admin
  if (updateData.branchId !== undefined && isAdmin(currentUser)) {
    lead.branchId = updateData.branchId || null;
  }

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

    const normalizedNewStatus =
      normalizeLeadStatus(updateData.status);

    lead.status = normalizedNewStatus;

    if (normalizedNewStatus === 'Converted') {
      if (!lead.convertedAt) {
        lead.convertedAt = new Date();
      }
      if (!lead.closedAt) {
        lead.closedAt = new Date();
      }
    } else if (normalizedNewStatus === 'Lost') {
      lead.convertedAt = null;
      if (!lead.closedAt) {
        lead.closedAt = new Date();
      }
    } else {
      // Reopened or transitioned to an active status
      lead.convertedAt = null;
      lead.closedAt = null;
    }
  }

  // Assignment
  if (
    updateData.assignedTo !==
      undefined &&
    !isEmployee(currentUser)
  ) {
    if (updateData.assignedTo && isHrStaff(currentUser)) {
      const targetUser = await User.findById(updateData.assignedTo).select('branchId');
      if (!targetUser || !targetUser.branchId || targetUser.branchId.toString() !== (lead.branchId ? lead.branchId.toString() : '')) {
        throw new Error('HR can only assign leads to employees in their own branch');
      }
    }
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
      .populate('branchId', 'name code')
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

  if (status !== previousStatus) {
    lead.status =
      status;

    if (status === 'Converted') {
      if (!lead.convertedAt) {
        lead.convertedAt = new Date();
      }
      if (!lead.closedAt) {
        lead.closedAt = new Date();
      }
    } else if (status === 'Lost') {
      lead.convertedAt = null;
      if (!lead.closedAt) {
        lead.closedAt = new Date();
      }
      lead.lostReason =
        lostReason
          ? lostReason.trim()
          : 'Customer not interested';
    } else {
      // Reopened or active status
      lead.convertedAt = null;
      lead.closedAt = null;
    }
  } else {
    if (status === 'Lost' && lostReason !== undefined) {
      lead.lostReason = lostReason.trim();
    }
  }

  lead.lastContactedAt =
    new Date();

  await lead.save();

  // Link the converted lead to one customer, preserving idempotency.
  if (status === 'Converted' && !lead.customerId) {
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
      // Non-fatal: log the error but don't fail the status update
      console.error('[leadService] Failed to auto-create customer on conversion:', customerErr.message);
    }
  }

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
      .populate('branchId', 'name code')
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

  assertLeadAccess(lead, currentUser, 'reassign');

  if (assignedToUserId) {
    const targetUser = await User.findById(assignedToUserId).select('branchId name');
    if (!targetUser) {
      throw new Error('Assignee user not found');
    }
    if (isHrStaff(currentUser)) {
      if (!targetUser.branchId || targetUser.branchId.toString() !== (lead.branchId ? lead.branchId.toString() : '')) {
        throw new Error('HR can only assign leads to employees in their own branch');
      }
    }
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
      .populate('branchId', 'name code')
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
 * Delete lead (Soft Delete by default; permanent delete if permanent = true & Admin)
 */
const deleteLead = async (
  id,
  currentUser,
  permanent = false
) => {
  const lead = await Lead.findById(id);

  if (!lead) {
    throw new Error(
      'Lead not found'
    );
  }

  assertEmployeeLeadAccess(lead, currentUser, 'modify');

  if (permanent === true || permanent === 'true') {
    if (currentUser.role !== 'admin') {
      throw new Error(
        'Only administrators can permanently delete leads'
      );
    }

    await Promise.all([
      Lead.findByIdAndDelete(id),
      LeadFollowup.deleteMany({ leadId: id }),
      LeadActivity.deleteMany({ leadId: id })
    ]);

    return {
      message: 'Lead permanently deleted from system'
    };
  }

  // Soft Delete - allowed for assigned employee / admin
  lead.isDeleted = true;
  lead.deletedAt = new Date();
  lead.deletedBy = currentUser._id;
  await lead.save();

  await LeadActivity.create({
    leadId: lead._id,
    action: 'Lead Deleted',
    performedBy: currentUser._id,
    remarks: 'Lead moved to Deleted Leads'
  });

  return {
    message: 'Lead moved to Deleted Leads'
  };
};

/**
 * Restore a soft-deleted lead
 */
const restoreLead = async (
  id,
  currentUser
) => {
  const lead = await Lead.findById(id);

  if (!lead) {
    throw new Error(
      'Lead not found'
    );
  }

  assertEmployeeLeadAccess(lead, currentUser, 'modify');

  lead.isDeleted = false;
  lead.deletedAt = null;
  lead.deletedBy = null;
  await lead.save();

  await LeadActivity.create({
    leadId: lead._id,
    action: 'Lead Restored',
    performedBy: currentUser._id,
    remarks: 'Lead restored from Deleted Leads'
  });

  return Lead.findById(lead._id)
    .populate('branchId', 'name code')
    .populate(
      'assignedTo',
      'name email employeeId phone vehicleSpecialization'
    )
    .populate(
      'createdBy',
      'name employeeId'
    )
    .lean();
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
  restoreLead,
  getLeadActivities,
  buildLeadFilterQuery
};