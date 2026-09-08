const mongoose = require('mongoose');

const vehicleSpecializationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Vehicle specialization name is required'],
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Prevent duplicate specializations such as:
// Japan Car
// japan car
// JAPAN CAR
vehicleSpecializationSchema.index(
  { name: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  'VehicleSpecialization',
  vehicleSpecializationSchema
);