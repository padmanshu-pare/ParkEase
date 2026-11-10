const mongoose = require('mongoose');
const { Schema } = mongoose;

const paymentSchema = new Schema(
  {
    facility: { type: Schema.Types.ObjectId, ref: 'Facility', required: true, index: true },
    record: { type: Schema.Types.ObjectId, ref: 'ParkingRecord' },
    reservation: { type: Schema.Types.ObjectId, ref: 'Reservation' },
    regNumber: String,
    amount: { type: Number, required: true },
    method: { type: String, enum: ['cash', 'upi', 'card', 'online'], required: true },
    status: { type: String, enum: ['pending', 'successful', 'failed', 'refunded'], default: 'successful' },
    transactionId: { type: String, index: true },
    receiptNo: { type: String, unique: true },
    gateway: { type: String, default: 'offline' }, // 'offline' | 'mock' | 'razorpay' (later)
    paidAt: { type: Date, default: Date.now },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
