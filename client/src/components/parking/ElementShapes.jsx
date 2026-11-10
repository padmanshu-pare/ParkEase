import { Rect, Text, Arrow } from 'react-konva';

export const TYPE_STYLE = {
  slot: { fill: '#f1f5f9', stroke: '#94a3b8', text: '#334155' },
  road: { fill: '#e2e8f0', stroke: '#cbd5e1', text: '#64748b' },
  entry: { fill: '#2563eb', stroke: '#1d4ed8', text: '#ffffff' },
  exit: { fill: '#334155', stroke: '#1e293b', text: '#ffffff' },
};

export const STATUS_STYLE = {
  available: { fill: '#dcfce7', stroke: '#16a34a', text: '#14532d' },
  occupied: { fill: '#fee2e2', stroke: '#dc2626', text: '#7f1d1d' },
  reserved: { fill: '#ffedd5', stroke: '#f97316', text: '#7c2d12' },
  maintenance: { fill: '#e2e8f0', stroke: '#64748b', text: '#334155' },
};

// Draws the inside of a layout element. The parent supplies the positioned <Group>.
export function ElementBody({ el, style, dim = false }) {
  if (el.type === 'arrow') {
    return (
      <>
        <Rect width={el.width} height={el.height} fill="transparent" />
        <Arrow points={[8, el.height / 2, el.width - 8, el.height / 2]} stroke="#1e3a8a" fill="#1e3a8a" strokeWidth={4} pointerLength={13} pointerWidth={13} />
      </>
    );
  }
  const s = style || TYPE_STYLE[el.type];
  const text = el.type === 'entry' ? el.label || 'ENTRY' : el.type === 'exit' ? el.label || 'EXIT' : el.label;
  return (
    <>
      <Rect width={el.width} height={el.height} fill={s.fill} stroke={s.stroke} strokeWidth={el.type === 'slot' ? 2 : 1} cornerRadius={el.type === 'slot' ? 5 : 3} opacity={dim ? 0.45 : 1} />
      {text ? (
        <Text text={text} width={el.width} height={el.height} align="center" verticalAlign="middle" fontStyle="bold" fontFamily="Manrope, sans-serif" fontSize={el.type === 'slot' ? 14 : 12} fill={s.text} listening={false} />
      ) : null}
    </>
  );
}
