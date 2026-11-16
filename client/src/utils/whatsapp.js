import { money, fmtDateTime, fmtDuration } from './format';

// Accepts 10-digit Indian mobiles, with or without 0 or 91 in front. Returns "91XXXXXXXXXX" or ''.
export function normalizeIndianPhone(input = '') {
  let d = String(input).replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  if (d.length === 10) d = `91${d}`;
  return /^91[6-9]\d{9}$/.test(d) ? d : '';
}

// The receipt as plain text, ready to paste into WhatsApp
export function receiptText(record, amount) {
  const pay = record.payment;
  const lines = [
    `*${record.facility?.name || 'ParkEase'}* receipt`,
    `Vehicle: ${record.regNumber}`,
    `Slot: ${`${record.floor?.name || ''} ${record.slot?.name || ''}`.trim()}`,
    `Entry: ${fmtDateTime(record.entryTime)}`,
    `Exit: ${fmtDateTime(record.exitTime)}`,
    `Duration: ${fmtDuration(record.durationMinutes)}`,
    `Total paid: ${money(amount)}`,
  ];
  if (pay) lines.push(`Paid by: ${String(pay.method).toUpperCase()}`, `Receipt no: ${pay.receiptNo}`);
  lines.push('', 'Thank you for parking with us.');
  return lines.join('\n');
}

// Opens WhatsApp with the message filled in. The staff member presses Send.
export function whatsappLink(phone, text) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
