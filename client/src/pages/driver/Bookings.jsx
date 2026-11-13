import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { errMsg } from '../../services/api';
import { PageHeader, Spinner, Empty } from '../../components/common/ui';
import DemoBanner from '../../components/common/DemoBanner';

const STATUS = {
  pending_payment: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  confirmed: 'bg-green-50 text-green-700 ring-green-600/20',
  active: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  completed: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  cancelled: 'bg-red-50 text-red-700 ring-red-600/20',
  expired: 'bg-amber-50 text-amber-700 ring-amber-600/20',
};
const LABEL = { pending_payment: 'awaiting payment' };
const PAY_WINDOW_MS = 15 * 60 * 1000;
const CUTOFF_MS = 60 * 60 * 1000;
const fmt = (d) => new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
const hm = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function Bookings() {
  const [items, setItems] = useState(null);

  const load = useCallback(() => {
    api.get('/driver/reservations').then(({ data }) => setItems(data)).catch((e) => toast.error(errMsg(e)));
  }, []);
  useEffect(() => { load(); }, [load]);

  const payNow = async (r) => {
    try {
      const { data } = await api.post(`/driver/reservations/${r._id}/pay`);
      toast.success(`Demo payment done. Receipt ${data.receiptNo}`);
      load();
    } catch (err) {
      toast.error(errMsg(err));
      load();
    }
  };

  const cancel = async (r) => {
    const paid = r.status === 'confirmed' && r.amount > 0;
    const msg = paid
      ? 'Cancel this booking? The slot will be released and the demo payment refunded.'
      : 'Cancel this booking? The slot will be released.';
    if (!window.confirm(msg)) return;
    try {
      await api.post(`/driver/reservations/${r._id}/cancel`);
      toast.success('Booking cancelled');
      load();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  return (
    <div>
      <PageHeader title="My bookings" subtitle="Your upcoming and past parking bookings." />
      <DemoBanner />
      {!items ? (
        <div className="grid place-items-center py-16"><Spinner /></div>
      ) : !items.length ? (
        <div className="card"><Empty title="No bookings yet">Find a facility and book your first slot.</Empty></div>
      ) : (
        <div className="space-y-3">
          {items.map((r) => {
            const pending = r.status === 'pending_payment';
            const canCancel = pending || (r.status === 'confirmed' && new Date(r.startTime).getTime() - Date.now() > CUTOFF_MS);
            const payBy = pending ? new Date(new Date(r.createdAt).getTime() + PAY_WINDOW_MS) : null;
            return (
              <div key={r._id} className="card flex flex-wrap items-center gap-4 p-5">
                <div className="min-w-[220px] flex-1">
                  <p className="font-bold text-slate-900">{r.facility?.name || 'Facility'}</p>
                  <p className="text-sm text-slate-500">{fmt(r.startTime)} to {fmt(r.endTime)}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {r.regNumber}{r.vehicleLabel ? ` (${r.vehicleLabel})` : ''} · Slot {r.slot?.name || '-'}{r.floor?.name ? `, ${r.floor.name}` : ''}
                  </p>
                  {r.amount > 0 && <p className="mt-1 text-sm font-semibold text-slate-700">Amount: ₹{r.amount}</p>}
                  {pending && payBy && <p className="mt-1 text-xs font-semibold text-amber-700">Pay by {hm(payBy)} or the slot is released</p>}
                </div>
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${STATUS[r.status] || ''}`}>{LABEL[r.status] || r.status}</span>
                {pending && <button className="btn-primary btn-sm" onClick={() => payNow(r)}>Pay ₹{r.amount} (demo)</button>}
                {canCancel && <button className="btn-danger btn-sm" onClick={() => cancel(r)}>Cancel</button>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
