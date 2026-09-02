const customerService = require('../services/customerService');

const listCustomers = async (req, res, next) => {
  try {
    const result = await customerService.listCustomers(req.user, req.query);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
};

const getCustomer = async (req, res) => {
  try {
    const customer = await customerService.getCustomerById(req.params.id, req.user);
    res.json({ success: true, data: customer });
  } catch (err) {
    if (err.message === 'Customer not found') return res.status(404).json({ success: false, message: err.message });
    if (err.message.includes('Unauthorized')) return res.status(403).json({ success: false, message: err.message });
    if (err.statusCode === 400) return res.status(400).json({ success: false, message: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
};

const createCustomer = async (req, res) => {
  try {
    const customer = await customerService.createCustomer(req.body, req.user);
    res.status(201).json({ success: true, message: 'Customer created successfully', data: customer });
  } catch (err) {
    if (err.isDuplicate) {
      return res.status(409).json({
        success: false,
        message: err.message,
        isDuplicate: true,
        existingCustomer: err.existingCustomer
      });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const customer = await customerService.updateCustomer(req.params.id, req.body, req.user);
    res.json({ success: true, message: 'Customer updated successfully', data: customer });
  } catch (err) {
    if (err.message === 'Customer not found') return res.status(404).json({ success: false, message: err.message });
    if (err.message.includes('Unauthorized')) return res.status(403).json({ success: false, message: err.message });
    res.status(400).json({ success: false, message: err.message });
  }
};

const lookupByPhone = async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ success: false, message: 'Phone is required' });
    const customer = await customerService.findCustomerByPhone(phone);
    res.json({ success: true, data: customer });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

module.exports = { listCustomers, getCustomer, createCustomer, updateCustomer, lookupByPhone };
