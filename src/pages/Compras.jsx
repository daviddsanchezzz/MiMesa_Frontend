import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const inputCls = 'w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white';
const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';

const money = (value) => `€${Number(value || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function Compras() {
  const [tab, setTab] = useState('orders');
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [productModal, setProductModal] = useState(null);
  const [orderModal, setOrderModal] = useState(null);

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
                    <th className="px-4 py-3 text-left">Items</th>
                    <th className="px-4 py-3 text-left">Total</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order._id} className="border-b last:border-0 border-gray-50">
                      <td className="px-4 py-3 text-gray-700">{String(order.orderDate || '').slice(0, 10)}</td>
                      <td className="px-4 py-3 text-gray-900 font-medium">{order.supplierName}</td>
                      <td className="px-4 py-3 text-gray-600">{order.items?.length || 0}</td>
                      <td className="px-4 py-3 text-gray-900 font-semibold">{money(order.totalAmount)}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setOrderModal(order)} className="text-violet-600 hover:text-violet-700 text-sm font-semibold">Editar</button>
                      </td>
                    </tr>
                  ))}
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
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 text-xs uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Producto</th>
                    <th className="px-4 py-3 text-left">Proveedor</th>
                    <th className="px-4 py-3 text-left">Unidad</th>
                    <th className="px-4 py-3 text-left">Coste base</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product._id} className="border-b last:border-0 border-gray-50">
                      <td className="px-4 py-3 text-gray-900 font-medium">{product.name}</td>
                      <td className="px-4 py-3 text-gray-700">{product.supplier?.name || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{product.unit || '-'}</td>
                      <td className="px-4 py-3 text-gray-900">{money(product.defaultUnitCost)}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setProductModal(product)} className="text-violet-600 hover:text-violet-700 text-sm font-semibold">Editar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">?</button>
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
  const [form, setForm] = useState({
    supplierId: order?.supplierId || '',
    orderDate: String(order?.orderDate || '').slice(0, 10) || todayIso(),
    notes: order?.notes || '',
    items: Array.isArray(order?.items) ? order.items.map((item) => ({ productId: String(item.productId), quantity: item.quantity, unitCost: item.unitCost })) : [],
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

  const total = useMemo(
    () => form.items.reduce((acc, item) => acc + (Number(item.quantity || 0) * Number(item.unitCost || 0)), 0),
    [form.items],
  );

  const setItem = (product, field, value) => {
    setForm((prev) => {
      const key = String(product._id);
      const existing = prev.items.find((item) => String(item.productId) === key);
      if (!existing) {
        const created = {
          productId: key,
          quantity: field === 'quantity' ? value : 0,
          unitCost: field === 'unitCost' ? value : Number(product.defaultUnitCost || 0),
        };
        return { ...prev, items: [...prev.items, created] };
      }
      return {
        ...prev,
        items: prev.items.map((item) => (String(item.productId) === key ? { ...item, [field]: value } : item)),
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
        items: form.items,
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
    <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl border border-gray-200 shadow-2xl max-h-[92vh] flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">{order?._id ? 'Editar pedido' : 'Nuevo pedido'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">?</button>
        </div>

        <form onSubmit={submit} className="flex-1 overflow-auto p-5 space-y-4">
          {error && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className={labelCls}>Proveedor *</label>
              <select className={inputCls} value={form.supplierId} onChange={(e) => setForm((prev) => ({ ...prev, supplierId: e.target.value }))} required>
                <option value="">Seleccionar...</option>
                {suppliers.map((supplier) => <option key={supplier._id} value={supplier._id}>{supplier.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Fecha *</label>
              <input type="date" className={inputCls} value={form.orderDate} onChange={(e) => setForm((prev) => ({ ...prev, orderDate: e.target.value }))} required />
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2 text-left text-xs text-gray-500 uppercase">Producto</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-500 uppercase">Unidad</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-500 uppercase">Cantidad</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-500 uppercase">Precio unit.</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-500 uppercase">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {supplierProducts.length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-sm text-gray-400">Selecciona un proveedor con productos activos</td></tr>
                ) : supplierProducts.map((product) => {
                  const row = rowByProduct.get(String(product._id)) || { quantity: 0, unitCost: Number(product.defaultUnitCost || 0) };
                  const subtotal = Number(row.quantity || 0) * Number(row.unitCost || 0);
                  return (
                    <tr key={product._id} className="border-b last:border-0 border-gray-100">
                      <td className="px-3 py-2 text-gray-800 font-medium">{product.name}</td>
                      <td className="px-3 py-2 text-gray-600">{product.unit || '-'}</td>
                      <td className="px-3 py-2"><input type="number" min="0" step="0.01" className={inputCls} value={row.quantity} onChange={(e) => setItem(product, 'quantity', Number(e.target.value || 0))} /></td>
                      <td className="px-3 py-2"><input type="number" min="0" step="0.01" className={inputCls} value={row.unitCost} onChange={(e) => setItem(product, 'unitCost', Number(e.target.value || 0))} /></td>
                      <td className="px-3 py-2 text-gray-900 font-semibold">{money(subtotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div>
            <label className={labelCls}>Notas</label>
            <textarea rows={2} className={inputCls} value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} />
          </div>
        </form>

        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-sm text-gray-600">Total: <span className="font-bold text-gray-900">{money(total)}</span></p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm">Cancelar</button>
            <button type="submit" disabled={saving} className="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold">{saving ? 'Guardando...' : 'Guardar pedido'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

