import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const inputCls = 'w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white';
const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';

const money = (value) => `€${Number(value || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const todayIso = () => new Date().toISOString().slice(0, 10);
const formatDecimalInput = (value) => {
  const num = Number(value || 0);
  if (!Number.isFinite(num) || num <= 0) return '';
  return String(num).replace('.', ',');
};
const parseDecimalInput = (raw) => {
  const sanitized = String(raw || '').replace(',', '.').replace(/[^0-9.]/g, '');
  if (!sanitized) return 0;
  const parsed = Number(sanitized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const STATUS_LABELS = {
  draft: 'Borrador',
  sent: 'Enviado',
  confirmed: 'Confirmado',
  received: 'Recibido',
  cancelled: 'Cancelado',
};

function normalizeInternationalPhone(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;
  const compact = text.replace(/[\s\-().]/g, '');
  const normalized = compact.startsWith('00') ? `+${compact.slice(2)}` : compact;
  const hasPlus = normalized.startsWith('+');
  const digits = normalized.replace(/\D/g, '');
  if (!hasPlus || digits.length < 8 || digits.length > 15) return null;
  return `+${digits}`;
}

function toWaPhone(e164) {
  return String(e164 || '').replace(/^\+/, '');
}

function generateWhatsAppOrderMessage(order, supplier) {
  const supplierName = supplier?.name || order?.supplierName || 'equipo';
  const lines = Array.isArray(order?.items)
    ? order.items
        .filter((item) => Number(item?.quantity || 0) > 0)
        .map((item) => `- ${item.quantity} ${item.unit ? `${item.unit} ` : ''}${item.productName}`.trim())
    : [];

  const blocks = [
    `Hola ${supplierName}, te paso pedido:`,
    '',
    ...lines,
    '',
    `Entrega: ${order?.deliveryDate ? String(order.deliveryDate).slice(0, 10) : 'a confirmar'}.`,
  ];

  const notes = String(order?.notes || '').trim();
  if (notes) blocks.push(`Observaciones: ${notes}`);
  blocks.push('', 'Gracias.');

  return blocks.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export default function Compras() {
  const [tab, setTab] = useState('orders');
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState({});

  const [productModal, setProductModal] = useState(null);
  const [orderModal, setOrderModal] = useState(null);
  const [supplierModal, setSupplierModal] = useState(null);
  const [openSuppliers, setOpenSuppliers] = useState({});

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [suppliersRes, productsRes, ordersRes] = await Promise.all([
        api.get('/suppliers'),
        api.get('/purchases/products'),
        api.get('/purchases/orders'),
      ]);
      setSuppliers(suppliersRes.data || []);
      setProducts(productsRes.data || []);
      setOrders(ordersRes.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudieron cargar los datos de compras');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const activeSuppliers = useMemo(() => suppliers.filter((supplier) => supplier.isActive), [suppliers]);
  const productsBySupplier = useMemo(() => {
    const groups = {};
    products.forEach((product) => {
      const key = String(product.supplier?._id || product.supplierId || 'unknown');
      if (!groups[key]) {
        groups[key] = {
          supplier: product.supplier || suppliers.find((s) => String(s._id) === key) || { _id: key, name: 'Sin proveedor' },
          products: [],
        };
      }
      groups[key].products.push(product);
    });
    return Object.values(groups).sort((a, b) => String(a.supplier?.name || '').localeCompare(String(b.supplier?.name || '')));
  }, [products, suppliers]);

  const markSentUI = (updatedOrder) => {
    setOrders((prev) => prev.map((order) => (order._id === updatedOrder._id ? updatedOrder : order)));
  };

  const handleSendWhatsapp = async (order) => {
    const orderId = String(order?._id || '');
    if (!orderId) return;

    if (!Array.isArray(order.items) || order.items.filter((item) => Number(item?.quantity || 0) > 0).length === 0) {
      setError('Este pedido no tiene productos');
      return;
    }

    const supplier = suppliers.find((s) => String(s._id) === String(order.supplierId));
    if (!supplier) {
      setError('No se encontró el proveedor del pedido');
      return;
    }

    const normalizedPhone = normalizeInternationalPhone(supplier.whatsappPhone || supplier.phone);
    if (!normalizedPhone) {
      setError('Este proveedor no tiene teléfono de WhatsApp configurado');
      return;
    }

    const message = generateWhatsAppOrderMessage(order, supplier);
    const url = `https://wa.me/${toWaPhone(normalizedPhone)}?text=${encodeURIComponent(message)}`;

    setActionLoading((prev) => ({ ...prev, [orderId]: true }));
    setError('');

    try {
      window.open(url, '_blank');
      const { data } = await api.post(`/purchases/orders/${orderId}/mark-whatsapp-sent`, { message });
      markSentUI(data);
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { type: 'success', message: 'Pedido marcado como enviado por WhatsApp' } }));
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo marcar el pedido como enviado');
    } finally {
      setActionLoading((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Compras</h1>
        <p className="text-sm text-gray-500 mt-1">Pedidos de compra y catálogo de productos por proveedor</p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          <button onClick={() => setTab('orders')} className={`px-4 py-2 text-sm font-semibold border-b-2 ${tab === 'orders' ? 'border-violet-600 text-violet-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Pedidos</button>
          <button onClick={() => setTab('products')} className={`px-4 py-2 text-sm font-semibold border-b-2 ${tab === 'products' ? 'border-violet-600 text-violet-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Productos</button>
          <button onClick={() => setTab('suppliers')} className={`px-4 py-2 text-sm font-semibold border-b-2 ${tab === 'suppliers' ? 'border-violet-600 text-violet-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Proveedores</button>
        </nav>
      </div>

      {loading && <div className="h-24 rounded-2xl bg-gray-100 animate-pulse" />}
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      {!loading && tab === 'orders' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Listado de pedidos</h2>
            <button onClick={() => setOrderModal({})} className="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold">+ Pedido</button>
          </div>

          {orders.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">Todavía no hay pedidos registrados</div>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 text-xs uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Fecha</th>
                    <th className="px-4 py-3 text-left">Proveedor</th>
                    <th className="px-4 py-3 text-left">Estado</th>
                    <th className="px-4 py-3 text-left">Items</th>
                    <th className="px-4 py-3 text-left">Total</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const orderId = String(order._id);
                    const itemsCount = order.items?.length || 0;
                    const disabledSend = itemsCount === 0 || actionLoading[orderId];
                    return (
                      <tr key={order._id} className="border-b last:border-0 border-gray-50">
                        <td className="px-4 py-3 text-gray-700">{String(order.orderDate || '').slice(0, 10)}</td>
                        <td className="px-4 py-3 text-gray-900 font-medium">{order.supplierName}</td>
                        <td className="px-4 py-3 text-gray-600">{STATUS_LABELS[order.status] || order.status || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">{itemsCount}</td>
                        <td className="px-4 py-3 text-gray-900 font-semibold">{money(order.totalAmount)}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              onClick={() => handleSendWhatsapp(order)}
                              disabled={disabledSend}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold"
                            >
                              {actionLoading[orderId] ? 'Enviando...' : 'Enviar por WhatsApp'}
                            </button>
                            <button onClick={() => setOrderModal(order)} className="text-violet-600 hover:text-violet-700 text-sm font-semibold">Editar</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {!loading && tab === 'products' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Productos por proveedor</h2>
            <button onClick={() => setProductModal({})} className="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold">+ Producto</button>
          </div>

          {products.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">Todavía no hay productos registrados</div>
          ) : (
            <div className="space-y-3">
              {productsBySupplier.map((group) => {
                const supplierId = String(group.supplier?._id || 'unknown');
                const isOpen = !!openSuppliers[supplierId];
                return (
                  <div key={supplierId} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                    <button
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
                      onClick={() => setOpenSuppliers((prev) => ({ ...prev, [supplierId]: !prev[supplierId] }))}
                    >
                      <span className="text-sm font-semibold text-gray-900">{group.supplier?.name || 'Sin proveedor'}</span>
                      <span className="text-xs text-gray-500">{group.products.length} productos {isOpen ? '▲' : '▼'}</span>
                    </button>
                    {isOpen && (
                      <table className="w-full text-sm border-t border-gray-100">
                        <thead>
                          <tr className="border-b border-gray-100 text-gray-400 text-xs uppercase tracking-wide">
                            <th className="px-4 py-3 text-left">Producto</th>
                            <th className="px-4 py-3 text-left">Unidad</th>
                            <th className="px-4 py-3 text-left">Coste base</th>
                            <th className="px-4 py-3" />
                          </tr>
                        </thead>
                        <tbody>
                          {group.products.map((product) => (
                            <tr key={product._id} className="border-b last:border-0 border-gray-50">
                              <td className="px-4 py-3 text-gray-900 font-medium">{product.name}</td>
                              <td className="px-4 py-3 text-gray-600">{product.unit || '-'}</td>
                              <td className="px-4 py-3 text-gray-900">{money(product.defaultUnitCost)}</td>
                              <td className="px-4 py-3 text-right">
                                <button onClick={() => setProductModal(product)} className="text-violet-600 hover:text-violet-700 text-sm font-semibold">Editar</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {!loading && tab === 'suppliers' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Proveedores</h2>
            <button onClick={() => setSupplierModal({})} className="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold">+ Proveedor</button>
          </div>

          {suppliers.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">Todavía no hay proveedores registrados</div>
          ) : (
            <div className="space-y-3">
              <div className="md:hidden space-y-2">
                {suppliers.map((supplier) => (
                  <div key={supplier._id} className="rounded-2xl border border-gray-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{supplier.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{supplier.contactName || 'Sin contacto'}</p>
                      </div>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${supplier.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                        {supplier.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <div className="mt-3 space-y-1.5">
                      <p className="text-xs text-gray-600"><span className="font-semibold text-gray-500">WhatsApp:</span> {supplier.whatsappPhone || supplier.phone || '-'}</p>
                      <p className="text-xs text-gray-600"><span className="font-semibold text-gray-500">Email:</span> {supplier.email || '-'}</p>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <button onClick={() => setSupplierModal(supplier)} className="text-violet-600 hover:text-violet-700 text-sm font-semibold">Editar</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block rounded-2xl border border-gray-200 bg-white overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 text-xs uppercase tracking-wide">
                      <th className="px-4 py-3 text-left">Proveedor</th>
                      <th className="px-4 py-3 text-left">Contacto</th>
                      <th className="px-4 py-3 text-left">WhatsApp</th>
                      <th className="px-4 py-3 text-left">Estado</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map((supplier) => (
                      <tr key={supplier._id} className="border-b last:border-0 border-gray-50">
                        <td className="px-4 py-3 text-gray-900 font-medium">{supplier.name}</td>
                        <td className="px-4 py-3 text-gray-600">{supplier.contactName || '-'}</td>
                        <td className="px-4 py-3 text-gray-700">{supplier.whatsappPhone || supplier.phone || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">{supplier.isActive ? 'Activo' : 'Inactivo'}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => setSupplierModal(supplier)} className="text-violet-600 hover:text-violet-700 text-sm font-semibold">Editar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {productModal !== null && (
        <ProductModal
          product={productModal}
          suppliers={activeSuppliers}
          onClose={() => setProductModal(null)}
          onSaved={async () => {
            setProductModal(null);
            await loadAll();
          }}
        />
      )}

      {orderModal !== null && (
        <OrderModal
          order={orderModal}
          suppliers={activeSuppliers}
          products={products.filter((product) => product.isActive)}
          onClose={() => setOrderModal(null)}
          onSaved={async () => {
            setOrderModal(null);
            await loadAll();
          }}
        />
      )}

      {supplierModal !== null && (
        <SupplierModal
          supplier={supplierModal}
          onClose={() => setSupplierModal(null)}
          onSaved={async () => {
            setSupplierModal(null);
            await loadAll();
          }}
        />
      )}
    </div>
  );
}

function SupplierModal({ supplier, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: supplier?.name || '',
    category: supplier?.category || 'other',
    contactName: supplier?.contactName || '',
    phone: supplier?.phone || '',
    whatsappPhone: supplier?.whatsappPhone || '',
    email: supplier?.email || '',
    notes: supplier?.notes || '',
    isActive: supplier?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (supplier?._id) await api.put(`/suppliers/${supplier._id}`, form);
      else await api.post('/suppliers', form);
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo guardar el proveedor');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white rounded-2xl border border-gray-200 shadow-2xl">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">{supplier?._id ? 'Editar proveedor' : 'Nuevo proveedor'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">X</button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-3">
          {error && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>}
          <div><label className={labelCls}>Nombre *</label><input className={inputCls} value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} required /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={labelCls}>Persona contacto</label><input className={inputCls} value={form.contactName} onChange={(e) => setForm((prev) => ({ ...prev, contactName: e.target.value }))} /></div>
            <div><label className={labelCls}>Teléfono</label><input className={inputCls} value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} placeholder="+34600111222" /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={labelCls}>WhatsApp</label><input className={inputCls} value={form.whatsappPhone} onChange={(e) => setForm((prev) => ({ ...prev, whatsappPhone: e.target.value }))} placeholder="+34600111222" /></div>
            <div><label className={labelCls}>Email</label><input className={inputCls} type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} /></div>
          </div>
          <div><label className={labelCls}>Notas</label><textarea rows={2} className={inputCls} value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} /></div>
          {supplier?._id && (
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))} />
              Proveedor activo
            </label>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm">Cancelar</button>
            <button type="submit" disabled={saving} className="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold">{saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProductModal({ product, suppliers, onClose, onSaved }) {
  const [form, setForm] = useState({
    supplierId: product?.supplier?._id || product?.supplierId || '',
    name: product?.name || '',
    unit: product?.unit || '',
    defaultUnitCost: product?.defaultUnitCost ?? 0,
    sku: product?.sku || '',
    notes: product?.notes || '',
    isActive: product?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (product?._id) await api.put(`/purchases/products/${product._id}`, form);
      else await api.post('/purchases/products', form);
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo guardar el producto');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white rounded-2xl border border-gray-200 shadow-2xl">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">{product?._id ? 'Editar producto' : 'Nuevo producto'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">X</button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-3">
          {error && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>}
          <div>
            <label className={labelCls}>Proveedor *</label>
            <select className={inputCls} value={form.supplierId} onChange={(e) => setForm((prev) => ({ ...prev, supplierId: e.target.value }))} required>
              <option value="">Seleccionar...</option>
              {suppliers.map((supplier) => <option key={supplier._id} value={supplier._id}>{supplier.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={labelCls}>Nombre *</label><input className={inputCls} value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} required /></div>
            <div><label className={labelCls}>Unidad</label><input className={inputCls} value={form.unit} onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value }))} placeholder="kg, ud, caja..." /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={labelCls}>Coste base</label><input type="number" min="0" step="0.01" className={inputCls} value={form.defaultUnitCost} onChange={(e) => setForm((prev) => ({ ...prev, defaultUnitCost: e.target.value }))} /></div>
            <div><label className={labelCls}>SKU</label><input className={inputCls} value={form.sku} onChange={(e) => setForm((prev) => ({ ...prev, sku: e.target.value }))} /></div>
          </div>
          <div><label className={labelCls}>Notas</label><textarea rows={2} className={inputCls} value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} /></div>
          {product?._id && (
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))} />
              Producto activo
            </label>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm">Cancelar</button>
            <button type="submit" disabled={saving} className="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold">{saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function OrderModal({ order, suppliers, products, onClose, onSaved }) {
  const isEditing = !!order?._id;
  const [step, setStep] = useState(isEditing ? 2 : 1);
  const [form, setForm] = useState({
    supplierId: order?.supplierId || '',
    orderDate: todayIso(),
    notes: order?.notes || '',
    items: Array.isArray(order?.items) ? order.items.map((item) => ({ productId: String(item.productId), quantity: item.quantity })) : [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const supplierProducts = useMemo(
    () => products.filter((product) => String(product.supplier?._id || product.supplierId) === String(form.supplierId)),
    [products, form.supplierId],
  );

  const rowByProduct = useMemo(() => {
    const map = new Map();
    form.items.forEach((item) => map.set(String(item.productId), item));
    return map;
  }, [form.items]);

  const selectedSupplier = useMemo(
    () => suppliers.find((supplier) => String(supplier._id) === String(form.supplierId)),
    [suppliers, form.supplierId],
  );

  const setItemQuantity = (product, value) => {
    setForm((prev) => {
      const key = String(product._id);
      const existing = prev.items.find((item) => String(item.productId) === key);
      if (!existing) {
        const created = {
          productId: key,
          quantity: value,
        };
        return { ...prev, items: [...prev.items, created] };
      }
      return {
        ...prev,
        items: prev.items.map((item) => (String(item.productId) === key ? { ...item, quantity: value } : item)),
      };
    });
  };

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((item) => supplierProducts.some((product) => String(product._id) === String(item.productId))),
    }));
  }, [form.supplierId]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        supplierId: form.supplierId,
        orderDate: form.orderDate,
        notes: form.notes,
        items: form.items.filter((item) => Number(item.quantity || 0) > 0),
      };
      if (order?._id) await api.put(`/purchases/orders/${order._id}`, payload);
      else await api.post('/purchases/orders', payload);
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo guardar el pedido');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/45 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-3xl bg-white rounded-t-3xl sm:rounded-2xl border border-gray-200 shadow-2xl max-h-[95vh] flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">{order?._id ? 'Editar pedido' : 'Nuevo pedido'}</h3>
            <p className="text-xs text-gray-500 mt-0.5">Paso {step} de 2</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">X</button>
        </div>

        <form onSubmit={submit} className="flex-1 overflow-auto p-4 sm:p-5 space-y-4">
          {error && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">Selecciona proveedorg</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {suppliers.filter((s) => s.isActive).map((supplier) => {
                  const selected = String(form.supplierId) === String(supplier._id);
                  return (
                    <button
                      key={supplier._id}
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({ ...prev, supplierId: supplier._id }));
                        setStep(2);
                      }}
                      className={`text-left rounded-xl border px-3 py-3 transition-colors ${selected ? 'border-violet-500 bg-violet-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                    >
                      <p className="text-sm font-semibold text-gray-900">{supplier.name}</p>
                      <p className="text-xs text-gray-500 mt-1">{supplier.whatsappPhone || supplier.phone || 'Sin teléfono'}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="rounded-xl bg-gray-50 border border-gray-200 px-3 py-2">
                <p className="text-xs text-gray-500">Proveedor</p>
                <p className="text-sm font-semibold text-gray-900">{selectedSupplier?.name || 'Sin proveedor'}</p>
                <p className="text-xs text-gray-500 mt-0.5">Fecha: {form.orderDate}</p>
              </div>

              <div className="space-y-2">
                {supplierProducts.length === 0 ? (
                  <div className="rounded-xl border border-gray-200 px-3 py-4 text-sm text-gray-500 text-center">Este proveedor no tiene productos activos</div>
                ) : supplierProducts.map((product) => {
                  const row = rowByProduct.get(String(product._id)) || { quantity: 0 };
                  return (
                    <div key={product._id} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{product.name}</p>
                          <p className="text-xs text-gray-500">{product.unit || 'unidad'}</p>
                        </div>
                        <input
                          type="text"
                          inputMode="decimal"
                          className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-right"
                          value={formatDecimalInput(row.quantity)}
                          onChange={(e) => setItemQuantity(product, parseDecimalInput(e.target.value))}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div>
                <label className={labelCls}>Notas</label>
                <textarea rows={2} className={inputCls} value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} />
              </div>
            </div>
          )}
        </form>

        <div className="px-4 sm:px-5 py-4 border-t border-gray-100 flex items-center justify-between gap-2">
          <div className="flex gap-2">
            {step === 2 && (
              <button type="button" onClick={() => setStep(1)} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm">Atrás</button>
            )}
            <button type="button" onClick={onClose} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm">Cancelar</button>
          </div>
          <div className="flex gap-2">
            {step === 1 && (
              <button
                type="button"
                disabled={!form.supplierId}
                onClick={() => setStep(2)}
                className="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold disabled:opacity-50"
              >
                Siguiente
              </button>
            )}
            {step === 2 && (
              <button type="submit" disabled={saving} onClick={submit} className="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold">{saving ? 'Guardando...' : 'Guardar pedido'}</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
