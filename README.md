# ParkEase: Smart Parking Management System

ParkEase is a full-stack web application for running parking facilities. It helps a parking operator see which slots are free in real time, record vehicles coming in and going out, calculate parking fees automatically, and keep a history of every vehicle and payment.

The project is built with the MERN stack (MongoDB, Express.js, React.js, Node.js) and uses Socket.IO for live updates.

**Live demo (Phase 1):** https://park-ease-henna.vercel.app

---

## The problem it solves

Most small and mid-sized parking lots still track vehicles on paper or in a register. That makes it hard to know how many slots are free, easy to lose track of who parked where, and slow to bill at exit. Two staff members can also accidentally assign the same slot to different cars.

ParkEase replaces this with a single system where:

- the layout of the parking floor is drawn once and reused,
- every slot has a live status,
- a vehicle is assigned to a slot in a way that cannot be double-booked,
- the fee is calculated by the system, not by hand,
- every record can be searched, filtered, and exported.

---

## Who uses it

**Admin** manages the whole system. Admins create facilities, add floors, create manager accounts, and assign each manager to one or more facilities.

**Manager** runs a facility day to day. Managers record vehicle entry and exit, watch the live floor plan, change slot status, design the layout, record payments, and review history.

---

## Features (Phase 1: Manager Panel)

**Authentication and roles.** Login uses JWT tokens. Access is role-based, so managers cannot open admin pages, and admins can create, edit, and deactivate managers.

**Facilities and floors.** One admin can run several facilities. Each facility has its own opening hours, floors, and pricing rules. Facilities and floors can be activated or deactivated.

**Visual layout designer.** A drag-and-drop canvas built with React Konva. Staff place parking slots, roads, entry and exit gates, and direction arrows. Each element can be moved, resized, rotated, duplicated, or deleted. Slots can be named in bulk (A01, A02, ...). A layout is saved as a draft first and goes live only when published. Publishing creates the real parking slots in the database.

**Slot management.** Slots can be filtered by status, searched by name, and viewed as a grid or on the floor plan. Status can be set manually to available, reserved, or under maintenance.

**Live dashboard.** Four summary cards, floor-wise availability, a live floor plan, and the most recent vehicles and reservations. Updates arrive through Socket.IO, so the screen refreshes without reloading.

**Vehicle entry.** The manager uploads or captures a photo of the number plate. Tesseract.js reads the plate in the browser, and the manager verifies or corrects it. The manager then taps a free slot on the floor plan to confirm entry. Manual entry is also supported.

**Vehicle exit.** The vehicle is found by plate number or from the list of parked vehicles. The system shows the charges, the manager picks cash, UPI, or card, and a receipt is generated.

**Parking fees.** Supports hourly or fixed rates, a grace period, and a different rate for extra hours. Part hours are rounded up. The amount is always recalculated on the server at checkout, so it cannot be changed from the browser.

**History and payments.** Parking history and payments have filters, pagination, a summary, and CSV export.

---

## Planned (Phase 2 and later)

- **Driver portal:** drivers sign up, find parking near them, and reserve a slot in advance.
- **Reservations:** the data model is already in place, and the dashboard and entry screens are being built to use it.
- **Public live availability page:** anyone can see how many slots are free before travelling.
- **Online payments:** Razorpay will replace the current mock payment gateway. The integration point is already isolated in one service file.
- **Reports and analytics:** occupancy trends, revenue summaries, and exportable PDF and Excel reports.
- **Hardening and deployment:** automated tests, input rate limits, and production monitoring.

---
Phase 2: Driver Portal, Reservations, Public Page

Ye phase driver ko system me laata hai. Ab tak sirf manager use karta tha.

Driver portal

Driver khud sign-up karega (email ya phone + password) aur login karega.
Driver profile me apni vehicles (number plate) save kar sakega.
Nearby facilities ya facility list dekhega, aur har facility ki live slot availability.

Reservations

