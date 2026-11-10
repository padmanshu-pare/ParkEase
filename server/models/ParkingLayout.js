const mongoose = require('mongoose');

// One layout per floor. `elements` is the working draft, `publishedElements` is what operations use.
const layoutSchema = new mongoose.Schema(
  {
    facility: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', required: true },
    floor: { type: mongoose.Schema.Types.ObjectId, ref: 'Floor', required: true, unique: true },
    canvas: { width: { type: Number, default: 1000 }, height: { type: Number, default: 600 } },
    elements: { type: [mongoose.Schema.Types.Mixed], default: [] },
    publishedElements: { type: [mongoose.Schema.Types.Mixed], default: [] },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    publishedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('ParkingLayout', layoutSchema);
