const mongoose = require('mongoose');
const { normalizePhoneNumber, getCanonicalPhoneKey } = require('../utils/phoneUtils');

const CUSTOMER_TYPES = [
  'Workshop',
  'Mechanic',
  'Retailer',
  'Dealer',
  'Service Center',
  'Fleet',
  'Individual',
  'Other'
];

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Customer name is required'], trim: true },
    contactNumber: { type: String, required: [true, 'Contact number is required'], trim: true, index: true },
    canonicalPhoneKey: { type: String, index: true },
    nationality: { type: String, trim: true, default: '' },
    alternateNumber: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    shopName: { type: String, trim: true, default: '' },
    companyName: { type: String, trim: true, default: '' },
    trnNumber: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: '' },
    customerType: { type: String, enum: CUSTOMER_TYPES, default: 'Other' },
    notes: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

customerSchema.pre('save', function (next) {
  if (this.isModified('contactNumber') && this.contactNumber) {
    this.contactNumber = normalizePhoneNumber(this.contactNumber);
    this.canonicalPhoneKey = getCanonicalPhoneKey(this.contactNumber);
  }
  if (this.isModified('alternateNumber') && this.alternateNumber) {
    this.alternateNumber = normalizePhoneNumber(this.alternateNumber);
  }
  next();
});

customerSchema.index({ name: 1 });
customerSchema.index({ shopName: 1 });
customerSchema.index({ companyName: 1 });
customerSchema.index({ trnNumber: 1 });
customerSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Customer', customerSchema);
module.exports.CUSTOMER_TYPES = CUSTOMER_TYPES;
