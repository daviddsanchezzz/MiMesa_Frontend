import { DAY_LABELS, inputCls, labelCls, toHHMM } from './utils';

// 24h time picker in 15-minute steps (native time inputs follow the OS locale).
const TIMES = Array.from({ length: 97 }, (_, i) => toHHMM(i * 15));
function TimeSelect({ value, onChange }) {
  const options = TIMES.includes(value) ? TIMES : [...TIMES, value].sort();
  return (
    <select className={`${inputCls} !w-24 !py-1.5 !px-2 tabular-nums`} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((t) => <option key={t} value={t}>{t}</option>)}
    </select>
  );
}

const emptyRule = () => ({ days: [1, 2, 3, 4, 5], start: '09:00', end: '14:00' });

/**
 * Edits weekly rules + date exceptions. Controlled: value = { rules, overrides }.
 */
export default function ScheduleEditor({ value, onChange, showOverrides = true }) {
  const rules = value?.rules || [];
  const overrides = value?.overrides || [];
  const set = (patch) => onChange({ rules, overrides, ...patch });

  const updateRule = (i, patch) => set({ rules: rules.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) });
  const toggleDay = (i, day) => {
    const days = rules[i].days.includes(day) ? rules[i].days.filter((d) => d !== day) : [...rules[i].days, day];
    updateRule(i, { days });
  };
  const updateOverride = (i, patch) => set({ overrides: overrides.map((o, idx) => (idx === i ? { ...o, ...patch } : o)) });

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className={labelCls}>Horario semanal</p>
        {rules.length === 0 && <p className="text-xs text-gray-400">Sin tramos: cerrado todos los días.</p>}
        {rules.map((r, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2 border border-gray-100 rounded-xl p-2.5">
            <div className="flex gap-1">
              {DAY_LABELS.map((d) => (
                <button key={d.value} type="button" title={d.long} onClick={() => toggleDay(i, d.value)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold border transition-colors ${
                    r.days.includes(d.value) ? 'bg-violet-600 border-violet-600 text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-violet-300'}`}>
                  {d.short}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <TimeSelect value={r.start} onChange={(v) => updateRule(i, { start: v })} />
              <span className="text-gray-400 text-sm">–</span>
              <TimeSelect value={r.end} onChange={(v) => updateRule(i, { end: v })} />
            </div>
            <button type="button" className="ml-auto text-xs text-gray-400 hover:text-rose-600" onClick={() => set({ rules: rules.filter((_, idx) => idx !== i) })}>
              Quitar
            </button>
          </div>
        ))}
        <button type="button" className="text-xs font-semibold text-violet-600 hover:text-violet-800" onClick={() => set({ rules: [...rules, emptyRule()] })}>
          + Añadir tramo
        </button>
      </div>

      {showOverrides && (
        <div className="space-y-2">
          <p className={labelCls}>Cierres y horarios especiales</p>
          {overrides.length === 0 && <p className="text-xs text-gray-400">Ninguno. Añade festivos, vacaciones o días con otro horario.</p>}
          {overrides.map((o, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 border border-gray-100 rounded-xl p-2.5">
              <input type="date" className={`${inputCls} !w-40 !py-1.5`} value={o.from} onChange={(e) => updateOverride(i, { from: e.target.value, to: o.to < e.target.value ? e.target.value : o.to })} />
              <span className="text-gray-400 text-sm">a</span>
              <input type="date" className={`${inputCls} !w-40 !py-1.5`} value={o.to || o.from} min={o.from} onChange={(e) => updateOverride(i, { to: e.target.value })} />
              <select className={`${inputCls} !w-36 !py-1.5`} value={o.closed ? 'closed' : 'hours'}
                onChange={(e) => updateOverride(i, e.target.value === 'closed'
                  ? { closed: true, windows: undefined }
                  : { closed: false, windows: o.windows?.length ? o.windows : [{ start: '09:00', end: '14:00' }] })}>
                <option value="closed">Cerrado</option>
                <option value="hours">Otro horario</option>
              </select>
              {!o.closed && (o.windows || []).map((w, wi) => (
                <div key={wi} className="flex items-center gap-1.5">
                  <TimeSelect value={w.start} onChange={(v) => updateOverride(i, { windows: o.windows.map((x, xi) => (xi === wi ? { ...x, start: v } : x)) })} />
                  <span className="text-gray-400 text-sm">–</span>
                  <TimeSelect value={w.end} onChange={(v) => updateOverride(i, { windows: o.windows.map((x, xi) => (xi === wi ? { ...x, end: v } : x)) })} />
                </div>
              ))}
              <input className={`${inputCls} !w-44 !py-1.5`} placeholder="Motivo (opcional)" value={o.reason || ''} maxLength={120}
                onChange={(e) => updateOverride(i, { reason: e.target.value })} />
              <button type="button" className="ml-auto text-xs text-gray-400 hover:text-rose-600" onClick={() => set({ overrides: overrides.filter((_, idx) => idx !== i) })}>
                Quitar
              </button>
            </div>
          ))}
          <button type="button" className="text-xs font-semibold text-violet-600 hover:text-violet-800"
            onClick={() => {
              const today = new Date().toISOString().slice(0, 10);
              set({ overrides: [...overrides, { from: today, to: today, closed: true, reason: '' }] });
            }}>
            + Añadir cierre o día especial
          </button>
        </div>
      )}
    </div>
  );
}

// Strips UI-only fields before sending to the API.
export function scheduleForApi(value) {
  return {
    rules: (value.rules || []).filter((r) => r.days.length).map(({ days, start, end, label }) => ({ days, start, end, ...(label ? { label } : {}) })),
    overrides: (value.overrides || []).map((o) => ({
      from: o.from, to: o.to || o.from, closed: !!o.closed, reason: o.reason || '',
      ...(o.closed ? {} : { windows: (o.windows || []).map(({ start, end }) => ({ start, end })) }),
    })),
  };
}
