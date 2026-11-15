const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');
const { normalizeReg } = require('../utils/plate');

// Server-side number plate reading through a professional ANPR service (Plate Recognizer).
// Enabled only when PLATE_API_TOKEN is set on the server. Otherwise the app uses the browser reader.
const ENDPOINT = 'https://api.platerecognizer.com/v1/plate-reader/';

exports.readPlate = asyncHandler(async (req, res) => {
  const token = process.env.PLATE_API_TOKEN;
  if (!token) throw httpError(501, 'Server plate reading is not configured');

  const raw = typeof req.body.image === 'string' ? req.body.image : '';
  const b64 = raw.replace(/^data:image\/\w+;base64,/, '');
  if (!b64) throw httpError(400, 'Send a JPEG image');
  const buf = Buffer.from(b64, 'base64');
  if (buf.length > 220 * 1024) throw httpError(400, 'Image is too large');

  const form = new FormData();
  form.append('upload', new Blob([buf], { type: 'image/jpeg' }), 'plate.jpg');
  form.append('regions', 'in');

  let r;
  try {
    r = await fetch(ENDPOINT, { method: 'POST', headers: { Authorization: `Token ${token}` }, body: form });
  } catch {
    throw httpError(502, 'Plate reader is not reachable. Try again or type the number.');
  }
  if (!r.ok) throw httpError(502, 'Plate reader did not respond. Try again or type the number.');

  const data = await r.json();
  const best = (data.results || []).slice().sort((a, b) => (b.score || 0) - (a.score || 0))[0];
  if (!best) return res.json({ plate: '', confidence: 0 });
  res.json({ plate: normalizeReg(best.plate), confidence: Math.round((best.score || 0) * 100) });
});
