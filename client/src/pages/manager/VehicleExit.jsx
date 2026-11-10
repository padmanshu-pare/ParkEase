import { useCallback, useEffect, useState } from 'react';
import { Search, RefreshCw, Loader2, Car } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errMsg } from '../../services/api';
import { useFacility } from '../../context/FacilityContext';
import useLiveAvailability from '../../hooks/useLiveAvailability';
import PlateScanner from '../../components/vehicles/PlateScanner';
import Receipt from '../../components/vehicles/Receipt';
import { PageHeader, Field, NoFacility, Empty } from '../../components/common/ui';
import { normalizeReg, fmtDateTime, fmtDuration, money } from '../../utils/format';

const METHODS = [['cash', 'Cash'], ['upi', 'UPI'], ['card', 'Card']];

export default function VehicleExit() {
  const { selectedId, reload } = useFacility();
  const [reg, setReg] = useState('');
  const [parked, setParked] = useState([]);
  const [found, setFound] = useState(null);
  const [method, setMethod] = useState('cash');
  const [txn, setTxn] = useState('');
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const loadParked = useCallback(() => {
    if (!selectedId) return;
    api.get('/records', { params: { facility: selectedId, status: 'active', limit: 100 } }).then((r) => setParked(r.data.items)).catch(() => {});
  }, [selectedId]);
  useEffect(() => { setFound(null); loadParked(); }, [loadParked]);
  useLiveAvailability(selectedId, loadParked);

  const lookup = async (e, forced) => {
    e?.preventDefault();
    const number = normalizeReg(forced || reg);
    if (number.length < 5) return toast.error('Enter the vehicle number');
    try {
      const { data } = await api.get('/records/lookup', { params: { regNumber: number } });
      if (data.record.facility._id !== selectedId) toast(`Note: this vehicle is parked at ${data.record.facility.name}`, { icon: 'ℹ️' });
      setFound(data); setMethod('cash'); setTxn('');
    } catch (err) { setFound(null); toast.error(errMsg(err)); }
  };

  const refresh = async () => {
    try { const { data } = await api.get(`/records/${found.record._id}/active`); setFound(data); } catch (err) { toast.error(errMsg(err)); }
  };

  const checkout = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/records/${found.record._id}/exit`, { method, transactionId: txn || undefined });
      setReceipt(data); setFound(null); setReg(''); loadParked(); reload();
    } catch (err) { toast.error(errMsg(err)); loadParked(); }
    finally { setBusy(false); }
  };

  if (!selectedId) return <NoFacility />;
  const r = found?.record;

  return (
    <>
      <PageHeader title="Vehicle exit" subtitle="Scan or enter the vehicle number, check the charges and confirm checkout." />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-1">
          <form onSubmit={lookup} className="card space-y-4 p-5">
            <PlateScanner onDetected={(p) => { setReg(p); lookup(null, p); }} />
            <Field label="Vehicle number">
              <input className="input font-mono text-base font-bold uppercase tracking-wider" value={reg} onChange={(e) => setReg(e.target.value.toUpperCase())} placeholder="MP17AB1234" />
            </Field>
            <button className="btn-primary w-full"><Search className="h-4 w-4" />Find vehicle</button>
          </form>

          <div className="card overflow-hidden">
            <h2 className="border-b border-slate-200 px-5 py-3 text-sm font-bold text-slate-900">Currently parked ({parked.length})</h2>
            <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
              {parked.map((p) => (
                <li key={p._id}>
                  <button className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-slate-50" onClick={() => { setReg(p.regNumber); lookup(null, p.regNumber); }}>
                    <span className="plate">{p.regNumber}</span>
                    <span className="text-xs text-slate-500">{p.floor?.name} · {p.slot?.name}</span>
                  </button>
                </li>
              ))}
              {!parked.length && <li className="px-5 py-6 text-center text-sm text-slate-500">No vehicles are parked right now.</li>}
            </ul>
          </div>
        </div>

        <div className="xl:col-span-2">
          {!found ? (
            <div className="card"><Empty icon={Car} title="No vehicle selected">Find a vehicle by number plate, or pick one from the parked list.</Empty></div>
          ) : (
            <div className="card p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="plate text-xl">{r.regNumber}</span>
                  <p className="mt-2 text-sm text-slate-500">{r.ownerName || 'Owner not recorded'}{r.ownerPhone ? ` · ${r.ownerPhone}` : ''}</p>
                </div>
                <button className="btn-ghost btn-sm" onClick={refresh}><RefreshCw className="h-4 w-4" />Refresh charges</button>
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[['Parked at', `${r.floor?.name} · ${r.slot?.name}`], ['Entry', fmtDateTime(r.entryTime)], ['Duration', fmtDuration(found.minutes)], ['Facility', r.facility?.name]].map(([k, v]) => (
                  <div key={k}><dt className="text-xs font-semibold text-slate-500">{k}</dt><dd className="mt-0.5 text-sm font-bold text-slate-900">{v}</dd></div>
                ))}
              </dl>

              <div className="mt-6 rounded-xl bg-slate-50 p-5">
                <div className="flex items-baseline justify-between"><span className="font-bold text-slate-700">Amount to collect</span><span className="text-3xl font-extrabold text-slate-900">{money(found.amount)}</span></div>
                <ul className="mt-2 space-y-0.5 text-xs text-slate-500">{found.breakdown.map((b) => <li key={b}>{b}</li>)}</ul>
                <p className="mt-2 text-xs text-slate-400">The final amount is recalculated at the moment you confirm checkout.</p>
              </div>

              {found.amount > 0 && (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <span className="label">Payment method</span>
                    <div className="flex gap-2">
                      {METHODS.map(([v, l]) => (
                        <button key={v} type="button" onClick={() => setMethod(v)} className={`flex-1 rounded-lg border px-3 py-2 text-sm font-bold ${method === v ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{l}</button>
                      ))}
                    </div>
                  </div>
                  {method !== 'cash' && <Field label="Transaction / reference no. (optional)"><input className="input" value={txn} onChange={(e) => setTxn(e.target.value)} /></Field>}
                </div>
              )}

              <button className="btn-primary mt-6 w-full py-3 text-base" onClick={checkout} disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}{found.amount > 0 ? `Confirm checkout · collect ${money(found.amount)}` : 'Confirm checkout (no charge)'}
              </button>
            </div>
          )}
        </div>
      </div>
      <Receipt data={receipt} onClose={() => setReceipt(null)} />
    </>
  );
}
