const mongoose = require('mongoose');
const { Schema } = mongoose;

// The online booking flow ships with the Driver Portal (Phase 2). The model exists now so
// the manager panel can already link a reservation to a vehicle entry.
const reservationSchema = new Schema(
  {
    facility: { type: Schema.Types.ObjectId, ref: 'Facility', required: true, index: true },
    floor: { type: Schema.Types.ObjectId, ref: 'Floor', required: true },
    slot: { type: Schema.Types.ObjectId, ref: 'ParkingSlot', required: true },
    driver: { type: Schema.Types.ObjectId, ref: 'User' },
    regNumber: { type: String, uppercase: true, index: true },
    contactName: String,
    contactPhone: String,
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending_payment', 'confirmed', 'active', 'completed', 'cancelled', 'expired'],
      default: 'pending_payment',
    },
    amount: { type: Number, default: 0 },
    payment: { type: Schema.Types.ObjectId, ref: 'Payment' },
  },
  { timestamps: true }
);
reservationSchema.index({ slot: 1, startTime: 1, endTime: 1 });

module.exports = mongoose.model('Reservation', reservationSchema);
