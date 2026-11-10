const express = require('express');
const cors = require('cors');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();

const origins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((s) => s.trim());
app.use(cors({ origin: origins }));
app.use(express.json({ limit: '1mb' }));

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

app.use(notFound);
app.use(errorHandler);

module.exports = app;
