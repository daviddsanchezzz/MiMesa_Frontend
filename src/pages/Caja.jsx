import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSetMobileHeader } from '../context/MobileHeaderContext';
import { bookingsApi, apiError } from '../services/bookingsApi';
import CheckoutModal from './agenda/CheckoutModal';
import { Section, TimeRow, RowAction } from '../ui/kit';
import { queryClient, useData } from '../lib/query';
import { useResources } from './agenda/queries';

const NONE = [];
import { bookingTone } from '../lib/status';
import {
  DEFAULT_TZ, PAY_METHODS, addDays, btnSecondary, euros, inputCls, longDate, parseEuros, payMethodLabel,
  pluralize, staffColors, timeInTz, todayIn,
} from './agenda/utils';


/**
 * Caja: charge today's appointments, see what came in by payment method and
 * close the day counting the cash in the drawer.
 */
export default function Caja() {
  const { business, hasRole } = useAuth();
  const tz = business?.timezone || DEFAULT_TZ;
  const today = todayIn(tz);
  const [date, setDate] = useState(today);
  const [actionError, setError] = useState('');
  const [charging, setCharging] = useState(null);
  const [counted, setCounted] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useSetMobileHeader({ title: 'Caja' });

  // Cached (lib/query); charging, undoing or closing refreshes it.
  const cashQ = useData(['bookings', 'cash', date], () => bookingsApi.cashDay(date));
  const data = cashQ.data || null;
  const resources = useResources().data || NONE;
  const error = actionError || (cashQ.error ? apiError(cashQ.error) : '');
  const load = useCallback(() => queryClient.invalidateQueries({ queryKey: ['bookings', 'cash'] }), []);

  const colors = useMemo(() => staffColors(resources), [resources]);
  const staffById = useMemo(() => Object.fromEntries(resources.map((r) => [r._id, r])), [resources]);
  const personOf = (b) => staffById[(b.segments.flatMap((s) => s.resourceIds || []).find((id) => staffById[id]?.kind === 'staff'))];

  const now = Date.now();
  const t = data?.totals;
  const closed = data?.close;
  const countedCents = parseEuros(counted);
  const diff = countedCents !== null && counted !== '' && t ? countedCents - t.cash : null;

  async function run(fn) {
    setBusy(true);
    setError('');
    try { await fn(); await load(); } catch (err) { setError(apiError(err)); } finally { setBusy(false); }
  }

  const closeDay = () => {
    if (counted !== '' && countedCents === null) return setError('El efectivo contado no es válido');
    if (data.toCharge.length && !window.confirm(`Quedan ${pluralize(data.toCharge.length, 'cita', 'citas')} sin cobrar. ¿Cerrar la caja igualmente?`)) return;
    run(() => bookingsApi.closeCash({ date, countedCash: counted === '' ? null : countedCents, note }).then(() => { setCounted(''); setNote(''); }));
  };

  const METHOD_COLOR = { cash: '#10b981', card: '#8b5cf6', bizum: '#0ea5e9', other: '#94a3b8' };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="hidden lg:block text-2xl font-semibold tracking-tight text-gray-900">Caja</h1>
          <p className="text-sm text-gray-500 lg:mt-0.5">{longDate(date)}{closed && ' · cerrada'}</p>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" className="w-9 h-9 rounded-full hover:bg-gray-100 text-gray-600" onClick={() => setDate(addDays(date, -1))} aria-label="Día anterior">‹</button>
          <button type="button" className="h-9 px-3 rounded-full text-sm font-semibold text-violet-700 hover:bg-violet-50 disabled:text-gray-300 disabled:hover:bg-transparent" onClick={() => setDate(today)} disabled={date === today}>Hoy</button>
          <button type="button" className="w-9 h-9 rounded-full hover:bg-gray-100 text-gray-600 disabled:text-gray-300" onClick={() => setDate(addDays(date, 1))} disabled={date >= today} aria-label="Día siguiente">›</button>
        </div>
      </div>

      {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 mb-4">{error}</p>}
      {!data && !error && <p className="text-sm text-gray-400">Cargando…</p>}

      {data && (
        <>
          <section className="mb-8">
            <p className="text-[13px] font-semibold uppercase tracking-wide text-gray-400">Cobrado</p>
            <div className="flex items-baseline gap-3 flex-wrap">
              <p className="text-4xl lg:text-5xl font-semibold tracking-tight tabular-nums text-gray-900">{euros(t.total)}</p>
              <p className="text-sm text-gray-500">{pluralize(t.payments, 'cobro', 'cobros')}{t.tips ? ` · +${euros(t.tips)} propinas` : ''}
                {data.toCharge.length > 0 && <> · <b className="text-orange-600">{euros(data.toChargeAmount)}</b> por cobrar</>}</p>
            </div>
            {t.total > 0 && (
              <div className="mt-4 h-3 rounded-full overflow-hidden flex bg-gray-100">
                {PAY_METHODS.filter((m) => t[m.key] > 0).map((m) => (
                  <div key={m.key} style={{ width: `${(t[m.key] / t.total) * 100}%`, backgroundColor: METHOD_COLOR[m.key] }} title={`${m.label}: ${euros(t[m.key])}`} />
                ))}
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5">
              {PAY_METHODS.filter((m) => t[m.key] > 0 || (!t.total && m.key === 'cash')).map((m) => (
                <span key={m.key} className="inline-flex items-center gap-2 text-sm">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: METHOD_COLOR[m.key] }} />
                  <span className="text-gray-500">{m.label}</span>
                  <b className="tabular-nums text-gray-900">{euros(t[m.key])}</b>
                </span>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-x-12 gap-y-9 items-start">
            <div className="space-y-9 min-w-0">
              <Section title="Por cobrar" aside={data.toCharge.length > 0 && <span className="text-xs text-gray-500">{pluralize(data.toCharge.length, 'cita', 'citas')} · {euros(data.toChargeAmount)}</span>}>
                {data.toCharge.length === 0 ? (
                  <p className="py-6 text-sm text-gray-500">No queda nada por cobrar este día.</p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {data.toCharge.map((b) => {
                      const person = personOf(b);
                      const upcoming = new Date(b.start).getTime() > now;
                      return (
                        <TimeRow key={b._id} time={timeInTz(b.start, tz)} tone={bookingTone(b)} title={b.guestName}
                          subtitle={`${b.segments.map((x) => x.serviceName).join(' + ')}${person ? ` · ${person.name}` : ''}${upcoming ? ' · aún no ha empezado' : ''}`}
                          trailing={(
                            <>
                              <span className="text-sm font-semibold tabular-nums text-gray-900">{euros(b.totalPrice)}</span>
                              <RowAction disabled={!!closed} onClick={() => setCharging(b)}>Cobrar</RowAction>
                            </>
                          )}
                          onClick={closed ? undefined : () => setCharging(b)} />
                      );
                    })}
                  </ul>
                )}
              </Section>

              <Section title="Cobros del día">
                {data.payments.length === 0 ? (
                  <p className="py-6 text-sm text-gray-500">Todavía no hay cobros.</p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {data.payments.map((b) => {
                      const p = b.payment;
                      const extras = (p.extras || []).map((x) => `${x.qty > 1 ? `${x.qty}× ` : ''}${x.name}`).join(', ');
                      return (
                        <li key={b._id} className="py-3 flex items-center gap-3">
                          <span className="w-12 shrink-0 text-right text-[13px] text-gray-400 tabular-nums">{timeInTz(p.paidAt, tz)}</span>
                          <span className="w-[3px] self-stretch rounded-full shrink-0" style={{ backgroundColor: METHOD_COLOR[p.method] || METHOD_COLOR.other }} />
                          <div className="min-w-0 flex-1">
                            <p className="text-[15px] font-medium text-gray-900 truncate">{b.guestName}</p>
                            <p className="text-[13px] text-gray-500 truncate">
                              {payMethodLabel(p.method)} · {b.segments.map((x) => x.serviceName).join(' + ')}{extras && ` · ${extras}`}
                              {p.discount > 0 && ` · −${euros(p.discount)}`}{p.tip > 0 && ` · propina ${euros(p.tip)}`}
                            </p>
                          </div>
                          <span className="text-sm font-semibold tabular-nums text-gray-900">{euros(p.total + (p.tip || 0))}</span>
                          {hasRole('manager') && !closed && (
                            <button type="button" disabled={busy} title="Deshacer cobro" aria-label="Deshacer cobro"
                              onClick={() => { if (window.confirm(`¿Deshacer el cobro de ${b.guestName}?`)) run(() => bookingsApi.undoCheckout(b._id)); }}
                              className="w-8 h-8 rounded-full text-gray-300 hover:text-rose-600 hover:bg-rose-50">↺</button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Section>
            </div>

            <Section title="Cierre de caja">
              {closed ? (
                <div className="space-y-3">
                  <dl className="text-sm divide-y divide-gray-100 border-y border-gray-100">
                    <div className="flex justify-between py-2"><dt className="text-gray-600">Efectivo esperado</dt><dd className="font-semibold tabular-nums">{euros(closed.totals.cash)}</dd></div>
                    {closed.countedCash !== null && (
                      <>
                        <div className="flex justify-between py-2"><dt className="text-gray-600">Contado</dt><dd className="font-semibold tabular-nums">{euros(closed.countedCash)}</dd></div>
                        <div className="flex justify-between py-2"><dt className="text-gray-600">Diferencia</dt>
                          <dd className={`font-bold tabular-nums ${closed.difference === 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{closed.difference > 0 ? '+' : ''}{euros(closed.difference)}</dd></div>
                      </>
                    )}
                    <div className="flex justify-between py-2"><dt className="text-gray-600">Total del día</dt><dd className="font-bold tabular-nums">{euros(closed.totals.total)}</dd></div>
                  </dl>
                  {closed.note && <p className="text-sm text-gray-600">“{closed.note}”</p>}
                  <p className="text-xs text-gray-400">Cerrada a las {timeInTz(closed.createdAt, tz)}. Los cobros de este día ya no se pueden cambiar.</p>
                  {hasRole('manager') && (
                    <button type="button" className={btnSecondary} disabled={busy}
                      onClick={() => { if (window.confirm('¿Reabrir la caja de este día?')) run(() => bookingsApi.reopenCash(date)); }}>
                      Reabrir caja
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm py-2 border-y border-gray-100">
                    <span className="text-gray-600">Efectivo que debería haber</span>
                    <span className="font-bold tabular-nums">{euros(t.cash)}</span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Efectivo contado en el cajón (€)</label>
                    <input className={`${inputCls} text-right tabular-nums`} inputMode="decimal" placeholder="Opcional" value={counted} onChange={(e) => setCounted(e.target.value)} />
                    {diff !== null && (
                      <p className={`text-sm font-semibold mt-1.5 ${diff === 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {diff === 0 ? 'Cuadra ✓' : diff > 0 ? `Sobran ${euros(diff)}` : `Faltan ${euros(-diff)}`}
                      </p>
                    )}
                  </div>
                  <input className={inputCls} placeholder="Nota (opcional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
                  <button type="button" className="w-full h-11 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-black disabled:opacity-50" disabled={busy} onClick={closeDay}>Cerrar caja del día</button>
                  <p className="text-xs text-gray-400">Lo cobrado aparece en Finanzas como «Cobrado» del día. Al cerrar, los cobros de este día quedan bloqueados.</p>
                </div>
              )}
            </Section>
          </div>
        </>
      )}

      {charging && (
        <CheckoutModal booking={charging} tz={tz} onClose={() => setCharging(null)}
          onPaid={() => { setCharging(null); load(); }} />
      )}
    </div>
  );
}
