import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { bookingsApi, apiError } from '../../services/bookingsApi';
import { ResourceScheduleModal } from '../agenda/AgendaSettings';
import {
  btnPrimary,
  btnSecondary,
  inputCls,
  resizeImage,
  STAFF_COLORS,
  summarizeRules,
  todayIn,
  DEFAULT_TZ,
  euros,
} from '../agenda/utils';
import { useUnsavedChanges } from '../../lib/unsavedChanges';
import CalendarLink from './CalendarLink';

export default function ProfessionalGeneral({
  resource,
  schedule,
  businessHours,
  color,
  onSaved,
}) {
  const { business, isModuleEnabled, hasRole } = useAuth();
  const [summary, setSummary] = useState(null);
  const [summaryError, setSummaryError] = useState('');
  const [name, setName] = useState(resource.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editingHours, setEditingHours] = useState(false);
  const dirty = name.trim() !== resource.name;
  useUnsavedChanges('nombre del profesional', dirty);
  async function update(patch) {
    setBusy(true);
    setError('');
    try {
      await bookingsApi.updateResource(resource._id, patch);
      onSaved();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }
  async function photo(file) {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      await bookingsApi.updateResource(resource._id, {
        photo: await resizeImage(file, { max: 160, square: true }),
      });
      onSaved();
    } catch (err) {
      setError(apiError(err, err.message));
    } finally {
      setBusy(false);
    }
  }
  const hours = schedule?._id ? schedule : businessHours;
  const today = todayIn(business?.timezone || DEFAULT_TZ);
  const canSeeResults = hasRole('manager') && isModuleEnabled('staff');
  useEffect(() => {
    if (!canSeeResults) return;
    let live = true;
    setSummary(null);
    setSummaryError('');
    bookingsApi
      .team(`${today.slice(0, 7)}-01`, today)
      .then((data) => {
        if (live)
          setSummary(data.staff.find((p) => p.id === resource._id) || null);
      })
      .catch((err) => {
        if (live) setSummaryError(apiError(err));
      });
    return () => {
      live = false;
    };
  }, [resource._id, today, canSeeResults]);
  const upcoming = (hours?.overrides || [])
    .filter((o) => o.closed && (o.to || o.from) >= today)
    .sort((a, b) => a.from.localeCompare(b.from));
  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          update({ name: name.trim() });
        }}
        className="space-y-3"
      >
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
        {dirty && (
          <button className={btnPrimary} disabled={busy || !name.trim()}>
            Guardar nombre
          </button>
        )}
      </form>
      <section className="space-y-3">
        <h2 className="font-semibold">Foto y color</h2>
        <div className="flex flex-wrap gap-1">
          {STAFF_COLORS.map((c) => (
            <button
              key={c}
              disabled={busy}
              aria-label={`Color ${c}`}
              aria-pressed={color === c}
              onClick={() => update({ color: c })}
              className={`w-11 h-11 rounded-full border-4 ${color === c ? 'border-gray-900' : 'border-white'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <label className="block text-sm">
          Subir foto
          <input
            disabled={busy}
            type="file"
            accept="image/*"
            className="block w-full text-sm mt-2"
            onChange={(e) => {
              photo(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>
        {resource.photo && (
          <button
            disabled={busy}
            className="min-h-11 text-sm text-rose-700"
            onClick={() => update({ photo: null })}
          >
            Quitar foto
          </button>
        )}
        <label className="flex items-center gap-2 min-h-11 text-sm">
          <input
            disabled={busy}
            type="checkbox"
            checked={resource.showPhotoToClients !== false}
            onChange={(e) => update({ showPhotoToClients: e.target.checked })}
          />
          Mostrar foto a clientes al reservar
        </label>
        <p className="text-xs text-gray-500">
          La foto siempre se muestra dentro de la empresa.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-semibold">Horario</h2>
        <p className="text-sm text-gray-500">
          {!schedule
            ? 'No se pudo cargar el horario propio.'
            : schedule._id
              ? 'Tiene horario propio'
              : 'Sigue el horario del negocio'}
        </p>
        <p className="text-sm">{summarizeRules(hours?.rules || [])}</p>
        <button className={btnSecondary} onClick={() => setEditingHours(true)}>
          Editar horario
        </button>
      </section>
      <section className="space-y-2">
        <h2 className="font-semibold">Próximas vacaciones y cierres</h2>
        {upcoming.length ? (
          <ul className="text-sm text-gray-500 space-y-2">
            {upcoming.map((o, i) => (
              <li key={i}>
                {o.from} — {o.to || o.from}
                {o.reason && ` · ${o.reason}`}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">Ninguna en su horario.</p>
        )}
        <button
          className="min-h-11 text-sm text-violet-700"
          onClick={() => setEditingHours(true)}
        >
          Gestionar
        </button>
      </section>
      <section className="space-y-2">
        <h2 className="font-semibold">Agenda</h2>
        {summary && (
          <p className="text-sm text-gray-500">
            {summary.appointments} citas atendidas este mes ·{' '}
            {euros(summary.billed + summary.products)} generado
          </p>
        )}
        {summaryError && (
          <p className="text-sm text-rose-700">{summaryError}</p>
        )}
        <Link
          className="inline-flex min-h-11 items-center text-sm text-violet-700"
          to={`/agenda?staff=${resource._id}`}
        >
          Ver agenda de {resource.name} →
        </Link>
      </section>
      {resource.active !== false && <CalendarLink resource={resource} />}
      <section className="space-y-2">
        <h2 className="font-semibold">Disponibilidad</h2>
        <label className="flex items-center gap-2 min-h-11 text-sm">
          <input
            disabled={busy}
            type="checkbox"
            checked={resource.bookableOnline !== false}
            onChange={(e) => update({ bookableOnline: e.target.checked })}
          />
          Permitir reservas online
        </label>
        <button
          disabled={busy}
          className="min-h-11 text-sm text-rose-700"
          onClick={() => {
            if (
              window.confirm(
                resource.active === false
                  ? '¿Reactivar este profesional? Se aplican los límites de tu plan.'
                  : '¿Desactivar este profesional? Sus citas e historial se conservan. Su acceso a Vetra se gestiona por separado.',
              )
            )
              update({ active: resource.active === false });
          }}
        >
          {resource.active === false
            ? 'Reactivar profesional'
            : 'Desactivar profesional'}
        </button>
      </section>
      {error && (
        <p role="alert" className="text-sm text-rose-700">
          {error}
        </p>
      )}
      {editingHours && (
        <ResourceScheduleModal
          resource={resource}
          onClose={() => setEditingHours(false)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
