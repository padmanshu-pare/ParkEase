import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errMsg } from '../../services/api';
import { useFacility } from '../../context/FacilityContext';
import { PageHeader, Spinner, Empty, Pagination } from '../../components/common/ui';
import { fmtDateTime, money } from '../../utils/format';

const ACTIONS = [
  ['', 'All actions'], ['vehicle.', 'Entries and exits'], ['pricing.', 'Rate changes'],
  ['booking.', 'Bookings and refunds'], ['ops.', 'Undos'], ['layout.', 'Layouts'], ['slot.', 'Slot changes'],
  ['driver.', 'Driver accounts'], ['auth.', 'Logins'],
];
const ROLE = { admin: 'Admin', manager: 'Manager', driver: 'Driver' };

export default function AuditLog() {
  const { selectedId } = useFacility() || {};
  const [f, setF] = useState({ action: '', from: '', to: '', thisFacility: true });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);

  const load = useCallback(() => {
    const params = { page };
    if (f.thisFacility && selectedId) params.facility = selectedId;
    if (f.action) params.action = f.action;
    if (f.from) params.from = f.from;
    if (f.to) params.to = f.to;
    api.get('/audit', { params }).then((r) => setData(r.data)).catch((e) => toast.error(errMsg(e)));
  }, [f, page, selectedId]);

  useEffect(() => { load(); }, [load]);

  const set = (patch) => { setF({ ...f, ...patch }); setPage(1); };

  return (
    <div>
      <PageHeader title="Audit log" subtitle="Who did what, and when. Entries cannot be edited or deleted." />

      <div className="card mb-5 flex flex-wrap items-end gap-3 p-4">
        <label className="text-xs font-semibold text-slate-500">Action
          <select className="input mt-1 !w-auto min-w-[200px]" value={f.action} onChange={(e) => set({ action: e.target.value })}>
            {ACTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-500">From<input type="date" className="input mt-1" value={f.from} onChange={(e) => set({ from: e.target.value })} /></label>
        <label className="text-xs font-semibold text-slate-500">To<input type="date" className="input mt-1" value={f.to} onChange={(e) => set({ to: e.target.value })} /></label>
        <label className="flex items-center gap-2 pb-2 text-sm text-slate-600">
          <input type="checkbox" checked={f.thisFacility} onChange={(e) => set({ thisFacility: e.target.checked })} />
          Only the selected facility
        </label>
      </div>

      <div className="card overflow-hidden">
        {!data ? <div className="grid place-items-center py-16"><Spinner /></div> : data.items.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">When</th>
                    <th className="px-4 py-3">Who</th>
                    <th className="px-4 py-3">What</th>
                    <th className="px-4 py-3">Details</th>
                    <th className="px-4 py-3">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((a) => (
                    <tr key={a._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">{fmtDateTime(a.createdAt)}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{a.actorName || a.actorEmail || 'Unknown'}</p>
                        <p className="text-xs text-slate-500">{ROLE[a.actorRole] || ''}{a.actorEmail && a.actorName ? ` · ${a.actorEmail}` : ''}</p>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{a.label || a.action}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {a.details?.regNumber && <span className="font-mono text-xs">{a.details.regNumber}</span>}
                        {typeof a.details?.amount === 'number' && <span className="ml-2 font-semibold">{money(a.details.amount)}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${a.status < 300 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          {a.status < 300 ? 'Done' : a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={data.page} pages={data.pages} onChange={setPage} />
          </>
        ) : <Empty icon={ShieldCheck} title="No activity yet">Actions appear here as staff use the app.</Empty>}
      </div>
    </div>
  );
}
