import { Link } from 'react-router-dom';
import { ParkingSquare } from 'lucide-react';

// DRAFT text. Replace the [bracketed] placeholders and get a lawyer to review before going live.
const DOCS = {
  privacy: {
    title: 'Privacy Policy',
    sections: [
      { h: 'What we collect', p: ['When you create a driver account: your name, email, and optional phone number, and your password (stored only as a one-way hash).', 'When you save a vehicle or book a slot: the vehicle number and an optional label.', 'When you park: the vehicle number, entry and exit times, the slot used, and the amount and payment method. Parking records may include the owner name and phone if the manager enters them.'] },
      { h: 'Why we use it', p: ['To create and secure your account, to take and manage your bookings, to show live availability, to calculate and record parking charges, and to meet tax and audit requirements.'] },
      { h: 'How long we keep it', p: ['Parking records and payments are kept for 365 days. After that, personal contact details (owner name and phone) are removed from those records. Plate numbers and amounts are kept for accounting.', 'Bookings that were never used are marked expired. Your account details stay until you delete your account.'] },
      { h: 'Your rights', p: ['You can view and change your name and phone in your profile, manage your saved vehicles, and delete your account from the Profile page. Deleting your account cancels your upcoming bookings and removes your personal details.', 'For other requests, contact [contact email].'] },
      { h: 'Who we share it with', p: ['We do not sell your data. Hosting providers (Vercel, Render, MongoDB Atlas) process data on our behalf. Payment providers will receive payment details once online payments are enabled.'] },
      { h: 'Security', p: ['Passwords are hashed. Data is sent over HTTPS. Access to the manager panel is limited by role.'] },
      { h: 'Children', p: ['You must be 18 or older to create a driver account. If you are a parent or guardian and believe a minor has an account, contact [contact email].'] },
    ],
  },
  terms: {
    title: 'Terms of Service',
    sections: [
      { h: 'Using ParkEase', p: ['ParkEase lets drivers book parking slots at participating facilities, and lets facility staff manage parking. You agree to give accurate information and to keep your password private.'] },
      { h: 'Bookings', p: ['A booking reserves a slot for the time you choose, for the vehicle you saved. You must arrive within the booked time. The facility may refuse entry to a vehicle that does not match its booking.'] },
      { h: 'Cancellations', p: ['You can cancel a booking up to 1 hour before its start time. See the Refund Policy for payment rules.'] },
      { h: 'Facility rules', p: ['Each facility sets its own rules, opening hours, and charges. Follow the instructions of the facility staff while on the premises.'] },
      { h: 'Limitation of liability', p: ['ParkEase is a booking and management tool. To the extent allowed by law, we are not liable for loss or damage to vehicles or belongings at a facility.'] },
      { h: 'Changes and termination', p: ['We may update these terms and will show the new version in the app. We may suspend accounts that misuse the service.'] },
      { h: 'Governing law', p: ['These terms are governed by the laws of India. Courts at [city] have jurisdiction.'] },
    ],
  },
  refund: {
    title: 'Refund and Cancellation Policy',
    sections: [
      { h: 'Cancelling a booking', p: ['You can cancel a booking from My bookings up to 1 hour before its start time. The slot is released immediately.', 'Bookings cannot be cancelled within 1 hour of the start time, or after the start time.'] },
      { h: 'Booking fees', p: ['Where a booking fee applies, it is refunded in full when you cancel within the allowed time. Refunds go back to the original payment method within [number] working days.'] },
      { h: 'No-shows', p: ['If you do not arrive, the booking is marked expired at its end time. No refund is given for expired bookings where a fee was paid.'] },
      { h: 'Parking charges', p: ['Parking charges are calculated from your actual time in the slot, using the facility rate, after the grace period. They are not refunded for early exit unless the facility decides otherwise.'] },
    ],
  },
};

export default function Legal({ kind }) {
  const doc = DOCS[kind];
  if (!doc) return <p className="p-8">Page not found.</p>;
  return (
    <div className="min-h-full bg-slate-50">
      <header className="flex items-center justify-between bg-navy-900 px-6 py-4 text-white">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600"><ParkingSquare className="h-5 w-5" /></span>
          <span className="text-lg font-extrabold">ParkEase</span>
        </Link>
        <nav className="flex gap-4 text-sm font-semibold">
          <Link to="/privacy" className="hover:underline">Privacy</Link>
          <Link to="/terms" className="hover:underline">Terms</Link>
          <Link to="/refund" className="hover:underline">Refunds</Link>
        </nav>
      </header>
      <main className="mx-auto max-w-3xl p-6">
        <p className="mb-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">Draft text. It must be reviewed by a qualified lawyer before it is published.</p>
        <h1 className="mb-6 text-3xl font-extrabold tracking-tight text-slate-900">{doc.title}</h1>
        <div className="space-y-6">
          {doc.sections.map((s) => (
            <section key={s.h}>
              <h2 className="mb-2 text-lg font-bold text-slate-900">{s.h}</h2>
              {s.p.map((para, i) => <p key={i} className="mb-2 leading-relaxed text-slate-700">{para}</p>)}
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
