import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errMsg } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useFacility } from '../../context/FacilityContext';
import { PageHeader, Field, Spinner } from '../../components/common/ui';

function Pricing() {
  const { isAdmin } = useAuth();
  const { selected, selectedId } = useFacility();
  const [rule, setRule] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!selectedId) return;
    setRule(null);
    api.get(`/pricing/${selectedId}`).then((r) => setRule(r.data)).catch((e) => toast.error(errMsg(e)));
  }, [selectedId]);

  if (!selectedId) return <p className="text-sm text-slate-500">Select a facility to see its parking rates.</p>;
  if (!rule) return <Spinner />;
  const set = (k) => (e) => setRule({ ...rule, [k]: e.target.value });
  const num = (k, label, hint) => (
    <Field label={label} hint={hint}><input className="input" type="number" min="0" disabled={!isAdmin} value={rule[k]} onChange={set(k)} /></Field>
  );

  const save = async (e) => {
    e.preventDefault(); setBusy(true);
    try { setRule((await api.put(`/pricing/${selectedId}`, rule)).data); toast.success('Parking rates saved'); }
    catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={save} className="card p-6">
      <h2 className="font-bold text-slate-900">Parking rates</h2>
      <p className="mb-5 text-sm text-slate-500">{selected?.name}{isAdmin ? '' : ' (only the admin can change rates)'}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Charging method">
          <select className="input" disabled={!isAdmin} value={rule.rateType} onChange={set('rateType')}>
            <option value="hourly">Hourly rate</option><option value="fixed">Fixed rate for the first hours</option>
          </select>
        </Field>
        {num('baseHours', 'First block of hours', 'Hours covered before the additional rate applies')}
        {rule.rateType === 'hourly' ? num('hourlyRate', 'Hourly rate (₹)') : num('fixedRate', 'Fixed rate (₹)', 'Charged for the first block of hours')}
        {num('additionalHourlyRate', 'Additional hourly rate (₹)', '0 = same as the hourly rate')}
        {num('graceMinutes', 'Grace period (minutes)', 'No charge if the vehicle leaves within this time')}
        {num('reservationFee', 'Reservation fee (₹)', 'Used by online booking in the next phase')}
      </div>
      {isAdmin && <button className="btn-primary mt-6" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Save rates</button>}
    </form>
  );
}

function Password() {
  const [f, setF] = useState({ currentPassword: '', newPassword: '' });
  const [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault(); setBusy(true);
    try { await api.put('/auth/password', f); toast.success('Password updated'); setF({ currentPassword: '', newPassword: '' }); }
    catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={save} className="card p-6">
      <h2 className="mb-5 font-bold text-slate-900">Change password</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Current password"><input className="input" type="password" required value={f.currentPassword} onChange={(e) => setF({ ...f, currentPassword: e.target.value })} /></Field>
        <Field label="New password" hint="At least 6 characters"><input className="input" type="password" required minLength={6} value={f.newPassword} onChange={(e) => setF({ ...f, newPassword: e.target.value })} /></Field>
      </div>
      <button className="btn-primary mt-6" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Update password</button>
    </form>
  );
}

export default function Settings() {
  return (
    <>
      <PageHeader title="Settings" />
      <div className="max-w-3xl space-y-6"><Pricing /><Password /></div>
    </>
  );
}
