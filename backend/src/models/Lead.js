const mongoose = require('mongoose');

const {
  normalizePhoneNumber,
  getCanonicalPhoneKey,
} = require('../utils/phoneUtils');

const requirementSchema = new mongoose.Schema(
  {
    vehicleName: {
      type: String,
      trim: true,
      default: '',
    },

    vehicleModel: {
      type: String,
      trim: true,
      default: '',
    },

    partName: {
      type: String,
      trim: true,
      default: '',
    },

    partNumber: {
      type: String,
      trim: true,
      default: '',
    },

    quantity: {
      type: Number,
      min: 1,
      default: 1,
    },

    remarks: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    _id: true,
  }
);

const leadSchema = new mongoose.Schema(
  {
    mobileNumber: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true,
      index: true,
    },

    canonicalPhoneKey: {
      type: String,
      index: true,
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
      index: true,
    },

    customerName: {
      type: String,
      trim: true,
      default: '',
    },

    nationality: {
      type: String,
      trim: true,
      default: '',
    },

    shopName: {
      type: String,
      trim: true,
      default: '',
    },

    trnNumber: {
      type: String,
      trim: true,
      default: '',
    },

    alternateMobileNumber: {
      type: String,
      trim: true,
      default: '',
    },

    companyName: {
      type: String,
      trim: true,
      default: '',
    },

    customerType: {
      type: String,
      enum: [
        'Workshop',
        'Mechanic',
        'Retailer',
        'Dealer',
        'Service Center',
        'Fleet',
        'Individual',
        'Other',
      ],
      default: 'Other',
    },

    location: {
      type: String,
      trim: true,
      default: '',
    },

    /*
     * Legacy primary vehicle fields.
     * These are intentionally retained because existing
     * CRM features may still use them.
     */
    vehicleMake: {
      type: String,
      trim: true,
      default: '',
    },

    vehicleModel: {
      type: String,
      trim: true,
      default: '',
    },

    vehicleYear: {
      type: String,
      trim: true,
      default: '',
    },

    /*
     * Legacy primary part fields.
     */
    partRequired: {
      type: String,
      trim: true,
      default: '',
    },

    partNumber: {
      type: String,
      trim: true,
      default: '',
    },

    quantity: {
      type: Number,
      min: 1,
      default: 1,
    },

    /*
     * New professional multi-line requirement structure.
     *
     * Each line supports:
     * vehicle
     * model
     * part
     * part number
     * quantity
     * remarks
     */
    requirements: {
      type: [requirementSchema],
      default: [],
    },

    requirementDetails: {
      type: String,
      trim: true,
      default: '',
    },

    source: {
      type: String,
      enum: [
        'Phone',
        'WhatsApp',
        'Walk-in',
        'Referral',
        'Website',
        'Social Media',
        'Existing Customer',
        'Other',
      ],
      default: 'Phone',
    },

    status: {
      type: String,
      enum: [
        'New',
        'Contacted',
        'Quotation',
        'Followup',
        'Converted',
        'Lost',
        // Legacy values retained so existing documents still validate.
        'Follow Up',
        'Interested',
      ],
      default: 'New',
      index: true,
    },

    priority: {
      type: String,
      enum: [
        'Low',
        'Medium',
        'High',
        'Urgent',
      ],
      default: 'Medium',
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    nextFollowUpDate: {
      type: Date,
      default: null,
      index: true,
    },

    lastContactedAt: {
      type: Date,
      default: null,
    },

    remarks: {
      type: String,
      trim: true,
      default: '',
    },

    lostReason: {
      type: String,
      trim: true,
      default: '',
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    convertedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/*
 * Normalize mobile number and maintain the canonical
 * duplicate-check key.
 */
leadSchema.pre('save', function (next) {
  if (
    this.isModified('mobileNumber') &&
    this.mobileNumber
  ) {
    this.mobileNumber =
      normalizePhoneNumber(
        this.mobileNumber
      );

    this.canonicalPhoneKey =
      getCanonicalPhoneKey(
        this.mobileNumber
      );
  }

  /*
   * Keep convertedAt synchronized with status.
   */
  if (this.isModified('status')) {
    if (
      this.status === 'Converted' &&
      !this.convertedAt
    ) {
      this.convertedAt = new Date();
    } else if (
      this.status !== 'Converted'
    ) {
      this.convertedAt = null;
    }
  }

  next();
});

/*
 * Existing indexes.
 */
leadSchema.index({
  customerName: 1,
});

leadSchema.index({
  companyName: 1,
});

leadSchema.index({
  partRequired: 1,
});

leadSchema.index({
  partNumber: 1,
});

leadSchema.index({
  vehicleModel: 1,
});

leadSchema.index({
  'requirements.vehicleName': 1,
});

leadSchema.index({
  'requirements.vehicleModel': 1,
});

leadSchema.index({
  'requirements.partName': 1,
});

leadSchema.index({
  'requirements.partNumber': 1,
});

leadSchema.index({
  createdAt: -1,
});

leadSchema.index({
  nextFollowUpDate: 1,
  status: 1,
});

leadSchema.index({
  shopName: 1,
});

leadSchema.index({
  trnNumber: 1,
});

const Lead = mongoose.model(
  'Lead',
  leadSchema
);

module.exports = Lead;