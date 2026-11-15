import { useEffect, useRef, useState } from 'react';
import { Video, VideoOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { readPlate, releasePlateReader, sharpnessOf } from '../../utils/plateOcr';

const AUTO_EVERY_MS = 2000;
const BLUR_MIN = 15;      // frames sharper than this are read; lower it if a sharp camera is skipped
const CONFIRM_COUNT = 2;  // in auto mode, the same plate must come from 2 separate frames

// Live camera feed for entry and exit. Blurry frames are skipped, and auto mode waits
// for the same plate in two frames before accepting it.
export default function LiveCameraScanner({ onDetected }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const busyRef = useRef(false);
  const votesRef = useRef([]);
  const [open, setOpen] = useState(false);
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState('');
  const [auto, setAuto] = useState(true);
  const [reading, setReading] = useState(false);
  const [status, setStatus] = useState('');

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const startCamera = async (id) => {
    stopCamera();
    votesRef.current = [];
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
      setStatus('Hold the number plate inside the frame. Keep it straight and well lit.');
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
    return () => {
      stopCamera();
      releasePlateReader();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const accept = (plate) => {
    toast.success(`Detected ${plate}. Please verify it.`);
    onDetected(plate);
    setOpen(false);
  };

  // Grab the current frame and read it. Returns true when a plate is accepted.
  const readFrame = async (manual) => {
    const v = videoRef.current;
    if (busyRef.current || !v || !streamRef.current || !v.videoWidth) return false;
    const c = canvasRef.current;
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);

    if (!manual && sharpnessOf(c) < BLUR_MIN) {
      setStatus('Image is blurry. Hold the camera still.');
      return false;
    }

    busyRef.current = true;
    setReading(true);
    try {
      const result = await readPlate(c);
      if (!result.plate) {
        const seen = result.text ? ` OCR saw: "${result.text.slice(0, 40)}".` : '';
        if (manual) toast.error(`No plate found.${seen} Move closer, improve the light, and try again.`);
        else setStatus(`No plate yet.${seen}`);
        return false;
      }
      if (manual) {
        accept(result.plate);
        return true;
      }
      votesRef.current = [...votesRef.current, result.plate].slice(-6);
      const count = votesRef.current.filter((p) => p === result.plate).length;
      if (count >= CONFIRM_COUNT) {
        accept(result.plate);
        return true;
      }
      setStatus(`Reading ${result.plate}. Confirming...`);
      return false;
    } catch (err) {
      const msg = err.response?.data?.message || 'Reading failed. Try again.';
      if (manual) toast.error(msg);
      return false;
    } finally {
      busyRef.current = false;
      setReading(false);
    }
  };

  useEffect(() => {
    if (!open || !auto) return undefined;
    const t = setInterval(() => readFrame(false), AUTO_EVERY_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, auto]);

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
        <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" aria-label="Live camera feed" />
        <div className="pointer-events-none absolute inset-x-8 inset-y-1/4 rounded-lg border-2 border-dashed border-emerald-300/80" />
        {reading && (
          <div className="absolute right-3 top-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />Reading plate
          </div>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />

      <div className="space-y-3 p-3">
        {status && <p className="text-xs text-slate-300">{status}</p>}
        {devices.length > 1 && (
          <select className="input text-sm" value={deviceId} onChange={(e) => { setDeviceId(e.target.value); startCamera(e.target.value); }} aria-label="Choose camera">
            {devices.map((d, i) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${i + 1}`}</option>)}
          </select>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn-primary btn-sm" onClick={() => readFrame(true)} disabled={reading}>Read plate now</button>
          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />Auto read
          </label>
          <button type="button" className="btn-ghost btn-sm ml-auto text-slate-200" onClick={() => setOpen(false)}>
            <VideoOff className="h-4 w-4" />Close camera
          </button>
        </div>
      </div>
    </div>
  );
}
