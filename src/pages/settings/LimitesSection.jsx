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

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Antelacion Minima de Reserva</h3>
        <p className="text-sm text-gray-600 mb-4">
          Los clientes no podran reservar online con menos de esta antelacion respecto a la hora del turno. Deja en 0 para no aplicar limite. El personal siempre puede crear reservas manuales desde el panel sin esta restriccion.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min="0"
            placeholder="0"
            value={minBookingNoticeHours}
            onChange={(e) => setMinBookingNoticeHours(e.target.value)}
            className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            disabled={saving}
          />
          <div>
            <p className="text-sm font-medium text-gray-900">horas minimo</p>
            <p className="text-xs text-gray-500">Antes de la hora de la reserva</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Maximo de Personas por Reserva</h3>
        <p className="text-sm text-gray-600 mb-4">
          Establece el numero maximo de personas que pueden hacer una reserva en una sola solicitud.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min="1"
            value={maxReservationPeople}
            onChange={(e) => setMaxReservationPeople(e.target.value)}
            className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            disabled={saving}
          />
          <div>
            <p className="text-sm font-medium text-gray-900">personas maximo</p>
            <p className="text-xs text-gray-500">Por reserva individual</p>
          </div>
        </div>
      </div>

      <PlanGate paid>
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-semibold text-gray-900">Maximo de Personas por Turno</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Deja vacio para no establecer limite por turno.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="1"
              placeholder="Sin limite"
              value={maxPeoplePerSlot}
              onChange={(e) => setMaxPeoplePerSlot(e.target.value)}
              className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              disabled={saving}
            />
            <div>
              <p className="text-sm font-medium text-gray-900">personas maximo</p>
              <p className="text-xs text-gray-500">Por franja horaria simultanea</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-semibold text-gray-900">Duracion por Mesa</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Deja vacio para no bloquear franjas posteriores.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="1"
              placeholder="Sin bloqueo"
              value={reservationDuration}
              onChange={(e) => setReservationDuration(e.target.value)}
              className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              disabled={saving}
            />
            <div>
              <p className="text-sm font-medium text-gray-900">minutos</p>
              <p className="text-xs text-gray-500">Tiempo bloqueado por reserva</p>
            </div>
          </div>
        </div>
      </PlanGate>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSaveLimits}
          disabled={saving}
          className="px-5 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
        {saving && (
          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        )}
      </div>
    </div>
  );
}
