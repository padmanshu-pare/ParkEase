import { useState } from 'react';
import { Printer, MessageCircle, CheckCircle2, Clock, MapPin, LogIn, LogOut, Timer, Wallet, Hash } from 'lucide-react';
import { Modal } from '../common/ui';
import { money, fmtDateTime, fmtDuration } from '../../utils/format';
import { normalizeIndianPhone, receiptText, whatsappLink } from '../../utils/whatsapp';

const Line = ({ icon: Icon, label, value, mono }) => (
  <div className="flex items-start gap-3 py-2.5">
    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500"><Icon className="h-3.5 w-3.5" /></span>
    <div className="min-w-0 flex-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`truncate text-sm font-semibold text-slate-900 ${mono ? 'font-mono text-xs' : ''}`}>{value || '—'}</p>
    </div>
  </div>
);

export default function Receipt({ data, onClose }) {
  const [phone, setPhone] = useState(data?.record?.ownerPhone || '');
  if (!data) return null;
  const { record, amount, breakdown = [] } = data;
  const pay = record.payment;
  const phoneNo = normalizeIndianPhone(phone);

  const sendWhatsApp = () => {
    if (!phoneNo) return;
    window.open(whatsappLink(phoneNo, receiptText(record, amount)), '_blank', 'noopener');
  };

  return (
    <Modal open onClose={onClose} title="Checkout complete">
      <style>{`@media print { .no-print { display: none !important; } }`}</style>

      <div className="print-area overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Header */}
        <div className="bg-gradient-to-br from-navy-900 to-navy-800 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-sm font-black">P</span>
              <span className="text-sm font-bold tracking-wide">ParkEase</span>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5" />Paid
            </span>
          </div>
          <p className="mt-4 text-lg font-extrabold">{record.facility?.name}</p>
          {record.facility?.address && <p className="text-xs text-slate-300">{record.facility.address}</p>}
        </div>

        {/* Amount and plate */}
        <div className="px-6 pt-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total paid</p>
          <p className="mt-1 text-4xl font-black tracking-tight text-slate-900">{money(amount)}</p>
          <div className="mt-4 flex justify-center">
            <span className="plate text-base">{record.regNumber}</span>
          </div>
        </div>

        {/* Visit details */}
        <div className="mx-6 mt-6 border-t border-dashed border-slate-300 pt-2">
          <div className="grid grid-cols-2 gap-x-6">
            <Line icon={MapPin} label="Slot" value={`${record.floor?.name || ''} · ${record.slot?.name || ''}`} />
            <Line icon={Timer} label="Time parked" value={fmtDuration(record.durationMinutes)} />
            <Line icon={LogIn} label="Came in" value={fmtDateTime(record.entryTime)} />
            <Line icon={LogOut} label="Left" value={fmtDateTime(record.exitTime)} />
          </div>
        </div>

        {/* Payment details */}
        {pay && (
          <div className="mx-6 border-t border-dashed border-slate-300 pt-2">
            <div className="grid grid-cols-2 gap-x-6">
              <Line icon={Wallet} label="Paid by" value={String(pay.method).toUpperCase()} />
              <Line icon={Hash} label="Receipt no." value={pay.receiptNo} mono />
              <div className="col-span-2"><Line icon={Clock} label="Transaction" value={pay.transactionId} mono /></div>
            </div>
          </div>
        )}

        {/* Charge breakdown */}
        {breakdown.length > 0 && (
          <div className="mx-6 mb-6 mt-2 rounded-xl bg-slate-50 px-4 py-3">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">How it was calculated</p>
            <ul className="space-y-0.5 text-xs text-slate-600">{breakdown.map((b) => <li key={b}>• {b}</li>)}</ul>
          </div>
        )}

        <p className="pb-5 text-center text-xs text-slate-400">Thank you for parking with us</p>
      </div>

      {/* WhatsApp */}
      <div className="no-print mt-5 rounded-xl border border-slate-200 p-3">
        <label className="label" htmlFor="wa-phone">Send receipt on WhatsApp</label>
        <div className="flex gap-2">
          <input
            id="wa-phone" type="tel" inputMode="numeric" className="input" placeholder="Customer mobile, e.g. 98765 43210"
            value={phone} onChange={(e) => setPhone(e.target.value)}
          />
          <button type="button" className="btn-primary shrink-0" onClick={sendWhatsApp} disabled={!phoneNo}>
            <MessageCircle className="h-4 w-4" />Send
          </button>
        </div>
        {phone && !phoneNo && <p className="mt-2 text-xs text-amber-700">Enter a valid 10-digit mobile number.</p>}
      </div>

      <div className="no-print mt-4 flex gap-2">
        <button className="btn-secondary flex-1" onClick={() => window.print()}><Printer className="h-4 w-4" />Print receipt</button>
        <button className="btn-primary flex-1" onClick={onClose}>Done</button>
      </div>
    </Modal>
  );
}
