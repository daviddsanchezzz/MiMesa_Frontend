import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useSetMobileHeader } from '../context/MobileHeaderContext';
import Modal from '../components/Modal';
import Icon from '../ui/Icon';
import { Empty, GhostButton, MenuButton, PageHeader, PrimaryButton, Tabs, Toggle } from '../ui/kit';

const inputCls = 'w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white';
const labelCls = 'block text-xs font-medium text-gray-500 mb-1';
const btnPrimary = 'h-10 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold disabled:opacity-50';
const btnQuiet = 'h-10 px-4 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-100';
const btnDanger = 'h-10 px-3 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50';

const money = (value) => `${Number(value || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const niceDate = (value) => {
  const iso = String(value || '').slice(0, 10);
  if (!iso) return '—';
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '');
};
const tableHead = 'hidden md:grid grid-cols-12 gap-4 px-2 pb-2 border-b border-gray-200 text-[11px] font-semibold uppercase tracking-wide text-gray-400';
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
const csvEscape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

// [dot colour] per order state, in the app's palette.
const STATUS_COLOR = { draft: '#f59e0b', sent: '#7c3aed', confirmed: '#7c3aed', received: '#10b981', cancelled: '#9ca3af' };

function OrderStatus({ status }) {
  const color = STATUS_COLOR[status] || '#9ca3af';
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700">
      <span className="w-2 h-2 rounded-full shrink-0" style={status === 'draft' ? { border: `1.5px dashed ${color}` } : { backgroundColor: color }} />
      {STATUS_LABELS[status] || status || '—'}
    </span>
  );
}

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
  const compact = text.replace(/[\\s().-]/g, '');
  const normalized = compact.startsWith('00') ? "+" + compact.slice(2) : compact;
  const hasPlus = normalized.startsWith('+');
  const digits = normalized.replace(/\\D/g, '');

  if (hasPlus) {
    if (digits.length < 8 || digits.length > 15) return null;
    return "+" + digits;
  }

  if (digits.length === 9) return "+34" + digits;
  if (digits.length >= 8 && digits.length <= 15) return "+" + digits;
  return null;
}

function toWaPhone(e164) {
  return String(e164 || '').replace(/^\+/, '');
}

function generateWhatsAppOrderMessage(order, supplier) {
  const note = String(order?.notes || '').trim();
  const lines = Array.isArray(order?.items)
    ? order.items
        .filter((item) => Number(item?.quantity || 0) > 0)
        .map((item) => {
          const unit = String(item?.unit || '').trim();
          const normalizedUnit = unit ? unit.charAt(0).toUpperCase() + unit.slice(1) : '';
          const productName = String(item?.productName || '').trim();
          return `- ${item.quantity} x ${`${normalizedUnit} ${productName}`.trim()}`.trim();
        })
    : [];
  const messageParts = [];
  if (note) messageParts.push(note);
  if (lines.length > 0) messageParts.push(lines.join('\n'));
  return messageParts.join('\n\n').trim();
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
  const [orderDetail, setOrderDetail] = useState(null);
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
      return {
        suppliers: suppliersRes.data || [],
        products: productsRes.data || [],
        orders: ordersRes.data || [],
      };
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudieron cargar los datos de compras');
      return null;
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
      if (orderDetail?._id === data._id) setOrderDetail(data);
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { type: 'success', message: 'Pedido marcado como enviado por WhatsApp' } }));
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo marcar el pedido como enviado');
    } finally {
      setActionLoading((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const handleDeleteOrder = async (order) => {
    const orderId = String(order?._id || '');
    if (!orderId) return;
    if (!window.confirm('¿Eliminar este pedido?')) return;
    try {
      await api.delete(`/purchases/orders/${orderId}`);
      setOrderDetail(null);
      setOrders((prev) => prev.filter((item) => String(item._id) !== orderId));
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { type: 'success', message: 'Pedido eliminado' } }));
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo eliminar el pedido');
    }
  };

  const exportSuppliersProductsCsv = () => {
    const groups = [...productsBySupplier];
    const rows = [];
    rows.push(['Proveedor', 'Producto', 'Unidad', 'Orden', 'Activo']);
    groups.forEach((group) => {
      const supplierName = group.supplier?.name || 'Sin proveedor';
      if (!group.products.length) {
        rows.push([supplierName, '', '', '', '']);
        return;
      }
      group.products.forEach((product) => {
        rows.push([
          supplierName,
          product.name || '',
          product.unit || '',
          Number(product.sortOrder || 0),
          product.isActive ? 'Sí' : 'No',
        ]);
      });
      rows.push(['', '', '', '', '']);
    });

    const csv = rows
      .map((row) => row.map((cell) => csvEscape(cell)).join(';'))
      .join('\n');

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = todayIso();
    a.href = url;
    a.download = `proveedores_productos_${date}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportSuppliersProductsPdf = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    const lineHeight = 16;
    let y = margin;

    const printLine = (text, opts = {}) => {
      const { bold = false, size = 10, color = [31, 41, 55] } = opts;
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(size);
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(String(text || ''), pageWidth - margin * 2);
      lines.forEach((line) => {
        if (y > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += lineHeight;
      });
    };

    printLine(`Proveedores y productos - ${todayIso()}`, { bold: true, size: 14, color: [17, 24, 39] });
    y += 4;

    productsBySupplier.forEach((group) => {
      const supplierName = group.supplier?.name || 'Sin proveedor';
      printLine(supplierName, { bold: true, size: 12, color: [79, 70, 229] });
      if (!group.products.length) {
        printLine('Sin productos', { size: 10, color: [107, 114, 128] });
      } else {
        group.products.forEach((product, index) => {
          const unit = product.unit ? ` (${product.unit})` : '';
          printLine(`${index + 1}. ${product.name}${unit}`, { size: 10 });
        });
      }
      y += 6;
    });

    doc.save(`proveedores_productos_${todayIso()}.pdf`);
  };

  const handleMoveProduct = async (product, direction) => {
    const supplierProducts = products
      .filter((p) => String(p.supplier?._id || p.supplierId) === String(product.supplier?._id || product.supplierId))
      .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0) || String(a.name).localeCompare(String(b.name)));
    const currentIndex = supplierProducts.findIndex((p) => String(p._id) === String(product._id));
    if (currentIndex < 0) return;
    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= supplierProducts.length) return;
    const other = supplierProducts[swapIndex];

    try {
      await Promise.all([
        api.put(`/purchases/products/${product._id}`, { sortOrder: swapIndex + 1 }),
        api.put(`/purchases/products/${other._id}`, { sortOrder: currentIndex + 1 }),
      ]);
      await loadAll();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo actualizar el orden de productos');
    }
  };

  const primary = {
    orders: { label: 'Nuevo pedido', short: 'Pedido', onClick: () => setOrderModal({}) },
    products: { label: 'Nuevo producto', short: 'Producto', onClick: () => setProductModal({}) },
    suppliers: { label: 'Nuevo proveedor', short: 'Proveedor', onClick: () => setSupplierModal({}) },
  }[tab];
  useSetMobileHeader({ title: 'Compras', action: { label: primary.short, onClick: primary.onClick } });

  return (
    <div className="w-full space-y-6">
      <PageHeader title="Compras" subtitle="Pedidos a proveedores y el catálogo de lo que les compras."
        actions={(
          <>
            {tab === 'suppliers' && (
              <MenuButton ariaLabel="Exportar" className="h-9 px-3.5 border border-gray-200"
                items={[{ label: 'Exportar Excel', onClick: exportSuppliersProductsCsv }, { label: 'Exportar PDF', onClick: exportSuppliersProductsPdf }]}>
                Exportar<Icon name="down" className="w-3.5 h-3.5" strokeWidth={2} />
              </MenuButton>
            )}
            <PrimaryButton onClick={primary.onClick}>{primary.label}</PrimaryButton>
          </>
        )} />

      <Tabs value={tab} onChange={setTab} options={[
        ['orders', `Pedidos${orders.length ? ` · ${orders.length}` : ''}`],
        ['products', `Productos${products.length ? ` · ${products.length}` : ''}`],
        ['suppliers', `Proveedores${suppliers.length ? ` · ${suppliers.length}` : ''}`],
      ]} />

      {loading && <p className="text-sm text-gray-400">Cargando…</p>}
      {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      {!loading && tab === 'orders' && (
        orders.length === 0 ? (
          <Empty action={<button type="button" onClick={() => setOrderModal({})} className="text-sm font-semibold text-violet-700">+ Hacer el primer pedido</button>}>
            Todavía no hay pedidos.
          </Empty>
        ) : (
          <div>
            <div className={tableHead}>
              <span className="col-span-2">Fecha</span>
              <span className="col-span-3">Proveedor</span>
              <span className="col-span-2">Estado</span>
              <span className="col-span-1 text-right">Productos</span>
              <span className="col-span-2 text-right">Total</span>
              <span className="col-span-2" />
            </div>
            <ul className="divide-y divide-gray-100">
              {orders.map((order) => {
                const orderId = String(order._id);
                const itemsCount = order.items?.length || 0;
                const disabledSend = itemsCount === 0 || actionLoading[orderId];
                return (
                  <li key={order._id}>
                    <div role="button" tabIndex={0} onClick={() => setOrderDetail(order)}
                      onKeyDown={(e) => { if (e.key === 'Enter') setOrderDetail(order); }}
                      className="w-full text-left px-2 py-3 flex items-center gap-3 md:grid md:grid-cols-12 md:gap-4 rounded-xl hover:bg-gray-50 active:bg-gray-100 cursor-pointer">
                      <span className="hidden md:block md:col-span-2 text-sm text-gray-700">{niceDate(order.orderDate)}</span>
                      <div className="md:col-span-3 min-w-0 flex-1">
                        <p className="text-[15px] font-medium text-gray-900 truncate">{order.supplierName}</p>
                        <p className="text-[13px] text-gray-500 truncate md:hidden">{niceDate(order.orderDate)} · {itemsCount} {itemsCount === 1 ? 'producto' : 'productos'}</p>
                        <p className="md:hidden mt-0.5"><OrderStatus status={order.status} /></p>
                      </div>
                      <span className="hidden md:block md:col-span-2"><OrderStatus status={order.status} /></span>
                      <span className="hidden md:block md:col-span-1 text-right text-sm tabular-nums text-gray-700">{itemsCount}</span>
                      <span className={`${order.totalAmount ? '' : 'hidden md:block'} md:col-span-2 text-right text-sm font-semibold tabular-nums text-gray-900 shrink-0`}>{order.totalAmount ? money(order.totalAmount) : <span className="text-gray-300 font-normal">—</span>}</span>
                      <div className="hidden md:flex md:col-span-2 justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => handleSendWhatsapp(order)} disabled={disabledSend}
                          className="h-8 px-3 rounded-full bg-emerald-50 text-emerald-800 hover:bg-emerald-100 disabled:opacity-40 text-xs font-semibold">
                          {actionLoading[orderId] ? 'Enviando…' : 'WhatsApp'}
                        </button>
                        <button type="button" onClick={() => setOrderModal(order)} className="h-8 px-3 rounded-full text-xs font-semibold text-gray-700 hover:bg-gray-100">Editar</button>
                      </div>
                      <Icon name="right" className="md:hidden w-4 h-4 text-gray-300 shrink-0" strokeWidth={2} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )
      )}

      {!loading && tab === 'products' && (
        products.length === 0 ? (
          <Empty action={<button type="button" onClick={() => setProductModal({})} className="text-sm font-semibold text-violet-700">+ Añadir el primero</button>}>
            {suppliers.length ? 'Todavía no hay productos.' : 'Primero añade un proveedor; luego sus productos.'}
          </Empty>
        ) : (
          <div className="space-y-7">
            {productsBySupplier.map((group) => {
              const supplierId = String(group.supplier?._id || 'unknown');
              const isOpen = openSuppliers[supplierId] !== false;
              return (
                <section key={supplierId}>
                  <button type="button" onClick={() => setOpenSuppliers((prev) => ({ ...prev, [supplierId]: !isOpen }))}
                    className="w-full flex items-baseline justify-between gap-3 mb-1.5 text-left">
                    <h3 className="text-[13px] font-semibold uppercase tracking-wide text-gray-400">{group.supplier?.name || 'Sin proveedor'} · {group.products.length}</h3>
                    <span className="text-[13px] font-semibold text-violet-700">{isOpen ? 'Ocultar' : 'Ver'}</span>
                  </button>
                  {isOpen && (
                    <ul className="divide-y divide-gray-100">
                      {group.products.map((product, idx) => (
                        <li key={product._id} className="flex items-center gap-3 py-2.5">
                          <div className="min-w-0 flex-1">
                            <p className={`text-[15px] font-medium truncate ${product.isActive ? 'text-gray-900' : 'text-gray-400'}`}>{product.name}</p>
                            <p className="text-[13px] text-gray-500">{product.unit || 'unidad'}{product.defaultUnitCost > 0 ? ` · ${money(product.defaultUnitCost)}` : ''}{!product.isActive ? ' · inactivo' : ''}</p>
                          </div>
                          <button type="button" onClick={() => handleMoveProduct(product, 'up')} disabled={idx === 0} aria-label="Subir"
                            className="w-8 h-8 rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-30">↑</button>
                          <button type="button" onClick={() => handleMoveProduct(product, 'down')} disabled={idx === group.products.length - 1} aria-label="Bajar"
                            className="w-8 h-8 rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-30">↓</button>
                          <button type="button" onClick={() => setProductModal(product)} className="h-8 px-3 rounded-full text-[13px] font-semibold text-gray-700 hover:bg-gray-100">Editar</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        )
      )}

      {!loading && tab === 'suppliers' && (
        <>
          <div className="lg:hidden flex gap-2">
            <GhostButton onClick={exportSuppliersProductsCsv}>Exportar Excel</GhostButton>
            <GhostButton onClick={exportSuppliersProductsPdf}>Exportar PDF</GhostButton>
          </div>
          {suppliers.length === 0 ? (
            <Empty action={<button type="button" onClick={() => setSupplierModal({})} className="text-sm font-semibold text-violet-700">+ Añadir el primero</button>}>
              Todavía no hay proveedores.
            </Empty>
          ) : (
            <div>
              <div className={tableHead}>
                <span className="col-span-4">Proveedor</span>
                <span className="col-span-3">Contacto</span>
                <span className="col-span-3">WhatsApp</span>
                <span className="col-span-2 text-right">Productos</span>
              </div>
              <ul className="divide-y divide-gray-100">
                {suppliers.map((supplier) => {
                  const count = products.filter((pr) => String(pr.supplier?._id || pr.supplierId) === String(supplier._id)).length;
                  return (
                    <li key={supplier._id}>
                      <button type="button" onClick={() => setSupplierModal(supplier)}
                        className="w-full text-left px-2 py-3 flex items-center gap-3 md:grid md:grid-cols-12 md:gap-4 rounded-xl hover:bg-gray-50 active:bg-gray-100">
                        <div className="md:col-span-4 flex items-center gap-3 min-w-0 flex-1">
                          <span className="w-10 h-10 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center text-sm font-semibold shrink-0">
                            {(supplier.name || '?').charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className={`text-[15px] font-medium truncate ${supplier.isActive ? 'text-gray-900' : 'text-gray-400'}`}>{supplier.name}</p>
                            <p className="text-[13px] text-gray-500 truncate md:hidden">
                              {[supplier.contactName, supplier.whatsappPhone || supplier.phone].filter(Boolean).join(' · ') || 'Sin contacto'}{!supplier.isActive ? ' · inactivo' : ''}
                            </p>
                            {!supplier.isActive && <p className="hidden md:block text-[13px] text-gray-400">Inactivo</p>}
                          </div>
                        </div>
                        <span className="hidden md:block md:col-span-3 text-sm text-gray-700 truncate">{supplier.contactName || <span className="text-gray-300">—</span>}</span>
                        <span className="hidden md:block md:col-span-3 text-sm text-gray-700 tabular-nums">{supplier.whatsappPhone || supplier.phone || <span className="text-gray-300">—</span>}</span>
                        <span className="md:col-span-2 text-right text-sm tabular-nums text-gray-700 shrink-0">{count}</span>
                        <Icon name="right" className="md:hidden w-4 h-4 text-gray-300 shrink-0" strokeWidth={2} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
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
          onSaved={async (savedOrder) => {
            setOrderModal(null);
            const loaded = await loadAll();
            const opened = loaded?.orders?.find((order) => String(order._id) === String(savedOrder?._id));
            if (opened) setOrderDetail(opened);
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

      {orderDetail !== null && (
        <OrderDetailModal
          order={orderDetail}
          onClose={() => setOrderDetail(null)}
          onEdit={() => {
            setOrderDetail(null);
            setOrderModal(orderDetail);
          }}
          onDelete={() => handleDeleteOrder(orderDetail)}
          onSend={() => handleSendWhatsapp(orderDetail)}
          sending={!!actionLoading[String(orderDetail._id)]}
        />
      )}
    </div>
  );
}

function OrderDetailModal({ order, onClose, onEdit, onDelete, onSend, sending }) {
  const canSend = order?.status !== 'sent' && Array.isArray(order?.items) && order.items.length > 0;
  return (
    <Modal onClose={onClose} size="lg" title={order.supplierName}
      header={(
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-gray-900 truncate">{order.supplierName}</h3>
          <p className="text-[13px] text-gray-500 mt-0.5 flex items-center gap-2">{niceDate(order.orderDate)} · <OrderStatus status={order.status} /></p>
        </div>
      )}
      footer={(
        <div className="flex items-center gap-2">
          <button type="button" onClick={onDelete} className={btnDanger}>Eliminar</button>
          <div className="flex-1" />
          <button type="button" onClick={onEdit} className={btnQuiet}>Editar</button>
          {canSend && (
            <button type="button" onClick={onSend} disabled={sending}
              className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50">
              {sending ? 'Enviando…' : <><span className="sm:hidden">WhatsApp</span><span className="hidden sm:inline">Enviar por WhatsApp</span></>}
            </button>
          )}
        </div>
      )}>
      {order.items?.length ? (
        <ul className="divide-y divide-gray-100 -my-2">
          {order.items.map((item, idx) => (
            <li key={`${item.productId}-${idx}`} className="flex items-center justify-between gap-3 py-2.5">
              <span className="text-[15px] text-gray-900 min-w-0 truncate">{item.productName}</span>
              <span className="text-sm font-semibold tabular-nums text-gray-700 shrink-0">{item.quantity} {item.unit || ''}</span>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-gray-400">Sin productos</p>}
      {order.notes && <p className="mt-4 text-[13px] text-gray-500 whitespace-pre-line">{order.notes}</p>}
    </Modal>
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
    <Modal onClose={onClose} size="lg" title={supplier?._id ? 'Editar proveedor' : 'Nuevo proveedor'}
      footer={(
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnQuiet}>Cancelar</button>
          <button type="submit" form="supplier-form" disabled={saving} className={btnPrimary}>{saving ? 'Guardando…' : 'Guardar'}</button>
        </div>
      )}>
      <form id="supplier-form" onSubmit={submit} className="space-y-4">
        {error && <p className="text-sm text-rose-700 bg-rose-50 rounded-xl px-3 py-2">{error}</p>}
        <div><label className={labelCls}>Nombre *</label><input className={inputCls} value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} required /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={labelCls}>Persona de contacto</label><input className={inputCls} value={form.contactName} onChange={(e) => setForm((prev) => ({ ...prev, contactName: e.target.value }))} /></div>
          <div><label className={labelCls}>Teléfono</label><input className={inputCls} value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} placeholder="+34600111222" /></div>
          <div><label className={labelCls}>WhatsApp</label><input className={inputCls} value={form.whatsappPhone} onChange={(e) => setForm((prev) => ({ ...prev, whatsappPhone: e.target.value }))} placeholder="+34600111222" /></div>
          <div><label className={labelCls}>Email</label><input className={inputCls} type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} /></div>
        </div>
        <div><label className={labelCls}>Notas</label><textarea rows={2} className={inputCls} value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} /></div>
        {supplier?._id && (
          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="text-[15px] text-gray-900">Proveedor activo</span>
            <Toggle on={form.isActive} label="Proveedor activo" onChange={(v) => setForm((prev) => ({ ...prev, isActive: v }))} />
          </div>
        )}
      </form>
    </Modal>
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

  const remove = async () => {
    if (!product?._id) return;
    if (!window.confirm('¿Eliminar este producto?')) return;
    setSaving(true);
    setError('');
    try {
      await api.delete(`/purchases/products/${product._id}`);
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo eliminar el producto');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} size="lg" title={product?._id ? 'Editar producto' : 'Nuevo producto'}
      footer={(
        <div className="flex items-center gap-2">
          {product?._id && <button type="button" onClick={remove} disabled={saving} className={btnDanger}>Eliminar</button>}
          <div className="flex-1" />
          <button type="button" onClick={onClose} className={btnQuiet}>Cancelar</button>
          <button type="submit" form="product-form" disabled={saving} className={btnPrimary}>{saving ? 'Guardando…' : 'Guardar'}</button>
        </div>
      )}>
      <form id="product-form" onSubmit={submit} className="space-y-4">
        {error && <p className="text-sm text-rose-700 bg-rose-50 rounded-xl px-3 py-2">{error}</p>}
        <div>
          <label className={labelCls}>Proveedor *</label>
          <select className={inputCls} value={form.supplierId} onChange={(e) => setForm((prev) => ({ ...prev, supplierId: e.target.value }))} required>
            <option value="">Elegir…</option>
            {suppliers.map((supplier) => <option key={supplier._id} value={supplier._id}>{supplier.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={labelCls}>Nombre *</label><input className={inputCls} value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} required /></div>
          <div><label className={labelCls}>Unidad</label><input className={inputCls} value={form.unit} onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value }))} placeholder="kg, ud, caja…" /></div>
          <div><label className={labelCls}>Coste base</label><input type="number" min="0" step="0.01" className={inputCls} value={form.defaultUnitCost} onChange={(e) => setForm((prev) => ({ ...prev, defaultUnitCost: e.target.value }))} /></div>
          <div><label className={labelCls}>Referencia (SKU)</label><input className={inputCls} value={form.sku} onChange={(e) => setForm((prev) => ({ ...prev, sku: e.target.value }))} /></div>
        </div>
        <div><label className={labelCls}>Notas</label><textarea rows={2} className={inputCls} value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} /></div>
        {product?._id && (
          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="text-[15px] text-gray-900">Producto activo</span>
            <Toggle on={form.isActive} label="Producto activo" onChange={(v) => setForm((prev) => ({ ...prev, isActive: v }))} />
          </div>
        )}
      </form>
    </Modal>
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
    () => products
      .filter((product) => String(product.supplier?._id || product.supplierId) === String(form.supplierId))
      .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0) || String(a.name).localeCompare(String(b.name))),
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
      const response = order?._id
        ? await api.put(`/purchases/orders/${order._id}`, payload)
        : await api.post('/purchases/orders', payload);
      onSaved(response?.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo guardar el pedido');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} size="lg" title={order?._id ? 'Editar pedido' : 'Nuevo pedido'}
      subtitle={step === 1 ? 'Elige el proveedor' : `${selectedSupplier?.name || 'Sin proveedor'} · ${niceDate(form.orderDate)}`}
      footer={(
        <div className="flex items-center gap-2">
          {step === 2 && <button type="button" onClick={() => setStep(1)} className={btnQuiet}>‹ Proveedor</button>}
          <div className="flex-1" />
          <button type="button" onClick={onClose} className={btnQuiet}>Cancelar</button>
          {step === 1 && <button type="button" disabled={!form.supplierId} onClick={() => setStep(2)} className={btnPrimary}>Siguiente</button>}
          {step === 2 && <button type="submit" form="order-form" disabled={saving} className={btnPrimary}>{saving ? 'Guardando…' : 'Guardar pedido'}</button>}
        </div>
      )}>
      <form id="order-form" onSubmit={submit} className="space-y-4">
        {error && <p className="text-sm text-rose-700 bg-rose-50 rounded-xl px-3 py-2">{error}</p>}
        {step === 1 && (
          suppliers.filter((sp) => sp.isActive).length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No hay proveedores activos. Añade uno en la pestaña Proveedores.</p>
          ) : (
            <ul className="divide-y divide-gray-100 -my-2">
              {suppliers.filter((sp) => sp.isActive).map((supplier) => {
                const selected = String(form.supplierId) === String(supplier._id);
                return (
                  <li key={supplier._id}>
                    <button type="button" onClick={() => { setForm((prev) => ({ ...prev, supplierId: supplier._id })); setStep(2); }}
                      className={`w-full text-left flex items-center gap-3 px-2 -mx-2 py-3 rounded-xl ${selected ? 'bg-violet-50' : 'hover:bg-gray-50'}`}>
                      <span className="w-9 h-9 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center text-sm font-semibold shrink-0">{(supplier.name || '?').charAt(0).toUpperCase()}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-medium text-gray-900 truncate">{supplier.name}</span>
                        <span className="block text-[13px] text-gray-500">{supplier.whatsappPhone || supplier.phone || 'Sin teléfono'}</span>
                      </span>
                      <Icon name="right" className="w-4 h-4 text-gray-300" strokeWidth={2} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )
        )}

        {step === 2 && (
          <>
            {supplierProducts.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">Este proveedor no tiene productos activos.</p>
            ) : (
              <ul className="divide-y divide-gray-100 -my-2">
                {supplierProducts.map((product) => {
                  const row = rowByProduct.get(String(product._id)) || { quantity: 0 };
                  return (
                    <li key={product._id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-[15px] text-gray-900 truncate">{product.name}</p>
                        <p className="text-[13px] text-gray-500">{product.unit || 'unidad'}</p>
                      </div>
                      <input type="text" inputMode="decimal" placeholder="0" aria-label={`Cantidad de ${product.name}`}
                        className="w-20 border border-gray-300 rounded-xl px-3 py-2 text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-violet-500"
                        value={formatDecimalInput(row.quantity)}
                        onChange={(e) => setItemQuantity(product, parseDecimalInput(e.target.value))} />
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="pt-2">
              <label className={labelCls}>Notas para el proveedor</label>
              <textarea rows={2} className={inputCls} value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} />
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}
