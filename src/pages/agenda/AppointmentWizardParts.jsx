import DayChips from '../../ui/DayChips';
import StaffAvatar from './StaffAvatar';
import { euros, initials, toMinutes } from './utils';
import { dayLabel } from '../../lib/dates';

const STEP_LABELS = ['Cliente', 'Servicio', 'Profesional', 'Hora'];
const searchCls = 'w-full h-12 rounded-xl border border-gray-200 bg-white pl-10 pr-3 text-base text-gray-900 outline-none placeholder:text-gray-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100';

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="w-4 h-4">
      <circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" strokeLinecap="round" />
    </svg>
  );
}

export function WizardHeader({ page, onStep }) {
  const active = page === 2 ? 3 : page;
  return (
    <div className="min-w-0 flex-1">
      <h3 className="text-base font-semibold text-gray-900">Nueva cita</h3>
      <div className="grid grid-cols-4 mt-3" aria-label="Progreso de la cita">
        {STEP_LABELS.map((label, index) => {
          const done = index < active;
          const current = index === active;
          const enabled = index <= active;
          const target = index < 2 ? index : 2;
          return (
            <button key={label} type="button" disabled={!enabled} onClick={() => enabled && onStep(target)}
              className="relative min-w-0 min-h-11 flex flex-col items-center gap-1 disabled:cursor-default" aria-current={current ? 'step' : undefined}>
              {index > 0 && <span className={`absolute top-[7px] right-1/2 w-full h-px ${done || current ? 'bg-violet-300' : 'bg-gray-200'}`} />}
              <span className={`relative z-10 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ring-4 ring-white ${
                done ? 'bg-violet-600 text-white' : current ? 'bg-violet-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                {done ? '✓' : current ? '' : ''}
              </span>
              <span className={`text-[10px] truncate max-w-full ${current ? 'font-semibold text-violet-700' : done ? 'font-medium text-gray-700' : 'text-gray-400'}`}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function StepHeading({ number, title, text, aside }) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-lg font-semibold tracking-tight text-gray-900"><span className="text-gray-400 mr-1.5">{number}.</span>{title}</h4>
        {aside}
      </div>
      {text && <p className="text-sm text-gray-500 mt-0.5">{text}</p>}
    </div>
  );
}

function CustomerAvatar({ name, size = 'w-10 h-10' }) {
  return <span className={`${size} rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold shrink-0`}>{initials(name)}</span>;
}

function CustomerRow({ customer, habitual, onClick }) {
  return (
    <button type="button" onClick={onClick} className="w-full min-h-14 flex items-center gap-3 py-2.5 text-left border-b border-gray-100 last:border-0 hover:bg-gray-50 active:bg-gray-100">
      <CustomerAvatar name={customer.name} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-gray-900 truncate">{customer.name}</span>
        <span className="block text-xs text-gray-500 truncate">{customer.phone || customer.email || 'Sin contacto'}{habitual ? ' · Cliente habitual' : ''}</span>
      </span>
      <span className="text-gray-300 text-lg" aria-hidden="true">›</span>
    </button>
  );
}

export function ClientStep({ guest, setGuest, picked, onPick, onChange, matches, recent, summaries, creating, setCreating, repeat, onRepeat }) {
  const query = guest.guestName.trim();
  return (
    <section>
      <StepHeading number="1" title="Cliente" text="Busca un cliente o crea uno nuevo" />
      {picked ? (
        <>
          <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-3">
            <CustomerAvatar name={picked.name} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 truncate">{guest.guestName}</p>
              <p className="text-xs text-gray-500 truncate">{guest.guestPhone || guest.guestEmail || 'Sin contacto'}</p>
            </div>
            <button type="button" onClick={onChange} className="min-h-11 px-2 text-xs font-semibold text-violet-700">Cambiar</button>
          </div>
          {repeat && (
            <button type="button" onClick={onRepeat} className="mt-4 w-full rounded-xl bg-violet-50 px-3.5 py-3 text-left hover:bg-violet-100">
              <span className="block text-xs font-semibold text-violet-700">⚡ Repetir última cita</span>
              <span className="block mt-1 text-sm font-semibold text-gray-900">{repeat.services}</span>
              <span className="block text-xs text-gray-500">{repeat.meta}</span>
            </button>
          )}
        </>
      ) : (
        <>
          <div className="sticky top-0 z-10 bg-white pb-2">
            <div className="relative">
              <span className="absolute left-3.5 top-4 text-gray-400"><SearchIcon /></span>
              <input className={searchCls} value={guest.guestName} placeholder="Nombre o teléfono" autoComplete="off" autoFocus
                onChange={(e) => setGuest((g) => ({ ...g, guestName: e.target.value }))} maxLength={100} />
            </div>
          </div>
          <div className="mt-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">{query ? 'Coincidencias' : 'Clientes recientes'}</p>
            {(query ? matches : recent).length ? (query ? matches : recent).map((customer) => (
              <CustomerRow key={customer._id} customer={customer} habitual={(summaries[customer._id]?.visits || 0) >= 3} onClick={() => onPick(customer)} />
            )) : (
              <p className="py-4 text-sm text-gray-500">{query.length < 2 ? 'Escribe al menos dos caracteres.' : 'No hay coincidencias. Puedes crear este cliente.'}</p>
            )}
          </div>
          {creating && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input className={searchCls.replace('pl-10', 'pl-3')} type="tel" placeholder="Teléfono" value={guest.guestPhone}
                onChange={(e) => setGuest((g) => ({ ...g, guestPhone: e.target.value }))} maxLength={30} />
              <input className={searchCls.replace('pl-10', 'pl-3')} type="email" placeholder="Email (opcional)" value={guest.guestEmail}
                onChange={(e) => setGuest((g) => ({ ...g, guestEmail: e.target.value }))} maxLength={200} />
            </div>
          )}
          <button type="button" onClick={() => setCreating(true)} className="mt-3 min-h-11 text-sm font-semibold text-violet-700">
            {creating ? 'Se guardará al crear la cita' : '+ Crear nuevo cliente'}
          </button>
        </>
      )}
    </section>
  );
}

export function CompactCustomer({ guest, onChange }) {
  return (
    <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-gray-100">
      <CustomerAvatar name={guest.guestName} size="w-9 h-9" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900 truncate">{guest.guestName}</p>
        <p className="text-xs text-gray-500 truncate">{guest.guestPhone || guest.guestEmail || 'Sin contacto'}</p>
      </div>
      <button type="button" onClick={onChange} className="min-h-11 px-2 text-xs font-semibold text-violet-700">Cambiar</button>
    </div>
  );
}

export function ServiceStep({ guest, onChangeClient, services, visibleServices, items, onToggle, onRemove, onClear, search, setSearch, category, setCategory, categories, partySize, setPartySize, minParty, maxParty }) {
  const selectedIds = new Set(items.map((item) => item.serviceId));
  const selected = items.map((item) => services.find((service) => service._id === item.serviceId)).filter(Boolean);
  const totalDuration = selected.reduce((sum, service) => sum + service.durationMin, 0);
  const total = selected.reduce((sum, service) => sum + (service.price?.amount || 0) * (service.price?.perPerson ? partySize : 1), 0);
  return (
    <section>
      <CompactCustomer guest={guest} onChange={onChangeClient} />
      <StepHeading number="2" title="Servicio" text="Selecciona uno o varios servicios" />
      <div className="sticky top-0 z-10 bg-white pb-2">
        <div className="relative">
          <span className="absolute left-3.5 top-4 text-gray-400"><SearchIcon /></span>
          <input className={searchCls} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar servicio…" />
        </div>
        {categories.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto mt-2 pb-1 -mx-1 px-1">
            {categories.map((name) => <button key={name} type="button" onClick={() => setCategory(name)}
              className={`shrink-0 h-10 px-3 rounded-full text-xs font-semibold ${category === name ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>{name || 'Sin categoría'}</button>)}
          </div>
        )}
      </div>
      <div className="divide-y divide-gray-100">
        {visibleServices.map((service) => {
          const on = selectedIds.has(service._id);
          return (
            <button key={service._id} type="button" onClick={() => onToggle(service._id)} className="w-full min-h-14 py-2.5 flex items-center gap-3 text-left hover:bg-gray-50 active:bg-gray-100">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-gray-900">{service.name}</span>
                <span className="block text-xs text-gray-500 mt-0.5">{service.durationMin} min · {euros(service.price?.amount)}</span>
              </span>
              <span className={`w-7 h-7 rounded-full border flex items-center justify-center text-lg font-medium ${on ? 'bg-violet-600 border-violet-600 text-white' : 'border-gray-200 text-violet-600'}`}>{on ? '✓' : '+'}</span>
            </button>
          );
        })}
      </div>
      {!visibleServices.length && <p className="py-6 text-sm text-gray-500 text-center">No hay servicios con ese filtro.</p>}
      {selected.length > 0 && (
        <div className="mt-4 rounded-xl bg-gray-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-gray-700">{selected.length} {selected.length === 1 ? 'servicio seleccionado' : 'servicios seleccionados'}</p>
            <button type="button" onClick={onClear} className="min-h-9 text-xs font-semibold text-gray-500">Vaciar</button>
          </div>
          <div className="mt-1 space-y-1">
            {selected.map((service, index) => (
              <div key={`${service._id}-${index}`} className="flex items-center gap-2 text-xs text-gray-700">
                <span className="min-w-0 flex-1 truncate">{index + 1}. {service.name}</span>
                <button type="button" onClick={() => onRemove(index)} className="w-10 h-10 -my-1 text-gray-400" aria-label={`Quitar ${service.name}`}>×</button>
              </div>
            ))}
          </div>
          <p className="mt-2 pt-2 border-t border-gray-200 text-xs font-semibold text-gray-900">{totalDuration} min · {euros(total)}</p>
        </div>
      )}
      {maxParty > 1 && (
        <label className="mt-4 flex items-center justify-between gap-3 text-sm font-medium text-gray-700">
          Personas
          <input type="number" min={minParty} max={maxParty} value={partySize} onChange={(e) => setPartySize(Number(e.target.value) || minParty)}
            className="w-24 h-11 rounded-xl border border-gray-200 px-3 text-right" />
        </label>
      )}
    </section>
  );
}

export function ScheduleStep({ guest, selectedServices, onChangeClient, onChangeServices, eligible, resourceId, setResourceId, colors, date, today, setDate, slots, time, setTime, showNotes, setShowNotes, notes, setNotes }) {
  const duration = selectedServices.reduce((sum, service) => sum + service.durationMin, 0);
  const morning = (slots || []).filter((slot) => toMinutes(slot.time) < 14 * 60 + 30);
  const afternoon = (slots || []).filter((slot) => toMinutes(slot.time) >= 14 * 60 + 30);
  const choiceCls = (on) => `shrink-0 h-11 rounded-xl border text-sm font-semibold transition-colors ${on ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400'}`;
  return (
    <section>
      <div className="pb-4 mb-4 border-b border-gray-100 space-y-2">
        <div className="flex items-center gap-2 text-sm"><span className="min-w-0 flex-1 truncate font-semibold text-gray-900">{guest.guestName}</span><button type="button" onClick={onChangeClient} className="min-h-9 text-xs font-semibold text-violet-700">Cambiar</button></div>
        <div className="flex items-center gap-2 text-sm"><span className="min-w-0 flex-1 truncate text-gray-600">{selectedServices.map((service) => service.name).join(' + ')} · {duration} min</span><button type="button" onClick={onChangeServices} className="min-h-9 text-xs font-semibold text-violet-700">Cambiar</button></div>
      </div>
      {eligible.length > 0 && (
        <div className="mb-6">
          <StepHeading number="3" title="Profesional" />
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            <button type="button" onClick={() => { setResourceId(''); setTime(''); }} className={`${choiceCls(!resourceId)} px-3.5`}>Cualquiera</button>
            {eligible.map((person) => (
              <button key={person._id} type="button" onClick={() => { setResourceId(person._id); setTime(''); }} className={`${choiceCls(resourceId === person._id)} pl-1.5 pr-3.5 inline-flex items-center gap-2`}>
                <StaffAvatar name={person.name} photo={person.photo} color={colors[person._id]} size={28} />{person.name}
              </button>
            ))}
          </div>
        </div>
      )}
      <StepHeading number={eligible.length ? '4' : '3'} title="Día y hora" />
      <DayChips date={date} today={today} onChange={(next) => { setDate(next); setTime(''); }} />
      <div className="mt-3 min-h-20" aria-live="polite">
        {slots === null ? <p className="py-3 text-sm text-gray-400">Buscando huecos…</p>
          : slots.length === 0 ? <p className="py-3 text-sm text-gray-500">No hay huecos libres este día{resourceId ? ' con esta persona' : ''}. Prueba otro día.</p>
            : [['Mañana', morning], ['Tarde', afternoon]].filter(([, list]) => list.length).map(([label, list]) => (
              <div key={label} className="mb-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">{label}</p>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                  {list.map((slot) => <button key={slot.time} type="button" onClick={() => setTime(slot.time)}
                    className={`h-11 rounded-xl border text-sm font-semibold tabular-nums transition-colors ${time === slot.time ? 'bg-violet-600 border-violet-600 text-white' : 'border-gray-200 text-gray-700 hover:border-gray-400'}`}>{slot.time}</button>)}
                </div>
              </div>
            ))}
      </div>
      {showNotes ? (
        <div className="mt-4 space-y-3">
          <label className="block text-xs font-semibold text-gray-700">Nota del cliente<textarea className="mt-1 w-full min-h-20 rounded-xl border border-gray-200 p-3 font-normal" value={notes.notes} onChange={(e) => setNotes('notes', e.target.value)} maxLength={1000} /></label>
          <label className="block text-xs font-semibold text-gray-700">Nota interna <span className="font-normal text-gray-400">(no la ve el cliente)</span><textarea className="mt-1 w-full min-h-20 rounded-xl border border-gray-200 p-3 font-normal" value={notes.internalNotes} onChange={(e) => setNotes('internalNotes', e.target.value)} maxLength={2000} /></label>
        </div>
      ) : <button type="button" onClick={() => setShowNotes(true)} className="mt-3 min-h-11 text-sm font-semibold text-violet-700">+ Añadir una nota</button>}
    </section>
  );
}

export function AppointmentFooter({ page, date, today, time, duration, services, total, canContinue, saving, error, onContinue, onSubmit }) {
  const end = time ? (() => { const value = toMinutes(time) + duration; return `${String(Math.floor(value / 60) % 24).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`; })() : '';
  return (
    <div>
      {error && <p className="text-xs text-rose-600 mb-2">{error}</p>}
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          {page === 0 && <><p className="text-xs text-gray-500">Paso 1 de 4</p><p className="text-sm font-semibold text-gray-900 truncate">{canContinue ? 'Cliente listo' : 'Elige o crea un cliente'}</p></>}
          {page === 1 && <><p className="text-xs text-gray-500">{services.length ? `${services.length} ${services.length === 1 ? 'servicio' : 'servicios'} · ${duration} min` : 'Selecciona un servicio'}</p><p className="text-base font-semibold text-gray-900 tabular-nums">{services.length ? euros(total) : '—'}</p></>}
          {page === 2 && <><p className="text-xs text-gray-500 truncate">{dayLabel(date, today)}{time ? ` · ${time}–${end}` : ' · Elige una hora'}</p><p className="text-sm font-semibold text-gray-900 truncate">{services.map((service) => service.name).join(' + ')}{services.length ? ` · ${euros(total)}` : ''}</p></>}
        </div>
        <button type="button" disabled={!canContinue || saving} onClick={page === 2 ? onSubmit : onContinue}
          className="h-12 min-w-32 px-5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed">
          {saving ? 'Guardando…' : page === 2 ? 'Crear cita' : 'Continuar'}
        </button>
      </div>
    </div>
  );
}
