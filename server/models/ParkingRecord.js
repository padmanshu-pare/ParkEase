const mongoose = require('mongoose');
const { Schema } = mongoose;

const recordSchema = new Schema(
  {
    facility: { type: Schema.Types.ObjectId, ref: 'Facility', required: true, index: true },
    floor: { type: Schema.Types.ObjectId, ref: 'Floor', required: true },
    slot: { type: Schema.Types.ObjectId, ref: 'ParkingSlot', required: true },
    vehicle: { type: Schema.Types.ObjectId, ref: 'Vehicle' },
    regNumber: { type: String, required: true, uppercase: true, index: true },
    ownerName: String,
    ownerPhone: String,
    reservation: { type: Schema.Types.ObjectId, ref: 'Reservation' },
    entryTime: { type: Date, default: Date.now, index: true },
    exitTime: Date,
    durationMinutes: Number,
    amount: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'completed'], default: 'active', index: true },
    enteredBy: { type: Schema.Types.ObjectId, ref: 'User' },
    exitedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    payment: { type: Schema.Types.ObjectId, ref: 'Payment' },
  },
  { timestamps: true }
);

// A vehicle can only have one active parking record at a time (enforced by the database).
recordSchema.index({ regNumber: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'active' } });

module.exports = mongoose.model('ParkingRecord', recordSchema);
