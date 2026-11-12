const Floor = require('../models/Floor');
const ParkingLayout = require('../models/ParkingLayout');
const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');
const { assertFacility, assertActiveFacility } = require('../services/access');
const { validateElements, validateSlotElements, syncSlots } = require('../services/layoutService');
const { emitAvailability } = require('../sockets');

async function floorFor(user, floorId) {
  const floor = await Floor.findById(floorId);
  if (!floor) throw httpError(404, 'Floor not found');
  await assertFacility(user, floor.facility);
  return floor;
}

exports.getLayout = asyncHandler(async (req, res) => {
  const floor = await floorFor(req.user, req.params.floorId);
  const layout = await ParkingLayout.findOne({ floor: floor._id }).lean();
  res.json(
    layout || {
      floor: floor._id,
      facility: floor.facility,
      canvas: { width: 1000, height: 600 },
      elements: [],
      publishedElements: [],
      status: 'draft',
    }
  );
});

exports.saveDraft = asyncHandler(async (req, res) => {
  const floor = await floorFor(req.user, req.params.floorId);
  await assertActiveFacility(req.user, floor.facility);
  const elements = validateElements(req.body.elements);
  const layout = await ParkingLayout.findOneAndUpdate(
    { floor: floor._id },
    // Keep a previously published layout marked as published: `elements` is its
    // editable draft while `publishedElements` remains the live floor plan.
    { $set: { elements, facility: floor.facility } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  res.json({ status: layout.status, updatedAt: layout.updatedAt });
});

exports.publish = asyncHandler(async (req, res) => {
  const floor = await floorFor(req.user, req.params.floorId);
  const elements = validateElements(req.body.elements);
  await assertActiveFacility(req.user, floor.facility);
  validateSlotElements(elements);
  const session = await mongoose.startSession();
  let layout;
  try {
    await session.withTransaction(async () => {
      layout = await ParkingLayout.findOneAndUpdate(
        { floor: floor._id },
        { $set: { elements, publishedElements: elements, facility: floor.facility, status: 'published', publishedAt: new Date() } },
        { new: true, upsert: true, setDefaultsOnInsert: true, session }
      );
      await syncSlots(layout, session);
    });
  } finally {
    await session.endSession();
  }
  emitAvailability(floor.facility, floor._id);
  res.json({ status: layout.status, publishedAt: layout.publishedAt });
});

exports.copyLayout = asyncHandler(async (req, res) => {
  const target = await floorFor(req.user, req.params.floorId);
  const source = await floorFor(req.user, req.body.sourceFloorId);
  if (String(target._id) === String(source._id)) throw httpError(400, 'Choose a different floor to copy from');

  const srcLayout = await ParkingLayout.findOne({ floor: source._id }).lean();
  if (!srcLayout || !srcLayout.elements.length) throw httpError(404, 'The source floor has no layout to copy');

  // Fresh element ids so the two floors never share ids
  const stamp = Date.now().toString(36);
  const elements = srcLayout.elements.map((e, i) => ({ ...e, id: `${e.id}_c${stamp}${i}` }));

  await ParkingLayout.findOneAndUpdate(
    { floor: target._id },
    { $set: { elements, facility: target.facility, status: 'draft' } },
    { upsert: true, setDefaultsOnInsert: true }
  );
  res.json({ elements, copiedFrom: source.name });
});
