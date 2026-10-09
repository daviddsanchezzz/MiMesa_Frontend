import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSetMobileHeader } from '../../context/MobileHeaderContext';
import { bookingsApi, apiError } from '../../services/bookingsApi';
import Modal from '../../components/Modal';
import StaffAvatar from '../agenda/StaffAvatar';
import { DEFAULT_TZ, inputCls, labelCls, staffColors, todayIn } from '../agenda/utils';
import PeriodNavigator from '../../ui/PeriodNavigator';
import { Empty, FigureLine, GhostButton, Hero, PrimaryButton, Section, SectionLink } from '../../ui/kit';
import { eur } from '../../lib/format';

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const eurRound = (n) => eur(Math.round(n || 0));
const citas = (n) => `${n || 0} ${n === 1 ? 'cita' : 'citas'}`;
const num = (n) => (n || 0).toLocaleString('es-ES', { maximumFractionDigits: 1 });

const PAY_OPTIONS = [
  { key: 'monthly', label: 'Sueldo fijo', hint: 'Un importe al mes', unit: '€ al mes' },
  { key: 'hourly', label: 'Por horas', hint: 'Según las horas de su horario', unit: '€ la hora' },
  { key: 'commission', label: 'Solo comisión', hint: 'Cobra un % de lo que factura', unit: null },
];
const TYPE_FROM_API = { monthly_fixed: 'monthly', hourly: 'hourly', commission_only: 'commission' };

export function payText(pay) {
  if (!pay) return 'Sin definir cómo cobra';
  const parts = [];
  if (pay.type === 'monthly_fixed') parts.push(`${eur(pay.amount)}/mes`);
  if (pay.type === 'hourly') parts.push(`${eur(pay.amount)}/hora`);
  if (pay.type === 'commission_only') parts.push('Solo comisión');
  if (pay.commissionPercent) parts.push(`${pay.commissionPercent}% servicios`);
  if (pay.productCommissionPercent) parts.push(`${pay.productCommissionPercent}% productos`);
  return parts.join(' · ');
}

