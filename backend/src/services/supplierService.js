const Supplier = require('../models/Supplier');
const { isValidPhoneNumber } = require('../utils/phoneUtils');
const { assertObjectId } = require('../utils/ids');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const listSuppliers = async (queryParams = {}) => {
  const { page = 1, limit = 25, search = '', status, supplierType, country } = queryParams;
  const query = {};
  if (status) query.status = status;
  if (supplierType) query.supplierType = supplierType;
  if (country) query.country = { $regex: country, $options: 'i' };

  if (search) {
    const s = search.trim();
    query.$or = [
      { name: { $regex: s, $options: 'i' } },
      { contactPerson: { $regex: s, $options: 'i' } },
      { phone: { $regex: s, $options: 'i' } },
      { companyName: { $regex: s, $options: 'i' } },
      { shopWarehouseName: { $regex: s, $options: 'i' } },
      { trnNumber: { $regex: s, $options: 'i' } },
      { email: { $regex: s, $options: 'i' } }
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [suppliers, total] = await Promise.all([
    Supplier.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    Supplier.countDocuments(query)
  ]);

  return {
    data: suppliers,
    suppliers,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)) || 1,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)) || 1
    }
  };
};

const getSupplierById = async (id) => {
  assertObjectId(id, 'supplier id');
  const supplier = await Supplier.findById(id).lean();
  if (!supplier) throw new Error('Supplier not found');
  return supplier;
};

const createSupplier = async (data, user) => {
  if (!data.name || !String(data.name).trim()) throw new Error('Supplier name is required');
  if (!data.phone) throw new Error('Phone number is required');
  if (!isValidPhoneNumber(data.phone)) throw new Error('Invalid phone number');
  if (data.alternatePhone && String(data.alternatePhone).trim() && !isValidPhoneNumber(data.alternatePhone)) {
    throw new Error('Invalid alternate phone');
  }
  if (data.email && data.email.trim() && !EMAIL_RE.test(data.email.trim())) {
    throw new Error('Invalid email address');
  }

  const supplier = await Supplier.create({
    name: String(data.name).trim(),
    contactPerson: data.contactPerson ? String(data.contactPerson).trim() : '',
    phone: data.phone,
    alternatePhone: data.alternatePhone || '',
    email: data.email ? String(data.email).trim().toLowerCase() : '',
    companyName: data.companyName ? String(data.companyName).trim() : '',
    shopWarehouseName: data.shopWarehouseName ? String(data.shopWarehouseName).trim() : '',
    trnNumber: data.trnNumber ? String(data.trnNumber).trim() : '',
    country: data.country ? String(data.country).trim() : '',
    city: data.city ? String(data.city).trim() : '',
    address: data.address ? String(data.address).trim() : '',
    supplierType: data.supplierType || 'Other',
    status: data.status || 'active',
    notes: data.notes ? String(data.notes).trim() : '',
    createdBy: user._id
  });

  return supplier.toJSON();
};

const updateSupplier = async (id, data) => {
  assertObjectId(id, 'supplier id');
  const supplier = await Supplier.findById(id);
  if (!supplier) throw new Error('Supplier not found');

  if (data.phone && !isValidPhoneNumber(data.phone)) throw new Error('Invalid phone number');
  if (data.alternatePhone && String(data.alternatePhone).trim() && !isValidPhoneNumber(data.alternatePhone)) {
    throw new Error('Invalid alternate phone');
  }
  if (data.email && data.email.trim() && !EMAIL_RE.test(String(data.email).trim())) {
    throw new Error('Invalid email address');
  }

  const fields = [
    'name', 'contactPerson', 'phone', 'alternatePhone', 'email', 'companyName',
    'shopWarehouseName', 'trnNumber', 'country', 'city', 'address', 'supplierType',
    'status', 'notes'
  ];
  fields.forEach((field) => {
    if (data[field] !== undefined) {
      supplier[field] = typeof data[field] === 'string' ? data[field].trim() : data[field];
    }
  });

  await supplier.save();
  return supplier.toJSON();
};

module.exports = { listSuppliers, getSupplierById, createSupplier, updateSupplier };
