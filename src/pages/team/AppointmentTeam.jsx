import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSetMobileHeader } from '../../context/MobileHeaderContext';
import { bookingsApi, apiError } from '../../services/bookingsApi';
import Modal from '../../components/Modal';
import StaffAvatar from '../agenda/StaffAvatar';
import { DEFAULT_TZ, inputCls, labelCls, staffColors, todayIn } from '../agenda/utils';
import { BigFigure, Empty, FigureLine, GhostButton, PageHeader, PrimaryButton, RowAction, Section, SectionLink } from '../../ui/kit';

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const eur = (n) => `${(n || 0).toLocaleString('es-ES', { minimumFractionDigits: Number.isInteger(n || 0) ? 0 : 2, maximumFractionDigits: 2, useGrouping: 'always' })} €`;
const citas = (n) => `${n || 0} ${n === 1 ? 'cita' : 'citas'}`;
const num = (n) => (n || 0).toLocaleString('es-ES', { maximumFractionDigits: 1 });

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

/** Cancel + main button for the bottom of a sheet. */
function SheetFooter({ onCancel, onSave, saving, label }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <button type="button" onClick={onCancel} className="h-10 px-4 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100">Cancelar</button>
      <PrimaryButton icon={null} onClick={onSave} disabled={saving}>{saving ? 'Guardando…' : label}</PrimaryButton>
    </div>
  );
}

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
    <Modal title={`Cómo cobra ${person.name}`} subtitle="Se usa para calcular su coste y lo que deja al negocio." onClose={onClose}
      footer={<SheetFooter onCancel={onClose} onSave={save} saving={saving} label="Guardar" />}>
      <div className="space-y-6">
        <Section title="Tipo de pago">
          <ul className="divide-y divide-gray-100" role="radiogroup">
            {PAY_OPTIONS.map((o) => (
              <li key={o.key}>
                <button type="button" role="radio" aria-checked={type === o.key} onClick={() => setType(o.key)}
                  className="w-full flex items-center gap-3 py-2.5 text-left">
                  <span className={`w-[18px] h-[18px] rounded-full shrink-0 flex items-center justify-center border-2 ${type === o.key ? 'border-violet-600' : 'border-gray-300'}`}>
                    {type === o.key && <span className="w-2 h-2 rounded-full bg-violet-600" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-medium text-gray-900">{o.label}</span>
                    <span className="block text-[13px] text-gray-500">{o.hint}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Section>
        {opt.unit && (
          <div>
            <label className={labelCls}>Importe ({opt.unit})</label>
            <input className={`${inputCls} text-right tabular-nums`} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={type === 'monthly' ? '1.200' : '10'} />
            {type === 'hourly' && <p className="text-xs text-gray-500 mt-1">Las horas salen de su horario en la agenda.</p>}
          </div>
        )}
        <Section title="Comisión">
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className={labelCls}>Servicios (%)</label>
              <input className={`${inputCls} text-right tabular-nums`} inputMode="decimal" value={commission} onChange={(e) => setCommission(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className={labelCls}>Productos (%)</label>
              <input className={`${inputCls} text-right tabular-nums`} inputMode="decimal" value={productCommission} onChange={(e) => setProductCommission(e.target.value)} placeholder="0" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Si un servicio tiene su propio % de comisión, se usa ese para ese servicio.</p>
        </Section>
        {error && <p className="text-sm text-rose-700 rounded-xl bg-rose-50 px-3 py-2">{error}</p>}
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
    <Modal title={`Pago a ${person.name}`} subtitle={`Pendiente este mes: ${eur(person.toPay)}`} onClose={onClose}
      footer={<SheetFooter onCancel={onClose} onSave={save} saving={saving} label="Registrar pago" />}>
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Importe (€)</label>
          <input autoFocus className={`${inputCls} text-right tabular-nums`} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <p className="text-xs text-gray-500 mt-1">Sueldo + comisión + propinas − ya pagado.</p>
        </div>
        <div>
          <label className={labelCls}>Nota</label>
          <input className={inputCls} placeholder="Nómina, adelanto, propinas…" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} />
        </div>
        {error && <p className="text-sm text-rose-700 rounded-xl bg-rose-50 px-3 py-2">{error}</p>}
      </div>
    </Modal>
  );
}

/** The month's money for one professional, line by line (opens under the row). */
function Breakdown({ p, onPay, onEdit }) {
  const line = (label, value, cls = 'text-gray-900') => (
    <div className="flex justify-between gap-3 py-2"><dt className="text-gray-600">{label}</dt><dd className={`tabular-nums ${cls}`}>{value}</dd></div>
  );
  return (
    <div className="pb-4 md:pl-[52px] grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-10">
      <dl className="text-sm divide-y divide-gray-100">
        {line('Servicios', eur(p.billed))}
        {p.products > 0 && line('Productos vendidos', eur(p.products))}
        {line('Sueldo', p.salary ? `−${eur(p.salary)}` : '—', p.salary ? 'text-rose-600' : 'text-gray-300')}
        {line('Comisión', p.commission ? `−${eur(p.commission)}` : '—', p.commission ? 'text-rose-600' : 'text-gray-300')}
        {line('Deja al negocio', eur(p.leaves), `font-semibold ${p.leaves >= 0 ? 'text-emerald-600' : 'text-rose-600'}`)}
      </dl>
      <div>
        <dl className="text-sm divide-y divide-gray-100">
          {p.tips > 0 && line('Propinas (son suyas)', eur(p.tips), 'text-gray-500')}
          {line('Pagado', eur(p.paid))}
          {line('Pendiente', eur(p.toPay), `font-semibold ${p.toPay > 0 ? 'text-amber-700' : 'text-gray-900'}`)}
        </dl>
        <div className="flex flex-wrap gap-2 pt-3">
          <GhostButton onClick={onEdit}>Cambiar cómo cobra</GhostButton>
          <GhostButton onClick={onPay}>Registrar pago</GhostButton>
        </div>
      </div>
    </div>
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
  const [open, setOpen] = useState(null);

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
    <div className="w-full space-y-8">
      <PageHeader title="Personal" subtitle="Cómo cobra cada profesional y lo que deja al negocio." mobileActions
        actions={(
          <div className="flex items-center gap-1">
            <button type="button" className="w-9 h-9 rounded-full hover:bg-gray-100 text-gray-600" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mes anterior">‹</button>
            <span className="px-1 text-sm font-semibold text-gray-900 capitalize min-w-[8.5rem] text-center">{MONTHS[m - 1]} {y}</span>
            <button type="button" className="w-9 h-9 rounded-full hover:bg-gray-100 text-gray-600 disabled:text-gray-300 disabled:hover:bg-transparent" onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= today.slice(0, 7)} aria-label="Mes siguiente">›</button>
          </div>
        )} />

      {error && <p className="text-sm text-rose-700 rounded-xl bg-rose-50 px-3 py-2">{error}</p>}
      {!data && !error && <p className="text-sm text-gray-400">Cargando…</p>}

      {data && (
        <>
          <section className="space-y-4">
            <BigFigure label="Deja al negocio" value={eur(t.leaves)} tone={(t.leaves || 0) >= 0 ? 'good' : 'bad'}
              sub={`Facturado menos ${eur(t.cost)} de coste del equipo`} />
            <FigureLine items={[
              { label: `facturado · ${citas(t.appointments)}`, value: eur(t.billed + t.products) },
              t.products ? { label: 'en productos', value: eur(t.products) } : null,
              { label: 'sueldos', value: eur(t.salary) },
              { label: 'comisiones', value: eur(t.commission) },
              { label: 'pendiente de pagar', value: eur(t.toPay), tone: t.toPay > 0 ? 'warn' : undefined },
              { label: 'ya pagado', value: eur(t.paid) },
              t.tips ? { label: 'propinas', value: eur(t.tips) } : null,
            ]} />
          </section>

          <Section title="Profesionales">
            {data.staff.length === 0 ? (
              <Empty action={<SectionLink to="/configuracion?tab=profesionales">Añadirlos en Configuración</SectionLink>}>Todavía no hay profesionales.</Empty>
            ) : (
              <>
                <div className="hidden md:grid grid-cols-12 gap-4 px-2 pb-2 border-b border-gray-200 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  <span className="col-span-4">Profesional</span>
                  <span className="col-span-1 text-right">Citas</span>
                  <span className="col-span-1 text-right">Horas</span>
                  <span className="col-span-2 text-right">Facturado</span>
                  <span className="col-span-1 text-right">Coste</span>
                  <span className="col-span-1 text-right">Deja</span>
                  <span className="col-span-2 text-right">Pendiente</span>
                </div>
                <ul className="divide-y divide-gray-100">
                  {data.staff.map((p) => {
                    const isOpen = open === p.id;
                    const cost = (p.salary || 0) + (p.commission || 0);
                    return (
                      <li key={p.id}>
                        <div role="button" tabIndex={0} aria-expanded={isOpen}
                          onClick={() => setOpen(isOpen ? null : p.id)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(isOpen ? null : p.id); } }}
                          className="flex items-center gap-3 md:grid md:grid-cols-12 md:gap-4 px-2 py-3 rounded-xl cursor-pointer hover:bg-gray-50">
                          <div className="md:col-span-4 flex items-center gap-3 min-w-0 flex-1">
                            <StaffAvatar name={p.name} photo={p.photo} color={colors[p.id]} size={40} />
                            <div className="min-w-0">
                              <p className="text-[15px] font-medium text-gray-900 truncate">
                                {p.name}{!p.active && <span className="ml-1.5 text-[11px] font-semibold px-1.5 py-px rounded bg-gray-100 text-gray-500 align-middle">Desactivada</span>}
                              </p>
                              <button type="button" onClick={(e) => { e.stopPropagation(); setEditing(p); }}
                                className={`text-[13px] text-left truncate max-w-full ${p.pay ? 'text-gray-500 hover:text-violet-700' : 'text-amber-700 font-semibold'}`}>
                                {payText(p.pay)}
                              </button>
                              <p className="md:hidden text-[13px] text-gray-500 tabular-nums">{citas(p.appointments)} · {eur(p.billed + p.products)}</p>
                            </div>
                          </div>
                          <span className="hidden md:block col-span-1 text-right text-sm tabular-nums text-gray-700">{p.appointments}</span>
                          <span className="hidden md:block col-span-1 text-right text-sm tabular-nums text-gray-700">{num(p.hours)}</span>
                          <span className="hidden md:block col-span-2 text-right text-sm tabular-nums text-gray-900">{eur(p.billed + p.products)}</span>
                          <span className="hidden md:block col-span-1 text-right text-sm tabular-nums text-gray-700">{cost ? eur(cost) : <span className="text-gray-300">—</span>}</span>
                          <span className={`hidden md:block col-span-1 text-right text-sm font-semibold tabular-nums ${p.leaves >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{eur(p.leaves)}</span>
                          <div className="hidden md:flex col-span-2 items-center justify-end gap-2">
                            <span className={`text-sm tabular-nums ${p.toPay > 0 ? 'font-semibold text-amber-700' : 'text-gray-400'}`}>{eur(p.toPay)}</span>
                            <RowAction onClick={() => setPaying(p)}>Pagar</RowAction>
                          </div>
                          <div className="md:hidden text-right shrink-0">
                            <p className={`text-[15px] font-semibold tabular-nums ${p.leaves >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{eur(p.leaves)}</p>
                            <p className="text-[11px] text-gray-400">{p.toPay > 0 ? <span className="text-amber-700">{eur(p.toPay)} pendiente</span> : 'deja'}</p>
                          </div>
                        </div>
                        {isOpen && <Breakdown p={p} onPay={() => setPaying(p)} onEdit={() => setEditing(p)} />}
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </Section>
          <p className="text-xs text-gray-400">
            Datos del 1 al {Number(to.slice(8))} de {MONTHS[m - 1]}. Toca un profesional para ver el detalle. Las horas salen del horario de cada profesional en la agenda
            (<Link to="/configuracion?tab=profesionales" className="text-violet-700">cambiar horarios</Link>). Sueldos y comisiones aparecen también en Finanzas.
          </p>
        </>
      )}

      {editing && <PayModal person={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {paying && <PaymentModal person={paying} onClose={() => setPaying(null)} onSaved={() => { setPaying(null); load(); }} />}
    </div>
  );
}
