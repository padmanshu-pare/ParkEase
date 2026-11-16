import { useState } from 'react';
import { Printer, MessageCircle, CheckCircle2 } from 'lucide-react';
import { Modal } from '../common/ui';
import { money, fmtDateTime, fmtDuration } from '../../utils/format';
import { normalizeIndianPhone, receiptText, whatsappLink } from '../../utils/whatsapp';

// One row of the receipt: label on the left, value on the right
const Row = ({ k, v, mono }) => (
  <div className="flex items-baseline justify-between gap-4 py-2 text-sm">
    <dt className="text-slate-500">{k}</dt>
    <dd className={`text-right font-semibold text-slate-900 ${mono ? 'font-mono text-xs' : ''}`}>{v || '—'}</dd>
  </div>
);

export default function Receipt({ data, onClose }) {
  const [phone, setPhone] = useState(data?.record?.ownerPhone || '');
  const [landscape, setLandscape] = useState(false);
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
      {/* Scrolls inside the popup, so the buttons stay reachable at any zoom */}
      <div className="max-h-[70vh] overflow-y-auto pr-1">
        {/* Print: A5 paper, only the receipt is printed, colours kept. Orientation follows the checkbox. */}
        <style>{`
          @page { size: A5 ${landscape ? 'landscape' : 'portrait'}; margin: 8mm; }
          .receipt-print { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @media print {
            body * { visibility: hidden !important; }
            .receipt-print, .receipt-print * { visibility: visible !important; }
            .receipt-print { position: fixed; left: 0; top: 0; width: 100%; margin: 0 !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; }
            .no-print { display: none !important; }
          }
        `}</style>

        <div className="receipt-print overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {/* Header band */}
          <header className="bg-gradient-to-br from-navy-900 via-navy-800 to-brand-700 px-6 pb-6 pt-5 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-lg font-black text-navy-900">P</span>
                <div>
                  <p className="text-base font-extrabold leading-tight">ParkEase</p>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-blue-200">Parking receipt</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/40 bg-emerald-400/20 px-3 py-1 text-xs font-bold tracking-wide text-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5" />PAID
              </span>
            </div>
            <div className="mt-5">
              <p className="text-lg font-extrabold">{record.facility?.name}</p>
              {record.facility?.address && <p className="text-xs text-blue-100">{record.facility.address}</p>}
            </div>
          </header>

          {/* Vehicle and total */}
          <section className="px-6 pt-6 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">Vehicle</p>
            <div className="mt-2 inline-block rounded-md border-[3px] border-slate-900 bg-amber-300 px-4 py-1.5 font-mono text-xl font-black tracking-[0.2em] text-slate-900">
              {record.regNumber}
            </div>
            <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">Total paid</p>
            <p className="text-5xl font-black tracking-tight text-brand-700">{money(amount)}</p>
          </section>

          {/* Visit and payment details */}
          <dl className="mx-6 mt-6 divide-y divide-dashed divide-slate-200 border-t-2 border-dashed border-slate-200">
            <Row k="Slot" v={`${record.floor?.name || ''} · ${record.slot?.name || ''}`} />
            <Row k="Came in" v={fmtDateTime(record.entryTime)} />
            <Row k="Left" v={fmtDateTime(record.exitTime)} />
            <Row k="Time parked" v={fmtDuration(record.durationMinutes)} />
            {pay && <Row k="Paid by" v={String(pay.method).toUpperCase()} />}
            {pay && <Row k="Receipt no." v={pay.receiptNo} mono />}
            {pay && <Row k="Transaction" v={pay.transactionId} mono />}
          </dl>

          {breakdown.length > 0 && (
            <div className="mx-6 mt-4 rounded-lg border border-slate-200 px-4 py-3">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">How it was calculated</p>
              <ul className="space-y-0.5 text-xs text-slate-600">{breakdown.map((b) => <li key={b}>{b}</li>)}</ul>
            </div>
          )}

          <div className="mt-6 h-1.5 bg-gradient-to-r from-brand-600 via-emerald-500 to-amber-400" />
          <p className="px-6 py-4 text-center text-xs text-slate-500">Thank you for parking with us. Keep this receipt for your records.</p>
        </div>

        {/* WhatsApp (not printed) */}
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

        <label className="no-print mt-4 flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={landscape} onChange={(e) => setLandscape(e.target.checked)} />
          Print horizontally (landscape)
        </label>

        <div className="no-print mt-4 flex gap-2">
          <button className="btn-secondary flex-1" onClick={() => window.print()}><Printer className="h-4 w-4" />Print A5 receipt</button>
          <button className="btn-primary flex-1" onClick={onClose}>Done</button>
        </div>
      </div>
    </Modal>
  );
}
