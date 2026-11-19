# ParkEase: Smart Parking Management System

ParkEase is a full-stack web application for running parking facilities. It shows which slots are free in real time, records vehicles coming in and going out (by number plate, with a camera or by typing), calculates fees automatically, takes driver bookings in advance, and keeps a complete audit trail of who did what.

Built with the MERN stack (MongoDB, Express.js, React.js, Node.js), with Socket.IO for live updates.

**Live app:** https://park-ease-henna.vercel.app
**Pitch site:** https://parkease-site.vercel.app

---

## Who uses it

| User | Where | What they do |
|---|---|---|
| Admin | Manager panel | Creates facilities and floors, manages managers and drivers, sees the full audit log |
| Manager | Manager panel | Designs layouts, records entry and exit, watches live status, handles payments and reports |
| Driver | Driver portal | Signs up, saves vehicles, books a time window, pays, cancels, downloads own data |
| Visitor | Public page | Sees live free-slot counts, no login needed |

---

## Features

### Manager panel
- **Login and roles:** JWT login, admin and manager roles, login rate limiting. Deactivated accounts are blocked on every request.
- **Facilities and floors:** several facilities, floors, opening hours, pricing rule, activate or deactivate.
- **Layout designer:** drag-and-drop floor plan (slots, roads, gates, arrows). Move, resize, rotate, duplicate, bulk-name slots (A01, A02...), copy from another floor, add floors. Save as draft, publish to create live slots.
- **Live dashboard:** stats, floor-wise availability, live floor plan, recent activity. Updates over Socket.IO.
- **Slots:** filter by status, search, grid and map views, manual status change.
- **Vehicle entry:**
  - Type the number, or read it from a camera (one photo, read once) or an uploaded photo.
  - Plate is checked for a valid Indian format (state code, BH series).
  - **Auto-assign:** the system picks a free slot, or the slot booked for that vehicle. The car is entered automatically once the plate is read (can be turned off).
  - Manual slot selection on the map is still available.
  - Entry is blocked if a booking holds that slot in the next 3 hours.
- **Vehicle exit:** find by plate or from the parked list, see the server-calculated charge, choose cash, UPI, card or online, print a receipt, send it on WhatsApp.
- **Receipt:** styled checkout receipt, A5 print (portrait or landscape), WhatsApp link to send it.
- **Fees:** hourly or fixed rate, grace period, extra-hour rate, part hours rounded up. Always calculated on the server.
- **History:** filters (status, plate, dates), sort by time, amount, duration, payment type. CSV export.
- **Payments:** totals and breakdown by method, click any payment to see the car's visit (came in, left, time parked, slot, booking, owner).
- **Reservations:** day view of bookings. Unpaid bookings hold a slot for 15 minutes.
- **Alerts:** live warnings (car parked over 3 hours, bookings waiting for payment, facility almost full).
- **Undo:** an entry or exit can be undone within 60 seconds.
- **Keyboard shortcuts:** Alt+N new entry, Alt+X exit, Alt+D dashboard, Alt+S slots, Alt+H history, Alt+P payments, Alt+R reservations, Alt+/ show list.
- **Audit log:** every entry, exit, undo, rate change, booking payment or cancellation, layout publish, slot change, driver change and login is recorded with who, when, and where. Read-only.
- **Dark mode:** toggle in the sidebar, remembered on each device.

### Driver portal
- Sign-up with consent (privacy policy, terms, refund policy), login.
- Saved vehicles (up to 5).
- Find parking: facility list with live free counts, search.
- Book a time window (30 minutes to 12 hours, up to 30 days ahead), the vehicle must be saved on the profile, facility opening hours are checked.
- Pay for the booking (demo payment for now). Unpaid bookings release the slot after 15 minutes.
- Cancel up to 1 hour before the start time (refund if paid).
- Download own data (JSON). Delete account (upcoming bookings cancelled, personal details removed).

### Admin
- Facilities and floors, managers (create, edit, facilities, reset), drivers (activate or deactivate, bookings overview).

### Public page
- Live free counts per facility and floor, with no personal data.

### Demo account
- A read-only demo manager with a sample facility. Every write is blocked on the server. Sample resets every night at 02:00 IST.

---

## Technology

