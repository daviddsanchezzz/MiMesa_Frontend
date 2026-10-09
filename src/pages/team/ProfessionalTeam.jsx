import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSetMobileHeader } from '../../context/MobileHeaderContext';
import { PageHeader, PrimaryButton } from '../../ui/kit';
import api from '../../services/api';
import { bookingsApi, apiError } from '../../services/bookingsApi';
import ProfessionalAvatar from '../../components/ProfessionalAvatar';
import { StaffServicesModal } from '../agenda/AgendaSettings';
import {
  btnSecondary,
  staffColors,
  todayIn,
  DEFAULT_TZ,
} from '../agenda/utils';
import { ProfessionalPay, validMonth } from './AppointmentTeam';
import ProfessionalAccess, {
  MemberAccess,
  PendingAccess,
} from './ProfessionalAccess';
import CreateProfessional from './CreateProfessional';
import ProfessionalGeneral from './ProfessionalGeneral';
import { confirmLeave } from '../../lib/unsavedChanges';
import { Loading } from '../../ui/feedback';

const servicesOf = (r, services) =>
  services.filter((s) =>
    (s.requirements || []).some(
      (q) =>
        q.kind === 'staff' &&
        (!q.resourceIds?.length ||
          q.resourceIds.map(String).includes(String(r._id))),
    ),
  );
const TABS = [
  ['general', 'General'],
  ['servicios', 'Servicios'],
  ['remuneracion', 'Remuneración'],
  ['acceso', 'Acceso'],
];

export default function ProfessionalTeam() {
  const { business } = useAuth();
  return <TeamContent key={business?._id || business?.id} />;
}

