import { useState } from 'react';
import Modal from '../../components/Modal';
import api from '../../services/api';
import { bookingsApi, apiError } from '../../services/bookingsApi';
import ScheduleEditor, { scheduleForApi } from '../agenda/ScheduleEditor';
import { btnPrimary, inputCls, STAFF_COLORS, euros } from '../agenda/utils';
import { InviteFields } from './ProfessionalAccess';

export default function CreateProfessional({
  services,
  onClose,
  onSaved,
  maxPros,
  count,
}) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [color, setColor] = useState(STAFF_COLORS[0]);
  const [selected, setSelected] = useState([]);
  const [own, setOwn] = useState(false);
  const [schedule, setSchedule] = useState({
    rules: [{ days: [1, 2, 3, 4, 5], start: '09:00', end: '17:00' }],
    overrides: [],
  });
  const [access, setAccess] = useState(false);
  const [invite, setInvite] = useState({ email: '', role: 'staff' });
  const [created, setCreated] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save(e) {
    e.preventDefault();
    if (step < 2) {
      setStep(step + 1);
      return;
    }
    setBusy(true);
    setError('');
    try {
      // Keep the ID after partial success: retry never creates a duplicate.
      const r =
        created ||
        (await bookingsApi.createResource({
          kind: 'staff',
          name: name.trim(),
          color,
        }));
      setCreated(r);
      await bookingsApi.setResourceServices(r._id, selected);
      if (own)
        await bookingsApi.saveSchedule({
          ownerType: 'resource',
          ownerId: r._id,
          ...scheduleForApi(schedule),
        });
      if (access)
        await api.post('/invitations', {
          name: r.name,
          ...invite,
          links: { resourceId: r._id },
        });
      onSaved(r);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Nuevo profesional"
      onClose={() => {
        if (!busy) {
          if (created) onSaved(created);
          else onClose();
        }
      }}
      size="lg"
    >
      <form className="space-y-5" onSubmit={save}>
        <p className="text-xs text-gray-500">
          Paso {step + 1} de 3 ·{' '}
          {['Datos y servicios', 'Horario', 'Acceso opcional'][step]}
        </p>
        {step === 0 && (
          <>
            <label className="block text-sm">
              Nombre
              <input
                required
                maxLength={120}
                className={inputCls}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <div className="flex flex-wrap gap-1" aria-label="Color">
              {STAFF_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  aria-label={`Color ${c}`}
                  aria-pressed={color === c}
                  onClick={() => setColor(c)}
                  className={`w-11 h-11 rounded-full border-4 ${color === c ? 'border-gray-900' : 'border-white'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <fieldset className="space-y-1">
              <legend className="font-medium text-sm">
                Servicios que realiza
              </legend>
              {services.map((s) => (
                <label
                  key={s._id}
                  className="flex items-center gap-3 min-h-11 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(s._id)}
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? [...selected, s._id]
                          : selected.filter((id) => id !== s._id),
                      )
                    }
                  />
                  <span className="flex-1">{s.name}</span>
                  <span className="text-xs text-gray-500">
                    {s.durationMin} min · {euros(s.price?.amount)}
                  </span>
                </label>
              ))}
              {!services.length && (
                <p className="text-sm text-gray-500">
                  Podrás asignarle servicios cuando los crees en Configuración.
                </p>
              )}
            </fieldset>
          </>
        )}
        {step === 1 && (
          <>
            <label className="flex gap-2 min-h-11 items-center text-sm">
              <input
                type="checkbox"
                checked={own}
                onChange={(e) => setOwn(e.target.checked)}
              />
              Tiene su propio horario y vacaciones
            </label>
            {own ? (
              <ScheduleEditor value={schedule} onChange={setSchedule} />
            ) : (
              <p className="text-sm text-gray-500">
                Seguirá el horario del negocio.
              </p>
            )}
          </>
        )}
        {step === 2 && (
          <>
            <label className="flex gap-2 min-h-11 items-center">
              <input
                type="checkbox"
                checked={access}
                onChange={(e) => setAccess(e.target.checked)}
              />
              Dar acceso a Vetra
            </label>
            <p className="text-sm text-gray-500">
              Puede recibir citas sin cuenta. Si le das acceso, podrá iniciar
              sesión y gestionar las funciones permitidas por su rol.
            </p>
            {access && <InviteFields value={invite} onChange={setInvite} />}
            <p className="text-xs text-gray-500">
              La disponibilidad depende de los servicios asignados y del
              horario. Se aplican los límites y la tarifa por profesional de tu
              suscripción.
            </p>
            {typeof maxPros === 'number' && count >= maxPros && (
              <p className="text-sm text-amber-700">
                Has alcanzado los {maxPros} profesionales incluidos en tu plan.
              </p>
            )}
          </>
        )}
        {error && (
          <p role="alert" className="text-sm text-rose-700">
            {created &&
              'El profesional ya se ha creado. Puedes reintentar la configuración pendiente o abrir su ficha. '}
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3">
          {step > 0 && !created && (
            <button
              type="button"
              disabled={busy}
              className="min-h-11 text-sm"
              onClick={() => setStep(step - 1)}
            >
              Atrás
            </button>
          )}
          {created && (
            <button
              type="button"
              disabled={busy}
              className="min-h-11 text-sm"
              onClick={() => onSaved(created)}
            >
              Abrir ficha
            </button>
          )}
          <button
            className={btnPrimary}
            disabled={busy || (step === 0 && !name.trim())}
          >
            {busy
              ? 'Guardando…'
              : step < 2
                ? 'Continuar'
                : created
                  ? 'Reintentar'
                  : 'Crear profesional'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
