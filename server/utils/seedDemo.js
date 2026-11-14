// Creates (or updates) the read-only demo manager and the sample facility.
// Usage: npm run seed:demo   (needs MONGO_URI and DEMO_PASSWORD in server/.env)
try { require('dotenv').config(); } catch { /* dotenv optional */ }
const mongoose = require('mongoose');
const User = require('../models/User');
const { ensureDemoFacility, resetDemoData, DEMO_FACILITY_NAME } = require('../services/demo');

async function main() {
  const email = (process.env.DEMO_EMAIL || 'demo@parkease.app').toLowerCase();
  const password = process.env.DEMO_PASSWORD;
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is missing');
  if (!password || password.length < 8) throw new Error('DEMO_PASSWORD is missing or shorter than 8 characters');

  await mongoose.connect(process.env.MONGO_URI);

  let user = await User.findOne({ email }).select('+password');
  if (!user) user = new User({ name: 'Demo Manager', email, role: 'manager' });
  user.name = 'Demo Manager';
  user.role = 'manager';
  user.isDemo = true;
  user.isActive = true;
  user.password = password; // hashed by the model's pre-save hook
  await user.save();

  await ensureDemoFacility();
  await resetDemoData();
  console.log(`Demo ready. Login: ${email}. Facility: "${DEMO_FACILITY_NAME}". Read-only.`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('Demo seed failed:', err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
