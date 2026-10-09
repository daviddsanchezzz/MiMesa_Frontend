import { useState } from 'react';
import api from '../services/api';
import { useData } from '../lib/query';
import { Empty } from '../ui/kit';
import Page from '../ui/Page';
import MyRequests from './personal/MyRequests';
import SwapRequestModal from './personal/SwapRequestModal';
import TimeOffModal from './personal/TimeOffModal';
import { timeOffLabel } from './personal/timeOff';
import PeriodNavigator, { usePeriod } from '../ui/PeriodNavigator';
import { toIso } from '../lib/periods';
import { Loading } from '../ui/feedback';
import { List } from '../ui/list';

const hoursText = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
};
const dayLabel = (iso) => {
  const t = new Date(`${iso}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/** The signed-in employee's own week: which shifts they work and with whom. */
export default function MySchedule() {
  const [timeOffOpen, setTimeOffOpen] = useState(false);
  const [swapShift, setSwapShift] = useState(null);
  const { period, dateRange, onPeriodChange, onShift, onRangeChange } = usePeriod('week');
  const today = toIso();
  const q = useData(['staff', 'me', 'schedule', dateRange.from], () => api.get(`/staff/me/schedule?weekStart=${dateRange.from}`).then((r) => r.data), { retry: false });
  const d = q.data;
  const offQ = useData(['staff', 'me', 'time-off'], () => api.get('/staff/me/time-off').then((r) => r.data.items), { enabled: Boolean(d?.linked), retry: false });
  const swapsQ = useData(['staff', 'me', 'swaps'], () => api.get('/staff/me/swaps').then((r) => r.data), { enabled: Boolean(d?.linked), retry: false });
  const refreshAll = () => Promise.all([q.refetch(), offQ.refetch(), swapsQ.refetch()]);

  const todayShifts = d?.linked ? (d.days.find((x) => x.date === today)?.shifts || []) : [];

  return (
    <Page title="Mi horario" subtitle="Tus turnos de la semana y con quién trabajas." sticky
      primary={d?.linked ? { label: 'Pedir libre', short: 'Pedir libre', icon: null, onClick: () => setTimeOffOpen(true) } : undefined} mobileAction={false}
      toolbar={<PeriodNavigator period={period} dateRange={dateRange} onPeriodChange={onPeriodChange} onShift={onShift} onRangeChange={onRangeChange} periods={['week']} />}>

      {q.isLoading && <Loading />}
      {q.isError && (
        <div className="py-10 text-center">
          <p className="text-sm text-gray-500">No se ha podido cargar tu horario.</p>
          <button type="button" onClick={() => q.refetch()} className="mt-2 text-sm font-semibold text-violet-700">Reintentar</button>
        </div>
      )}

      {d && !d.linked && (
        <Empty>Tu usuario todavía no está enlazado a ningún empleado, así que no podemos mostrarte turnos. Pídele a tu encargado que te enlace en Personal.</Empty>
      )}

      {d?.linked && (
        <MyRequests part="top" incoming={swapsQ.data?.incoming || []} mine={swapsQ.data?.mine || []} timeOff={offQ.data || []} onChanged={refreshAll} />
      )}

      {d?.linked && d.published === false && (
        <div className="rounded-3xl border border-dashed border-gray-300 px-5 py-10 text-center">
          <p className="text-[17px] font-semibold text-gray-900">Esta semana todavía no está publicada</p>
          <p className="mt-1 text-sm text-gray-500">Tu encargado aún la está preparando. Te avisaremos cuando la publique.</p>
        </div>
      )}

      {d?.linked && d.published !== false && (() => {
        const now = new Date();
        const nowMin = now.getHours() * 60 + now.getMinutes();
        const toMin = (t) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m; };
        // A shift is over once its end has passed (overnight shifts end the next morning).
        const isOver = (day, sh) => day.date < today || (day.date === today && toMin(sh.end) > toMin(sh.start) && toMin(sh.end) <= nowMin);
        const isNow = (day, sh) => day.date === today && !isOver(day, sh) && toMin(sh.start) <= nowMin;
        let next = null;
        for (const day of d.days) {
          if (day.date < today) continue;
          const sh = day.shifts.find((x) => !isOver(day, x));
          if (sh) { next = { day, sh }; break; }
        }
        const tomorrow = toIso(new Date(Date.now() + 86400000));
        const whenLabel = (date) => (date === today ? 'Hoy' : date === tomorrow ? 'Mañana' : dayLabel(date).split(',')[0]);
        const workedDays = d.days.filter((x) => x.shifts.length > 0).length;
        const dayShort = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '');
        return (
          <div className={`space-y-5 ${q.isFetching ? 'opacity-60' : ''}`}>
            <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <p className="text-[13px] text-gray-500">{d.employee.name}{d.employee.position ? ` · ${d.employee.position}` : ''}</p>
              {next ? (
                <>
                  <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-violet-700">
                    {isNow(next.day, next.sh) ? 'Ahora' : 'Próximo turno'} · {whenLabel(next.day.date)}
                  </p>
                  <p className="mt-0.5 text-[34px] leading-10 font-semibold tracking-tight tabular-nums text-gray-900">{next.sh.start}–{next.sh.end}</p>
                  <p className="mt-1 text-[15px] text-gray-600">
                    {[next.sh.shiftName, next.sh.roleLabel].filter(Boolean).join(' · ') || hoursText(next.sh.minutes)}
                    {next.sh.coworkers.length > 0 && <span className="text-gray-500"> · con {next.sh.coworkers.join(', ')}</span>}
                  </p>
                  {next.sh.notes && <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[13px] text-amber-900">“{next.sh.notes}”</p>}
                </>
              ) : (
                <p className="mt-3 text-[22px] leading-7 font-semibold text-gray-900">
                  {d.shiftCount === 0 ? 'Sin turnos esta semana' : 'No te quedan más turnos esta semana'}
                </p>
              )}
              <div className="mt-4 pt-4 border-t border-gray-100 flex divide-x divide-gray-100">
                <div className="flex-1 pr-2"><p className="text-[17px] font-semibold tabular-nums text-gray-900">{d.shiftCount === 0 ? '0 h' : hoursText(d.totalMinutes)}</p><p className="text-[11px] text-gray-500">esta semana</p></div>
                <div className="flex-1 px-2 text-center"><p className="text-[17px] font-semibold tabular-nums text-gray-900">{d.shiftCount}</p><p className="text-[11px] text-gray-500">{d.shiftCount === 1 ? 'turno' : 'turnos'}</p></div>
                <div className="flex-1 pl-2 text-right"><p className="text-[17px] font-semibold tabular-nums text-gray-900">{7 - workedDays}</p><p className="text-[11px] text-gray-500">{7 - workedDays === 1 ? 'día libre' : 'días libres'}</p></div>
              </div>
            </section>

            <div className="rounded-2xl border border-gray-200 bg-white grid grid-cols-7 gap-1 p-1.5">
              {d.days.map((day) => {
                const isToday = day.date === today;
                const busy = day.shifts.length > 0;
                return (
                  <div key={day.date} className={`flex flex-col items-center py-1.5 rounded-xl ${isToday ? 'bg-gray-900' : ''}`}>
                    <span className={`text-[11px] font-semibold uppercase ${isToday ? 'text-gray-300' : 'text-gray-400'}`}>{dayShort(day.date)}</span>
                    <span className={`text-[15px] font-semibold tabular-nums ${isToday ? 'text-white' : 'text-gray-900'}`}>{Number(day.date.slice(8, 10))}</span>
                    <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${busy ? (isToday ? 'bg-white' : 'bg-violet-500') : 'bg-transparent'}`} />
                  </div>
                );
              })}
            </div>

            <List>
              {d.days.map((day) => {
                const isToday = day.date === today;
                const past = day.date < today;
                const dt = new Date(`${day.date}T12:00:00`);
                return (
                  <li key={day.date} className={`flex gap-4 px-2 py-3.5 rounded-xl ${isToday ? 'bg-violet-50/50' : ''} ${past ? 'opacity-60' : ''}`}>
                    <div className="w-11 shrink-0 text-center pt-0.5">
                      <p className={`text-[11px] font-semibold uppercase ${isToday ? 'text-violet-700' : 'text-gray-400'}`}>{dayShort(day.date)}</p>
                      <p className={`text-[20px] leading-6 font-semibold tabular-nums ${isToday ? 'text-violet-700' : 'text-gray-900'}`}>{dt.getDate()}</p>
                    </div>
                    <div className="min-w-0 flex-1 flex flex-col justify-center">
                      {(day.timeOff || []).map((t) => (
                        <p key={t.id} className={`mb-1.5 w-fit rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${t.status === 'approved' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                          {timeOffLabel(t.type)}{t.fromTime || t.toTime ? ` ${t.fromTime || ''}–${t.toTime || ''}` : ''}{t.status === 'pending' ? ' · pendiente' : ''}
                        </p>
                      ))}
                      {day.shifts.length === 0 ? (
                        <p className="text-sm text-gray-400">{(day.timeOff || []).length ? '' : 'Libre'}</p>
                      ) : (
                        <ul className="space-y-3">
                          {day.shifts.map((sh) => (
                            <li key={sh.id} className="flex items-start gap-3">
                              <span className={`w-[3px] self-stretch rounded-full shrink-0 ${past ? 'bg-gray-300' : 'bg-violet-500'}`} aria-hidden="true" />
                              <div className="min-w-0 flex-1">
                                <p className="flex flex-wrap items-center gap-x-2 text-[17px] font-semibold tabular-nums text-gray-900 whitespace-nowrap">
                                  {sh.start}–{sh.end}
                                  <span className="text-[13px] font-normal text-gray-500">{hoursText(sh.minutes)}</span>
                                  {isNow(day, sh) && <span className="text-[10px] font-semibold px-1.5 py-px rounded-full bg-emerald-100 text-emerald-700">Ahora</span>}
                                </p>
                                {(sh.shiftName || sh.roleLabel) && <p className="text-[13px] text-gray-600">{[sh.shiftName, sh.roleLabel].filter(Boolean).join(' · ')}</p>}
                                {sh.coworkers.length > 0 && <p className="text-[13px] text-gray-500">Con {sh.coworkers.join(', ')}</p>}
                                {sh.notes && <p className="mt-0.5 text-[13px] text-amber-700">“{sh.notes}”</p>}
                                {sh.swap ? (
                                  <p className="mt-1 text-[12px] font-semibold text-violet-700">Cesión en curso · {sh.swap.status === 'pending_manager' ? 'falta tu encargado' : 'esperando respuesta'}</p>
                                ) : !past && (
                                  <button type="button" onClick={() => setSwapShift({ shift: sh, dateText: dayLabel(day.date) })}
                                    className="mt-1 text-[13px] font-semibold text-violet-700 hover:text-violet-900">Ceder turno</button>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </li>
                );
              })}
            </List>
            <MyRequests part="bottom" incoming={swapsQ.data?.incoming || []} mine={swapsQ.data?.mine || []} timeOff={offQ.data || []} onChanged={refreshAll} />
            <p className="text-xs text-gray-400">Si algo no te cuadra, habla con tu encargado.</p>
          </div>
        );
      })()}

      {timeOffOpen && <TimeOffModal onClose={() => setTimeOffOpen(false)} onSaved={refreshAll} />}
      {swapShift && <SwapRequestModal shift={swapShift.shift} dateText={swapShift.dateText} onClose={() => setSwapShift(null)} onSaved={refreshAll} />}
    </Page>
  );
}
