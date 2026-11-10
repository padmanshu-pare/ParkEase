const PricingRule = require('../models/PricingRule');

const DEFAULTS = { rateType: 'hourly', hourlyRate: 30, fixedRate: 100, baseHours: 1, additionalHourlyRate: 0, graceMinutes: 10, reservationFee: 0 };

async function getRule(facilityId) {
  const rule = await PricingRule.findOne({ facility: facilityId }).lean();
  return rule || { ...DEFAULTS, facility: facilityId };
}

// Returns { minutes, hours, amount, breakdown[] } for a stay.
function calculateCharge(rule, entryTime, exitTime = new Date()) {
  const minutes = Math.max(1, Math.ceil((new Date(exitTime) - new Date(entryTime)) / 60000));
  const breakdown = [];

  if (minutes <= rule.graceMinutes) {
    return { minutes, hours: 0, amount: 0, breakdown: [`Within ${rule.graceMinutes} min grace period`] };
  }

  const hours = Math.ceil(minutes / 60);
  const extraRate = rule.additionalHourlyRate > 0 ? rule.additionalHourlyRate : rule.hourlyRate;
  const baseHours = Math.max(1, rule.baseHours || 1);
  let amount = 0;

  if (rule.rateType === 'fixed') {
    amount += rule.fixedRate;
    breakdown.push(`Fixed charge (first ${baseHours} hr): ₹${rule.fixedRate}`);
    const extraHours = Math.max(0, hours - baseHours);
    if (extraHours) {
      amount += extraHours * extraRate;
      breakdown.push(`${extraHours} extra hr × ₹${extraRate}: ₹${extraHours * extraRate}`);
    }
  } else {
    const baseUsed = Math.min(hours, baseHours);
    amount += baseUsed * rule.hourlyRate;
    breakdown.push(`${baseUsed} hr × ₹${rule.hourlyRate}: ₹${baseUsed * rule.hourlyRate}`);
    const extraHours = Math.max(0, hours - baseHours);
    if (extraHours) {
      amount += extraHours * extraRate;
      breakdown.push(`${extraHours} extra hr × ₹${extraRate}: ₹${extraHours * extraRate}`);
    }
  }
  return { minutes, hours, amount, breakdown };
}

module.exports = { getRule, calculateCharge, DEFAULTS };
