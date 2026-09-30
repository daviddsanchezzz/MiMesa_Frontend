import { lazy, Suspense, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import publicApi from '../services/publicApi';
import { slugPath } from '../lib/publicUrl';

const PublicBooking = lazy(() => import('./PublicBooking'));
const PublicReservation = lazy(() => import('./PublicReservation'));
const PublicBookingCancel = lazy(() => import('./PublicBookingCancel'));

function Spinner() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-gray-500 animate-spin" aria-label="Cargando" />
    </div>
  );
}

function NotFound() {
  useEffect(() => {
    document.title = 'Página no encontrada | Vetra';
    setMeta('robots', 'noindex');
  }, []);
  return (
    <div className="min-h-dvh flex items-center justify-center bg-gray-50 px-6">
      <div className="max-w-sm text-center">
        <h1 className="text-xl font-bold text-gray-900">No encontramos esta página de reservas</h1>
        <p className="text-sm text-gray-500 mt-2">Revisa que el enlace esté bien escrito o pide al negocio que te lo vuelva a enviar.</p>
        <a href="https://www.vetrareserve.com/" className="inline-block mt-5 text-sm font-semibold text-violet-700">Ir a Vetra</a>
      </div>
    </div>
  );
}

function setMeta(name, content) {
  let el = document.head.querySelector(`meta[name="${name}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute('name', name); document.head.appendChild(el); }
  el.setAttribute('content', content);
}

function setCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) { el = document.createElement('link'); el.setAttribute('rel', 'canonical'); document.head.appendChild(el); }
  el.setAttribute('href', href);
}

/**
 * vetrareserve.com/{slug} (or /r/{slug} inside the app): finds the business
 * by its public address and shows its booking page. An old slug moves to the
 * current one, keeping the query (?embed=1).
 */
export default function PublicSlugPage({ cancel = false }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [state, setState] = useState({ status: 'loading', business: null });

  useEffect(() => {
    let alive = true;
    setState({ status: 'loading', business: null });
    publicApi.get(`/auth/public/business-by-slug/${encodeURIComponent(slug)}`)
      .then(({ data }) => {
        if (!alive) return;
        if (data.slug && data.slug !== slug) {
          navigate(`${slugPath(data.slug)}${cancel ? '/cancelar' : ''}${location.search}`, { replace: true });
          return;
        }
        setState({ status: 'ok', business: data });
      })
      .catch(() => alive && setState({ status: 'missing', business: null }));
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const b = state.business;
  useEffect(() => {
    if (!b) return;
    const appointments = b.businessType === 'appointments';
    document.title = `${appointments ? 'Reserva tu cita' : 'Reserva mesa'} en ${b.name}`;
    setMeta('description', appointments
      ? `Pide cita online en ${b.name}: elige servicio, profesional y hora en menos de un minuto.`
      : `Reserva mesa online en ${b.name}: elige día, hora y personas en menos de un minuto.`);
    if (b.publicUrl) setCanonical(b.publicUrl);
  }, [b]);

  if (state.status === 'loading') return <Spinner />;
  if (state.status === 'missing') return <NotFound />;
  const Page = cancel ? PublicBookingCancel : b.businessType === 'appointments' ? PublicBooking : PublicReservation;
  return <Suspense fallback={<Spinner />}><Page businessId={String(b.id)} slug={b.slug} /></Suspense>;
}
