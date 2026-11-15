// Indian vehicle number plates.
// Standard format: SS RR LL NNNN   (state, RTO district, series letters, serial number)
// BH (Bharat) series: YY BH NNNN LL (year, BH, serial, letters), used for inter-state movement.

export const STATE_CODES = {
  AN: 'Andaman and Nicobar', AP: 'Andhra Pradesh', AR: 'Arunachal Pradesh', AS: 'Assam', BR: 'Bihar',
  CG: 'Chhattisgarh', CH: 'Chandigarh', DD: 'Daman and Diu', DL: 'Delhi', DN: 'Dadra and Nagar Haveli',
  GA: 'Goa', GJ: 'Gujarat', HP: 'Himachal Pradesh', HR: 'Haryana', JH: 'Jharkhand', JK: 'Jammu and Kashmir',
  KA: 'Karnataka', KL: 'Kerala', LA: 'Ladakh', LD: 'Lakshadweep', MH: 'Maharashtra', ML: 'Meghalaya',
  MN: 'Manipur', MP: 'Madhya Pradesh', MZ: 'Mizoram', NL: 'Nagaland', OD: 'Odisha', PB: 'Punjab',
  PY: 'Puducherry', RJ: 'Rajasthan', SK: 'Sikkim', TN: 'Tamil Nadu', TR: 'Tripura', TS: 'Telangana',
  UK: 'Uttarakhand', UP: 'Uttar Pradesh', WB: 'West Bengal',
};

// Plate categories, by plate colour. The manager picks one at entry; the colour is shown on screen.
export const PLATE_CATEGORIES = [
  { value: 'private', label: 'Private (white plate, black text)', bg: '#ffffff', fg: '#111111', border: '#94a3b8' },
  { value: 'commercial', label: 'Commercial (yellow plate, black text)', bg: '#fde047', fg: '#111111', border: '#ca8a04' },
  { value: 'ev', label: 'Electric, private (green plate, white text)', bg: '#15803d', fg: '#ffffff', border: '#166534' },
  { value: 'ev_commercial', label: 'Electric, commercial (green plate, yellow text)', bg: '#15803d', fg: '#fde047', border: '#166534' },
  { value: 'rental', label: 'Self-drive rental (black plate, yellow text)', bg: '#111111', fg: '#fde047', border: '#facc15' },
  { value: 'temporary', label: 'Temporary (red plate, white text)', bg: '#dc2626', fg: '#ffffff', border: '#991b1b' },
  { value: 'diplomatic', label: 'Diplomatic (blue plate, white text)', bg: '#1d4ed8', fg: '#ffffff', border: '#1e3a8a' },
  { value: 'government', label: 'Government / constitutional (red plate, gold emblem)', bg: '#dc2626', fg: '#fde68a', border: '#7f1d1d' },
  { value: 'military', label: 'Armed forces (military format)', bg: '#3f4a2f', fg: '#ffffff', border: '#1f2617' },
];

export const categoryInfo = (value) => PLATE_CATEGORIES.find((c) => c.value === value) || PLATE_CATEGORIES[0];

const STANDARD = /^([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{4})$/;
const BH = /^(\d{2})BH(\d{4})([A-Z]{1,2})$/;

// Works out what a registration number looks like. Used to warn staff about typos before entry.
export function analyzePlate(reg = '') {
  const r = String(reg).toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (BH.test(r)) return { valid: true, format: 'bh', stateCode: 'BH', stateName: 'Bharat (inter-state) series', suggestedCategory: 'private' };
  const m = r.match(STANDARD);
  if (m) {
    const state = m[1];
    if (STATE_CODES[state]) return { valid: true, format: 'standard', stateCode: state, stateName: STATE_CODES[state], suggestedCategory: 'private' };
    return { valid: false, format: 'standard', stateCode: state, reason: `"${state}" is not an Indian state or UT code. Check the number.` };
  }
  return { valid: false, format: 'unknown', reason: 'Format should look like MP17AB1234 (state, district, series, number), or 22BH1234AA for BH series.' };
}
