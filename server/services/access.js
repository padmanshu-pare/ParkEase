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

// Access alone is not enough for mutations: a deactivated facility remains visible so
// staff can review its history, but it must not accept operational changes.
async function assertActiveFacility(user, facilityId) {
  await assertFacility(user, facilityId);
  const facility = await Facility.findOne({ _id: facilityId, isActive: true }).select('_id');
  if (!facility) throw httpError(409, 'This facility is inactive and cannot accept operational changes');
}

module.exports = { accessibleFacilityIds, assertFacility, assertActiveFacility };
