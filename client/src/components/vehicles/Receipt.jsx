import { Printer } from 'lucide-react';
import { Modal } from '../common/ui';
import { money, fmtDateTime, fmtDuration } from '../../utils/format';

export default function Receipt({ data, onClose }) {
  if (!data) return null;
  const { record, amount, breakdown } = data;
  const pay = record.payment;
  const Row = ({ k, v }) => <div className="flex justify-between py-1.5 text-sm"><dt className="text-slate-500">{k}</dt><dd className="text-right font-semibold text-slate-900">{v}</dd></div>;
  return (
    <Modal open onClose={onClose} title="Checkout complete">
      <div className="print-area">
        <p className="text-center text-lg font-extrabold text-slate-900">{record.facility?.name}</p>
        <p className="mb-4 text-center text-xs text-slate-500">{record.facility?.address}</p>
        <div className="text-center"><span className="plate text-lg">{record.regNumber}</span></div>
        <dl className="mt-4 divide-y divide-slate-100 border-y border-slate-200">
          <Row k="Slot" v={`${record.floor?.name} · ${record.slot?.name}`} />
          <Row k="Entry" v={fmtDateTime(record.entryTime)} />
          <Row k="Exit" v={fmtDateTime(record.exitTime)} />
          <Row k="Duration" v={fmtDuration(record.durationMinutes)} />
          {pay && <Row k="Paid by" v={pay.method.toUpperCase()} />}
          {pay && <Row k="Receipt no." v={pay.receiptNo} />}
          {pay && <Row k="Transaction" v={<span className="font-mono text-xs">{pay.transactionId}</span>} />}
        </dl>
        <ul className="mt-3 space-y-0.5 text-xs text-slate-500">{breakdown.map((b) => <li key={b}>{b}</li>)}</ul>
        <div className="mt-4 flex items-baseline justify-between rounded-lg bg-slate-50 px-4 py-3">
          <span className="font-bold text-slate-700">Total paid</span>
          <span className="text-2xl font-extrabold text-slate-900">{money(amount)}</span>
        </div>
      </div>
      <div className="mt-5 flex gap-2">
        <button className="btn-secondary flex-1" onClick={() => window.print()}><Printer className="h-4 w-4" />Print receipt</button>
        <button className="btn-primary flex-1" onClick={onClose}>Done</button>
      </div>
    </Modal>
  );
}
