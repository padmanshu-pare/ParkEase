// Run once:  npm run seed   (safe to re-run - it skips anything that already exists)
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Facility = require('../models/Facility');
const Floor = require('../models/Floor');
const ParkingLayout = require('../models/ParkingLayout');
const PricingRule = require('../models/PricingRule');
const { syncSlots } = require('../services/layoutService');

// Demo layout: entry/exit gates, one road, two rows of slots, an arrow.
function demoElements(prefix) {
  const els = [
    { id: `${prefix}_entry`, type: 'entry', x: 20, y: 20, width: 110, height: 40, rotation: 0, label: 'ENTRY' },
    { id: `${prefix}_exit`, type: 'exit', x: 870, y: 20, width: 110, height: 40, rotation: 0, label: 'EXIT' },
    { id: `${prefix}_road`, type: 'road', x: 20, y: 215, width: 960, height: 80, rotation: 0, label: '' },
    { id: `${prefix}_arrow`, type: 'arrow', x: 440, y: 235, width: 120, height: 40, rotation: 0, label: '' },
  ];
  for (let i = 0; i < 10; i++) {
    els.push({ id: `${prefix}_t${i}`, type: 'slot', x: 40 + i * 94, y: 90, width: 70, height: 110, rotation: 0, label: `${prefix}${String(i + 1).padStart(2, '0')}` });
    els.push({ id: `${prefix}_b${i}`, type: 'slot', x: 40 + i * 94, y: 310, width: 70, height: 110, rotation: 0, label: `${prefix}${String(i + 11).padStart(2, '0')}` });
  }
  return els;
}

(async () => {
  await connectDB();

  let admin = await User.findOne({ email: 'admin@parkease.com' });
  if (!admin) admin = await User.create({ name: 'ParkEase Admin', email: 'admin@parkease.com', password: 'Admin@123', role: 'admin', phone: '9000000001' });

  let facility = await Facility.findOne({ owner: admin._id, name: 'City Centre Parking' });
  if (!facility) {
    facility = await Facility.create({ name: 'City Centre Parking', address: 'Civil Lines, Rewa, Madhya Pradesh', city: 'Rewa', owner: admin._id, openTime: '06:00', closeTime: '22:00' });
    await PricingRule.create({ facility: facility._id, rateType: 'hourly', hourlyRate: 30, baseHours: 1, additionalHourlyRate: 20, graceMinutes: 10 });

    for (const [name, level, prefix] of [['Ground Floor', 0, 'A'], ['First Floor', 1, 'B']]) {
      const floor = await Floor.create({ facility: facility._id, name, level });
      const els = demoElements(prefix);
      const layout = await ParkingLayout.create({ facility: facility._id, floor: floor._id, elements: els, publishedElements: els, status: 'published', publishedAt: new Date() });
      await syncSlots(layout);
    }
  }

  let manager = await User.findOne({ email: 'manager@parkease.com' });
  if (!manager) manager = await User.create({ name: 'Ravi Manager', email: 'manager@parkease.com', password: 'Manager@123', role: 'manager', phone: '9000000002', facilities: [facility._id], createdBy: admin._id });

  console.log('\nSeed complete.\n  Admin   : admin@parkease.com / Admin@123\n  Manager : manager@parkease.com / Manager@123\n');
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
