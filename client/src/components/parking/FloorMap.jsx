import { useEffect, useState } from 'react';
import api, { errMsg } from '../../services/api';
import LayoutViewer from './LayoutViewer';
import { Spinner, Empty, SlotLegend } from '../common/ui';
import { PencilRuler } from 'lucide-react';

// Fetches a floor's published layout + live slots and renders them. Re-fetches when refreshKey changes.
export default function FloorMap({ floorId, refreshKey = 0, onSlotClick, selectedSlotId, selectableStatuses, legend = true }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!floorId) return undefined;
    let alive = true;
    Promise.all([api.get(`/layouts/${floorId}`), api.get('/slots', { params: { floor: floorId } })])
      .then(([l, s]) => alive && (setData({ layout: l.data, slots: s.data }), setError('')))
      .catch((e) => alive && setError(errMsg(e)));
    return () => { alive = false; };
  }, [floorId, refreshKey]);

  if (error) return <p className="py-8 text-center text-sm text-red-600">{error}</p>;
  if (!data) return <div className="grid place-items-center py-16"><Spinner /></div>;

  const els = data.layout.publishedElements || [];
  if (!els.length) {
    return <Empty icon={PencilRuler} title="No published layout for this floor">Design the floor in Layout designer and publish it to see slots here.</Empty>;
  }
  const slotByElement = Object.fromEntries(data.slots.map((s) => [s.elementId, s]));
  return (
    <div className="space-y-3">
      {legend && <SlotLegend />}
      <LayoutViewer elements={els} canvas={data.layout.canvas} slotByElement={slotByElement} onSlotClick={onSlotClick} selectedSlotId={selectedSlotId} selectableStatuses={selectableStatuses} />
    </div>
  );
}