Driver ek facility me time window (start aur end) ke liye slot book karega.
Reservation ka status: pending, confirmed, active, completed, cancelled.
Driver apni reservation cancel kar sakega (cancel policy ke saath).
Manager ke dashboard par aaj ki reservations dikhengi. Jab vehicle aaye, manager reservation ko entry se link karega, aur slot reserved se occupied ho jayega.
Double-booking ek time window me bhi roki jayegi, ye database level par hoga.

Public live availability page

Bina login ke koi bhi dekh sake ki facility me kitne slots free hain.
Ye Socket.IO se live update hoga, aur sirf count dikhega, vehicle ki details nahi.

Admin monitoring

Drivers ki list, kisi ko deactivate karna, aur reservations ka overview.

Milestone: driver sign-up karke reservation kar sake, manager use entry par confirm kar sake, aur public page par availability badle.

Phase 3: Razorpay Payment Gateway
Mock payment (server/services/paymentGateway.js) ko Razorpay SDK se replace karna.
Reservation ke liye online payment (advance ya full), aur exit par online checkout.
Order create karna, client par payment karna, aur server par signature verify karna.
Webhook route jo Razorpay ke signature ko verify kare, taaki payment status reliable ho.
Refund flow cancelled reservations ke liye.
Test mode me pehle test karna, phir live keys.

Milestone: driver online pay karke reservation confirm kare, aur webhook se payment status update ho.

Phase 4: Reports and Analytics
Daily, weekly aur monthly occupancy trends.
Revenue summary (cash, UPI, card, online alag-alag).
Peak hours ka chart, aur slot-wise utilization.
PDF aur Excel export.
Filters: facility, floor, date range.
Charts ke liye Chart.js ya Recharts.

Milestone: admin ek date range select karke PDF ya Excel report download kar sake.

Phase 5: Testing, Hardening, Deployment
Backend ke liye automated tests (fee calculation, double-booking, auth).
Frontend ke liye main flows ke tests.
Security: rate limiting login par, input validation, helmet, CORS ko strict karna.
Logs aur error monitoring.
Production deployment: Render (backend), Vercel (frontend), MongoDB Atlas (database), ya chaho to Razorpay webhook ke liye stable public URL.
Keep-alive ya paid hosting ka decision (abhi free tier par sleep hota hai).
Documentation: README update, API docs.

Milestone: tests pass hon, security checklist complete ho, aur production par bina sleep issue ke chale.

## Technology

| Layer | Technology |
|---|---|
| Frontend | React, Vite, Tailwind CSS, React Konva, React Router |
| Backend | Node.js, Express.js |
| Database | MongoDB (Atlas), Mongoose |
| Real-time | Socket.IO |
| Authentication | JWT, bcryptjs |
| Number plate OCR | Tesseract.js (runs in the browser) |

---

## How it is structured

```
ParkEase/
├── client/    React single-page app
│   └── src/
│       ├── pages/        manager and admin screens
│       ├── components/   shared UI, floor plan, receipt, plate scanner
│       ├── context/      auth and selected-facility state
│       └── services/     API and socket clients
└── server/    Express REST API
    ├── models/           Facility, Floor, ParkingLayout, ParkingSlot, ParkingRecord, Payment, PricingRule, User, Vehicle, Reservation
    ├── controllers/      request handling
    ├── services/         business logic (layout, access control, pricing, payments)
    ├── sockets/          real-time events
    └── middleware/       authentication and role checks
```

---

## Design decisions

**No double booking.** Slot assignment is enforced in the database, not only in the interface. A slot can be claimed by only one vehicle at a time, and a vehicle can have only one active parking record at a time. Two managers acting at the same moment cannot park two cars in the same slot.

**Server-side money.** The fee is always computed on the server from the facility's pricing rule. The client only displays it.

**Layout as draft and publish.** Designing a layout never changes live operations. Only a publish step creates or removes slots, and slots that are occupied or reserved cannot be removed by accident.

**Events carry no sensitive data.** Real-time events only tell clients to refresh their data. They do not send vehicle details over the socket.

**Payment layer is swappable.** All payment logic goes through one service. Replacing the mock gateway with Razorpay changes that file, not the rest of the application.

---

## Status

Phase 1 (manager panel) is complete and deployed. Testing with real facilities and feedback will decide the order of the Phase 2 work.