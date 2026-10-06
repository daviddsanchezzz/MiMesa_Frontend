import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PlanGate from '../../components/PlanGate';

export function LimitesSection() {
  const { business, refreshBusiness } = useAuth();
  const [maxReservationPeople, setMaxReservationPeople] = useState(business?.maxReservationPeople || 20);
  const [maxPeoplePerSlot, setMaxPeoplePerSlot] = useState(business?.maxPeoplePerSlot || '');
  const [reservationDuration, setReservationDuration] = useState(business?.reservationDuration || '');
  const [minBookingNoticeHours, setMinBookingNoticeHours] = useState(business?.minBookingNoticeHours || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (business?.maxReservationPeople) setMaxReservationPeople(business.maxReservationPeople);
    setMaxPeoplePerSlot(business?.maxPeoplePerSlot || '');
    setReservationDuration(business?.reservationDuration || '');
    setMinBookingNoticeHours(business?.minBookingNoticeHours || '');
  }, [business]);

  const handleSaveLimits = async () => {
    setSaving(true);
    try {
      const maxPpl = maxReservationPeople === '' ? null : Number(maxReservationPeople);
      const perSlot = maxPeoplePerSlot === '' ? null : Number(maxPeoplePerSlot);
      const duration = reservationDuration === '' ? null : Number(reservationDuration);
      const minNotice = minBookingNoticeHours === '' ? 0 : Number(minBookingNoticeHours);
      await api.put('/auth/settings', {
        maxReservationPeople: maxPpl,
        maxPeoplePerSlot: perSlot,
        reservationDuration: duration,
        minBookingNoticeHours: minNotice,
      });
      await refreshBusiness();
    } catch (err) {
      console.error('Error saving limits settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const field = 'h-11 rounded-xl border border-gray-200 bg-white px-3 text-base text-gray-900 tabular-nums outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:opacity-60';
  return (
    <div className="space-y-6">
      <div className="divide-y divide-gray-100 border-y border-gray-100">
        <Setting title="Antelación mínima" hint="Los clientes no podrán reservar online con menos antelación que esta respecto a la hora del turno. Con 0 no hay límite; el personal siempre puede crear reservas a mano.">
          <input type="number" min="0" placeholder="0" value={minBookingNoticeHours} onChange={(e) => setMinBookingNoticeHours(e.target.value)} className={`${field} w-24`} disabled={saving} />
          <Unit main="horas" sub="antes de la hora de la reserva" />
        </Setting>

        <Setting title="Personas por reserva" hint="El máximo de personas que pueden reservar juntas en una sola solicitud.">
          <input type="number" min="1" value={maxReservationPeople} onChange={(e) => setMaxReservationPeople(e.target.value)} className={`${field} w-24`} disabled={saving} />
          <Unit main="personas como máximo" sub="por reserva" />
        </Setting>

        <PlanGate paid>
          <Setting title="Personas por turno" hint="Déjalo vacío para no poner límite por turno.">
            <input type="number" min="1" placeholder="Sin límite" value={maxPeoplePerSlot} onChange={(e) => setMaxPeoplePerSlot(e.target.value)} className={`${field} w-28`} disabled={saving} />
            <Unit main="personas como máximo" sub="a la vez en cada franja" />
          </Setting>

          <Setting title="Duración por mesa" hint="Déjalo vacío para no bloquear las franjas siguientes.">
            <input type="number" min="1" placeholder="Sin bloqueo" value={reservationDuration} onChange={(e) => setReservationDuration(e.target.value)} className={`${field} w-28`} disabled={saving} />
            <Unit main="minutos" sub="que se bloquea la mesa por reserva" />
          </Setting>
        </PlanGate>
      </div>

      <button type="button" onClick={handleSaveLimits} disabled={saving}
        className="w-full sm:w-auto h-11 px-6 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors">
        {saving ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </div>
  );
}

/** One rule: its name and what it does, then the field. No box: the lines between rules are enough. */
function Setting({ title, hint, children }) {
  return (
    <div className="py-5">
      <h3 className="text-[15px] font-semibold text-gray-900">{title}</h3>
      <p className="text-[13px] leading-5 text-gray-500 mt-0.5 mb-3">{hint}</p>
      <div className="flex items-center gap-3">{children}</div>
    </div>
  );
}

function Unit({ main, sub }) {
  return (
    <span className="min-w-0">
      <span className="block text-sm font-medium text-gray-900">{main}</span>
      <span className="block text-xs text-gray-500">{sub}</span>
    </span>
  );
}
