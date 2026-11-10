const mongoose = require('mongoose');

const pricingSchema = new mongoose.Schema(
  {
    facility: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', required: true, unique: true },
    rateType: { type: String, enum: ['hourly', 'fixed'], default: 'hourly' },
    hourlyRate: { type: Number, default: 30, min: 0 },
    fixedRate: { type: Number, default: 100, min: 0 }, // covers `baseHours` when rateType = fixed
    baseHours: { type: Number, default: 1, min: 1 },
    additionalHourlyRate: { type: Number, default: 0, min: 0 }, // 0 = same as hourlyRate
    graceMinutes: { type: Number, default: 10, min: 0 },
    reservationFee: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PricingRule', pricingSchema);
