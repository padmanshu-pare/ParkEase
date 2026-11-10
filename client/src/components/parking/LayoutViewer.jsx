import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Group } from 'react-konva';
import { ElementBody, STATUS_STYLE } from './ElementShapes';

// Read-only floor plan coloured by live slot status. Optionally clickable.
export default function LayoutViewer({ elements = [], canvas = { width: 1000, height: 600 }, slotByElement = {}, onSlotClick, selectedSlotId, selectableStatuses }) {
  const box = useRef(null);
  const [width, setWidth] = useState(800);

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    if (box.current) ro.observe(box.current);
    return () => ro.disconnect();
  }, []);

  const scale = Math.max(0.3, width / canvas.width);
  const clickable = (slot) => onSlotClick && slot && (!selectableStatuses || selectableStatuses.includes(slot.status));

  return (
    <div ref={box} className="w-full overflow-hidden rounded-lg border border-slate-200 bg-white" style={{ backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      <Stage width={width} height={canvas.height * scale} scaleX={scale} scaleY={scale}>
        <Layer>
          {elements.map((el) => {
            const slot = el.type === 'slot' ? slotByElement[el.id] : null;
            const isSlot = el.type === 'slot';
            const style = isSlot ? STATUS_STYLE[slot?.status || 'maintenance'] : undefined;
            const can = clickable(slot);
            const selected = slot && String(slot._id) === String(selectedSlotId);
            return (
              <Group
                key={el.id} x={el.x} y={el.y} rotation={el.rotation || 0}
                onClick={() => can && onSlotClick(slot)} onTap={() => can && onSlotClick(slot)}
                onMouseEnter={(e) => { if (can) e.target.getStage().container().style.cursor = 'pointer'; }}
                onMouseLeave={(e) => { e.target.getStage().container().style.cursor = 'default'; }}
              >
                <ElementBody el={el} style={style} dim={Boolean(onSlotClick && isSlot && !can)} />
                {selected && <ElementBody el={{ ...el, label: '' }} style={{ fill: 'rgba(37,99,235,0.18)', stroke: '#2563eb', text: '#2563eb' }} />}
              </Group>
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}
