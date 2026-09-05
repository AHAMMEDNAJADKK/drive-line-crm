const supplierService = require('../services/supplierService');

// ============================================================
// LIST SUPPLIERS
// ============================================================

const listSuppliers = async (req, res, next) => {
  try {
    const result = await supplierService.listSuppliers(req.query, req.user);

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (err) {
    return next(err);
  }
};

// ============================================================
// GET SUPPLIER
// ============================================================

const getSupplier = async (req, res) => {
  try {
    const supplier = await supplierService.getSupplierById(
      req.params.id,
      req.user
    );

    return res.status(200).json({
      success: true,
      data: supplier
    });
  } catch (err) {
    if (err.message === 'Supplier not found') {
      return res.status(404).json({
        success: false,
        message: err.message
      });
    }

    if (
      err.statusCode === 400 ||
      err.statusCode === 403 ||
      err.name === 'ValidationError' ||
      err.name === 'CastError'
    ) {
      return res.status(err.statusCode || 400).json({
        success: false,
        message: err.message
      });
    }

    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to fetch supplier'
    });
  }
};

// ============================================================
// CREATE SUPPLIER
// ============================================================

const createSupplier = async (req, res) => {
  try {
    const supplier = await supplierService.createSupplier(
      req.body,
      req.user
    );

    return res.status(201).json({
      success: true,
      message: 'Supplier created successfully',
      data: supplier
    });
  } catch (err) {
    // Duplicate supplier phone
    if (err.isDuplicate) {
      return res.status(409).json({
        success: false,
        message: err.message,
        isDuplicate: true,
        existingSupplier: err.existingSupplier || null
      });
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: Object.values(err.errors)
          .map((error) => error.message)
          .join(', ')
      });
    }

    return res.status(400).json({
      success: false,
      message: err.message || 'Failed to create supplier'
    });
  }
};

// ============================================================
// UPDATE SUPPLIER
// ============================================================

const updateSupplier = async (req, res) => {
  try {
    const supplier = await supplierService.updateSupplier(
      req.params.id,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: 'Supplier updated successfully',
      data: supplier
    });
  } catch (err) {
    // Supplier not found
    if (err.message === 'Supplier not found') {
      return res.status(404).json({
        success: false,
        message: err.message
      });
    }

    // Duplicate phone
    if (err.isDuplicate) {
      return res.status(409).json({
        success: false,
        message: err.message,
        isDuplicate: true,
        existingSupplier: err.existingSupplier || null
      });
    }

    // Invalid ObjectId / validation
    if (
      err.statusCode === 400 ||
      err.name === 'ValidationError' ||
      err.name === 'CastError'
    ) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    return res.status(400).json({
      success: false,
      message: err.message || 'Failed to update supplier'
    });
  }
};

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  listSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier
};