export function monthRange(ym) {
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

export function PayModal({ person, onClose, onSaved }) {
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
    <Modal title={`Cómo cobra ${person.name}`} subtitle="Se usa para calcular su coste y el margen del equipo." onClose={onClose}
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

export function PaymentModal({ person, onClose, onSaved }) {
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
export function Breakdown({ p, onPay, onEdit }) {
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
        {line('Margen tras coste de personal', eur(p.leaves), `font-semibold ${p.leaves >= 0 ? 'text-emerald-600' : 'text-rose-600'}`)}
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
  const [params, setParams] = useSearchParams();
  const { business } = useAuth();
  const tz = business?.timezone || DEFAULT_TZ;
  const today = todayIn(tz);
  const month = validMonth(params.get('month'), today.slice(0, 7));
  const setMonth = (value) => setParams({ month: value });
  const professionalUrl = (id) => `/equipo?pro=${id}&tab=remuneracion&from=rendimiento&month=${month}`;
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useSetMobileHeader({ title: 'Rendimiento' });

  const [from, fullTo] = monthRange(month);
  const to = fullTo > today ? today : fullTo;
  useEffect(() => {
    let live = true;
    setError(''); setData(null);
    bookingsApi.team(from, to < from ? from : to).then((value) => { if (live) setData(value); }).catch((err) => { if (live) setError(apiError(err)); });
    return () => { live = false; };
  }, [from, to, business?.id]);

  const colors = useMemo(() => staffColors((data?.staff || []).map((s) => ({ ...s, _id: s.id, kind: 'staff' }))), [data]);
  const [y, m] = month.split('-').map(Number);
  const t = data?.totals;
  const billed = (t?.billed || 0) + (t?.products || 0);
  const canShowSplit = billed > 0 && (t?.leaves || 0) >= 0 && (t?.cost || 0) >= 0;
  const marginShare = canShowSplit ? Math.min(100, Math.max(0, ((t?.leaves || 0) / billed) * 100)) : 0;
  const costShare = canShowSplit ? 100 - marginShare : 0;

  return (
    <div className="w-full flex flex-1 min-h-0 flex-col">
      <div className="shrink-0 pb-4 lg:pb-5">
        <div className="hidden lg:block min-w-0 pb-3">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Rendimiento</h1>
          <p className="text-sm text-gray-500 mt-0.5">Facturación, costes y margen de cada profesional.</p>
        </div>
        <div className="flex justify-center">
          <PeriodNavigator period="month" dateRange={{ from, to: fullTo }} periods={['month']}
            onShift={(direction) => setMonth(shiftMonth(month, direction))} canNext={month < today.slice(0, 7)}
            onPeriodChange={() => {}} onRangeChange={() => {}} />
        </div>
      </div>

      <div key={month} data-page-scroll className="flex-1 min-h-0 overflow-y-auto overscroll-contain pb-6 space-y-6 lg:space-y-8">
      {error && <p className="text-sm text-rose-700 rounded-xl bg-rose-50 px-3 py-2">{error}</p>}
      {!data && !error && <p className="text-sm text-gray-400">Cargando…</p>}

      {data && (
        <>
          <Hero label="Margen del equipo" value={eur(t.leaves)} tone={(t.leaves || 0) >= 0 ? 'good' : 'bad'}
            bar={canShowSplit ? {
              segments: [
                { label: 'Margen', text: `${num(marginShare)} %`, value: marginShare, color: '#10b981' },
                { label: 'Equipo', text: `${num(costShare)} %`, value: costShare, color: '#c4b5fd' },
              ],
              note: `${eur(t.salary)} en sueldos · ${eur(t.commission)} en comisiones${t.tips > 0 ? ` · ${eur(t.tips)} en propinas` : ''}`,
            } : null}
            stats={[
              { label: 'Facturado', value: eurRound(billed), sub: citas(t.appointments) },
              { label: 'Coste', value: eurRound(t.cost), sub: 'sueldos y comisiones' },
              { label: 'Por pagar', value: eurRound(t.toPay), tone: t.toPay > 0 ? 'warn' : undefined, sub: t.toPay > 0 ? 'pendiente' : 'al día' },
            ]} />

          <Section title="Profesionales">
            {data.staff.length === 0 ? (
              <Empty action={<SectionLink to="/equipo">Añadir profesional</SectionLink>}>Todavía no hay profesionales.</Empty>
            ) : (
              <>
                <div className="hidden md:grid grid-cols-12 gap-4 px-2 pb-2 border-b border-gray-200 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  <span className="col-span-4">Profesional</span>
                  <span className="col-span-1 text-right">Citas</span>
                  <span className="col-span-1 text-right">Horas</span>
                  <span className="col-span-2 text-right">Facturado</span>
                  <span className="col-span-1 text-right">Coste</span>
                  <span className="col-span-1 text-right">Margen</span>
                  <span className="col-span-2 text-right">Pendiente</span>
                </div>
                <ul className="mt-1 divide-y divide-gray-100 rounded-2xl border border-gray-200 overflow-hidden md:mt-0 md:rounded-none md:border-0 md:overflow-visible">
                  {data.staff.map((p) => {
                    const cost = (p.salary || 0) + (p.commission || 0);
                    return (
                      <li key={p.id}>
                        <Link to={professionalUrl(p.id)}
                          aria-label={`Ver rendimiento de ${p.name}`}
                          className="group block md:hidden px-4 py-4 hover:bg-gray-50 active:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-inset">
                          <div className="flex items-start gap-3 min-w-0">
                            <StaffAvatar name={p.name} photo={p.photo} color={colors[p.id]} size={40} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-[15px] font-medium text-gray-900 truncate">
                                    {p.name}{!p.active && <span className="ml-1.5 text-[11px] font-semibold px-1.5 py-px rounded bg-gray-100 text-gray-500 align-middle">Desactivada</span>}
                                  </p>
                                  {p.pay ? (
                                    <span className="block max-w-full truncate text-left text-[13px] text-gray-500 group-hover:text-violet-700">
                                      {payText(p.pay)}
                                    </span>
                                  ) : (
                                    <span className="mt-1 inline-flex min-h-7 items-center rounded-full bg-violet-50 px-2.5 text-xs font-semibold text-violet-700 group-hover:bg-violet-100">
                                      Configurar remuneración
                                    </span>
                                  )}
                                </div>
                                <div className="flex shrink-0 items-start gap-2">
                                  {p.pay && (
                                    <div className="text-right">
                                      <p className={`text-[15px] font-semibold tabular-nums ${p.leaves >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{p.leaves > 0 ? '+' : ''}{eur(p.leaves)}</p>
                                      <p className="text-[11px] text-gray-400">margen</p>
                                    </div>
                                  )}
                                  <span aria-hidden="true" className="pt-px text-xl leading-5 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-500 group-focus-visible:translate-x-0.5 group-focus-visible:text-gray-500">›</span>
                                </div>
                              </div>
                              <p className="mt-1.5 text-[13px] text-gray-500 tabular-nums">{citas(p.appointments)} · {eur(p.billed + p.products)} facturado</p>
                              {p.pay && (
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                  <span className="text-gray-500">Coste <strong className="font-semibold tabular-nums text-gray-700">{eur(cost)}</strong></span>
                                  {p.toPay > 0 ? (
                                    <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-800 tabular-nums">Pendiente · {eur(p.toPay)}</span>
                                  ) : p.paid > 0 ? (
                                    <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-600">Pagado</span>
                                  ) : null}
                                </div>
                              )}
                            </div>
                          </div>
                        </Link>

                        <Link to={professionalUrl(p.id)}
                          aria-label={`Ver rendimiento de ${p.name}`}
                          className="group hidden md:grid md:grid-cols-12 md:gap-4 items-center px-2 py-3 rounded-xl hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-inset">
                          <div className="col-span-4 flex items-center gap-3 min-w-0">
                            <StaffAvatar name={p.name} photo={p.photo} color={colors[p.id]} size={40} />
                            <div className="min-w-0">
                              <p className="text-[15px] font-medium text-gray-900 truncate">
                                {p.name}{!p.active && <span className="ml-1.5 text-[11px] font-semibold px-1.5 py-px rounded bg-gray-100 text-gray-500 align-middle">Desactivada</span>}
                              </p>
                              <span className={`block text-[13px] text-left truncate max-w-full ${p.pay ? 'text-gray-500 group-hover:text-violet-700' : 'text-violet-700 font-semibold group-hover:text-violet-900'}`}>
                                {p.pay ? payText(p.pay) : 'Configurar remuneración'}
                              </span>
                            </div>
                          </div>
                          <span className="hidden md:block col-span-1 text-right text-sm tabular-nums text-gray-700">{p.appointments}</span>
                          <span className="hidden md:block col-span-1 text-right text-sm tabular-nums text-gray-700">{num(p.hours)}</span>
                          <span className="hidden md:block col-span-2 text-right text-sm tabular-nums text-gray-900">{eur(p.billed + p.products)}</span>
                          <span className="hidden md:block col-span-1 text-right text-sm tabular-nums text-gray-700">{cost ? eur(cost) : <span className="text-gray-300">—</span>}</span>
                          <span className={`hidden md:block col-span-1 text-right text-sm font-semibold tabular-nums ${p.pay ? (p.leaves >= 0 ? 'text-emerald-600' : 'text-rose-600') : 'text-gray-300'}`}>{p.pay ? eur(p.leaves) : '—'}</span>
                          <div className="hidden md:flex col-span-2 items-center justify-end gap-3">
                            <span className={`text-sm tabular-nums ${p.toPay > 0 ? 'font-semibold text-amber-700' : 'text-gray-400'}`}>{eur(p.toPay)}</span>
                            <span aria-hidden="true" className="text-xl leading-5 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-500 group-focus-visible:translate-x-0.5 group-focus-visible:text-gray-500">›</span>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </Section>
          <p className="text-xs text-gray-400">
            Datos del 1 al {Number(to.slice(8))} de {MONTHS[m - 1]}. Toca un profesional para ver el detalle. Sueldos y comisiones cuentan también como gasto en Finanzas.
          </p>
        </>
      )}

      </div>
    </div>
  );
}

export function validMonth(value, fallback) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value || '') && value <= fallback && value >= '2000-01' ? value : fallback;
}

export function ProfessionalPay({ resource, month, onMonthChange }) {
  const { business } = useAuth();
  const today = todayIn(business?.timezone || DEFAULT_TZ);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let live = true;
    setData(null); setError('');
    const [from, end] = monthRange(month);
    bookingsApi.team(from, end > today ? today : end).then((report) => {
      if (!live) return;
      const row = report.staff.find((p) => String(p.id) === String(resource._id));
      if (row) setData(row);
      else setError('Este profesional inactivo no tiene resultados en este período. Consulta otro mes o reactívalo desde General.');
    }).catch((err) => { if (live) setError(apiError(err)); });
    return () => { live = false; };
  }, [resource._id, month, today, version]);
  const saved = () => { setModal(null); setVersion((v) => v + 1); };
  return <section className="space-y-5">
    <h2 className="font-semibold">Remuneración</h2>
    <label className="block text-sm">Período<input type="month" min="2000-01" max={today.slice(0, 7)} className={inputCls} value={month} onChange={(e) => onMonthChange(validMonth(e.target.value, today.slice(0, 7)))} /></label>
    {error ? <p role="alert" className="text-sm text-rose-700">{error}</p> : !data ? <p className="text-sm text-gray-500">Cargando…</p> : <>
      <p className="font-medium">{payText(data.pay)}</p><button className="min-h-11 text-sm font-semibold text-violet-700" onClick={() => setModal('pay')}>{data.pay ? 'Editar remuneración' : 'Configurar remuneración'}</button>
      <FigureLine items={[{ label: 'generado', value: eur(data.billed + data.products) }, { label: 'citas', value: data.appointments }, { label: 'coste estimado', value: eur(data.salary + data.commission) }]} />
      <Breakdown p={data} onEdit={() => setModal('pay')} onPay={() => setModal('payment')} />
      <p className="text-xs text-gray-500">Hasta el {month === today.slice(0, 7) ? today : monthRange(month)[1]}. El sueldo fijo se prorratea por los días del período; el pago por horas usa el horario. Las comisiones se calculan con la facturación registrada. Los pagos se registran con la fecha de hoy.</p>
      {modal === 'pay' && <PayModal person={data} onClose={() => setModal(null)} onSaved={saved} />}
      {modal === 'payment' && <PaymentModal person={data} onClose={() => setModal(null)} onSaved={saved} />}
    </>}
  </section>;
}
