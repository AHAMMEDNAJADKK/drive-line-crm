const mongoose = require('mongoose');

const leadActivitySchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
      index: true
    },
    action: {
      type: String,
      required: true,
      enum: [
        'Lead Created',
        'Lead Updated',
        'Status Changed',
        'Lead Assigned',
        'Lead Reassigned',
        'Follow-up Added',
        'Lead Converted',
        'Lead Lost',
        'Lead Imported',
        'Lead Exported'
      ]
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    remarks: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

leadActivitySchema.index({ leadId: 1, createdAt: -1 });

const LeadActivity = mongoose.model('LeadActivity', leadActivitySchema);

module.exports = LeadActivity;