| Layer | Technology |
|---|---|
| Frontend | React, Vite, Tailwind CSS, React Router, React Konva (layout designer), Axios, react-hot-toast, lucide-react |
| Backend | Node.js, Express |
| Database | MongoDB Atlas, Mongoose |
| Real-time | Socket.IO (staff and public namespaces) |
| Auth | JWT, bcryptjs |
| Plate reading | Tesseract.js in the browser, optional server ANPR (Plate Recognizer) |
| Security | helmet, express-rate-limit, express-mongo-sanitize, password policy, role and facility access checks |
| Hosting | Vercel (frontend), Render (backend), MongoDB Atlas (database) |

---

## Project structure

```
ParkEase/
├── client/                      React app
│   ├── vercel.json              SPA routing and security headers
│   └── src/
│       ├── App.jsx              all routes
│       ├── pages/
│       │   ├── manager/         Dashboard, VehicleEntry, VehicleExit, Slots, History,
│       │   │                    Payments, LayoutDesigner, Reservations, AuditLog, Settings, Login
│       │   ├── admin/           Facilities, Managers, Drivers
│       │   ├── driver/          DriverLogin, Facilities, Book, Bookings, Profile
│       │   ├── public/          Availability
│       │   └── legal/           Privacy, Terms, Refund (draft text)
│       ├── components/
│       │   ├── common/          UI kit, DemoModeBanner, ThemeToggle
│       │   ├── layout/          Manager sidebar, driver top bar
│       │   ├── ops/             Alerts, undo, shortcuts
│       │   ├── payments/        Car visit details popup
│       │   ├── vehicles/        Live camera, photo reader, receipt
│       │   └── parking/         Floor map and layout drawing
│       ├── context/             Auth, Facility, Theme
│       ├── hooks/               Live availability feed
│       └── utils/               Plate reading, WhatsApp, formatting, Indian plate rules
└── server/                      Express API
    ├── server.js, app.js        startup, middleware order, routes
    ├── models/                  User, Facility, Floor, ParkingLayout, ParkingSlot,
    │                            ParkingRecord, Vehicle, Reservation, SlotHold, Payment,
    │                            PricingRule, AuditLog
    ├── controllers/             auth, users, facilities, layouts, slots, records (entry and exit),
    │                            payments, pricing, dashboard, reservations, driver, public,
    │                            ops (alerts and undo), audit, plates, payment details
    ├── routes/                  one file per area
    ├── middleware/              auth, error handling, rate limits, demo guard, audit log
    ├── services/                access rules, layout publish, pricing, availability,
    │                            reservations (holds, payment, cancel), payment gateway (demo),
    │                            background jobs, password policy
    ├── sockets/                 live updates
    ├── utils/                   seed, demo seed, audit backfill, plate and HTTP helpers
    └── tests/                   unit tests (node:test)
```

---

## Setup (local)

You need Node.js 18 or newer, and a MongoDB Atlas database.

### Server
```bash
cd server
npm install
cp .env.example .env         # Windows: copy .env.example .env
```
Fill in `server/.env`:
- `MONGO_URI`: your Atlas connection string (special characters in the password must be URL-encoded)
- `JWT_SECRET`: a long random string
- `CLIENT_URL`: `http://localhost:5173`

Then:
```bash
npm run seed          # demo admin, manager, facility and slots
npm run seed:demo     # read-only demo account (needs DEMO_PASSWORD set)
npm run dev           # http://localhost:5000
npm test              # unit tests
```

### Client
```bash
cd client
npm install
cp .env.example .env
npm run dev           # http://localhost:5173
```
Fill in `client/.env`:
- `VITE_API_URL=http://localhost:5000/api`
- `VITE_SOCKET_URL=http://localhost:5000`

Check the server: `http://localhost:5000/api/health` should return `{"ok":true,"app":"ParkEase"}`.

---

## Environment variables

### Server (Render, or `server/.env` locally)
| Variable | Purpose |
|---|---|
| `MONGO_URI` | Atlas connection string (secret) |
| `JWT_SECRET` | Signs login tokens (secret) |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `7d` |
| `CLIENT_URL` | Allowed frontend origin(s), comma-separated, no trailing slash |
| `DEMO_EMAIL` | Demo account email (used by the seed script) |
| `DEMO_PASSWORD` | Demo account password (used by the seed script) |
| `RETENTION_DAYS` | Optional. Days before owner details are removed from old records (default 365) |
| `PLATE_API_TOKEN` | Optional. Plate Recognizer token for server-side number reading |

