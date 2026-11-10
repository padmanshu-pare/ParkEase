// Normalises a vehicle registration number: "mp 17 ab-1234" -> "MP17AB1234"
exports.normalizeReg = (v = '') => String(v).toUpperCase().replace(/[^A-Z0-9]/g, '');
exports.isValidReg = (v) => /^[A-Z0-9]{5,12}$/.test(v);
exports.escapeRegex = (s = '') => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
