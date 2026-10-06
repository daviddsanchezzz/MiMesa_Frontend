import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import Modal from '../../components/Modal';
import api from '../../services/api';
import { useData } from '../../lib/query';
import { bookingsApi, apiError } from '../../services/bookingsApi';
import { useResources, useServices } from './queries';
import { staffForServices } from './NewBookingModal';
import { PAY_METHODS, centsToInput, euros, initials, inputCls, parseEuros } from './utils';

const NONE = [];
const LAST_PRO = 'quicksale:professional';
const read = (k) => { try { return window.localStorage.getItem(k) || ''; } catch { return ''; } };
const write = (k, v) => { try { window.localStorage.setItem(k, v); } catch { /* ignore */ } };

const chip = (on) => `shrink-0 inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full border text-sm font-medium transition-colors ${
  on ? 'border-violet-600 bg-violet-50 text-violet-800 ring-1 ring-violet-600' : 'border-gray-200 text-gray-700 active:bg-gray-50'}`;

/**
 * Cobro rápido: someone at the counter without a booking. What was done, who did it, how they
 * paid — one screen, and tapping the payment method charges. The appointment is created behind.
 */
export default function QuickSaleModal({ onClose, onDone }) {
  const servicesQ = useServices();
  const resourcesQ = useResources();
  const meQ = useData(['bookings', 'resources', 'me'], () => bookingsApi.myResource().catch(() => null), { retry: false });
  const customersQ = useData(['customers', 'list'], () => api.get('/customers').then((r) => r.data || []), { retry: false });

  const services = useMemo(() => (servicesQ.data || NONE).filter((s) => s.active !== false && s.bookingMode !== 'quote'), [servicesQ.data]);
  const staff = useMemo(() => (resourcesQ.data || NONE).filter((r) => r.kind === 'staff' && r.active !== false), [resourcesQ.data]);

  const [picked, setPicked] = useState([]); // service ids
  const [search, setSearch] = useState('');
  const [chosenPro, setChosenPro] = useState(null); // null = not touched yet; '' = anyone
  const [customer, setCustomer] = useState(null);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [amount, setAmount] = useState('');
  const [more, setMore] = useState(false);
  const [tip, setTip] = useState('');
  const [discount, setDiscount] = useState('');
  const [packId, setPackId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selected = useMemo(() => picked.map((id) => services.find((s) => s._id === id)).filter(Boolean), [picked, services]);
  const eligible = useMemo(() => staffForServices(selected, staff), [selected, staff]);
  // Who did it: what they chose, else the last one used here, else the person who is logged in
  const defaultPro = [read(LAST_PRO), meQ.data?._id].find((id) => id && eligible.some((p) => p._id === id)) || '';
  const resourceId = chosenPro !== null && (chosenPro === '' || eligible.some((p) => p._id === chosenPro)) ? chosenPro : defaultPro;

  const autoTotal = selected.reduce((sum, s) => sum + (s.price?.amount || 0), 0);
  const servicesCents = amount.trim() === '' ? autoTotal : parseEuros(amount);
  const tipCents = parseEuros(tip);
  const discountCents = parseEuros(discount);

  const packsQ = useData(['bookings', 'customerPacks', customer?._id], () => bookingsApi.customerPacks(customer._id), { enabled: !!customer?._id, retry: false });
  const packs = useMemo(() => (packsQ.data || NONE).filter((p) => p.status === 'active'
    && selected.length > 0 && (!(p.serviceIds || []).length || selected.every((s) => p.serviceIds.map(String).includes(s._id)))), [packsQ.data, selected]);
  const pack = packs.find((p) => p._id === packId) || null;

  const invalid = servicesCents === null || tipCents === null || discountCents === null;
  const total = pack ? 0 : Math.max(0, (servicesCents || 0) - (discountCents || 0));
  const charged = total + (tipCents || 0);

  const needle = search.trim().toLocaleLowerCase('es');
  const visible = services.filter((s) => !needle || s.name.toLocaleLowerCase('es').includes(needle));
  // Most used first would need history; keep the catalogue order and let the search narrow it down
  const toggle = (id) => { setPicked((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id])); setAmount(''); setPackId(''); };

  const q = query.trim().toLocaleLowerCase('es');
  const digits = q.replace(/\D/g, '');
  const matches = q.length < 2 ? NONE : (customersQ.data || NONE).filter((c) => c.name?.toLocaleLowerCase('es').includes(q)
    || (digits.length >= 3 && (c.phone || '').replace(/\D/g, '').includes(digits))).slice(0, 5);

  async function charge(method) {
    setError('');
    if (!selected.length) return setError('Elige qué se ha hecho');
    if (invalid) return setError('Revisa los importes');
    if (!pack && (discountCents || 0) > (servicesCents || 0)) return setError('El descuento es mayor que el total');
    setSaving(true);
    try {
      const paid = await bookingsApi.quickSale({
        items: selected.map((s) => ({ serviceId: s._id, resourceId: resourceId || null })),
        ...(customer ? { customerId: customer._id, guestName: customer.name, guestPhone: customer.phone || '', guestEmail: customer.email || '' } : {}),
        ...(pack ? { packId: pack._id } : { services: servicesCents, discount: discountCents || 0 }),
        ...(method ? { method } : {}),
        tip: tipCents || 0,
      });
      if (resourceId) write(LAST_PRO, resourceId);
      toast.success(pack && !charged ? 'Cobrado con bono' : `Cobrado ${euros(paid.payment.total + paid.payment.tip)}`);
      onDone?.(paid);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  const noMethodNeeded = !!pack && !tipCents;
  const footer = (
    <div className="space-y-2.5">
      {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>}
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-gray-500">{pack ? `Bono · ${pack.name}` : 'Total'}</span>
        <span className="text-2xl font-bold tabular-nums text-gray-900">{pack ? (tipCents ? euros(tipCents) : 'Sin cargo') : euros(charged)}</span>
      </div>
      {noMethodNeeded ? (
        <button type="button" disabled={saving} onClick={() => charge('')}
          className="w-full h-12 rounded-xl bg-emerald-600 text-white text-base font-bold hover:bg-emerald-700 disabled:opacity-50">
          {saving ? 'Cobrando…' : 'Cobrar con bono'}
        </button>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {PAY_METHODS.map((m) => (
            <button key={m.key} type="button" disabled={saving || !selected.length} onClick={() => charge(m.key)}
              className="rounded-xl bg-emerald-600 text-white py-2.5 text-sm font-bold flex flex-col items-center gap-0.5 hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-40 transition">
              <span aria-hidden="true">{m.icon}</span>{m.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <Modal title="Cobrar" subtitle="Cliente sin reserva" onClose={() => !saving && onClose()} size="md" footer={footer}>
      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">Qué se ha hecho</p>
          {services.length > 8 && (
            <input className={`${inputCls} mb-2`} placeholder="Buscar servicio…" value={search} onChange={(e) => setSearch(e.target.value)} />
          )}
          {servicesQ.isLoading && <p className="text-sm text-gray-400">Cargando…</p>}
          <div className="flex flex-wrap gap-2">
            {visible.map((s) => (
              <button key={s._id} type="button" onClick={() => toggle(s._id)} className={chip(picked.includes(s._id))}>
                {s.name}<span className="text-xs text-gray-400 tabular-nums">{euros(s.price?.amount || 0)}</span>
              </button>
            ))}
          </div>
          {!servicesQ.isLoading && !services.length && <p className="text-sm text-gray-500">Aún no hay servicios. Créalos en Equipo → Servicios.</p>}
        </div>

        {eligible.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">Quién lo ha hecho</p>
            <div className="flex flex-wrap gap-2">
              {eligible.map((p) => (
                <button key={p._id} type="button" onClick={() => setChosenPro(p._id)} className={chip(resourceId === p._id)}>
                  <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold flex items-center justify-center">{initials(p.name)}</span>{p.name}
                </button>
              ))}
              <button type="button" onClick={() => setChosenPro('')} className={chip(resourceId === '')}>Cualquiera</button>
            </div>
          </div>
        )}

        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">Cliente <span className="font-normal text-gray-400">(opcional)</span></p>
          {customer ? (
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2">
              <span className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 text-[11px] font-bold flex items-center justify-center">{initials(customer.name)}</span>
              <span className="min-w-0 flex-1 text-sm font-medium text-gray-900 truncate">{customer.name}</span>
              <button type="button" onClick={() => { setCustomer(null); setPackId(''); setQuery(''); }} className="text-gray-400 hover:text-gray-700 px-1" aria-label="Quitar cliente">✕</button>
            </div>
          ) : !customerOpen ? (
            <button type="button" onClick={() => setCustomerOpen(true)} className="w-full text-left rounded-xl border border-dashed border-gray-300 px-3 py-2.5 text-sm text-gray-500">
              Cliente de paso · <span className="font-semibold text-violet-700">buscar o añadir</span>
            </button>
          ) : (
            <div>
              <input autoFocus className={inputCls} placeholder="Nombre o teléfono…" value={query} onChange={(e) => setQuery(e.target.value)} />
              {matches.length > 0 && (
                <ul className="mt-1.5 rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                  {matches.map((c) => (
                    <li key={c._id}>
                      <button type="button" onClick={() => { setCustomer(c); setCustomerOpen(false); }} className="w-full text-left px-3 py-2.5 text-sm active:bg-gray-50">
                        <span className="font-medium text-gray-900">{c.name}</span>{c.phone && <span className="text-gray-400"> · {c.phone}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {q.length >= 2 && !matches.length && <p className="mt-1.5 text-xs text-gray-500">No hay nadie con ese nombre. Se cobra como cliente de paso; puedes crearlo después desde Clientes.</p>}
            </div>
          )}
          {packs.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {packs.map((p) => (
                <button key={p._id} type="button" onClick={() => setPackId(packId === p._id ? '' : p._id)} className={chip(packId === p._id)}>
                  🎟️ {p.name} · quedan {p.remaining}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <button type="button" onClick={() => setMore((v) => !v)} className="text-sm font-semibold text-violet-700">
            {more ? 'Menos opciones' : 'Importe, descuento o propina'}
          </button>
          {more && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[['Importe (€)', amount, setAmount, centsToInput(autoTotal) || '0', !!pack], ['Descuento (€)', discount, setDiscount, '0', !!pack], ['Propina (€)', tip, setTip, '0', false]].map(([label, value, set, ph, off]) => (
                <label key={label} className="block">
                  <span className="block text-[11px] font-medium text-gray-500 mb-1">{label}</span>
                  <input className={`${inputCls} tabular-nums text-right`} inputMode="decimal" placeholder={ph} value={value} disabled={off} onChange={(e) => set(e.target.value)} />
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
