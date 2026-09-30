import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSetMobileHeader } from '../context/MobileHeaderContext';
import { bookingsApi, apiError } from '../services/bookingsApi';
import CheckoutModal from './agenda/CheckoutModal';
import StaffAvatar from './agenda/StaffAvatar';
import {
  DEFAULT_TZ, PAY_METHODS, addDays, btnPrimary, btnSecondary, euros, inputCls, longDate, parseEuros, payMethodLabel,
  pluralize, staffColors, timeInTz, todayIn,
} from './agenda/utils';

const card = 'bg-white rounded-2xl border border-gray-200';

/**
 * Caja: charge today's appointments, see what came in by payment method and
 * close the day counting the cash in the drawer.
 */
export default function Caja() {
  const { business, hasRole } = useAuth();
  const tz = business?.timezone || DEFAULT_TZ;
  const today = todayIn(tz);
  const [date, setDate] = useState(today);
  const [data, setData] = useState(null);
  const [resources, setResources] = useState([]);
  const [error, setError] = useState('');
  const [charging, setCharging] = useState(null);
  const [counted, setCounted] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useSetMobileHeader({ title: 'Caja' });

  const load = useCallback(() => {
    setError('');
    return bookingsApi.cashDay(date).then(setData).catch((err) => setError(apiError(err)));
  }, [date]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { bookingsApi.resources().then(setResources).catch(() => {}); }, []);

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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center xl:items-end justify-between gap-3">
        <div>
          <h2 className="hidden xl:block text-xl font-bold text-gray-900">Caja</h2>
          <p className="text-sm text-gray-500 xl:mt-0.5">{longDate(date)}{closed && ' · Cerrada'}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" className={`${btnSecondary} !px-3`} onClick={() => setDate(addDays(date, -1))} aria-label="Día anterior">‹</button>
          <button type="button" className={btnSecondary} onClick={() => setDate(today)} disabled={date === today}>Hoy</button>
          <button type="button" className={`${btnSecondary} !px-3`} onClick={() => setDate(addDays(date, 1))} disabled={date >= today} aria-label="Día siguiente">›</button>
        </div>
      </div>

      {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>}
      {!data && !error && <p className="text-sm text-gray-400">Cargando…</p>}

      {data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className={`${card} px-4 py-3.5 col-span-2 lg:col-span-1`}>
              <p className="text-xs text-gray-500">Cobrado</p>
              <p className="text-2xl font-bold text-gray-900 tabular-nums mt-1">{euros(t.total)}</p>
              <p className="text-xs text-gray-400 mt-0.5">{pluralize(t.payments, 'cobro', 'cobros')}{t.tips ? ` · +${euros(t.tips)} propinas` : ''}</p>
            </div>
            {PAY_METHODS.map((m) => (
              <div key={m.key} className={`${card} px-4 py-3.5`}>
                <p className="text-xs text-gray-500">{m.icon} {m.label}</p>
                <p className="text-xl font-bold text-gray-900 tabular-nums mt-1">{euros(t[m.key])}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
            <div className="lg:col-span-3 space-y-5">
              <section className={card}>
                <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Por cobrar</h3>
                  <span className="text-xs text-gray-500">{data.toCharge.length ? `${pluralize(data.toCharge.length, 'cita', 'citas')} · ${euros(data.toChargeAmount)}` : ''}</span>
                </div>
                {data.toCharge.length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm text-gray-400">No queda nada por cobrar este día.</p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {data.toCharge.map((b) => {
                      const person = personOf(b);
                      const upcoming = new Date(b.start).getTime() > now;
                      return (
                        <li key={b._id} className="px-5 py-3 flex items-center gap-3">
                          <span className="text-sm font-semibold tabular-nums text-gray-900 w-11 shrink-0">{timeInTz(b.start, tz)}</span>
                          {person && <StaffAvatar name={person.name} photo={person.photo} color={colors[person._id]} size={26} />}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{b.guestName}</p>
                            <p className="text-xs text-gray-500 truncate">{b.segments.map((s) => s.serviceName).join(' + ')}{upcoming ? ' · aún no ha empezado' : ''}</p>
                          </div>
                          <span className="text-sm font-semibold tabular-nums text-gray-900">{euros(b.totalPrice)}</span>
                          <button type="button" disabled={!!closed} onClick={() => setCharging(b)}
                            className="shrink-0 px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40">
                            Cobrar
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section className={card}>
                <div className="px-5 py-3.5 border-b border-gray-100"><h3 className="text-sm font-semibold text-gray-900">Cobros del día</h3></div>
                {data.payments.length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm text-gray-400">Todavía no hay cobros.</p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {data.payments.map((b) => {
                      const p = b.payment;
                      const extras = (p.extras || []).map((x) => `${x.qty > 1 ? `${x.qty}× ` : ''}${x.name}`).join(', ');
                      return (
                        <li key={b._id} className="px-5 py-3 flex items-center gap-3">
                          <span className="text-xs text-gray-400 tabular-nums w-11 shrink-0">{timeInTz(p.paidAt, tz)}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{b.guestName}</p>
                            <p className="text-xs text-gray-500 truncate">
                              {b.segments.map((s) => s.serviceName).join(' + ')}{extras && ` · ${extras}`}
                              {p.discount > 0 && ` · −${euros(p.discount)}`}{p.tip > 0 && ` · propina ${euros(p.tip)}`}
                            </p>
                          </div>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{payMethodLabel(p.method)}</span>
                          <span className="text-sm font-semibold tabular-nums text-gray-900 w-20 text-right">{euros(p.total + (p.tip || 0))}</span>
                          {hasRole('manager') && !closed && (
                            <button type="button" disabled={busy} title="Deshacer cobro" aria-label="Deshacer cobro"
                              onClick={() => { if (window.confirm(`¿Deshacer el cobro de ${b.guestName}?`)) run(() => bookingsApi.undoCheckout(b._id)); }}
                              className="text-gray-300 hover:text-rose-600 text-sm">↺</button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>

            {/* Close the day */}
            <section className={`${card} lg:col-span-2 p-5 space-y-4`}>
              <h3 className="text-sm font-semibold text-gray-900">Cierre de caja</h3>
              {closed ? (
                <div className="space-y-3">
                  <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-gray-600">Efectivo esperado</span><span className="font-semibold tabular-nums">{euros(closed.totals.cash)}</span></div>
                    {closed.countedCash !== null && (
                      <>
                        <div className="flex justify-between"><span className="text-gray-600">Contado</span><span className="font-semibold tabular-nums">{euros(closed.countedCash)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600">Diferencia</span>
                          <span className={`font-bold tabular-nums ${closed.difference === 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{closed.difference > 0 ? '+' : ''}{euros(closed.difference)}</span></div>
                      </>
                    )}
                    <div className="flex justify-between pt-1.5 border-t border-gray-200"><span className="text-gray-600">Total del día</span><span className="font-bold tabular-nums">{euros(closed.totals.total)}</span></div>
                  </div>
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
                  <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 flex justify-between text-sm">
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
                  <button type="button" className={`${btnPrimary} w-full`} disabled={busy} onClick={closeDay}>Cerrar caja del día</button>
                  <p className="text-xs text-gray-400">Lo cobrado aparece en Finanzas como ingreso real del día. Al cerrar, los cobros de este día quedan bloqueados.</p>
                </div>
              )}
            </section>
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
