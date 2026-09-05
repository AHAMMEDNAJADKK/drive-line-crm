const Customer = require('../models/Customer');
const Lead = require('../models/Lead');
const { normalizePhoneNumber, getCanonicalPhoneKey, isValidPhoneNumber } = require('../utils/phoneUtils');
const { assertObjectId, isValidObjectId } = require('../utils/ids');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const employeeRelatedCustomerFilter = async (user) => {
  const leads = await Lead.find({
    $or: [{ assignedTo: user._id }, { createdBy: user._id }]
  }).select('customerId').lean();

  const ids = leads.map((l) => l.customerId).filter(Boolean);
  return {
    $or: [
      { createdBy: user._id },
      { _id: { $in: ids } }
    ]
  };
};

const canAccessCustomer = async (customer, user) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (customer.createdBy && customer.createdBy.toString() === user._id.toString()) return true;
  const related = await Lead.exists({
    customerId: customer._id,
    $or: [{ assignedTo: user._id }, { createdBy: user._id }]
  });
  return Boolean(related);
};

const listCustomers = async (user, queryParams = {}) => {
  const { page = 1, limit = 25, search = '', status, customerType } = queryParams;
  const query = {};

  if (user.role === 'employee') {
    Object.assign(query, await employeeRelatedCustomerFilter(user));
  }

  if (status) query.status = status;
  if (customerType) query.customerType = customerType;

  if (search) {
    const s = search.trim();
    const searchOr = [
      { name: { $regex: s, $options: 'i' } },
      { contactNumber: { $regex: s, $options: 'i' } },
      { shopName: { $regex: s, $options: 'i' } },
      { companyName: { $regex: s, $options: 'i' } },
      { trnNumber: { $regex: s, $options: 'i' } },
      { email: { $regex: s, $options: 'i' } }
    ];
    if (query.$or) {
      query.$and = [{ $or: query.$or }, { $or: searchOr }];
      delete query.$or;
    } else {
      query.$or = searchOr;
    }
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [customers, total] = await Promise.all([
    Customer.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    Customer.countDocuments(query)
  ]);

  return {
    data: customers,
    customers,
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

const getCustomerById = async (id, user) => {
  assertObjectId(id, 'customer id');
  const customer = await Customer.findById(id).lean();
  if (!customer) throw new Error('Customer not found');
  if (!(await canAccessCustomer(customer, user))) {
    throw new Error('Unauthorized to view this customer');
  }
  const leads = await Lead.find({ customerId: id })
    .populate('assignedTo', 'name employeeId')
    .sort({ createdAt: -1 })
    .lean();

  const visibleLeads = user.role === 'employee'
    ? leads.filter((l) => {
        const assigned = l.assignedTo && (l.assignedTo._id || l.assignedTo).toString() === user._id.toString();
        const created = l.createdBy && l.createdBy.toString() === user._id.toString();
        return assigned || created;
      })
    : leads;

  return { ...customer, leads: visibleLeads };
};

const findCustomerByPhone = async (phone) => {
  if (!phone) return null;
  const canonicalKey = getCanonicalPhoneKey(phone);
  const normalized = normalizePhoneNumber(phone);
  return Customer.findOne({
    $or: [
      { canonicalPhoneKey: canonicalKey },
      { contactNumber: normalized }
    ]
  }).lean();
};

const createCustomer = async (data, user) => {
  if (!data.name || !String(data.name).trim()) throw new Error('Customer name is required');
  if (!data.contactNumber) throw new Error('Contact number is required');
  if (!isValidPhoneNumber(data.contactNumber)) throw new Error('Invalid contact number');
  if (data.email && data.email.trim() && !EMAIL_RE.test(data.email.trim())) {
    throw new Error('Invalid email address');
  }
  if (data.alternateNumber && data.alternateNumber.trim() && !isValidPhoneNumber(data.alternateNumber)) {
    throw new Error('Invalid alternate number');
  }

  const existing = await findCustomerByPhone(data.contactNumber);
  if (existing) {
    const err = new Error('A customer with this contact number already exists');
    err.isDuplicate = true;
    err.existingCustomer = existing;
    throw err;
  }

  const customer = await Customer.create({
    name: String(data.name).trim(),
    contactNumber: data.contactNumber,
    nationality: data.nationality ? String(data.nationality).trim() : '',
    alternateNumber: data.alternateNumber || '',
    email: data.email ? String(data.email).trim().toLowerCase() : '',
    shopName: data.shopName ? String(data.shopName).trim() : '',
    companyName: data.companyName ? String(data.companyName).trim() : '',
    trnNumber: data.trnNumber ? String(data.trnNumber).trim() : '',
    address: data.address ? String(data.address).trim() : '',
    city: data.city ? String(data.city).trim() : '',
    country: data.country ? String(data.country).trim() : '',
    customerType: data.customerType || 'Other',
    notes: data.notes ? String(data.notes).trim() : '',
    status: data.status || 'active',
    createdBy: user._id
  });

  return customer.toJSON();
};

const updateCustomer = async (id, data, user) => {
  assertObjectId(id, 'customer id');
  const customer = await Customer.findById(id);
  if (!customer) throw new Error('Customer not found');
  if (!(await canAccessCustomer(customer, user))) {
    throw new Error('Unauthorized to update this customer');
  }
  if (user.role === 'employee' && customer.createdBy.toString() !== user._id.toString()) {
    throw new Error('Unauthorized to update this customer');
  }

  if (data.contactNumber && data.contactNumber !== customer.contactNumber) {
    if (!isValidPhoneNumber(data.contactNumber)) throw new Error('Invalid contact number');
    const existing = await findCustomerByPhone(data.contactNumber);
    if (existing && existing._id.toString() !== id) {
      throw new Error('A customer with this contact number already exists');
    }
    customer.contactNumber = data.contactNumber;
  }

  if (data.email !== undefined && data.email && !EMAIL_RE.test(String(data.email).trim())) {
    throw new Error('Invalid email address');
  }
  if (data.alternateNumber && String(data.alternateNumber).trim() && !isValidPhoneNumber(data.alternateNumber)) {
    throw new Error('Invalid alternate number');
  }

  const fields = [
    'name', 'nationality', 'alternateNumber', 'email', 'shopName', 'companyName',
    'trnNumber', 'address', 'city', 'country', 'customerType', 'notes', 'status'
  ];
  fields.forEach((field) => {
    if (data[field] !== undefined) customer[field] = typeof data[field] === 'string' ? data[field].trim() : data[field];
  });

  await customer.save();
  return customer.toJSON();
};

const upsertCustomerFromLead = async (leadData, user) => {
  if (leadData.customerId && isValidObjectId(leadData.customerId)) {
    const existing = await Customer.findById(leadData.customerId);
    if (existing) return existing;
  }

  const phone = leadData.mobileNumber || leadData.contactNumber;
  if (!phone) return null;

  const found = await findCustomerByPhone(phone);
  if (found) return found;

  if (!leadData.customerName && !leadData.name) return null;

  try {
    const created = await createCustomer({
      name: leadData.customerName || leadData.name || 'Customer',
      contactNumber: phone,
      nationality: leadData.nationality,
      alternateNumber: leadData.alternateMobileNumber || leadData.alternateNumber,
      email: leadData.email,
      shopName: leadData.shopName,
      companyName: leadData.companyName,
      trnNumber: leadData.trnNumber,
      address: leadData.location || leadData.address,
      city: leadData.city,
      country: leadData.country,
      customerType: leadData.customerType,
      notes: leadData.remarks
    }, user);
    return created;
  } catch (err) {
    if (err.isDuplicate) return err.existingCustomer;
    return null;
  }
};

const applyCustomerSnapshot = (lead, customer) => {
  if (!customer) return;
  lead.customerId = customer._id;
  lead.customerName = customer.name || lead.customerName;
  lead.mobileNumber = customer.contactNumber || lead.mobileNumber;
  lead.alternateMobileNumber = customer.alternateNumber || lead.alternateMobileNumber;
  lead.companyName = customer.companyName || lead.companyName;
  lead.shopName = customer.shopName || lead.shopName;
  lead.nationality = customer.nationality || lead.nationality;
  lead.trnNumber = customer.trnNumber || lead.trnNumber;
  lead.customerType = customer.customerType || lead.customerType;
  lead.location = [customer.city, customer.country].filter(Boolean).join(', ') || customer.address || lead.location;
};

module.exports = {
  listCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  findCustomerByPhone,
  upsertCustomerFromLead,
  applyCustomerSnapshot,
  canAccessCustomer
};
