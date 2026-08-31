const mongoose = require('mongoose');

const leadFollowupSchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
      index: true
    },
    remarks: {
      type: String,
      required: [true, 'Followup remarks are required'],
      trim: true
    },
    statusChangedTo: {
      type: String,
      trim: true,
      default: null
    },
    nextFollowUpDate: {
      type: Date,
      default: null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

leadFollowupSchema.index({ leadId: 1, createdAt: -1 });

const LeadFollowup = mongoose.model('LeadFollowup', leadFollowupSchema);

module.exports = LeadFollowup;
