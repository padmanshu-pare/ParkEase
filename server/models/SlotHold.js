const mongoose = require('mongoose');
const { Schema } = mongoose;

// One document per slot per 30-minute block that a booking covers.
// The unique index below is what stops two drivers booking the same slot in the same block,
// even if two requests arrive at the same moment.
const slotHoldSchema = new Schema({
  facility: { type: Schema.Types.ObjectId, ref: 'Facility', required: true },
  slot: { type: Schema.Types.ObjectId, ref: 'ParkingSlot', required: true },
  bucket: { type: Date, required: true },
  reservation: { type: Schema.Types.ObjectId, ref: 'Reservation', required: true, index: true },
  expireAt: { type: Date, required: true },
});

slotHoldSchema.index({ slot: 1, bucket: 1 }, { unique: true });
slotHoldSchema.index({ facility: 1, bucket: 1 });
// MongoDB removes old holds automatically
slotHoldSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('SlotHold', slotHoldSchema);
