import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Undo2, Keyboard, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errMsg } from '../../services/api';
import { useFacility } from '../../context/FacilityContext';
import { fmtDateTime } from '../../utils/format';

// Keyboard shortcuts (hold Alt, then the key)
const SHORTCUTS = [
  { code: 'KeyN', path: '/entry', label: 'Alt+N  New entry' },
  { code: 'KeyX', path: '/exit', label: 'Alt+X  Exit' },
  { code: 'KeyD', path: '/', label: 'Alt+D  Dashboard' },
  { code: 'KeyS', path: '/slots', label: 'Alt+S  Slots' },
  { code: 'KeyH', path: '/history', label: 'Alt+H  History' },
  { code: 'KeyP', path: '/payments', label: 'Alt+P  Payments' },
  { code: 'KeyR', path: '/reservations', label: 'Alt+R  Reservations' },
];

const LEVEL = {
  warn: 'bg-amber-50 text-amber-800 ring-amber-300',
  info: 'bg-blue-50 text-blue-800 ring-blue-300',
  danger: 'bg-red-50 text-red-800 ring-red-300',
};

// Shows live warnings and the last-minute actions (with Undo). Also handles the keyboard shortcuts.
export default function OpsStrip() {
  const navigate = useNavigate();
  const { selectedId } = useFacility() || {};
  const [alerts, setAlerts] = useState([]);
  const [actions, setActions] = useState([]);
  const [showHelp, setShowHelp] = useState(false);

  const load = useCallback(() => {
    if (!selectedId) return;
    api.get('/ops/alerts', { params: { facility: selectedId } }).then((r) => setAlerts(r.data.alerts)).catch(() => {});
    api.get('/ops/recent', { params: { facility: selectedId } }).then((r) => setActions(r.data.actions)).catch(() => {});
  }, [selectedId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  // Keyboard shortcuts, ignored while typing in a field
  useEffect(() => {
    const onKey = (e) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      const hit = SHORTCUTS.find((s) => s.code === e.code);
      if (hit) {
        e.preventDefault();
        navigate(hit.path);
      }
      if (e.code === 'Slash') setShowHelp((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  const undo = async (a) => {
    try {
      await api.post(`/ops/undo/${a.id}`);
      toast.success(`Undone: ${a.kind === 'entry' ? 'entry' : 'exit'} of ${a.regNumber}`);
      load();
    } catch (err) {
      toast.error(errMsg(err));
      load();
    }
  };

  if (!alerts.length && !actions.length && !showHelp) {
    return (
      <div className="mb-3 flex justify-end">
        <button type="button" onClick={() => setShowHelp(true)} className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600">
          <Keyboard className="h-3.5 w-3.5" />Shortcuts (Alt+/)
        </button>
      </div>
    );
  }

  return (
    <div className="mb-4 space-y-2">
      {alerts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {alerts.map((a, i) => (
            <span key={i} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${LEVEL[a.level]}`}>
              <AlertTriangle className="h-3.5 w-3.5" />{a.text}
            </span>
          ))}
        </div>
      )}

      {actions.length > 0 && (
        <div className="card flex flex-wrap items-center gap-2 p-3">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Last minute</span>
          {actions.map((a) => (
            <span key={`${a.kind}-${a.id}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1 text-xs">
              <span className="font-semibold text-slate-800">{a.kind === 'entry' ? 'In' : 'Out'}: {a.regNumber}</span>
              <span className="text-slate-500">{fmtDateTime(a.at)}</span>
              <button type="button" className="btn-ghost btn-sm text-amber-700" onClick={() => undo(a)}>
                <Undo2 className="h-3.5 w-3.5" />Undo
              </button>
            </span>
          ))}
        </div>
      )}

      {showHelp && (
        <div className="card flex flex-wrap items-start gap-x-6 gap-y-1 p-3 text-xs text-slate-600">
          <span className="flex w-full items-center justify-between font-bold text-slate-800">
            Keyboard shortcuts
            <button type="button" onClick={() => setShowHelp(false)} aria-label="Close"><X className="h-4 w-4" /></button>
          </span>
          {SHORTCUTS.map((s) => <span key={s.code}>{s.label}</span>)}
          <span>Alt+/  Show or hide this list</span>
        </div>
      )}
    </div>
  );
}
