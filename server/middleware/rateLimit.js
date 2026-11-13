const rateLimit = require('express-rate-limit');

const base = { standardHeaders: 'draft-7', legacyHeaders: false };

// Brute-force protection on password login: 10 failed or total attempts per 15 minutes per IP
exports.loginLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: { message: 'Too many login attempts. Please try again in 15 minutes.' },
});

// Stops bulk account creation
exports.signupLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 10,
  message: { message: 'Too many sign-up attempts from this network. Please try again later.' },
});

// General API limit to slow scraping and abuse
exports.apiLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: 300,
  message: { message: 'Too many requests. Please slow down.' },
});
