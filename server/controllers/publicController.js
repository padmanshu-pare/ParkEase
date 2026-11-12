const Facility = require('../models/Facility');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');
const { escapeRegex } = require('../utils/plate');
const { availabilitySummary } = require('../services/availability');

// Used by the public page (no login) and by the driver facility list
exports.listFacilities = asyncHandler(async (req, res) => {
  const { city, q } = req.query;
  const filter = { isActive: true };
  if (city) filter.city = new RegExp(escapeRegex(String(city)), 'i');
  if (q) filter.name = new RegExp(escapeRegex(String(q)), 'i');
  const facilities = await Facility.find(filter).select('name address city openTime closeTime').sort('name').lean();
  const summaries = await Promise.all(facilities.map((f) => availabilitySummary(f._id)));
  res.json(
    facilities.map((f, i) => ({
      ...f,
      total: summaries[i].total,
      free: summaries[i].free,
      occupied: summaries[i].occupied,
      reserved: summaries[i].reserved,
    }))
  );
});

exports.availability = asyncHandler(async (req, res) => {
  const facility = await Facility.findOne({ _id: req.params.id, isActive: true }).select('name address city openTime closeTime').lean();
  if (!facility) throw httpError(404, 'Facility not found');
  res.json({ facility, ...(await availabilitySummary(facility._id)) });
});
