import { useCallback, useEffect, useState } from 'react';
import { Download, Search, History as HistoryIcon, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errMsg } from '../../services/api';
import { useFacility } from '../../context/FacilityContext';
import { PageHeader, Badge, Pagination, Empty, Spinner, NoFacility } from '../../components/common/ui';
import { fmtDateTime, fmtDuration, money } from '../../utils/format';

const TABS = [['', 'All'], ['active', 'Currently parked'], ['completed', 'Completed']];

const SORT_OPTIONS = [
  ['entry:desc', 'Newest entry first'],
  ['entry:asc', 'Oldest entry first'],
  ['amount:desc', 'Amount: high to low'],
  ['amount:asc', 'Amount: low to high'],
  ['duration:desc', 'Duration: longest first'],
  ['duration:asc', 'Duration: shortest first'],
  ['payment:asc', 'Payment type: A to Z'],
  ['payment:desc', 'Payment type: Z to A'],
  ['vehicle:asc', 'Vehicle number: A to Z'],
];

// Column headers that can be sorted (key matches the server's SORT_FIELDS)
const SORTABLE = { vehicle: 'Vehicle', exit: 'Exit', entry: 'Entry', duration: 'Duration', amount: 'Amount', payment: 'Payment' };

export default function History() {
  const { selectedId } = useFacility();
  const [f, setF] = useState({ status: '', regNumber: '', from: '', to: '', sort: 'entry', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);

  const params = useCallback(() => ({ facility: selectedId, ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)) }), [selectedId, f]);

  useEffect(() => {
    if (!selectedId) return undefined;
    setData(null);
    const t = setTimeout(() => {
      api.get('/records', { params: { ...params(), page } }).then((r) => setData(r.data)).catch((e) => toast.error(errMsg(e)));
    }, 250);
    return () => clearTimeout(t);
  }, [selectedId, params, page]);

  const set = (patch) => { setF({ ...f, ...patch }); setPage(1); };

  // Click a header: first click sorts descending, second click ascending
  const sortBy = (key) => set({ sort: key, dir: f.sort === key && f.dir === 'desc' ? 'asc' : 'desc' });

  const arrow = (key) => {
    if (f.sort !== key) return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />;
    return f.dir === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
  };

  const exportCsv = async () => {
    try {
      const res = await api.get('/records/export', { params: params(), responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = 'parking-records.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { toast.error(errMsg(e)); }
  };

  if (!selectedId) return <NoFacility />;

  return (
    <>
      <PageHeader title="Parking history" subtitle="Every entry and exit for this facility.">
        <button className="btn-secondary" onClick={exportCsv}><Download className="h-4 w-4" />Export CSV</button>
      </PageHeader>

      <div className="mb-4 flex gap-1 rounded-lg bg-slate-100 p-1 sm:w-fit">
        {TABS.map(([v, l]) => (
          <button key={v} onClick={() => set({ status: v })} className={`rounded-md px-4 py-1.5 text-sm font-bold ${f.status === v ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'}`}>{l}</button>
        ))}
      </div>

      <div className="card mb-5 flex flex-wrap items-end gap-3 p-4">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input className="input pl-9 font-mono uppercase" placeholder="Search vehicle number" value={f.regNumber} onChange={(e) => set({ regNumber: e.target.value })} aria-label="Search vehicle number" />
        </div>
        <label className="text-xs font-semibold text-slate-500">From<input type="date" className="input mt-1" value={f.from} onChange={(e) => set({ from: e.target.value })} /></label>
        <label className="text-xs font-semibold text-slate-500">To<input type="date" className="input mt-1" value={f.to} onChange={(e) => set({ to: e.target.value })} /></label>
        <label className="text-xs font-semibold text-slate-500">Sort by
          <select
            className="input mt-1 !w-auto min-w-[220px]"
            value={`${f.sort}:${f.dir}`}
            onChange={(e) => { const [sort, dir] = e.target.value.split(':'); set({ sort, dir }); }}
          >
            {SORT_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
      </div>

      <div className="card overflow-hidden">
        {!data ? <div className="grid place-items-center py-16"><Spinner /></div> : data.items.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px]">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    {Object.entries(SORTABLE).map(([key, label]) => (
                      <th key={key} className="th">
                        <button className="inline-flex items-center gap-1.5 hover:text-slate-800" onClick={() => sortBy(key)}>
                          {label}{arrow(key)}
                        </button>
                      </th>
                    ))}
                    <th className="th">Slot</th>
                    <th className="th">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-50">
                      <td className="td"><span className="plate">{r.regNumber}</span>{r.ownerName && <p className="mt-1 text-xs text-slate-400">{r.ownerName}</p>}</td>
                      <td className="td text-slate-600">{fmtDateTime(r.entryTime)}</td>
                      <td className="td text-slate-600">{fmtDateTime(r.exitTime)}</td>
                      <td className="td text-slate-600">{fmtDuration(r.durationMinutes)}</td>
                      <td className="td font-bold">{r.status === 'completed' ? money(r.amount) : '—'}</td>
                      <td className="td">{r.payment ? <span className="text-xs font-semibold uppercase text-slate-600">{r.payment.method}</span> : '—'}</td>
                      <td className="td text-slate-600">{r.floor?.name} · {r.slot?.name}</td>
                      <td className="td"><Badge status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={data.page} pages={data.pages} onChange={setPage} />
          </>
        ) : <Empty icon={HistoryIcon} title="No records match">Try a different vehicle number or date range.</Empty>}
      </div>
    </>
  );
}