function TeamContent() {
  const { business, isModuleEnabled, hasRole } = useAuth();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [inactive, setInactive] = useState(false);
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState('');
  const reload = useCallback(() => setRevision((v) => v + 1), []);
  useEffect(() => {
    let live = true;
    setError('');
    Promise.all([
      bookingsApi.resources(true),
      bookingsApi.services(),
      api.get('/members'),
      api.get('/invitations'),
      bookingsApi.schedule(),
    ])
      .then(async ([resources, services, members, invitations, hours]) => {
        const staff = resources.filter((r) => r.kind === 'staff');
        const schedules = await Promise.all(
          staff.map((r) =>
            bookingsApi
              .schedule({ ownerType: 'resource', ownerId: r._id })
              .catch(() => null),
          ),
        );
        if (live)
          setData({
            resources: staff,
            services,
            members: members.data,
            invitations: invitations.data.filter(
              (i) =>
                i.status === 'pending' && new Date(i.expiresAt) > new Date(),
            ),
            hours,
            schedules: Object.fromEntries(
              staff.map((r, i) => [r._id, schedules[i]]),
            ),
          });
      })
      .catch((err) => {
        if (live) setError(apiError(err));
      });
    return () => {
      live = false;
    };
  }, [revision]);
  const resource = data?.resources.find(
    (r) => String(r._id) === params.get('pro'),
  );
  const finance = hasRole('manager') && isModuleEnabled('staff');
  const tabs = TABS.filter(([key]) => key !== 'remuneracion' || finance);
  const tab = tabs.some(([key]) => key === params.get('tab'))
    ? params.get('tab')
    : 'general';
  const month = validMonth(
    params.get('month'),
    todayIn(business?.timezone || DEFAULT_TZ).slice(0, 7),
  );
  useSetMobileHeader({
    title: resource?.name || 'Equipo',
    action: params.get('pro')
      ? false
      : { label: 'Persona', onClick: () => setAdding(true) },
  });
  function selectTab(key) {
    if (!confirmLeave()) return;
    const next = new URLSearchParams(params);
    next.set('tab', key);
    setParams(next, { replace: true });
  }
  const open = (r) => {
    setParams({ pro: r._id });
    setNotice('');
  };
  const back =
    params.get('from') === 'rendimiento'
      ? `/personal?month=${month}`
      : '/equipo';
  const colors = staffColors(data?.resources || []);
  const saved = () => {
    setNotice('Guardado');
    reload();
  };
  if (!data)
    return (
      <div className="space-y-4">
        <PageHeader title="Equipo" />
        {error ? (
          <>
            <p role="alert" className="text-rose-700">
              {error}
            </p>
            <button className={btnSecondary} onClick={reload}>
              Reintentar
            </button>
          </>
        ) : (
          <Loading>Cargando equipo…</Loading>
        )}
      </div>
    );
  const { resources, members, invitations, services } = data;
  const unlinked = members.filter(
    (m) => !resources.some((r) => r.userId === m.userId),
  );
  const adminInvites = invitations.filter(
    (i) =>
      !resources.some((r) => String(r._id) === String(i.links?.resourceId)),
  );
  const active = resources.filter((r) => r.active !== false);
  return (
    <div
      className="w-full flex flex-1 min-h-0 flex-col"
    >
      {error && (
        <p role="alert" className="shrink-0 text-sm text-rose-700">
          {error}
          <button className="ml-3 underline" onClick={reload}>
            Reintentar
          </button>
        </p>
      )}
      {notice && (
        <p role="status" className="shrink-0 text-sm text-emerald-700">
          {notice}
        </p>
      )}
      {params.get('pro') ? (
        resource ? (
          <>
            <div className="shrink-0 bg-white">
              <Link
                to={back}
                onClick={(e) => {
                  if (!confirmLeave()) e.preventDefault();
                }}
                className="inline-flex min-h-11 items-center text-sm font-medium text-violet-700"
              >
                ‹{' '}
                {params.get('from') === 'rendimiento'
                  ? 'Rendimiento'
                  : 'Equipo'}
              </Link>
              <div className="flex items-center gap-3 py-2">
                <ProfessionalAvatar
                  name={resource.name}
                  photo={resource.photo}
                  color={colors[resource._id]}
                  size={44}
                />
                <div className="min-w-0">
                  <h1 className="text-xl font-semibold break-words">
                    {resource.name}
                  </h1>
                  <p className="text-sm text-gray-500">
                    {resource.active !== false ? 'Activo' : 'Inactivo'}
                  </p>
                </div>
              </div>
              <nav
                aria-label="Secciones del profesional"
                className="flex overflow-x-auto border-b border-gray-200"
              >
                {tabs.map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => selectTab(key)}
                    aria-current={key === tab ? 'page' : undefined}
                    className={`shrink-0 min-h-11 px-4 text-sm font-medium border-b-2 ${key === tab ? 'border-violet-600 text-violet-700' : 'border-transparent text-gray-500'}`}
                  >
                    {label}
                  </button>
                ))}
              </nav>
            </div>
            <div
              key={`${resource._id}-${tab}`}
              data-page-scroll
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain pt-5 pb-6"
            >
              {tab === 'general' && (
                <ProfessionalGeneral
                  resource={resource}
                  schedule={data.schedules[resource._id]}
                  businessHours={data.hours}
                  color={colors[resource._id]}
                  onSaved={saved}
                />
              )}
              {tab === 'servicios' && (
                <StaffServicesModal
                  inline
                  resource={resource}
                  services={services}
                  onSaved={saved}
                />
              )}
              {tab === 'remuneracion' && finance && (
                <ProfessionalPay
                  resource={resource}
                  month={month}
                  onMonthChange={(value) => {
                    const next = new URLSearchParams(params);
                    next.set('month', value);
                    setParams(next, { replace: true });
                  }}
                />
              )}
              {tab === 'acceso' && (
                <ProfessionalAccess
                  resource={resource}
                  resources={resources}
                  members={members}
                  invitations={invitations}
                  onSaved={saved}
                />
              )}
            </div>
          </>
        ) : (
          <>
            <p>Profesional no encontrado.</p>
            <Link to="/equipo" className="text-violet-700">
              Volver a Equipo
            </Link>
          </>
        )
      ) : (
        <>
          <PageHeader
            className="shrink-0 pb-4"
            title="Equipo"
            subtitle={`${active.length} ${active.length === 1 ? 'profesional' : 'profesionales'}`}
            actions={
              <PrimaryButton onClick={() => setAdding(true)}>
                Persona
              </PrimaryButton>
            }
          />
          <div data-page-scroll className="flex-1 min-h-0 overflow-y-auto overscroll-contain pb-6 space-y-4">
          {!resources.length && (
            <p className="text-sm text-gray-500">
              Crea tu primer profesional. No necesita una cuenta para recibir
              citas.
            </p>
          )}
          {resources.length > 0 && (
            <div className="hidden lg:grid grid-cols-12 gap-4 px-2 pb-2 border-b border-gray-200 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              <span className="col-span-4">Profesional</span>
              <span className="col-span-5">Servicios</span>
              <span className="col-span-2">Acceso a Vetra</span>
              <span className="col-span-1" />
            </div>
          )}
          <ul className="divide-y divide-gray-100">
            {resources
              .filter((r) => inactive || r.active !== false)
              .map((r) => {
                const member = members.find((m) => m.userId === r.userId);
                const pending = invitations.some(
                  (i) => String(i.links?.resourceId) === String(r._id),
                );
                const serviceList = servicesOf(r, services);
                const serviceCount = serviceList.length;
                return (
                  <li key={r._id}>
                    <button
                      className="w-full text-left flex items-center gap-3 lg:grid lg:grid-cols-12 lg:gap-4 py-3 lg:px-2 min-h-11 hover:bg-gray-50 rounded-xl"
                      onClick={() => open(r)}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1 lg:col-span-4">
                      <ProfessionalAvatar
                        name={r.name}
                        photo={r.photo}
                        color={colors[r._id]}
                        size={40}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900">
                          {r.name}
                          {r.active === false && (
                            <span className="ml-2 text-xs text-gray-400">
                              Inactivo
                            </span>
                          )}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-2 text-xs text-gray-500 mt-1 lg:hidden">
                          <span>
                            {serviceCount}{' '}
                            {serviceCount === 1 ? 'servicio' : 'servicios'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={
                              member
                                ? 'text-emerald-700'
                                : pending
                                  ? 'text-amber-700'
                                  : 'text-gray-500'
                            }
                          >
                            {member
                              ? 'Con acceso'
                              : pending
                                ? 'Invitación pendiente'
                                : 'Sin acceso'}
                          </span>
                        </div>
                      </div>
                      </div>
                      <span className="hidden lg:block lg:col-span-5 text-sm text-gray-600 truncate">
                        {serviceCount ? serviceList.map((x) => x.name).join(', ') : <span className="text-gray-300">—</span>}
                      </span>
                      <span className={`hidden lg:block lg:col-span-2 text-sm ${member ? 'text-emerald-700' : pending ? 'text-amber-700' : 'text-gray-500'}`}>
                        {member ? 'Con acceso' : pending ? 'Invitación pendiente' : 'Sin acceso'}
                      </span>
                      <span className="text-gray-400 lg:col-span-1 lg:text-right" aria-hidden="true">
                        ›
                      </span>
                    </button>
                  </li>
                );
              })}
          </ul>
          {resources.some((r) => r.active === false) && (
            <label className="flex items-center gap-2 min-h-11 text-sm text-gray-500">
              <input
                type="checkbox"
                checked={inactive}
                onChange={(e) => setInactive(e.target.checked)}
              />
              Mostrar inactivos
            </label>
          )}
          {(unlinked.length > 0 || adminInvites.length > 0) && (
            <section className="border-t border-gray-100 pt-6 space-y-3">
              <h2 className="text-xs uppercase font-semibold text-gray-400">
                Usuarios sin profesional
              </h2>
              <p className="text-sm text-gray-500">
                Acceso administrativo, sin agenda propia.
              </p>
              {unlinked.map((m) => (
                <details
                  key={m._id}
                  className="rounded-xl border border-gray-100 p-3"
                >
                  <summary className="min-h-11 flex items-center cursor-pointer text-sm font-medium">
                    {m.userName || m.userEmail}
                  </summary>
                  <MemberAccess member={m} onSaved={saved} />
                </details>
              ))}
              {adminInvites.map((i) => (
                <PendingAccess key={i._id} invitation={i} onSaved={saved} />
              ))}
            </section>
          )}
          </div>
        </>
      )}
      {adding && (
        <CreateProfessional
          services={services}
          maxPros={business?.capabilities?.maxProfessionals}
          count={active.length}
          onClose={() => setAdding(false)}
          onSaved={(r) => {
            setAdding(false);
            if (!r) {
              setNotice('Invitación enviada');
              reload();
              return;
            }
            setData((d) => ({
              ...d,
              resources: [...d.resources.filter((p) => p._id !== r._id), r],
            }));
            reload();
            open(r);
          }}
        />
      )}
    </div>
  );
}
