const COMMON = new Set([
  'password', 'password1', 'password123', '12345678', '123456789', 'qwerty123', 'qwertyuiop',
  'admin123', 'welcome123', 'letmein123', 'iloveyou1', 'parkease1', 'parkease123', 'abc12345',
]);

// Returns an error message, or null when the password is acceptable
exports.validatePassword = (password) => {
  const p = String(password || '');
  if (p.length < 8) return 'Password must be at least 8 characters';
  if (p.length > 72) return 'Password must be at most 72 characters';
  if (!/[A-Za-z]/.test(p) || !/[0-9]/.test(p)) return 'Password must include at least one letter and one number';
  if (COMMON.has(p.toLowerCase())) return 'This password is too common. Please choose another one.';
  return null;
};
