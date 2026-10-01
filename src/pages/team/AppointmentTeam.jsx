import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSetMobileHeader } from '../../context/MobileHeaderContext';
import { bookingsApi, apiError } from '../../services/bookingsApi';
import Modal from '../../components/Modal';
import StaffAvatar from '../agenda/StaffAvatar';
import { DEFAULT_TZ, btnPrimary, btnSecondary, inputCls, labelCls, staffColors, todayIn } from '../agenda/utils';

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const eur = (n) => `${(n || 0).toLocaleString('es-ES', { minimumFractionDigits: Number.isInteger(n || 0) ? 0 : 2, maximumFractionDigits: 2, useGrouping: 'always' })} €`;
const card = 'bg-white rounded-2xl border border-gray-200';

const PAY_OPTIONS = [
  { key: 'monthly', label: 'Sueldo fijo', hint: 'Un importe al mes', unit: '€ al mes' },
  { key: 'hourly', label: 'Por horas', hint: 'Según las horas de su horario', unit: '€ la hora' },
  { key: 'commission', label: 'Solo comisión', hint: 'Cobra un % de lo que factura', unit: null },
];
const TYPE_FROM_API = { monthly_fixed: 'monthly', hourly: 'hourly', commission_only: 'commission' };

function payText(pay) {
  if (!pay) return 'Sin definir cómo cobra';
  const parts = [];
  if (pay.type === 'monthly_fixed') parts.push(`${eur(pay.amount)}/mes`);
  if (pay.type === 'hourly') parts.push(`${eur(pay.amount)}/hora`);
  if (pay.type === 'commission_only') parts.push('Solo comisión');
  if (pay.commissionPercent) parts.push(`${pay.commissionPercent}% servicios`);
  if (pay.productCommissionPercent) parts.push(`${pay.productCommissionPercent}% productos`);
  return parts.join(' · ');
}

function monthRange(ym) {
  const [y, m] = ym.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return [`${ym}-01`, `${ym}-${String(last).padStart(2, '0')}`];
}
const shiftMonth = (ym, n) => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

