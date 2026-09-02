const supplierService = require('../services/supplierService');

const listSuppliers = async (req, res, next) => {
  try {
    const result = await supplierService.listSuppliers(req.query);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
};

const getSupplier = async (req, res) => {
  try {
    const supplier = await supplierService.getSupplierById(req.params.id);
    res.json({ success: true, data: supplier });
  } catch (err) {
    if (err.message === 'Supplier not found') return res.status(404).json({ success: false, message: err.message });
    if (err.statusCode === 400) return res.status(400).json({ success: false, message: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
};

const createSupplier = async (req, res) => {
  try {
    const supplier = await supplierService.createSupplier(req.body, req.user);
    res.status(201).json({ success: true, message: 'Supplier created successfully', data: supplier });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const updateSupplier = async (req, res) => {
  try {
    const supplier = await supplierService.updateSupplier(req.params.id, req.body);
    res.json({ success: true, message: 'Supplier updated successfully', data: supplier });
  } catch (err) {
    if (err.message === 'Supplier not found') return res.status(404).json({ success: false, message: err.message });
    res.status(400).json({ success: false, message: err.message });
  }
};

module.exports = { listSuppliers, getSupplier, createSupplier, updateSupplier };
