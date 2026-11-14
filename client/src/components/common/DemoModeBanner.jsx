// Shown to visitors on the demo account. The server blocks every change, so this is only a reminder.
export default function DemoModeBanner() {
  return (
    <div className="mb-4 rounded-lg border border-blue-300 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">
      Demo mode: this is a read-only sample facility. Changes are turned off, and the sample resets every night.
    </div>
  );
}
