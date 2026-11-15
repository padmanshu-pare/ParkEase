import { normalizeReg } from './format';
import { STATE_CODES } from './indianPlate';

// Indian plates: 2 state letters, 1-2 district digits, 1-3 series letters, 4 digits. e.g. MP17AB1234
const PLATE_RE = /^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}$/;

// Characters OCR commonly confuses, by the type the position needs
const AS_LETTER = { 0: 'O', 1: 'I', 2: 'Z', 5: 'S', 6: 'G', 8: 'B' };
const AS_DIGIT = { O: '0', Q: '0', D: '0', I: '1', L: '1', Z: '2', S: '5', G: '6', B: '8' };
const isLetter = (c) => /[A-Z]/.test(c);
const isDigit = (c) => /[0-9]/.test(c);
const canBeDigit = (c) => isDigit(c) || AS_DIGIT[c] !== undefined;
const canBeLetter = (c) => isLetter(c) || AS_LETTER[c] !== undefined;

// Uses the plate's structure to fix confusions (O/0, I/1, B/8...). Returns '' if no valid plate fits.
export function correctPlate(raw) {
  const s = normalizeReg(raw || '');
  if (s.length < 9 || s.length > 11) return '';
  // BH series: YY BH NNNN LL. Fix the year digits and the B/H before checking.
  const bh = s.replace(/^([0-9OIZSGB]{2})([B8])([H])/, (_, y, b, h) => `${y.split('').map((ch) => AS_DIGIT[ch] || ch).join('')}BH`);
  if (/^\d{2}BH\d{4}[A-Z]{1,2}$/.test(bh)) return bh;
  const c = s.split('');
  // State code: letters
  for (let i = 0; i < 2; i++) {
    if (!canBeLetter(c[i])) return '';
    c[i] = isLetter(c[i]) ? c[i] : AS_LETTER[c[i]];
  }
  // Last four: digits
  for (let i = c.length - 4; i < c.length; i++) {
    if (!canBeDigit(c[i])) return '';
    c[i] = isDigit(c[i]) ? c[i] : AS_DIGIT[c[i]];
  }
  // Middle: district digits (1 or 2), then series letters (1 to 3)
  const middle = c.slice(2, c.length - 4);
  for (const d of [2, 1]) {
    const digits = middle.slice(0, d);
    const letters = middle.slice(d);
    if (letters.length < 1 || letters.length > 3) continue;
    if (!digits.every(canBeDigit) || !letters.every(canBeLetter)) continue;
    const fixed = [
      ...digits.map((ch) => (isDigit(ch) ? ch : AS_DIGIT[ch])),
      ...letters.map((ch) => (isLetter(ch) ? ch : AS_LETTER[ch])),
    ];
    const plate = [c[0], c[1], ...fixed, ...c.slice(c.length - 4)].join('');
    // Reject plates whose state code does not exist (a common sign of a misread)
    if (!STATE_CODES[plate.slice(0, 2)]) return '';
    return PLATE_RE.test(plate) ? plate : '';
  }
  return '';
}

// Crops to the centre of the frame, where the plate is expected
function cropCentre(source) {
  const w = source.width;
  const h = source.height;
  const sx = Math.round(w * 0.05);
  const sy = Math.round(h * 0.2);
  const sw = Math.round(w * 0.9);
  const sh = Math.round(h * 0.6);
  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  canvas.getContext('2d').drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh);
  return canvas;
}

// Three versions of the same frame: fixed threshold, adaptive threshold, and a 2x enlarged version
export function preprocess(source, mode) {
  const base = cropCentre(source);
  const scale = mode === 'large' ? 2 : 1;
  const canvas = document.createElement('canvas');
  canvas.width = base.width * scale;
  canvas.height = base.height * scale;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(base, 0, 0, canvas.width, canvas.height);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  const gray = new Float32Array(d.length / 4);
  let sum = 0;
  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    gray[j] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    sum += gray[j];
  }
  const mean = sum / gray.length;
  const fixed = mode === 'thresh' ? 150 : mean;
  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    const v = gray[j] > fixed ? 255 : 0;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

// Sharpness score (variance of a Laplacian filter). Low values mean a blurred frame.
export function sharpnessOf(source) {
  const c = cropCentre(source);
  const small = document.createElement('canvas');
  const scale = Math.min(1, 320 / c.width);
  small.width = Math.max(8, Math.round(c.width * scale));
  small.height = Math.max(8, Math.round(c.height * scale));
  const ctx = small.getContext('2d');
  ctx.drawImage(c, 0, 0, small.width, small.height);
  const d = ctx.getImageData(0, 0, small.width, small.height).data;
  const w = small.width;
  const h = small.height;
  const g = new Float32Array(w * h);
  for (let i = 0, j = 0; i < d.length; i += 4, j++) g[j] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const k = y * w + x;
      const lap = 4 * g[k] - g[k - 1] - g[k + 1] - g[k - w] - g[k + w];
      sum += lap;
      sumSq += lap * lap;
      n++;
    }
  }
  if (!n) return 0;
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

// Loads Tesseract only when first needed. Returns the best plate read from the frame, or null.
export async function createPlateReader() {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng');
  await worker.setParameters({
    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
    tessedit_pageseg_mode: '7',
  });
  return {
    async read(source) {
      let best = null;
      for (const mode of ['thresh', 'adaptive', 'large']) {
        const { data } = await worker.recognize(preprocess(source, mode));
        const plate = correctPlate(data.text || '');
        if (plate && (!best || data.confidence > best.conf)) best = { plate, conf: data.confidence };
      }
      return best;
    },
    async close() {
      await worker.terminate();
    },
  };
}
