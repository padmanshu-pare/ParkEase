import { useEffect, useRef, useState } from 'react';
import { Video, VideoOff, Camera, RotateCcw, Loader2, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { readPlate } from '../../utils/plateOcr';

const clean = (v) => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

// Camera for entry and exit. Take one photo, read it once, and fill the number.
// If the number cannot be read clearly, the photo is kept so staff can retake it or type the number.
export default function LiveCameraScanner({ onDetected }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState('');
  const [snapshot, setSnapshot] = useState('');
  const [reading, setReading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [manual, setManual] = useState('');
  const [status, setStatus] = useState('');

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const startCamera = async (id) => {
    stopCamera();
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('This browser cannot open a camera. Open the app over HTTPS, or upload a photo.');
      return;
    }
    try {
      const video = id
        ? { deviceId: { exact: id } }
        : { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } };
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      const list = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput');
      setDevices(list);
      setDeviceId(stream.getVideoTracks()[0]?.getSettings().deviceId || id || '');
      setStatus('Keep the number plate inside the frame, then take the photo.');
    } catch (err) {
      const msg =
        err.name === 'NotAllowedError' ? 'Camera permission was denied. Allow camera access in the browser settings.' :
        err.name === 'NotFoundError' ? 'No camera was found on this device.' :
        err.name === 'NotReadableError' ? 'The camera is in use by another app. Close it and try again.' :
        'Could not open the camera.';
      setStatus(msg);
      toast.error(msg);
    }
  };

  useEffect(() => {
    if (!open) return undefined;
    startCamera('');
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const resetResult = () => {
    setSnapshot('');
    setFailed(false);
    setManual('');
  };

  const accept = (plate) => {
    toast.success(`Number read: ${plate}. Check it and confirm.`);
    onDetected(plate);
    resetResult();
    setOpen(false);
  };

  // Takes one photo and reads it once
  const capture = async () => {
    const v = videoRef.current;
    if (!v || !streamRef.current || !v.videoWidth) return toast.error('Camera is not ready yet');
    const c = canvasRef.current;
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    setSnapshot(c.toDataURL('image/jpeg', 0.85));
    setFailed(false);
    setReading(true);
    setStatus('Reading the number plate...');
    try {
      const result = await readPlate(c);
      if (result.plate) {
        accept(result.plate);
        return;
      }
      setFailed(true);
      setManual(clean(result.text).slice(0, 12));
      setStatus('Could not read it clearly. Retake the photo, or type the number below.');
    } catch (err) {
      setFailed(true);
      setStatus(err.response?.data?.message || 'Reading failed. Retake the photo, or type the number below.');
    } finally {
      setReading(false);
    }
  };

  const useTyped = () => {
    const p = clean(manual);
    if (p.length < 5) return toast.error('Enter a valid vehicle number');
    accept(p);
  };

  if (!open) {
    return (
      <button type="button" className="btn-secondary mt-3 w-full" onClick={() => setOpen(true)}>
        <Video className="h-4 w-4" />Use live camera
      </button>
    );
  }

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
      <div className="relative aspect-video w-full">
        {snapshot ? (
          <img src={snapshot} alt="Photo of the number plate" className="h-full w-full object-cover" />
        ) : (
          <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" aria-label="Live camera feed" />
        )}
        {!snapshot && <div className="pointer-events-none absolute inset-x-8 inset-y-1/4 rounded-lg border-2 border-dashed border-emerald-300/80" />}
        {reading && (
          <div className="absolute inset-0 grid place-items-center bg-black/40">
            <div className="flex items-center gap-2 rounded-full bg-black/70 px-4 py-2 text-sm font-semibold text-white">
              <Loader2 className="h-4 w-4 animate-spin" />Reading
            </div>
          </div>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />

      <div className="space-y-3 p-3">
        {status && <p className="text-xs text-slate-300">{status}</p>}

        {devices.length > 1 && !snapshot && (
          <select className="input text-sm" value={deviceId} onChange={(e) => { setDeviceId(e.target.value); startCamera(e.target.value); }} aria-label="Choose camera">
            {devices.map((d, i) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${i + 1}`}</option>)}
          </select>
        )}

        {!snapshot && (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn-primary" onClick={capture} disabled={reading}>
              <Camera className="h-4 w-4" />Take photo and read
            </button>
            <button type="button" className="btn-ghost btn-sm ml-auto text-slate-200" onClick={() => setOpen(false)}>
              <VideoOff className="h-4 w-4" />Close camera
            </button>
          </div>
        )}

        {snapshot && !reading && failed && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="input w-48 font-mono font-bold uppercase tracking-wider"
              value={manual}
              onChange={(e) => setManual(e.target.value.toUpperCase())}
              placeholder="MP17AB1234"
              aria-label="Vehicle number"
            />
            <button type="button" className="btn-primary btn-sm" onClick={useTyped}><Check className="h-4 w-4" />Use this number</button>
          </div>
        )}

        {snapshot && !reading && (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn-secondary btn-sm" onClick={() => { resetResult(); setStatus('Keep the number plate inside the frame, then take the photo.'); }}>
              <RotateCcw className="h-4 w-4" />Retake photo
            </button>
            <button type="button" className="btn-ghost btn-sm ml-auto text-slate-200" onClick={() => { resetResult(); setOpen(false); }}>
              <VideoOff className="h-4 w-4" />Close camera
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
