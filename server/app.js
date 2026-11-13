const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const { notFound, errorHandler } = require('./middleware/error');
const { loginLimiter, signupLimiter, apiLimiter } = require('./middleware/rateLimit');

const app = express();

// Render sits behind a proxy, so rate limits must read the real client IP
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Security headers. Cross-origin policy is relaxed because the frontend is on another domain.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

const origins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((s) => s.trim());
app.use(cors({ origin: origins, methods: ['GET', 'POST', 'PUT', 'DELETE'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json({ limit: '300kb' }));

// Strips keys starting with "$" or containing "." from request data (NoSQL injection)
app.use(mongoSanitize());

app.use('/api', apiLimiter);
app.use('/api/auth/login', loginLimiter);
app.use('/api/driver/signup', signupLimiter);

app.get('/api/health', (req, res) => res.json({ ok: true, app: 'ParkEase' }));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/facilities', require('./routes/facilityRoutes'));
app.use('/api/layouts', require('./routes/layoutRoutes'));
app.use('/api/slots', require('./routes/slotRoutes'));
app.use('/api/records', require('./routes/recordRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/pricing', require('./routes/pricingRoutes'));
app.use('/api/reservations', require('./routes/reservationRoutes'));
app.use('/api/driver', require('./routes/driverRoutes'));
app.use('/api/public', require('./routes/publicRoutes'));

app.use(notFound);
app.use(errorHandler);

// Background jobs (no-show expiry, data retention). Not started during tests.
if (process.env.NODE_ENV !== 'test') require('./services/maintenance').start();

module.exports = app;
