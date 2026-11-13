// Shown wherever a payment is involved, so nobody thinks real money is being charged
export default function DemoBanner() {
  return (
    <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
      Demo payments: nothing is charged. Real online payments will be added before go-live.
    </div>
  );
}
