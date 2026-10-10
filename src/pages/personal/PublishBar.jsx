import { useState } from 'react';
import api from '../../services/api';
import Modal from '../../components/Modal';
import { MenuButton } from '../../ui/kit';
import { Notice, SheetFooter } from './shared';
import { plural } from './timeOff';
import { confirmDialog } from '../../ui/confirm';

const when = (iso) => new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', '');

/**
 * Draft / published state of the week and the button to publish it. Employees only see a
 * week once it is published; republishing tells just the people whose shifts changed.
 */
export default function PublishBar({ status, weekStart, onChanged, className = '' }) {
  const [open, setOpen] = useState(false);
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  if (!status || (!status.published && status.assignments === 0)) return null;

  const dirty = status.published && status.changes > 0;
  const state = !status.published ? 'draft' : dirty ? 'dirty' : 'live';
  const tone = { draft: 'border-amber-200 bg-amber-50/70', dirty: 'border-amber-200 bg-amber-50/70', live: 'border-emerald-200 bg-emerald-50/60' }[state];

  const publish = async () => {
    setSaving(true);
    setError('');
    try {
      await api.post('/staff/schedule/publish', { weekStart, notify });
      setOpen(false);
      await onChanged?.();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo publicar');
    } finally {
      setSaving(false);
    }
  };
  const unpublish = async () => {
    if (!await confirmDialog('Tu equipo dejará de ver esta semana hasta que la vuelvas a publicar. ¿Continuar?')) return;
    try { await api.delete(`/staff/schedule/publish?weekStart=${weekStart}`); await onChanged?.(); } catch { /* ignore */ }
  };

  return (
    <>
      <div className={`flex items-center gap-2 px-1 text-[13px] text-gray-500 ${className}`}>
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${state === 'live' ? 'bg-emerald-500' : 'bg-amber-400'}`} aria-hidden="true" />
        <p className="min-w-0 flex-1 truncate">
          {state === 'draft' && 'Borrador · tu equipo aún no la ve'}
          {state === 'dirty' && `${plural(status.changes, 'cambio', 'cambios')} sin publicar`}
          {state === 'live' && `Publicada el ${when(status.publishedAt)}`}
        </p>
        {state !== 'live' && (
          <button type="button" onClick={() => { setError(''); setOpen(true); }} className="shrink-0 font-semibold text-violet-700 hover:underline">
            Publicar
          </button>
        )}
        {state === 'live' && (
          <MenuButton ariaLabel="Más opciones" className="w-8 h-8 justify-center text-gray-400" items={[{ label: 'Volver a borrador', onClick: unpublish }]}>
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4" aria-hidden="true"><path d="M2 8a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm4.5 0a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM12.5 6.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" /></svg>
          </MenuButton>
        )}
      </div>

      {open && (
        <Modal title={state === 'draft' ? 'Publicar la semana' : 'Publicar los cambios'} onClose={() => setOpen(false)} size="md"
          footer={<SheetFooter onCancel={() => setOpen(false)} onSave={publish} saving={saving} label={state === 'draft' ? 'Publicar' : 'Publicar cambios'} />}>
          <div className="space-y-4">
            <Notice>{error}</Notice>
            <p className="text-sm text-gray-700">
              {state === 'draft'
                ? 'Tu equipo podrá ver sus turnos de esta semana en “Mi horario”.'
                : `Tu equipo verá ${plural(status.changes, 'cambio', 'cambios')} que afectan a ${plural(status.employeesAffected, 'persona', 'personas')}.`}
            </p>
            <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-3 cursor-pointer">
              <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="mt-0.5 rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
              <span>
                <span className="block text-sm font-semibold text-gray-900">Avisar al equipo por email</span>
                <span className="block text-[13px] text-gray-500">
                  {notify
                    ? (state === 'draft' ? 'Les llegará una notificación y un email.' : 'Solo a quien ve cambiar su horario, con lo que cambia.')
                    : 'Se publica sin enviar ningún aviso; lo verán al abrir “Mi horario”.'}
                </span>
              </span>
            </label>
          </div>
        </Modal>
      )}
    </>
  );
}
