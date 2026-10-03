const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Branch name is required'],
      trim: true
    },
    code: {
      type: String,
      required: [true, 'Branch code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    address: {
      type: String,
      trim: true,
      default: ''
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes for fast lookup and branch code uniqueness
branchSchema.index({ name: 1 });
branchSchema.index({ status: 1, createdAt: -1 });

const Branch = mongoose.model('Branch', branchSchema);

module.exports = Branch;
