const PricingRule = require('../models/PricingRule');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');
const { assertFacility } = require('../services/access');
const { getRule } = require('../services/pricing');

exports.getPricing = asyncHandler(async (req, res) => {
  await assertFacility(req.user, req.params.facilityId);
  res.json(await getRule(req.params.facilityId));
});

exports.updatePricing = asyncHandler(async (req, res) => {
  await assertFacility(req.user, req.params.facilityId);
  const fields = ['rateType', 'hourlyRate', 'fixedRate', 'baseHours', 'additionalHourlyRate', 'graceMinutes', 'reservationFee'];
  const data = {};
  for (const f of fields) {
    if (req.body[f] === undefined) continue;
    if (f === 'rateType') {
      if (!['hourly', 'fixed'].includes(req.body[f])) throw httpError(400, 'Rate type must be hourly or fixed');
      data[f] = req.body[f];
    } else {
      const n = Number(req.body[f]);
      if (!Number.isFinite(n) || n < 0) throw httpError(400, `${f} must be a positive number`);
      data[f] = n;
    }
  }
  const rule = await PricingRule.findOneAndUpdate({ facility: req.params.facilityId }, { $set: data }, { new: true, upsert: true, setDefaultsOnInsert: true });
  res.json(rule);
});
