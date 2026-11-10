const Facility = require('../models/Facility');
const httpError = require('../utils/httpError');

// Admin: facilities they own. Manager: facilities assigned by the admin.
async function accessibleFacilityIds(user) {
  if (user.role === 'admin') {
    const list = await Facility.find({ owner: user._id }).select('_id');
    return list.map((f) => f._id);
  }
  return user.facilities || [];
}

async function assertFacility(user, facilityId) {
  if (!facilityId) throw httpError(400, 'Facility is required');
  const ids = await accessibleFacilityIds(user);
  if (!ids.some((id) => String(id) === String(facilityId))) throw httpError(403, 'You do not have access to this facility');
}

module.exports = { accessibleFacilityIds, assertFacility };
