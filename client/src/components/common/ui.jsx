import { useEffect } from 'react';
import { Loader2, X, ChevronLeft, ChevronRight } from 'lucide-react';

export const Spinner = ({ className = '' }) => <Loader2 className={`h-5 w-5 animate-spin text-brand-600 ${className}`} />;

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide = false }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy-950/50 p-4 sm:items-center" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`my-6 w-full ${wide ? 'max-w-2xl' : 'max-w-md'} rounded-2xl bg-white shadow-xl`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <button className="btn-ghost btn-sm" onClick={onClose} aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export const Field = ({ label, children, hint }) => (
  <label className="block">
    <span className="label">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
  </label>
);

export const Empty = ({ icon: Icon, title, children }) => (
  <div className="flex flex-col items-center px-6 py-14 text-center">
    {Icon && <Icon className="mb-3 h-9 w-9 text-slate-300" />}
    <p className="font-bold text-slate-700">{title}</p>
    {children && <p className="mt-1 max-w-sm text-sm text-slate-500">{children}</p>}
  </div>
);

const STATUS_STYLES = {
  available: 'bg-green-50 text-green-700 ring-green-600/20',
  occupied: 'bg-red-50 text-red-700 ring-red-600/20',
  reserved: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  maintenance: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  active: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  completed: 'bg-green-50 text-green-700 ring-green-600/20',
  successful: 'bg-green-50 text-green-700 ring-green-600/20',
  pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  failed: 'bg-red-50 text-red-700 ring-red-600/20',
  refunded: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  confirmed: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  inactive: 'bg-slate-100 text-slate-500 ring-slate-400/20',
};

export const Badge = ({ status, children }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${STATUS_STYLES[status] || STATUS_STYLES.inactive}`}>
    {children || String(status).replace('_', ' ')}
  </span>
);

export const SlotLegend = () => (
  <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-600">
    {[['Available', 'bg-slot-available'], ['Occupied', 'bg-slot-occupied'], ['Reserved', 'bg-slot-reserved'], ['Maintenance', 'bg-slot-maintenance']].map(([l, c]) => (
      <span key={l} className="inline-flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${c}`} />{l}</span>
    ))}
  </div>
);

export function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-500">
      <span>Page {page} of {pages}</span>
      <div className="flex gap-2">
        <button className="btn-secondary btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}><ChevronLeft className="h-4 w-4" />Previous</button>
        <button className="btn-secondary btn-sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next<ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

export const NoFacility = () => (
  <div className="card"><Empty title="No facility selected">Ask your admin to create a facility and assign it to you.</Empty></div>
);
