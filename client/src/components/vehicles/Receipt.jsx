import { useState } from 'react';
import { Printer, MessageCircle } from 'lucide-react';
import { Modal } from '../common/ui';
import { money, fmtDateTime, fmtDuration } from '../../utils/format';
import { normalizeIndianPhone, receiptText, whatsappLink } from '../../utils/whatsapp';

export default function Receipt({ data, onClose }) {
  const [phone, setPhone] = useState(data?.record?.ownerPhone || '');
  const [landscape, setLandscape] = useState(false);
  if (!data) return null;
  const { record, amount, breakdown = [] } = data;
  const pay = record.payment;
  const phoneNo = normalizeIndianPhone(phone);

  const Row = ({ k, v }) => (
    <div className="flex justify-between py-1.5 text-sm">
      <dt className="text-slate-500">{k}</dt>
      <dd className="text-right font-semibold text-slate-900">{v}</dd>
    </div>
  );

  const sendWhatsApp = () => {
    if (!phoneNo) return;
    window.open(whatsappLink(phoneNo, receiptText(record, amount)), '_blank', 'noopener');
  };

  return (
    <Modal open onClose={onClose} title="Checkout complete">
      {/* Print: A5 paper, only the receipt is printed. Orientation follows the toggle below. */}
      <style>{`
        @page { size: A5 ${landscape ? 'landscape' : 'portrait'}; margin: 8mm; }
        @media print {
          body * { visibility: hidden !important; }
          .receipt-print, .receipt-print * { visibility: visible !important; }
          .receipt-print { position: fixed; left: 0; top: 0; width: 100%; padding: 0 !important; background: #fff; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="receipt-print">
        <p className="text-center text-lg font-extrabold text-slate-900">{record.facility?.name}</p>
        <p className="mb-4 text-center text-xs text-slate-500">{record.facility?.address}</p>
        <div className="text-center"><span className="plate text-lg">{record.regNumber}</span></div>
        <dl className="mt-4 divide-y divide-slate-100 border-y border-slate-200">
          <Row k="Slot" v={`${record.floor?.name} · ${record.slot?.name}`} />
          <Row k="Entry" v={fmtDateTime(record.entryTime)} />
          <Row k="Exit" v={fmtDateTime(record.exitTime)} />
          <Row k="Duration" v={fmtDuration(record.durationMinutes)} />
          {pay && <Row k="Paid by" v={String(pay.method).toUpperCase()} />}
          {pay && <Row k="Receipt no." v={pay.receiptNo} />}
          {pay && <Row k="Transaction" v={<span className="font-mono text-xs">{pay.transactionId}</span>} />}
        </dl>
        {breakdown.length > 0 && (
          <ul className="mt-3 space-y-0.5 text-xs text-slate-500">{breakdown.map((b) => <li key={b}>{b}</li>)}</ul>
        )}
        <div className="mt-4 flex items-baseline justify-between rounded-lg bg-slate-50 px-4 py-3">
          <span className="font-bold text-slate-700">Total paid</span>
          <span className="text-2xl font-extrabold text-slate-900">{money(amount)}</span>
        </div>
      </div>

      <div className="no-print mt-5 rounded-lg border border-slate-200 p-3">
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

      <div className="no-print mt-4 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={landscape} onChange={(e) => setLandscape(e.target.checked)} />
          Print horizontally (landscape)
        </label>
      </div>
      <div className="no-print mt-4 flex gap-2">
        <button className="btn-secondary flex-1" onClick={() => window.print()}><Printer className="h-4 w-4" />Print A5 receipt</button>
        <button className="btn-primary flex-1" onClick={onClose}>Done</button>
      </div>
    </Modal>
  );
}