### Client (Vercel, or `client/.env` locally)
| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Backend API base, e.g. `https://parkease-api-hzv6.onrender.com/api` |
| `VITE_SOCKET_URL` | Backend origin for Socket.IO |
| `VITE_DEMO_EMAIL`, `VITE_DEMO_PASSWORD` | Optional. Shows a "fill demo login" button (the demo account is read-only) |

Rule: any `VITE_` variable is visible in the browser. Never put a secret in one.

---

## Scripts

| Where | Command | What it does |
|---|---|---|
| server | `npm run dev` | Start the API with auto-restart |
| server | `npm start` | Start the API |
| server | `npm test` | Run unit tests |
| server | `npm run seed` | Create demo admin, manager, facility, slots |
| server | `npm run seed:demo` | Create the read-only demo account and sample facility |
| server | `npm run audit:backfill` | Add audit entries for activity from before the audit log existed |
| client | `npm run dev` | Start the frontend |
| client | `npm run build` | Build for production (output in `dist/`) |

---

## Deploy

- **Backend (Render):** root directory `server`, build `npm install`, start `node server.js`. Set the server environment variables. Auto-deploys from `main`.
- **Frontend (Vercel):** root directory `client`, framework Vite, output `dist`. Set the `VITE_` variables, then redeploy when they change (they are read at build time). `client/vercel.json` gives SPA routing and security headers.
- **Database:** MongoDB Atlas. Allow Render's IPs (0.0.0.0/0 is used because Render's IP changes). Enable backups.
- **Pitch site:** the `site/` folder, deployed as its own Vercel project with no build step.

Never commit `.env` files. `.gitignore` covers them, and only `.env.example` is tracked.

---

## Security and privacy

- Passwords hashed with bcrypt. Driver passwords: at least 8 characters, a letter and a number, common passwords blocked.
- Login rate limit (10 failed attempts per 15 minutes per IP). General API rate limit. Driver sign-up limit.
- Helmet security headers on the API, and HSTS, frame, referrer and permissions headers on the frontend.
- Role checks on every route. Facility access checks on every staff route. Managers see only their facilities.
- Input: size limit, NoSQL-injection protection, string-only input in driver routes, amounts always calculated on the server.
- Sockets: staff must be active admins or managers, join only their own facilities. Events carry no personal data.
- Privacy: consent is stored with its version. Drivers can download their data and delete their account. Owner details are removed from old records after the retention period.
- Audit log: append-only, no edit or delete route.
- The privacy, terms and refund texts are drafts. They need review by a lawyer before publishing.

---

## Plate reading

- **Browser reader (Tesseract):** works without any account. Reads the centre of the image, tries several image versions and page layouts (single line, two lines, rotated), uses the Indian plate structure to fix common mistakes (O/0, I/1, B/8), and rejects unknown state codes.
- **Server reader (optional):** set `PLATE_API_TOKEN` and the server reads plates with Plate Recognizer, which is much more accurate. The app switches to it automatically.
- Accuracy depends on the camera: plate 1.5 to 3 metres away, straight on, good light, 1080p or better. Staff can always correct the number before the car is entered.

---

## Keyboard shortcuts (manager panel)

Hold Alt and press:

| Key | Action |
|---|---|
| N | New entry |
| X | Exit |
| D | Dashboard |
| S | Slots |
| H | History |
| P | Payments |
| R | Reservations |
| / | Show or hide the list |

---

## Testing

- Unit tests: `cd server && npm test` (password policy, time blocks, opening hours, and more)
- Manual test cases: `TEST_CASES.md` (about 90 cases across login, drivers, bookings, cancellations, public page, entry and exit, admin, layout, fees, live deployment, and security)

---

## Roadmap

| Phase | Scope | Status |
|---|---|---|
| 1. Manager panel | Layouts, entry and exit, fees, history, payments | Done |
| 2. Driver portal | Sign-up, vehicles, bookings, cancellation, public page, admin monitoring | Done |
| 2.x. Operations | Dark mode, sorting, camera and photo reading, auto-assign, auto-enter, WhatsApp receipts, alerts, undo, shortcuts, audit log, demo account | Done |
| 3. Payments | Demo payments are built. Razorpay checkout, webhook, real refunds | In progress |
| 4. Reports | Occupancy trends, revenue by method, peak hours, PDF and Excel export | Planned |
| 5. Hardening | Automated tests in CI, full Content Security Policy, cookie-based login, monitoring, accessibility audit, log retention | Planned |

---

## Status

The manager panel and driver portal are live. Payments are in demo mode, and Razorpay is the next step.