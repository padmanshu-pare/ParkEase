import { Modal, Badge } from '../common/ui';
import { money, fmtDateTime, fmtDuration } from '../../utils/format';

// Pop-up for one payment: when the car came in and left, how long it stayed, where it was parked, and the payment
export default function PaymentDetail({ data, onClose }) {
  if (!data) return null;
  const { payment: p, record: r, booking: b } = data;

  const Row = ({ k, v }) => (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <dt className="text-slate-500">{k}</dt>
      <dd className="text-right font-semibold text-slate-900">{v || '—'}</dd>
    </div>
  );

  return (
    <Modal open onClose={onClose} title="Vehicle visit details">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <span className="plate text-lg">{r?.regNumber || p.regNumber}</span>
          {r && <Badge status={r.status} />}
        </div>

        <section>
          <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Parking</h3>
          <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200 px-4">
            <Row k="Slot" v={r ? `${r.floor || ''} ${r.slot || ''}`.trim() : null} />
            <Row k="Facility" v={r?.facility} />
            <Row k="Came in" v={r ? fmtDateTime(r.entryTime) : null} />
            <Row k="Left" v={r?.exitTime ? fmtDateTime(r.exitTime) : 'Still parked'} />
            <Row k="Time parked" v={r?.durationMinutes != null ? fmtDuration(r.durationMinutes) : null} />
          </dl>
        </section>

        <section>
          <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Payment</h3>
          <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200 px-4">
            <Row k="Amount" v={money(p.amount)} />
            <Row k="Method" v={String(p.method || '').toUpperCase()} />
            <Row k="Status" v={p.status} />
            <Row k="Receipt no." v={p.receiptNo} />
            <Row k="Transaction" v={p.transactionId} />
            <Row k="Paid at" v={fmtDateTime(p.paidAt)} />
            {p.refundedAt && <Row k="Refunded at" v={fmtDateTime(p.refundedAt)} />}
          </dl>
        </section>

        {b && (
          <section>
            <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Booking</h3>
            <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200 px-4">
              <Row k="Booked from" v={fmtDateTime(b.startTime)} />
              <Row k="Booked until" v={fmtDateTime(b.endTime)} />
              <Row k="Booking status" v={b.status} />
            </dl>
          </section>
        )}

        {r && (r.ownerName || r.ownerPhone) && (
          <section>
            <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Owner</h3>
            <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200 px-4">
              <Row k="Name" v={r.ownerName} />
              <Row k="Phone" v={r.ownerPhone} />
            </dl>
          </section>
        )}
      </div>
    </Modal>
  );
}
