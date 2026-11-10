const mongoose = require('mongoose');

const floorSchema = new mongoose.Schema(
  {
    facility: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', required: true, index: true },
    name: { type: String, required: true, trim: true },
    level: { type: Number, default: 0 },
    capacity: { type: Number, default: 0 }, // synced from published layout
  },
  { timestamps: true }
);
floorSchema.index({ facility: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Floor', floorSchema);
