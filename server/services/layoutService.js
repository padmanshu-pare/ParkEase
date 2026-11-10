const ParkingSlot = require('../models/ParkingSlot');
const Floor = require('../models/Floor');
const Facility = require('../models/Facility');
const httpError = require('../utils/httpError');

const ELEMENT_TYPES = ['slot', 'road', 'entry', 'exit', 'arrow'];

function validateElements(elements) {
  if (!Array.isArray(elements)) throw httpError(400, 'Layout elements must be a list');
  if (elements.length > 1000) throw httpError(400, 'A floor can have at most 1000 elements');
  const ids = new Set();
  return elements.map((e) => {
    if (!e || typeof e.id !== 'string' || !ELEMENT_TYPES.includes(e.type)) throw httpError(400, 'Layout contains an invalid element');
    if (ids.has(e.id)) throw httpError(400, 'Layout contains duplicate element ids');
    ids.add(e.id);
    const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
    return {
      id: e.id,
      type: e.type,
      x: num(e.x, 0),
      y: num(e.y, 0),
      width: Math.max(10, num(e.width, 60)),
      height: Math.max(10, num(e.height, 60)),
      rotation: num(e.rotation, 0),
      label: String(e.label || '').slice(0, 20),
    };
  });
}

// Creates / renames / removes ParkingSlot documents so they match the slot shapes in a layout.
async function syncSlots(layout) {
  const slotEls = layout.publishedElements.filter((e) => e.type === 'slot');
  const seen = new Set();
  for (const e of slotEls) {
    const name = e.label.trim();
    if (!name) throw httpError(400, 'Every parking slot needs a name (for example A01)');
    if (seen.has(name.toLowerCase())) throw httpError(400, `Slot name "${name}" is used more than once on this floor`);
    seen.add(name.toLowerCase());
  }

  const existing = await ParkingSlot.find({ floor: layout.floor });
  const byElement = new Map(existing.map((s) => [s.elementId, s]));
  const keep = new Set(slotEls.map((e) => e.id));

  const removable = existing.filter((s) => !keep.has(s.elementId));
  const blocked = removable.filter((s) => ['occupied', 'reserved'].includes(s.status));
  if (blocked.length) throw httpError(409, `These slots are in use and cannot be removed: ${blocked.map((s) => s.name).join(', ')}`);

  for (const e of slotEls) {
    const name = e.label.trim();
    const slot = byElement.get(e.id);
    if (!slot) await ParkingSlot.create({ facility: layout.facility, floor: layout.floor, name, elementId: e.id });
    else if (slot.name !== name) await ParkingSlot.updateOne({ _id: slot._id }, { name });
  }
  if (removable.length) await ParkingSlot.deleteMany({ _id: { $in: removable.map((s) => s._id) } });

  const floorCount = await ParkingSlot.countDocuments({ floor: layout.floor });
  await Floor.findByIdAndUpdate(layout.floor, { capacity: floorCount });
  const total = await ParkingSlot.countDocuments({ facility: layout.facility });
  await Facility.findByIdAndUpdate(layout.facility, { totalCapacity: total });
}

module.exports = { validateElements, syncSlots };
