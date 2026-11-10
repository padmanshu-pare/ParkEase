const mongoose = require('mongoose');

const facilitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    city: { type: String, trim: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    openTime: { type: String, default: '06:00' },
    closeTime: { type: String, default: '22:00' },
    totalCapacity: { type: Number, default: 0 }, // kept in sync with published layouts
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Facility', facilitySchema);
