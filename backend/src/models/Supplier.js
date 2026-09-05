const mongoose = require('mongoose');

const { normalizePhoneNumber } = require('../utils/phoneUtils');

const SUPPLIER_TYPES = [
  'Manufacturer',
  'Distributor',
  'Wholesaler',
  'Local Supplier',
  'Importer',
  'Other'
];

const supplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Supplier name is required'],
      trim: true
    },

    contactPerson: {
      type: String,
      trim: true,
      default: ''
    },

    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      index: true
    },

    alternatePhone: {
      type: String,
      trim: true,
      default: '',
      index: true
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },

    companyName: {
      type: String,
      trim: true,
      default: ''
    },

    shopWarehouseName: {
      type: String,
      trim: true,
      default: ''
    },

    trnNumber: {
      type: String,
      trim: true,
      default: ''
    },

    country: {
      type: String,
      trim: true,
      default: ''
    },

    city: {
      type: String,
      trim: true,
      default: ''
    },

    address: {
      type: String,
      trim: true,
      default: ''
    },

    supplierType: {
      type: String,
      enum: SUPPLIER_TYPES,
      default: 'Other'
    },

    vehicleSpecialization: {
      type: String,
      enum: ['', 'German', 'Korean', 'Japanese', 'Other'],
      default: '',
      index: true
    },

    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true
    },

    notes: {
      type: String,
      trim: true,
      default: ''
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// ============================================================
// NORMALIZE PHONE NUMBERS
// ============================================================
supplierSchema.pre('save', function (next) {
  if (this.isModified('phone') && this.phone) {
    this.phone = normalizePhoneNumber(this.phone);
  }

  if (this.isModified('alternatePhone') && this.alternatePhone) {
    this.alternatePhone = normalizePhoneNumber(this.alternatePhone);
  }

  next();
});

// ============================================================
// INDEXES
// ============================================================
supplierSchema.index({ name: 1 });
supplierSchema.index({ companyName: 1 });
supplierSchema.index({ trnNumber: 1 });
supplierSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Supplier', supplierSchema);

module.exports.SUPPLIER_TYPES = SUPPLIER_TYPES;