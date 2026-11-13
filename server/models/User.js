const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    phone: { type: String, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ['admin', 'manager', 'driver'], default: 'manager' },
    // Facilities a manager is allowed to operate
    facilities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Facility' }],
    // Driver's saved number plates
    driverVehicles: [{ regNumber: { type: String, uppercase: true, trim: true }, label: { type: String, trim: true, default: '' }, _id: false }],
    // Privacy: when the driver accepted the policy, and which version
    consentAt: Date,
    consentVersion: String,
    deletedAt: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('User', userSchema);
