import { useRef, useState } from 'react';
import { Camera, Loader2, ScanLine } from 'lucide-react';
import toast from 'react-hot-toast';
import { readPlateFromFile } from '../../utils/plateOcr';

const MAX_MB = 6;

// Photo or camera-app capture. Reads the number plate and fills the form.
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
      const plate = await readPlateFromFile(file);
      if (plate) {
        onDetected(plate);
        toast.success(`Detected ${plate}. Please verify it.`);
      } else {
        toast.error('Could not read the number plate. Type it in manually.');
      }
    } catch {
      toast.error('Reading failed. Type the number plate manually.');
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
