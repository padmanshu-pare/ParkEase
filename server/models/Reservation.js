const mongoose = require('mongoose');
const { Schema } = mongoose;

const reservationSchema = new Schema(
  {
    facility: { type: Schema.Types.ObjectId, ref: 'Facility', required: true, index: true },
    floor: { type: Schema.Types.ObjectId, ref: 'Floor', required: true },
    slot: { type: Schema.Types.ObjectId, ref: 'ParkingSlot', required: true },
    driver: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    regNumber: { type: String, uppercase: true, index: true },
    vehicleLabel: String,
    contactName: String,
    contactPhone: String,
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    // Phase 2 bookings are confirmed directly. Phase 3 (Razorpay) uses pending_payment.
    status: {
      type: String,
      enum: ['pending_payment', 'confirmed', 'active', 'completed', 'cancelled', 'expired'],
      default: 'confirmed',
    },
    amount: { type: Number, default: 0 },
    payment: { type: Schema.Types.ObjectId, ref: 'Payment' },
    cancelledAt: Date,
    cancelReason: String,
  },
  { timestamps: true }
);
reservationSchema.index({ slot: 1, startTime: 1, endTime: 1 });
reservationSchema.index({ driver: 1, startTime: -1 });
reservationSchema.index({ facility: 1, regNumber: 1, status: 1 });

module.exports = mongoose.model('Reservation', reservationSchema);
