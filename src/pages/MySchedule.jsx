import api from '../services/api';
import { useSetMobileHeader } from '../context/MobileHeaderContext';
import { useData } from '../lib/query';
import { Empty, PageHeader } from '../ui/kit';
import PeriodNavigator, { StickyBar, usePeriod } from '../ui/PeriodNavigator';
import { toIso } from '../lib/periods';

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
  useSetMobileHeader({ title: 'Mi horario', action: false });
  const { period, dateRange, onPeriodChange, onShift, onRangeChange } = usePeriod('week');
  const today = toIso();
  const q = useData(['staff', 'me', 'schedule', dateRange.from], () => api.get(`/staff/me/schedule?weekStart=${dateRange.from}`).then((r) => r.data), { retry: false });
  const d = q.data;

  const todayShifts = d?.linked ? (d.days.find((x) => x.date === today)?.shifts || []) : [];

  return (
    <div className="w-full space-y-6">
      <div className="hidden lg:block"><PageHeader title="Mi horario" subtitle="Tus turnos de la semana y con quién trabajas." /></div>

      <StickyBar>
        <PeriodNavigator period={period} dateRange={dateRange} onPeriodChange={onPeriodChange} onShift={onShift} onRangeChange={onRangeChange} periods={['week']} />
      </StickyBar>

      {q.isLoading && <p className="text-sm text-gray-400">Cargando…</p>}
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
        <div className={`space-y-6 ${q.isFetching ? 'opacity-60' : ''}`}>
          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <p className="text-[13px] font-semibold uppercase tracking-wide text-gray-400">{d.employee.name}{d.employee.position ? ` · ${d.employee.position}` : ''}</p>
            <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums text-gray-900">{d.shiftCount === 0 ? 'Sin turnos' : hoursText(d.totalMinutes)}</p>
            <p className="mt-1 text-[15px] text-gray-600">
              {d.shiftCount === 0 ? 'Esta semana no tienes turnos asignados.' : `${d.shiftCount} ${d.shiftCount === 1 ? 'turno' : 'turnos'} esta semana.`}
            </p>
            {todayShifts.length > 0 && (
              <p className="mt-3 rounded-xl bg-violet-50 px-3.5 py-2.5 text-sm text-violet-900">
                <b>Hoy:</b> {todayShifts.map((s) => `${s.start}–${s.end}`).join(' y ')}
              </p>
            )}
          </section>

          <ul className="space-y-3">
            {d.days.map((day) => {
              const isToday = day.date === today;
              return (
                <li key={day.date} className={`rounded-2xl border px-4 py-3 ${isToday ? 'border-violet-300 bg-violet-50/40' : 'border-gray-200 bg-white'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className={`text-sm font-semibold ${isToday ? 'text-violet-800' : 'text-gray-900'}`}>{dayLabel(day.date)}</p>
                    {isToday && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-violet-600 text-white">Hoy</span>}
                  </div>
                  {day.shifts.length === 0 ? (
                    <p className="mt-1 text-sm text-gray-400">Libre</p>
                  ) : (
                    <ul className="mt-2 space-y-2.5">
                      {day.shifts.map((s) => (
                        <li key={s.id} className="flex items-start gap-3">
                          <span className="w-[3px] self-stretch rounded-full bg-violet-500 shrink-0" aria-hidden="true" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[17px] font-semibold tabular-nums text-gray-900">{s.start}–{s.end} <span className="text-sm font-normal text-gray-500">· {hoursText(s.minutes)}</span></p>
                            {(s.shiftName || s.roleLabel) && <p className="text-[13px] text-gray-600">{[s.shiftName, s.roleLabel].filter(Boolean).join(' · ')}</p>}
                            {s.coworkers.length > 0 && <p className="text-[13px] text-gray-500">Con {s.coworkers.join(', ')}</p>}
                            {s.notes && <p className="mt-0.5 text-[13px] text-amber-700">“{s.notes}”</p>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-gray-400">Si algo no te cuadra, habla con tu encargado.</p>
        </div>
      )}
    </div>
  );
}
