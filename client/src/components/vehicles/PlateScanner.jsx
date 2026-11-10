import { useRef, useState } from 'react';
import { Camera, Loader2, ScanLine } from 'lucide-react';
import toast from 'react-hot-toast';
import { normalizeReg } from '../../utils/format';

const MAX_MB = 6;
// Indian-style plate, e.g. MP17AB1234 / DL1CAB1234. Falls back to the longest alphanumeric token.
const PLATE_RE = /[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{3,4}/;

function pickPlate(raw) {
  const cleaned = normalizeReg(raw);
  const m = cleaned.match(PLATE_RE);
  if (m) return m[0];
  const tokens = raw.toUpperCase().split(/\s+/).map(normalizeReg).filter((t) => t.length >= 5);
  return tokens.sort((a, b) => b.length - a.length)[0] || cleaned.slice(0, 12);
}

// Takes a photo / uploads an image, runs Tesseract OCR in the browser and returns the plate text.
export default function PlateScanner({ onDetected }) {
  const input = useRef(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);

  const handle = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please choose an image file');
    if (file.size > MAX_MB * 1024 * 1024) return toast.error(`Image is too large. Keep it under ${MAX_MB} MB.`);

    setPreview(URL.createObjectURL(file));
    setBusy(true);
    try {
      const { createWorker } = await import('tesseract.js'); // loaded only when needed
      const worker = await createWorker('eng');
      await worker.setParameters({ tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ', tessedit_pageseg_mode: '7' });
      const { data } = await worker.recognize(file);
      await worker.terminate();
      const plate = pickPlate(data.text || '');
      if (plate.length >= 5) { onDetected(plate); toast.success(`Detected ${plate}. Please verify it.`); }
      else toast.error('Could not read the number plate. Type it in manually.');
    } catch {
      toast.error('OCR failed. Type the number plate manually.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" onChange={handle} />
      <button type="button" className="btn-secondary w-full" onClick={() => input.current.click()} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
        {busy ? 'Reading number plate…' : 'Capture or upload number plate'}
      </button>
      {preview && (
        <div className="relative mt-3 overflow-hidden rounded-lg border border-slate-200">
          <img src={preview} alt="Number plate" className="max-h-44 w-full bg-slate-100 object-contain" />
          {busy && <div className="absolute inset-0 grid place-items-center bg-white/60"><ScanLine className="h-8 w-8 animate-pulse text-brand-600" /></div>}
        </div>
      )}
    </div>
  );
}
