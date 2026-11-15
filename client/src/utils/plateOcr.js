import { normalizeReg } from './format';

// Indian-style plate, e.g. MP17AB1234 / DL1CAB1234. Falls back to the longest alphanumeric token.
const PLATE_RE = /[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{3,4}/;

export function pickPlate(raw) {
  const cleaned = normalizeReg(raw);
  const m = cleaned.match(PLATE_RE);
  if (m) return m[0];
  const tokens = raw.toUpperCase().split(/\s+/).map(normalizeReg).filter((t) => t.length >= 5);
  return tokens.sort((a, b) => b.length - a.length)[0] || cleaned.slice(0, 12);
}

// Makes plate text easier to read: grayscale plus a simple black and white threshold
function enhance(source) {
  const w = source.width;
  const h = source.height;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(source, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const v = g > 150 ? 255 : g < 90 ? 0 : g;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

// Loads Tesseract only when a camera or photo is first read. Reuse one reader per session.
export async function createPlateReader() {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng');
  await worker.setParameters({
    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ',
    tessedit_pageseg_mode: '7',
  });
  return {
    // source: a canvas or image element. Returns the plate text, or '' if nothing usable was read.
    async read(source) {
      const { data } = await worker.recognize(enhance(source));
      const plate = pickPlate(data.text || '');
      return plate.length >= 5 ? plate : '';
    },
    async close() {
      await worker.terminate();
    },
  };
}
