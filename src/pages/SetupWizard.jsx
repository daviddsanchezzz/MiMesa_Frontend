import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { bookingsApi, apiError } from '../services/bookingsApi';
import ScheduleEditor, { scheduleForApi } from './agenda/ScheduleEditor';
import ShareLink from './agenda/ShareLink';
import PublicAddressEditor from '../components/PublicAddressEditor';
import { btnPrimary, btnSecondary, centsToInput, inputCls, parseEuros, summarizeRules } from './agenda/utils';
import { ErrorBanner } from '../ui/feedback';

const STEPS = [
  ['horario', 'Horario'],
  ['servicios', 'Servicios'],
  ['tu', 'Tu agenda'],
  ['pagina', 'Tu página'],
];

const DURATIONS = [15, 20, 30, 45, 60, 75, 90, 120, 150, 180];

/**
 * First steps of a new appointment business (after sign-up): opening hours,
 * services with price and duration, the owner as professional, and the booking
 * page to share. Everything is saved as you go; it can be left at any step.
 */
export default function SetupWizard() {
  const navigate = useNavigate();
  const { business, session } = useAuth();
  const [step, setStep] = useState(0);
  const [schedule, setSchedule] = useState(null);
  const [services, setServices] = useState(null);
  const [me, setMe] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([bookingsApi.schedule(), bookingsApi.services(), bookingsApi.resources()])
      .then(([s, sv, r]) => {
        setSchedule({ rules: s?.rules?.length ? s.rules : [{ days: [1, 2, 3, 4, 5], start: '09:00', end: '14:00' }], overrides: s?.overrides || [] });
        setServices(sv.map((x) => ({ ...x, priceText: centsToInput(x.price?.amount) })));
        setMe(r.find((x) => x.kind === 'staff') || null);
      })
      .catch((err) => setError(apiError(err)));
  }, []);

  async function next(fn) {
    setBusy(true);
    setError('');
    try {
      if (fn) await fn();
      if (step < STEPS.length - 1) setStep(step + 1);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError(apiError(err, err.message));
    } finally {
      setBusy(false);
    }
  }

  const ready = schedule && services;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-xl space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/logo.svg" alt="" className="w-9 h-9" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{business?.name}</p>
              <p className="text-xs text-gray-500">Paso {step + 1} de {STEPS.length}</p>
            </div>
          </div>
          <Link to="/" className="text-sm font-medium text-gray-500 hover:text-gray-800">Terminar luego</Link>
        </div>

        <ol className="grid grid-cols-4 gap-1.5" aria-label="Pasos">
          {STEPS.map(([key, label], i) => (
            <li key={key}>
              <button type="button" onClick={() => i < step && setStep(i)} disabled={i >= step}
                className="w-full text-left disabled:cursor-default">
                <span className={`block h-1.5 rounded-full ${i <= step ? 'bg-violet-600' : 'bg-gray-200'}`} />
                <span className={`block mt-1.5 text-[11px] font-medium ${i === step ? 'text-violet-700' : 'text-gray-500'}`}>{label}</span>
              </button>
            </li>
          ))}
        </ol>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 space-y-5">
          {!ready && !error && <div className="h-40 animate-pulse rounded-xl bg-gray-100" />}

          {ready && step === 0 && (
            <>
              <Header title="¿Cuándo abres?" text="Tus clientes solo podrán reservar dentro de este horario. Añade una franja por la tarde si cierras a mediodía." />
              <ScheduleEditor value={schedule} onChange={setSchedule} showOverrides={false} />
              {schedule.rules.some((r) => r.days.length) && (
                <p className="text-xs text-gray-500">Resumen: {summarizeRules(scheduleForApi(schedule).rules)}</p>
              )}
              <Footer busy={busy} onNext={() => next(() => bookingsApi.saveSchedule(scheduleForApi(schedule)))} />
            </>
          )}

          {ready && step === 1 && (
            <ServicesStep services={services} setServices={setServices} busy={busy}
              onBack={() => setStep(0)} onNext={(save) => next(save)} />
          )}

          {ready && step === 2 && (
            <MeStep me={me} setMe={setMe} ownerName={session?.user?.name} busy={busy}
              onBack={() => setStep(1)} onNext={(save) => next(save)} />
          )}

          {ready && step === 3 && (
            <>
              <Header title="Tu página de reservas" text="Ya está lista. Elige su dirección y compártela: tus clientes reservan solos, a cualquier hora." />
              <PublicAddressEditor />
              <div className="pt-3 border-t border-gray-100"><ShareLink /></div>
              <div className="flex justify-between gap-2 pt-1">
                <button type="button" className={btnSecondary} onClick={() => setStep(2)}>Atrás</button>
                <button type="button" className={btnPrimary} onClick={() => navigate('/agenda')}>Ir a mi agenda</button>
              </div>
            </>
          )}

          {error && <ErrorBanner>{error}</ErrorBanner>}
        </div>
        <p className="text-center text-xs text-gray-400">Todo se puede cambiar después en Configuración.</p>
      </div>
    </div>
  );
}

