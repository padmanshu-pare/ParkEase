require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { init } = require('./sockets');

const PORT = process.env.PORT || 5000;

(async () => {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is missing in server/.env');
  await connectDB();
  const server = http.createServer(app);
  init(server);
  server.listen(PORT, () => console.log(`ParkEase API running on http://localhost:${PORT}`));
})().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
