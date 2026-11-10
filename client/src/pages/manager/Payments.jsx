import { useEffect, useState } from 'react';
import { Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errMsg } from '../../services/api';
import { useFacility } from '../../context/FacilityContext';
import { PageHeader, Badge, Pagination, Empty, Spinner, NoFacility } from '../../components/common/ui';
import { fmtDateTime, money, todayISO } from '../../utils/format';

export default function Payments() {
  const { selectedId } = useFacility();
  const [f, setF] = useState({ from: todayISO(), to: todayISO(), method: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!selectedId) return;
    setData(null);
    api.get('/payments', { params: { facility: selectedId, page, ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)) } })
      .then((r) => setData(r.data)).catch((e) => toast.error(errMsg(e)));
  }, [selectedId, f, page]);

  const set = (p) => { setF({ ...f, ...p }); setPage(1); };
  if (!selectedId) return <NoFacility />;

  return (
    <>
      <PageHeader title="Payments" subtitle="Collections recorded at checkout. Showing today by default." />
      <div className="card mb-5 flex flex-wrap items-end gap-3 p-4">
        <label className="text-xs font-semibold text-slate-500">From<input type="date" className="input mt-1" value={f.from} onChange={(e) => set({ from: e.target.value })} /></label>
        <label className="text-xs font-semibold text-slate-500">To<input type="date" className="input mt-1" value={f.to} onChange={(e) => set({ to: e.target.value })} /></label>
        <label className="text-xs font-semibold text-slate-500">Method
          <select className="input mt-1" value={f.method} onChange={(e) => set({ method: e.target.value })}>
            <option value="">All methods</option>{['cash', 'upi', 'card', 'online'].map((m) => <option key={m} value={m}>{m.toUpperCase()}</option>)}
          </select>
        </label>
      </div>

      {data && (
        <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[['Total collected', data.summary.total], ['Cash', data.summary.cash], ['UPI', data.summary.upi], ['Card', data.summary.card]].map(([l, v]) => (
            <div key={l} className="card p-4"><p className="text-xs font-semibold text-slate-500">{l}</p><p className="mt-1 text-2xl font-extrabold text-slate-900">{money(v)}</p></div>
          ))}
        </div>
      )}

      <div className="card overflow-hidden">
        {!data ? <div className="grid place-items-center py-16"><Spinner /></div> : data.items.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead className="border-b border-slate-200 bg-slate-50"><tr>{['Receipt', 'Vehicle', 'Paid at', 'Method', 'Transaction', 'Amount', 'Status'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50">
                      <td className="td font-mono text-xs">{p.receiptNo}</td>
                      <td className="td"><span className="plate">{p.regNumber}</span></td>
                      <td className="td text-slate-600">{fmtDateTime(p.paidAt)}</td>
                      <td className="td text-xs font-semibold uppercase text-slate-600">{p.method}</td>
                      <td className="td font-mono text-xs text-slate-500">{p.transactionId}</td>
                      <td className="td font-bold">{money(p.amount)}</td>
                      <td className="td"><Badge status={p.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={data.page} pages={data.pages} onChange={setPage} />
          </>
        ) : <Empty icon={Wallet} title="No payments in this range">Payments appear here after a vehicle exit with a charge.</Empty>}
      </div>
    </>
  );
}
