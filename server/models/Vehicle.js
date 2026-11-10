const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
  {
    regNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    ownerName: { type: String, trim: true },
    ownerPhone: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Vehicle', vehicleSchema);
