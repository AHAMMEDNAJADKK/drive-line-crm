const Supplier = require('../models/Supplier');

const {
  normalizePhoneNumber,
  getCanonicalPhoneKey,
  isValidPhoneNumber
} = require('../utils/phoneUtils');

const { assertObjectId } = require('../utils/ids');
const {
  VEHICLE_SPECIALIZATIONS,
  normalizeVehicleSpecialization
} = require('../utils/vehicleSpecializations');
const { isEmployee } = require('../utils/roles');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SUPPLIER_TYPES = [
  'Manufacturer',
  'Distributor',
  'Wholesaler',
  'Local Supplier',
  'Importer',
  'Other'
];

const SUPPLIER_STATUSES = ['active', 'inactive'];

// ============================================================
// HELPERS
// ============================================================

const normalizeOptionalString = (value) => {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value).trim();
};

const validatePagination = (page, limit) => {
  const parsedPage = Number(page);
  const parsedLimit = Number(limit);

  const safePage =
    Number.isInteger(parsedPage) && parsedPage > 0
      ? parsedPage
      : 1;

  const safeLimit =
    Number.isInteger(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, 100)
      : 25;

  return {
    page: safePage,
    limit: safeLimit
  };
};

const validateSupplierType = (supplierType) => {
  if (
    supplierType !== undefined &&
    supplierType !== '' &&
    !SUPPLIER_TYPES.includes(supplierType)
  ) {
    throw new Error('Invalid supplier type');
  }
};

const validateStatus = (status) => {
  if (
    status !== undefined &&
    status !== '' &&
    !SUPPLIER_STATUSES.includes(status)
  ) {
    throw new Error('Invalid supplier status');
  }
};

const validateVehicleSpecialization = (value) => {
  if (value !== undefined && value !== '' && !VEHICLE_SPECIALIZATIONS.includes(value)) {
    throw new Error('Invalid vehicle specialization');
  }
};

const applyEmployeeSupplierScope = (query, user) => {
  if (!isEmployee(user) || !user.vehicleSpecialization) return;

  query.$or = [
    { vehicleSpecialization: user.vehicleSpecialization },
    { vehicleSpecialization: '' },
    { vehicleSpecialization: null },
    { vehicleSpecialization: { $exists: false } }
  ];
};

// ============================================================
// DUPLICATE PHONE CHECK
// ============================================================

const findSupplierByPhone = async (phone) => {
  if (!phone) {
    return null;
  }

  const normalizedPhone = normalizePhoneNumber(phone);

  if (!normalizedPhone) {
    return null;
  }

  const canonicalPhoneKey = getCanonicalPhoneKey(normalizedPhone);

  const suppliers = await Supplier.find({
    $or: [
      { phone: normalizedPhone },
      { phone: canonicalPhoneKey }
    ]
  })
    .limit(10)
    .lean();

  return (
    suppliers.find(
      (supplier) =>
        normalizePhoneNumber(supplier.phone) === normalizedPhone
    ) || null
  );
};

// ============================================================
// LIST SUPPLIERS
// ============================================================

