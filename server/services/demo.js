// Sample ("demo") facility for visitors. Read-only for the demo account, reset every night at 02:00 IST.
const User = require('../models/User');
const Facility = require('../models/Facility');
const Floor = require('../models/Floor');
const ParkingSlot = require('../models/ParkingSlot');
const PricingRule = require('../models/PricingRule');
const ParkingRecord = require('../models/ParkingRecord');
const Reservation = require('../models/Reservation');
const SlotHold = require('../models/SlotHold');
const Payment = require('../models/Payment');

const DEMO_FACILITY_NAME = 'ParkEase Demo Lot';
const DEMO_SLOTS = 12;
const RESET_HOUR_IST = 2;

async function findDemoFacility() {
  return Facility.findOne({ name: DEMO_FACILITY_NAME });
}

// Creates the demo facility, floor, pricing and slots if they are missing. Safe to run many times.
async function ensureDemoFacility() {
  const demoUser = await User.findOne({ isDemo: true });
  if (!demoUser) throw new Error('No demo user found. Run "npm run seed:demo" first.');

  let facility = await findDemoFacility();
  if (!facility) {
    facility = await Facility.create({
      name: DEMO_FACILITY_NAME,
      address: 'Sample Road, Demo City',
      city: 'Demo City',
      owner: demoUser._id,
      openTime: '00:00',
      closeTime: '23:59',
    });
  }
  await User.updateOne({ _id: demoUser._id }, { $set: { facilities: [facility._id] } });

  let floor = await Floor.findOne({ facility: facility._id, name: 'Ground Floor' });
  if (!floor) floor = await Floor.create({ facility: facility._id, name: 'Ground Floor', level: 0 });

  await PricingRule.findOneAndUpdate(
    { facility: facility._id },
    { $setOnInsert: { facility: facility._id, rateType: 'hourly', hourlyRate: 20, graceMinutes: 10, reservationFee: 0 } },
    { upsert: true }
  );

  const ops = [];
  for (let i = 1; i <= DEMO_SLOTS; i++) {
    const name = `A${String(i).padStart(2, '0')}`;
    ops.push({
      updateOne: {
        filter: { floor: floor._id, elementId: `demo-${name}` },
        update: { $setOnInsert: { facility: facility._id, floor: floor._id, name, elementId: `demo-${name}`, status: 'available' } },
        upsert: true,
      },
    });
  }
  await ParkingSlot.bulkWrite(ops);
  return facility;
}

// Clears all visitor activity in the demo facility only, and frees every slot.
async function resetDemoData() {
  const facility = await ensureDemoFacility();
  await ParkingRecord.deleteMany({ facility: facility._id });
  await Reservation.deleteMany({ facility: facility._id });
  await SlotHold.deleteMany({ facility: facility._id });
  await Payment.deleteMany({ facility: facility._id });
  await ParkingSlot.updateMany({ facility: facility._id }, { $set: { status: 'available', currentRecord: null } });
  return facility._id;
}

// Called from the hourly job. Resets once per night, when the clock in India shows 02:xx.
async function resetDemoIfDue(now = new Date()) {
  const istHour = new Date(now.getTime() + 330 * 60000).getUTCHours();
  if (istHour !== RESET_HOUR_IST) return false;
  await resetDemoData();
  console.log('[demo] sample facility reset');
  return true;
}

module.exports = { DEMO_FACILITY_NAME, ensureDemoFacility, resetDemoData, resetDemoIfDue };
