const XLSX = require('xlsx');
const fs = require('fs');
const Lead = require('../models/Lead');
const User = require('../models/User');
const LeadActivity = require('../models/LeadActivity');
const { normalizePhoneNumber, getCanonicalPhoneKey, isValidPhoneNumber } = require('../utils/phoneUtils');
const { buildLeadFilterQuery } = require('./leadService');

/**
 * Sanitize cell value to prevent Excel formula injection
 */
const sanitizeCellValue = (val) => {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (/^[=\+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
};

/**
 * Standard CRM Lead Fields and Auto-mapping aliases
 */
const CRM_FIELDS = [
  { key: 'mobileNumber', label: 'Mobile Number *', required: true, aliases: ['mobile', 'mobile number', 'phone', 'phone number', 'contact', 'contact number', 'cell', 'cell number'] },
  { key: 'customerName', label: 'Customer Name', required: false, aliases: ['name', 'customer', 'customer name', 'client name', 'client', 'contact person'] },
  { key: 'alternateMobileNumber', label: 'Alternate Mobile', required: false, aliases: ['alt mobile', 'alternate mobile', 'secondary phone', 'alternate phone', 'alt phone'] },
  { key: 'companyName', label: 'Company Name', required: false, aliases: ['company', 'company name', 'business name', 'garage name', 'shop name', 'workshop name'] },
  { key: 'customerType', label: 'Customer Type', required: false, aliases: ['customer type', 'type', 'client type', 'business type'] },
  { key: 'location', label: 'Location / City', required: false, aliases: ['location', 'city', 'area', 'address'] },
  { key: 'vehicleMake', label: 'Vehicle Make (Brand)', required: false, aliases: ['make', 'vehicle make', 'brand', 'car make'] },
  { key: 'vehicleModel', label: 'Vehicle Model', required: false, aliases: ['model', 'vehicle model', 'vehicle', 'car model', 'car'] },
  { key: 'vehicleYear', label: 'Vehicle Year', required: false, aliases: ['year', 'vehicle year', 'model year'] },
  { key: 'partRequired', label: 'Part Required', required: false, aliases: ['part', 'part required', 'item', 'item required', 'spare part', 'product'] },
  { key: 'partNumber', label: 'Part Number (OEM)', required: false, aliases: ['part number', 'part no', 'oem number', 'oem no', 'sku'] },
  { key: 'quantity', label: 'Quantity', required: false, aliases: ['quantity', 'qty', 'count', 'units'] },
  { key: 'requirementDetails', label: 'Requirement Details', required: false, aliases: ['details', 'requirement details', 'specs', 'description'] },
  { key: 'source', label: 'Lead Source', required: false, aliases: ['source', 'lead source', 'channel'] },
  { key: 'status', label: 'Status', required: false, aliases: ['status', 'lead status', 'stage'] },
  { key: 'priority', label: 'Priority', required: false, aliases: ['priority', 'urgency'] },
  { key: 'assignedEmployee', label: 'Assigned Employee (ID/Email/Name)', required: false, aliases: ['assigned to', 'assigned employee', 'employee', 'sales rep', 'agent', 'assignee'] },
  { key: 'nextFollowUpDate', label: 'Next Follow-up Date', required: false, aliases: ['next follow up', 'follow up date', 'follow-up date', 'next follow-up', 'followup'] },
  { key: 'remarks', label: 'Remarks / Notes', required: false, aliases: ['remarks', 'notes', 'comment', 'comments'] }
];

/**
 * Suggest auto-mappings for uploaded spreadsheet headers
 */
const suggestMappings = (headers) => {
  const mappings = {};
  headers.forEach((header) => {
    const cleanHeader = String(header).trim().toLowerCase();
    const matchedField = CRM_FIELDS.find((field) => {
      return (
        field.key.toLowerCase() === cleanHeader ||
        field.aliases.some((alias) => alias === cleanHeader || cleanHeader.includes(alias))
      );
    });
    if (matchedField) {
      mappings[header] = matchedField.key;
    } else {
      mappings[header] = 'ignore';
    }
  });
  return mappings;
};

/**
 * Parse uploaded file to extract headers, sample rows, and suggested mappings
 */
const parseUploadedFile = async (filePath) => {
  try {
    const workbook = XLSX.readFile(filePath, { cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    if (!rawData || rawData.length === 0) {
      throw new Error('The uploaded spreadsheet appears to be empty.');
    }

    const headers = rawData[0].map((h) => String(h).trim()).filter((h) => h.length > 0);
    if (headers.length === 0) {
      throw new Error('No valid column headers found in the first row.');
    }

    // Extract up to 5 sample rows
    const sampleRows = [];
    for (let i = 1; i < Math.min(rawData.length, 6); i++) {
      const row = rawData[i];
      if (row.some((cell) => cell !== '')) {
        const rowObj = {};
        headers.forEach((h, index) => {
          rowObj[h] = row[index] !== undefined ? String(row[index]) : '';
        });
        sampleRows.push(rowObj);
      }
    }

    const suggestedMapping = suggestMappings(headers);
    const totalRowsCount = Math.max(0, rawData.length - 1);

    return {
      headers,
      suggestedMapping,
      sampleRows,
      totalRowsCount,
      crmFields: CRM_FIELDS
    };
  } finally {
    // Note: Temporary file is cleaned up after final import or error
  }
};

/**
 * Validate and execute lead import
 */
const processLeadImport = async (filePath, mappingJson, optionsJson, currentUser) => {
  const mapping = typeof mappingJson === 'string' ? JSON.parse(mappingJson) : mappingJson;
  const options = typeof optionsJson === 'string' ? JSON.parse(optionsJson) : (optionsJson || {});
  const duplicateHandling = options.duplicateHandling || 'skip'; // 'skip' | 'update' | 'both'
  const defaultAssignedTo = options.defaultAssignedTo || currentUser._id;

  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rawData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (!rawData || rawData.length === 0) {
    throw new Error('No data rows found to import.');
  }

  // Pre-load all active users for employee assignment matching
  const users = await User.find({ status: 'active' }).select('_id name email employeeId').lean();
  const userMap = {};
  users.forEach((u) => {
    userMap[u._id.toString()] = u._id;
    userMap[u.employeeId.toUpperCase()] = u._id;
    userMap[u.email.toLowerCase()] = u._id;
    userMap[u.name.toLowerCase().trim()] = u._id;
  });

  // Pre-load existing leads mobile keys for fast duplicate detection
  const existingLeads = await Lead.find({}).select('_id mobileNumber canonicalPhoneKey').lean();
  const existingKeyToLeadMap = new Map();
  existingLeads.forEach((l) => {
    if (l.canonicalPhoneKey) {
      existingKeyToLeadMap.set(l.canonicalPhoneKey, l._id);
    }
    if (l.mobileNumber) {
      existingKeyToLeadMap.set(l.mobileNumber, l._id);
    }
  });

  let importedCount = 0;
  let updatedCount = 0;
  let skippedDuplicatesCount = 0;
  let invalidCount = 0;
  const errorRows = [];
  const leadsToInsert = [];

  for (let i = 0; i < rawData.length; i++) {
    const rawRow = rawData[i];
    const rowNumber = i + 2; // Accounting for 1-based index and header row

    // Construct lead item using mapping
    const leadItem = {};
    for (const [colHeader, crmField] of Object.entries(mapping)) {
      if (crmField && crmField !== 'ignore' && rawRow[colHeader] !== undefined) {
        leadItem[crmField] = rawRow[colHeader];
      }
    }

    // Validate mobile number
    const rawMobile = leadItem.mobileNumber;
    if (!rawMobile || !String(rawMobile).trim()) {
      invalidCount++;
      errorRows.push({
        rowNumber,
        mobileNumber: 'N/A',
        error: 'Missing mandatory Mobile Number',
        originalData: rawRow
      });
      continue;
    }

    const normalizedMobile = normalizePhoneNumber(rawMobile);
    const canonicalKey = getCanonicalPhoneKey(rawMobile);

    if (!isValidPhoneNumber(normalizedMobile)) {
      invalidCount++;
      errorRows.push({
        rowNumber,
        mobileNumber: rawMobile,
        error: 'Invalid phone number format (must contain 7-15 digits)',
        originalData: rawRow
      });
      continue;
    }

    // Resolve assigned employee
    let assignedUserId = defaultAssignedTo;
    if (leadItem.assignedEmployee) {
      const empQuery = String(leadItem.assignedEmployee).trim();
      if (userMap[empQuery] || userMap[empQuery.toUpperCase()] || userMap[empQuery.toLowerCase()]) {
        assignedUserId = userMap[empQuery] || userMap[empQuery.toUpperCase()] || userMap[empQuery.toLowerCase()];
      }
    }

    // Parse date if given
    let parsedFollowUp = null;
    if (leadItem.nextFollowUpDate) {
      const d = new Date(leadItem.nextFollowUpDate);
      if (!isNaN(d.getTime())) {
        parsedFollowUp = d;
      }
    }

    // Check duplicate
    const existingLeadId = existingKeyToLeadMap.get(canonicalKey) || existingKeyToLeadMap.get(normalizedMobile);

    if (existingLeadId) {
      if (duplicateHandling === 'skip') {
        skippedDuplicatesCount++;
        continue;
      } else if (duplicateHandling === 'update') {
        // Update existing record
        const updateObj = {};
        if (leadItem.customerName) updateObj.customerName = String(leadItem.customerName).trim();
        if (leadItem.alternateMobileNumber) updateObj.alternateMobileNumber = normalizePhoneNumber(leadItem.alternateMobileNumber);
        if (leadItem.companyName) updateObj.companyName = String(leadItem.companyName).trim();
        if (leadItem.customerType) updateObj.customerType = String(leadItem.customerType).trim();
        if (leadItem.location) updateObj.location = String(leadItem.location).trim();
        if (leadItem.vehicleMake) updateObj.vehicleMake = String(leadItem.vehicleMake).trim();
        if (leadItem.vehicleModel) updateObj.vehicleModel = String(leadItem.vehicleModel).trim();
        if (leadItem.vehicleYear) updateObj.vehicleYear = String(leadItem.vehicleYear).trim();
        if (leadItem.partRequired) updateObj.partRequired = String(leadItem.partRequired).trim();
        if (leadItem.partNumber) updateObj.partNumber = String(leadItem.partNumber).trim();
        if (leadItem.quantity) updateObj.quantity = Number(leadItem.quantity) || 1;
        if (leadItem.requirementDetails) updateObj.requirementDetails = String(leadItem.requirementDetails).trim();
        if (leadItem.source) updateObj.source = String(leadItem.source).trim();
        if (leadItem.status) updateObj.status = String(leadItem.status).trim();
        if (leadItem.priority) updateObj.priority = String(leadItem.priority).trim();
        if (assignedUserId) updateObj.assignedTo = assignedUserId;
        if (parsedFollowUp) updateObj.nextFollowUpDate = parsedFollowUp;
        if (leadItem.remarks) updateObj.remarks = String(leadItem.remarks).trim();

        await Lead.findByIdAndUpdate(existingLeadId, { $set: updateObj });
        await LeadActivity.create({
          leadId: existingLeadId,
          action: 'Lead Imported',
          performedBy: currentUser._id,
          remarks: `Updated via Excel import by ${currentUser.name}`
        });
        updatedCount++;
        continue;
      }
      // If 'both', proceed to insert
    }

    // Prepare new lead
    const newDoc = {
      mobileNumber: normalizedMobile,
      canonicalPhoneKey: canonicalKey,
      customerName: leadItem.customerName ? String(leadItem.customerName).trim() : '',
      alternateMobileNumber: leadItem.alternateMobileNumber ? normalizePhoneNumber(leadItem.alternateMobileNumber) : '',
      companyName: leadItem.companyName ? String(leadItem.companyName).trim() : '',
      customerType: leadItem.customerType || 'Other',
      location: leadItem.location ? String(leadItem.location).trim() : '',
      vehicleMake: leadItem.vehicleMake ? String(leadItem.vehicleMake).trim() : '',
      vehicleModel: leadItem.vehicleModel ? String(leadItem.vehicleModel).trim() : '',
      vehicleYear: leadItem.vehicleYear ? String(leadItem.vehicleYear).trim() : '',
      partRequired: leadItem.partRequired ? String(leadItem.partRequired).trim() : '',
      partNumber: leadItem.partNumber ? String(leadItem.partNumber).trim() : '',
      quantity: Number(leadItem.quantity) || 1,
      requirementDetails: leadItem.requirementDetails ? String(leadItem.requirementDetails).trim() : '',
      source: leadItem.source || 'Phone',
      status: leadItem.status || 'New',
      priority: leadItem.priority || 'Medium',
      assignedTo: assignedUserId || currentUser._id,
      nextFollowUpDate: parsedFollowUp,
      remarks: leadItem.remarks ? String(leadItem.remarks).trim() : '',
      createdBy: currentUser._id
    };

    leadsToInsert.push(newDoc);
    // Track in duplicate map to prevent in-file duplicates
    existingKeyToLeadMap.set(canonicalKey, true);
    existingKeyToLeadMap.set(normalizedMobile, true);
  }

  // Bulk insert new leads
  if (leadsToInsert.length > 0) {
    const inserted = await Lead.insertMany(leadsToInsert);
    importedCount = inserted.length;

    // Log activities for imported leads
    const activities = inserted.map((doc) => ({
      leadId: doc._id,
      action: 'Lead Imported',
      performedBy: currentUser._id,
      remarks: `Imported via spreadsheet by ${currentUser.name}`
    }));
    await LeadActivity.insertMany(activities);
  }

  // Clean up uploaded file
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error('Error deleting temp file:', err);
  }

  return {
    totalRows: rawData.length,
    imported: importedCount,
    updated: updatedCount,
    duplicatesSkipped: skippedDuplicatesCount,
    invalid: invalidCount,
    errorRows
  };
};

/**
 * Generate Sample Excel Template for leads import
 */
const generateSampleTemplate = () => {
  const sampleHeaders = [
    'Mobile Number',
    'Customer Name',
    'Alternate Mobile',
    'Company Name',
    'Customer Type',
    'Location',
    'Vehicle Make',
    'Vehicle Model',
    'Vehicle Year',
    'Part Required',
    'Part Number',
    'Quantity',
    'Requirement Details',
    'Source',
    'Status',
    'Priority',
    'Assigned Employee',
    'Next Follow-up',
    'Remarks'
  ];

  const sampleData = [
    [
      '9876543210',
      'John Sharma',
      '9876543211',
      'Precision Auto Garage',
      'Workshop',
      'Mumbai',
      'Toyota',
      'Innova Crysta',
      '2018',
      'Clutch Plate Set',
      'TY-CP-9812',
      2,
      'Needs OEM replacement clutch plate & release bearing',
      'Phone',
      'Followup',
      'High',
      'EMP001',
      '2026-09-02',
      'Customer requested best rate for bulk order'
    ],
    [
      '9123456780',
      'Rajesh Motors',
      '',
      'Rajesh Spare Parts',
      'Retailer',
      'Delhi',
      'Maruti Suzuki',
      'Swift Dzire',
      '2020',
      'Front Brake Pads',
      'MS-BP-4421',
      5,
      'OEM or Bosch preferred',
      'WhatsApp',
      'Quotation',
      'Medium',
      '',
      '2026-09-03',
      'Quotation shared on WhatsApp'
    ]
  ];

  const ws = XLSX.utils.aoa_to_sheet([sampleHeaders, ...sampleData]);

  // Adjust column widths
  ws['!cols'] = [
    { wch: 18 }, // Mobile
    { wch: 20 }, // Customer
    { wch: 18 }, // Alt Mobile
    { wch: 25 }, // Company
    { wch: 15 }, // Type
    { wch: 15 }, // Location
    { wch: 15 }, // Make
    { wch: 20 }, // Model
    { wch: 12 }, // Year
    { wch: 25 }, // Part
    { wch: 18 }, // Part Number
    { wch: 10 }, // Qty
    { wch: 35 }, // Details
    { wch: 12 }, // Source
    { wch: 15 }, // Status
    { wch: 12 }, // Priority
    { wch: 20 }, // Assigned Employee
    { wch: 16 }, // Follow-up
    { wch: 35 }  // Remarks
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Leads Template');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

/**
 * Generate Excel Export respecting active query filters
 */
const generateExcelExport = async (currentUser, queryParams) => {
  const query = buildLeadFilterQuery(currentUser, queryParams);

  const leads = await Lead.find(query)
    .populate('assignedTo', 'name employeeId email')
    .populate('createdBy', 'name employeeId')
    .sort({ createdAt: -1 })
    .lean();

  const exportHeaders = [
    'Lead ID',
    'Customer Name',
    'Mobile Number',
    'Alternate Mobile',
    'Company Name',
    'Customer Type',
    'Location',
    'Vehicle Make',
    'Vehicle Model',
    'Vehicle Year',
    'Part Required',
    'Part Number',
    'Quantity',
    'Requirement Details',
    'Source',
    'Status',
    'Priority',
    'Assigned Employee',
    'Next Follow-up Date',
    'Last Contacted Date',
    'Remarks',
    'Lost Reason',
    'Created Date',
    'Created By',
    'Converted Date'
  ];

  const rows = leads.map((l) => [
    sanitizeCellValue(l._id),
    sanitizeCellValue(l.customerName || ''),
    sanitizeCellValue(l.mobileNumber || ''),
    sanitizeCellValue(l.alternateMobileNumber || ''),
    sanitizeCellValue(l.companyName || ''),
    sanitizeCellValue(l.customerType || 'Other'),
    sanitizeCellValue(l.location || ''),
    sanitizeCellValue(l.vehicleMake || ''),
    sanitizeCellValue(l.vehicleModel || ''),
    sanitizeCellValue(l.vehicleYear || ''),
    sanitizeCellValue(l.partRequired || ''),
    sanitizeCellValue(l.partNumber || ''),
    l.quantity || 1,
    sanitizeCellValue(l.requirementDetails || ''),
    sanitizeCellValue(l.source || 'Phone'),
    sanitizeCellValue(l.status || 'New'),
    sanitizeCellValue(l.priority || 'Medium'),
    sanitizeCellValue(l.assignedTo ? `${l.assignedTo.name} (${l.assignedTo.employeeId})` : 'Unassigned'),
    l.nextFollowUpDate ? new Date(l.nextFollowUpDate).toLocaleDateString() : '',
    l.lastContactedAt ? new Date(l.lastContactedAt).toLocaleDateString() : '',
    sanitizeCellValue(l.remarks || ''),
    sanitizeCellValue(l.lostReason || ''),
    l.createdAt ? new Date(l.createdAt).toLocaleDateString() : '',
    sanitizeCellValue(l.createdBy ? `${l.createdBy.name} (${l.createdBy.employeeId})` : ''),
    l.convertedAt ? new Date(l.convertedAt).toLocaleDateString() : ''
  ]);

  const ws = XLSX.utils.aoa_to_sheet([exportHeaders, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Drive Line Leads');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

/**
 * Generate Excel Error Report for failed import rows
 */
const generateErrorReportExcel = (errorRows) => {
  const headers = ['Row Number', 'Mobile Number', 'Error Reason', 'Original Row Data'];
  const rows = errorRows.map((err) => [
    err.rowNumber,
    sanitizeCellValue(err.mobileNumber),
    sanitizeCellValue(err.error),
    sanitizeCellValue(JSON.stringify(err.originalData))
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Import Errors');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

module.exports = {
  CRM_FIELDS,
  parseUploadedFile,
  processLeadImport,
  generateSampleTemplate,
  generateExcelExport,
  generateErrorReportExcel
};
