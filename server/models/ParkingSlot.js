const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema(
  {
    facility: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', required: true, index: true },
    floor: { type: mongoose.Schema.Types.ObjectId, ref: 'Floor', required: true, index: true },
    name: { type: String, required: true, trim: true },
    elementId: { type: String, required: true }, // id of the slot shape in the layout
    status: { type: String, enum: ['available', 'occupied', 'reserved', 'maintenance'], default: 'available', index: true },
    currentRecord: { type: mongoose.Schema.Types.ObjectId, ref: 'ParkingRecord', default: null },
  },
  { timestamps: true }
);
slotSchema.index({ floor: 1, elementId: 1 }, { unique: true });

module.exports = mongoose.model('ParkingSlot', slotSchema);
