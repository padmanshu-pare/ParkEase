import { categoryInfo } from '../../utils/indianPlate';

// Shows a number plate with the colours used on Indian plates for that category
export default function PlateChip({ reg, category = 'private', size = 'md' }) {
  const c = categoryInfo(category);
  const pad = size === 'lg' ? 'px-4 py-1.5 text-lg' : 'px-2.5 py-0.5 text-sm';
  return (
    <span
      className={`inline-block rounded-md border-2 font-mono font-extrabold tracking-widest ${pad}`}
      style={{ background: c.bg, color: c.fg, borderColor: c.border }}
      title={c.label}
    >
      {reg}
    </span>
  );
}