function Header({ title, text }) {
  return (
    <div>
      <h1 className="text-lg font-bold text-gray-900">{title}</h1>
      <p className="text-sm text-gray-500 mt-1">{text}</p>
    </div>
  );
}

function Footer({ busy, onNext, onBack, nextLabel = 'Siguiente' }) {
  return (
    <div className="flex justify-between gap-2 pt-1">
      {onBack ? <button type="button" className={btnSecondary} onClick={onBack} disabled={busy}>Atrás</button> : <span />}
      <button type="button" className={btnPrimary} onClick={onNext} disabled={busy}>{busy ? 'Guardando…' : nextLabel}</button>
    </div>
  );
}

function ServicesStep({ services, setServices, busy, onBack, onNext }) {
  const [draft, setDraft] = useState({ name: '', durationMin: 30, priceText: '' });
  const active = services.filter((s) => s.active !== false);
  const update = (id, patch) => setServices((list) => list.map((s) => (s._id === id ? { ...s, ...patch, dirty: true } : s)));

  function add() {
    const name = draft.name.trim();
    if (!name) return;
    setServices((list) => [...list, { _id: `new-${Date.now()}`, isNew: true, name, durationMin: draft.durationMin, priceText: draft.priceText, active: true, dirty: true }]);
    setDraft({ name: '', durationMin: 30, priceText: '' });
  }

  async function save() {
    for (const s of services) {
      if (!s.dirty) continue;
      const cents = parseEuros(s.priceText);
      if (cents === null) throw new Error(`El precio de «${s.name}» no es válido`);
      if (s.isNew) {
        if (s.active === false) continue;
        await bookingsApi.createService({
          name: s.name, durationMin: s.durationMin, slotIntervalMin: 15, price: { amount: cents, currency: 'eur' },
          requirements: [{ kind: 'staff', count: 1, customerCanChoose: true }],
          onlineBooking: { enabled: true, minNoticeHours: 1, maxDaysAhead: 60 },
        });
      } else {
        await bookingsApi.updateService(s._id, { name: s.name, durationMin: s.durationMin, price: { amount: cents, currency: 'eur' }, active: s.active !== false });
      }
    }
    const fresh = await bookingsApi.services();
    setServices(fresh.map((x) => ({ ...x, priceText: centsToInput(x.price?.amount) })));
    if (!fresh.length) throw new Error('Añade al menos un servicio para que puedan reservar.');
  }

  return (
    <>
      <Header title="¿Qué ofreces?" text="Cada servicio con lo que dura y lo que cuesta. La duración decide qué huecos se ofrecen." />
      <ul className="space-y-2">
        {services.map((s) => (
          <li key={s._id} className={`rounded-xl border px-3 py-2.5 ${s.active === false ? 'border-gray-100 bg-gray-50' : 'border-gray-200'}`}>
            <div className="flex items-center gap-2">
              <input className={`${inputCls} !py-1.5 flex-1 min-w-0 ${s.active === false ? 'text-gray-400 line-through' : ''}`} value={s.name}
                onChange={(e) => update(s._id, { name: e.target.value })} aria-label="Nombre del servicio" disabled={s.active === false} />
              <button type="button" className="text-xs font-medium text-gray-500 hover:text-gray-800 shrink-0 px-1"
                onClick={() => update(s._id, { active: s.active === false })}>
                {s.active === false ? 'Recuperar' : 'Quitar'}
              </button>
            </div>
            {s.active !== false && (
              <div className="flex items-center gap-2 mt-2">
                <select className={`${inputCls} !py-1.5 !w-auto`} value={s.durationMin} aria-label="Duración"
                  onChange={(e) => update(s._id, { durationMin: Number(e.target.value) })}>
                  {[...new Set([...DURATIONS, s.durationMin])].sort((a, b) => a - b).map((d) => <option key={d} value={d}>{d} min</option>)}
                </select>
                <div className="relative w-28">
                  <input className={`${inputCls} !py-1.5 pr-7`} inputMode="decimal" value={s.priceText} placeholder="0" aria-label="Precio"
                    onChange={(e) => update(s._id, { priceText: e.target.value })} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">€</span>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="rounded-xl bg-gray-50 p-3 space-y-2">
        <p className="text-xs font-semibold text-gray-600">Añadir un servicio</p>
        <input className={`${inputCls} bg-white`} placeholder="Ej.: Corte y peinado" value={draft.name} maxLength={120}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
        <div className="grid grid-cols-2 sm:grid-cols-[auto_8rem_auto] gap-2">
          <select className={`${inputCls} bg-white`} value={draft.durationMin} onChange={(e) => setDraft({ ...draft, durationMin: Number(e.target.value) })} aria-label="Duración">
            {DURATIONS.map((d) => <option key={d} value={d}>{d} min</option>)}
          </select>
          <div className="relative">
            <input className={`${inputCls} bg-white pr-8`} inputMode="decimal" placeholder="Precio" value={draft.priceText}
              onChange={(e) => setDraft({ ...draft, priceText: e.target.value })} aria-label="Precio" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">€</span>
          </div>
          <button type="button" className={`${btnSecondary} bg-white col-span-2 sm:col-span-1`} onClick={add} disabled={!draft.name.trim()}>Añadir</button>
        </div>
      </div>
      {!active.length && <p className="text-xs text-amber-700">Añade al menos un servicio para que puedan reservar.</p>}
      <Footer busy={busy} onBack={onBack} onNext={() => onNext(save)} />
    </>
  );
}

function MeStep({ me, setMe, ownerName, busy, onBack, onNext }) {
  const suggested = useMemo(() => (ownerName || '').trim().split(/\s+/)[0] || '', [ownerName]);
  const [name, setName] = useState(me?.name || suggested);

  async function save() {
    const clean = name.trim();
    if (!clean) throw new Error('Escribe cómo te verán tus clientes');
    if (me) {
      if (clean !== me.name) setMe(await bookingsApi.updateResource(me._id, { name: clean }));
    } else {
      setMe(await bookingsApi.createResource({ kind: 'staff', name: clean }));
    }
  }

  return (
    <>
      <Header title="Tú en la agenda" text="Las citas se apuntan a tu nombre. Así te verán tus clientes al reservar." />
      <label className="block">
        <span className="block text-xs font-medium text-gray-600 mb-1.5">Tu nombre</span>
        <input className={inputCls} value={name} maxLength={100} onChange={(e) => setName(e.target.value)} placeholder="Laura" />
      </label>
      <p className="text-xs text-gray-500">
        ¿Trabajáis más personas? Con el plan Pro cada una tiene su agenda, su horario y sus servicios. Podrás añadirlas en Configuración → Profesionales.
      </p>
      <Footer busy={busy} onBack={onBack} onNext={() => onNext(save)} />
    </>
  );
}