function PayModal({ person, onClose, onSaved }) {
  const pay = person.pay;
  const [type, setType] = useState(TYPE_FROM_API[pay?.type] || 'commission');
  const [amount, setAmount] = useState(pay?.amount ? String(pay.amount).replace('.', ',') : '');
  const [commission, setCommission] = useState(pay?.commissionPercent ?? '');
  const [productCommission, setProductCommission] = useState(pay?.productCommissionPercent ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const opt = PAY_OPTIONS.find((o) => o.key === type);

  async function save() {
    setSaving(true);
    setError('');
    try {
      await bookingsApi.setTeamPay(person.id, {
        type,
        amount: type === 'commission' ? 0 : Number(String(amount).replace(',', '.')) || 0,
        commissionPercent: commission === '' ? null : Number(String(commission).replace(',', '.')),
        productCommissionPercent: productCommission === '' ? null : Number(String(productCommission).replace(',', '.')),
      });
      onSaved();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Cómo cobra ${person.name}`} subtitle="Se usa para calcular su coste y lo que deja al negocio." onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {PAY_OPTIONS.map((o) => (
            <button key={o.key} type="button" onClick={() => setType(o.key)}
              className={`text-left rounded-xl border px-3 py-2.5 transition-colors ${type === o.key ? 'border-violet-600 bg-violet-50 ring-1 ring-violet-600' : 'border-gray-200 hover:bg-gray-50'}`}>
              <span className="block text-sm font-semibold text-gray-900">{o.label}</span>
              <span className="block text-xs text-gray-500">{o.hint}</span>
            </button>
          ))}
        </div>
        {opt.unit && (
          <div>
            <label className={labelCls}>Importe ({opt.unit})</label>
            <input className={`${inputCls} text-right tabular-nums`} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={type === 'monthly' ? '1.200' : '10'} />
            {type === 'hourly' && <p className="text-xs text-gray-500 mt-1">Las horas salen de su horario en la agenda.</p>}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Comisión servicios (%)</label>
            <input className={`${inputCls} text-right tabular-nums`} inputMode="decimal" value={commission} onChange={(e) => setCommission(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className={labelCls}>Comisión productos (%)</label>
            <input className={`${inputCls} text-right tabular-nums`} inputMode="decimal" value={productCommission} onChange={(e) => setProductCommission(e.target.value)} placeholder="0" />
          </div>
        </div>
        <p className="text-xs text-gray-500">Si un servicio tiene su propio % de comisión, se usa ese para ese servicio.</p>
        {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className={btnSecondary} onClick={onClose}>Cancelar</button>
          <button type="button" className={btnPrimary} onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </div>
    </Modal>
  );
}

function PaymentModal({ person, onClose, onSaved }) {
  const [amount, setAmount] = useState(person.toPay ? String(person.toPay).replace('.', ',') : '');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  async function save() {
    setSaving(true);
    setError('');
    try {
      await bookingsApi.addTeamPayment(person.id, { amount: Number(String(amount).replace(',', '.')), notes });
      onSaved();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal title={`Pago a ${person.name}`} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className={labelCls}>Importe (€)</label>
          <input autoFocus className={`${inputCls} text-right tabular-nums`} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <p className="text-xs text-gray-500 mt-1">Pendiente en este periodo: {eur(person.toPay)} (sueldo + comisión + propinas − ya pagado)</p>
        </div>
        <input className={inputCls} placeholder="Nota (nómina, adelanto, propinas…)" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} />
        {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className={btnSecondary} onClick={onClose}>Cancelar</button>
          <button type="button" className={btnPrimary} onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Registrar pago'}</button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Personal for appointment businesses: how each professional is paid, what
 * they billed and cost this month, what they leave the business and what is
 * still to pay them.
 */
export default function AppointmentTeam() {
  const { business } = useAuth();
  const tz = business?.timezone || DEFAULT_TZ;
  const today = todayIn(tz);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [paying, setPaying] = useState(null);

  useSetMobileHeader({ title: 'Personal' });

  const [from, fullTo] = monthRange(month);
  const to = fullTo > today ? today : fullTo;
  const load = useCallback(() => {
    setError('');
    return bookingsApi.team(from, to < from ? from : to).then(setData).catch((err) => setError(apiError(err)));
  }, [from, to]);
  useEffect(() => { load(); }, [load]);

  const colors = useMemo(() => staffColors((data?.staff || []).map((s) => ({ ...s, _id: s.id, kind: 'staff' }))), [data]);
  const [y, m] = month.split('-').map(Number);
  const t = data?.totals;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="hidden lg:block text-xl font-bold text-gray-900">Personal</h2>
          <p className="text-sm text-gray-500 lg:mt-0.5">Cómo cobra cada profesional y lo que deja al negocio.</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" className={`${btnSecondary} !px-3`} onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mes anterior">‹</button>
          <span className="px-3 text-sm font-semibold text-gray-900 capitalize min-w-[9rem] text-center">{MONTHS[m - 1]} {y}</span>
          <button type="button" className={`${btnSecondary} !px-3`} onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= today.slice(0, 7)} aria-label="Mes siguiente">›</button>
        </div>
      </div>

      {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>}
      {!data && !error && <p className="text-sm text-gray-400">Cargando…</p>}

      {data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              ['Facturado por el equipo', eur(t.billed + t.products), `${t.appointments || 0} citas${t.products ? ` · ${eur(t.products)} en productos` : ''}`],
              ['Coste del equipo', eur(t.cost), `${eur(t.salary)} sueldos · ${eur(t.commission)} comisiones`],
              ['Deja al negocio', eur(t.leaves), 'facturado − coste del equipo', (t.leaves || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'],
              ['Pendiente de pagar', eur(t.toPay), `${eur(t.paid)} ya pagado${t.tips ? ` · ${eur(t.tips)} propinas` : ''}`],
            ].map(([label, value, hint, tone]) => (
              <div key={label} className={`${card} px-4 py-3.5`}>
                <p className="text-xs text-gray-500">{label}</p>
                <p className={`text-2xl font-bold tabular-nums mt-1 ${tone || 'text-gray-900'}`}>{value}</p>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{hint}</p>
              </div>
            ))}
          </div>

          {data.staff.length === 0 ? (
            <div className={`${card} p-8 text-center`}>
              <p className="text-sm text-gray-500">Todavía no hay profesionales.</p>
              <Link to="/configuracion?tab=profesionales" className="text-sm font-semibold text-violet-700">Añadirlos en Configuración</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {data.staff.map((p) => (
                <section key={p.id} className={`${card} p-5 space-y-4`}>
                  <div className="flex items-start gap-3">
                    <StaffAvatar name={p.name} photo={p.photo} color={colors[p.id]} size={44} />
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-semibold text-gray-900 truncate">{p.name}{!p.active && <span className="ml-2 text-xs font-normal text-gray-400">(desactivada)</span>}</p>
                      <button type="button" onClick={() => setEditing(p)} className={`text-sm text-left ${p.pay ? 'text-gray-600 hover:text-violet-700' : 'text-amber-700 font-semibold'}`}>
                        {payText(p.pay)} · <span className="text-violet-700">Cambiar</span>
                      </button>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] text-gray-500">Deja al negocio</p>
                      <p className={`text-xl font-bold tabular-nums ${p.leaves >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{eur(p.leaves)}</p>
                    </div>
                  </div>

                  <dl className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-gray-50 py-2"><dt className="text-[11px] text-gray-500">Citas</dt><dd className="text-base font-bold text-gray-900 tabular-nums">{p.appointments}</dd></div>
                    <div className="rounded-xl bg-gray-50 py-2"><dt className="text-[11px] text-gray-500">Facturado</dt><dd className="text-base font-bold text-gray-900 tabular-nums">{eur(p.billed + p.products)}</dd></div>
                    <div className="rounded-xl bg-gray-50 py-2"><dt className="text-[11px] text-gray-500">Horas en agenda</dt><dd className="text-base font-bold text-gray-900 tabular-nums">{p.hours}</dd></div>
                  </dl>

                  <div className="text-sm space-y-1.5">
                    <div className="flex justify-between"><span className="text-gray-600">Servicios</span><span className="tabular-nums">{eur(p.billed)}</span></div>
                    {p.products > 0 && <div className="flex justify-between"><span className="text-gray-600">Productos vendidos</span><span className="tabular-nums">{eur(p.products)}</span></div>}
                    <div className="flex justify-between"><span className="text-gray-600">Sueldo</span>{p.salary ? <span className="tabular-nums text-rose-600">−{eur(p.salary)}</span> : <span className="text-gray-300">—</span>}</div>
                    <div className="flex justify-between"><span className="text-gray-600">Comisión</span>{p.commission ? <span className="tabular-nums text-rose-600">−{eur(p.commission)}</span> : <span className="text-gray-300">—</span>}</div>
                    {p.tips > 0 && <div className="flex justify-between"><span className="text-gray-600">Propinas (son suyas)</span><span className="tabular-nums text-gray-500">{eur(p.tips)}</span></div>}
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100">
                    <p className="text-sm text-gray-600">
                      Pagado <b className="text-gray-900 tabular-nums">{eur(p.paid)}</b>
                      {p.toPay > 0 && <> · pendiente <b className="text-amber-700 tabular-nums">{eur(p.toPay)}</b></>}
                    </p>
                    <button type="button" className={btnSecondary} onClick={() => setPaying(p)}>Registrar pago</button>
                  </div>
                </section>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-400">
            Datos del 1 al {Number(to.slice(8))} de {MONTHS[m - 1]}. Las horas salen del horario de cada profesional en la agenda
            (<Link to="/configuracion?tab=profesionales" className="text-violet-700">cambiar horarios</Link>). Sueldos y comisiones aparecen también en Finanzas.
          </p>
        </>
      )}

      {editing && <PayModal person={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {paying && <PaymentModal person={paying} onClose={() => setPaying(null)} onSaved={() => { setPaying(null); load(); }} />}
    </div>
  );
}
