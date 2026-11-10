# ParkEase — Smart Parking Management System

**MERN stack · Phase 1: Manager Panel** (backend + frontend)

Phase 1 covers everything a parking owner/manager needs to run a facility day to day.
Driver Portal, online reservations, live public availability page, Razorpay and Reports come in Phase 2.

## What is in Phase 1

| Module | Status |
| --- | --- |
| 1. Authentication (JWT, bcrypt, role-based access, manager management) | Done (driver sign-up comes with Phase 2) |
| 2. Parking facilities and floors | Done |
| 3. Visual layout designer (React Konva) | Done |
| 4. Slot management (status, filters, search) | Done |
| 5. Manager dashboard (live updates through Socket.IO) | Done |
| 6. Vehicle entry with number plate OCR (Tesseract.js) | Done |
| 7. Vehicle exit, fee calculation, checkout | Done |
| 11. Parking fee rules, offline payment recording | Done |
| 12. Parking history, CSV export | Done |
| 10. Payments | Offline payments (cash/UPI/card) done. Gateway layer is a **mock** (`server/services/paymentGateway.js`) |
| 8, 9, 13 and the Driver Portal | Phase 2 (data model for reservations already exists) |

## Setup

You need Node.js 18+ and a MongoDB Atlas cluster.

### 1. MongoDB Atlas
1. Create a free cluster, then **Database Access** → add a database user.
2. **Network Access** → add your current IP (or `0.0.0.0/0` while developing).
3. **Connect → Drivers** → copy the connection string.

### 2. Backend
```bash
cd server
npm install
cp .env.example .env      # then edit MONGO_URI and JWT_SECRET
npm run seed              # creates demo admin, manager, a facility with 2 floors and 40 slots
npm run dev               # http://localhost:5000
```

### 3. Frontend
```bash
cd client
npm install
cp .env.example .env      # defaults point to localhost:5000
npm run dev               # http://localhost:5173
```

### Demo logins (from the seed script)
| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@parkease.com | Admin@123 |
| Manager | manager@parkease.com | Manager@123 |

Change these passwords from **Settings** after your first login.

## How the main flows work

**Set up a facility (admin):** Facilities → Add facility → Floors → add floors → Layout designer → add slots, roads and gates → **Publish**. Publishing creates the real parking slots.

**Vehicle entry:** Capture/upload plate → OCR fills the number → verify → tap the slot on the live floor plan → Confirm entry. The slot is claimed atomically, so two managers can never park into the same slot, and a vehicle cannot have two active records (enforced by a unique partial index).

**Vehicle exit:** Scan or pick the vehicle → charges are calculated from the facility's pricing rule → choose cash/UPI/card → confirm. The amount is always recalculated on the server at checkout.

## Fee calculation
- Within the grace period: free.
- **Hourly:** first block of hours at the hourly rate, extra hours at the additional rate (or the hourly rate if 0).
- **Fixed:** fixed price for the first block of hours, extra hours at the additional rate.
- Part hours are rounded up.

## Notes
- Password hashing uses `bcryptjs` (same algorithm as `bcrypt`, no native build step, easier on Windows).
- Number plate OCR runs in the browser. Tesseract downloads its language data on first use, so the first scan needs internet and is slower. Clear, straight-on, well-lit photos work best; the manager always verifies the number.
- Camera capture (`capture="environment"`) works on phones; on desktop it opens the file picker.
- Real-time events only tell clients to refetch; they carry no vehicle data.

## Moving to Razorpay in Phase 2
Implement `createOrder` and `verifyPayment` in `server/services/paymentGateway.js` with the Razorpay SDK, add a webhook route that verifies the signature, and keep the secret keys in `.env`.

## Folder structure
```
ParkEase/
├── client/   React + Vite + Tailwind (pages/manager, pages/admin, components, context, services)
└── server/   Express + Mongoose (models, controllers, routes, middleware, services, sockets)
```