const listSuppliers = async (queryParams = {}, user) => {
  const {
    page: requestedPage = 1,
    limit: requestedLimit = 25,
    search = '',
    status,
    supplierType,
    country
  } = queryParams;

  const { page, limit } = validatePagination(
    requestedPage,
    requestedLimit
  );

  validateStatus(status);
  validateSupplierType(supplierType);

  const query = {};

  applyEmployeeSupplierScope(query, user);

  if (status) {
    query.status = status;
  }

  if (supplierType) {
    query.supplierType = supplierType;
  }

  if (country && String(country).trim()) {
    query.country = {
      $regex: String(country).trim(),
      $options: 'i'
    };
  }

  if (search && String(search).trim()) {
    const s = String(search).trim();

    query.$or = [
      { name: { $regex: s, $options: 'i' } },
      { contactPerson: { $regex: s, $options: 'i' } },
      { phone: { $regex: s, $options: 'i' } },
      { alternatePhone: { $regex: s, $options: 'i' } },
      { companyName: { $regex: s, $options: 'i' } },
      { shopWarehouseName: { $regex: s, $options: 'i' } },
      { trnNumber: { $regex: s, $options: 'i' } },
      { email: { $regex: s, $options: 'i' } },
      { city: { $regex: s, $options: 'i' } },
      { vehicleSpecialization: { $regex: s, $options: 'i' } }
    ];

    if (query.$or) {
      query.$and = [{ $or: query.$or }, { $or: searchConditions }];
      delete query.$or;
    } else {
      query.$or = searchConditions;
    }
  }

  const skip = (page - 1) * limit;

  const [suppliers, total] = await Promise.all([
    Supplier.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    Supplier.countDocuments(query)
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    data: suppliers,
    suppliers,
    total,
    page,
    pages: totalPages,

    pagination: {
      page,
      limit,
      total,
      totalPages
    }
  };
};

// ============================================================
// GET SUPPLIER BY ID
// ============================================================

const getSupplierById = async (id, user) => {
  assertObjectId(id, 'supplier id');

  const supplier = await Supplier.findById(id).lean();

  if (!supplier) {
    throw new Error('Supplier not found');
  }

  if (
    isEmployee(user) &&
    user.vehicleSpecialization &&
    supplier.vehicleSpecialization &&
    supplier.vehicleSpecialization !== user.vehicleSpecialization
  ) {
    const error = new Error('Unauthorized to view this supplier');
    error.statusCode = 403;
    throw error;
  }

  return supplier;
};

// ============================================================
// CREATE SUPPLIER
// ============================================================

const createSupplier = async (data, user) => {
  if (!user || !user._id) {
    throw new Error('Authenticated user is required');
  }

  const name = normalizeOptionalString(data.name);
  const phone = normalizeOptionalString(data.phone);
  const alternatePhone = normalizeOptionalString(
    data.alternatePhone
  );
  const email = normalizeOptionalString(data.email).toLowerCase();

  if (!name) {
    throw new Error('Supplier name is required');
  }

  if (!phone) {
    throw new Error('Phone number is required');
  }

  if (!isValidPhoneNumber(phone)) {
    throw new Error('Invalid phone number');
  }

  if (
    alternatePhone &&
    !isValidPhoneNumber(alternatePhone)
  ) {
    throw new Error('Invalid alternate phone');
  }

  if (email && !EMAIL_RE.test(email)) {
    throw new Error('Invalid email address');
  }

  validateSupplierType(data.supplierType);
  validateStatus(data.status);
  validateVehicleSpecialization(data.vehicleSpecialization);

  // Check duplicate phone
  const existingSupplier = await findSupplierByPhone(phone);

  if (existingSupplier) {
    const error = new Error(
      'A supplier with this phone number already exists'
    );

    error.isDuplicate = true;
    error.existingSupplier = existingSupplier;

    throw error;
  }

  const supplier = await Supplier.create({
    name,

    contactPerson: normalizeOptionalString(
      data.contactPerson
    ),

    phone,

    alternatePhone,

    email,

    companyName: normalizeOptionalString(
      data.companyName
    ),

    shopWarehouseName: normalizeOptionalString(
      data.shopWarehouseName
    ),

    trnNumber: normalizeOptionalString(
      data.trnNumber
    ),

    country: normalizeOptionalString(
      data.country
    ),

    city: normalizeOptionalString(
      data.city
    ),

    address: normalizeOptionalString(
      data.address
    ),

    supplierType:
      data.supplierType || 'Other',

    status:
      data.status || 'active',

    vehicleSpecialization:
      normalizeVehicleSpecialization(data.vehicleSpecialization) || '',

    notes: normalizeOptionalString(
      data.notes
    ),

    createdBy: user._id
  });

  return supplier.toJSON();
};

// ============================================================
// UPDATE SUPPLIER
// ============================================================

const updateSupplier = async (id, data) => {
  assertObjectId(id, 'supplier id');

  const supplier = await Supplier.findById(id);

  if (!supplier) {
    throw new Error('Supplier not found');
  }

  // ----------------------------------------------------------
  // PHONE
  // ----------------------------------------------------------

  if (data.phone !== undefined) {
    const phone = normalizeOptionalString(data.phone);

    if (!phone) {
      throw new Error('Phone number is required');
    }

    if (!isValidPhoneNumber(phone)) {
      throw new Error('Invalid phone number');
    }

    const normalizedPhone =
      normalizePhoneNumber(phone);

    const existingSupplier =
      await findSupplierByPhone(normalizedPhone);

    if (
      existingSupplier &&
      existingSupplier._id.toString() !== id
    ) {
      const error = new Error(
        'A supplier with this phone number already exists'
      );

      error.isDuplicate = true;
      error.existingSupplier = existingSupplier;

      throw error;
    }

    supplier.phone = normalizedPhone;
  }

  // ----------------------------------------------------------
  // ALTERNATE PHONE
  // ----------------------------------------------------------

  if (data.alternatePhone !== undefined) {
    const alternatePhone =
      normalizeOptionalString(data.alternatePhone);

    if (
      alternatePhone &&
      !isValidPhoneNumber(alternatePhone)
    ) {
      throw new Error('Invalid alternate phone');
    }

    supplier.alternatePhone = alternatePhone;
  }

  // ----------------------------------------------------------
  // EMAIL
  // ----------------------------------------------------------

  if (data.email !== undefined) {
    const email =
      normalizeOptionalString(data.email).toLowerCase();

    if (email && !EMAIL_RE.test(email)) {
      throw new Error('Invalid email address');
    }

    supplier.email = email;
  }

  // ----------------------------------------------------------
  // VALIDATE ENUM FIELDS
  // ----------------------------------------------------------

  if (data.supplierType !== undefined) {
    validateSupplierType(data.supplierType);

    supplier.supplierType =
      data.supplierType || 'Other';
  }

  if (data.status !== undefined) {
    validateStatus(data.status);

    supplier.status =
      data.status || 'active';
  }

  if (data.vehicleSpecialization !== undefined) {
    validateVehicleSpecialization(data.vehicleSpecialization);
    supplier.vehicleSpecialization =
      normalizeVehicleSpecialization(data.vehicleSpecialization) || '';
  }

  // ----------------------------------------------------------
  // OTHER FIELDS
  // ----------------------------------------------------------

  const stringFields = [
    'name',
    'contactPerson',
    'companyName',
    'shopWarehouseName',
    'trnNumber',
    'country',
    'city',
    'address',
    'notes'
  ];

  stringFields.forEach((field) => {
    if (data[field] !== undefined) {
      supplier[field] =
        normalizeOptionalString(data[field]);
    }
  });

  // Supplier name must never be empty
  if (!supplier.name || !supplier.name.trim()) {
    throw new Error('Supplier name is required');
  }

  await supplier.save();

  return supplier.toJSON();
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  listSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  findSupplierByPhone
};