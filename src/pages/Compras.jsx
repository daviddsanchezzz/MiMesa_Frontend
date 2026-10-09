import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import Icon from '../ui/Icon';
import { ModalFooter } from '../ui/form';
import { Empty, GhostButton, Hero, MenuButton, Section, SectionLink, Segmented, Tabs, Toggle } from '../ui/kit';
import Page from '../ui/Page';
import Invoices from './invoices/Invoices';
import InvoiceStatus from './invoices/InvoiceStatus';
import PeriodNavigator, { usePeriod } from '../ui/PeriodNavigator';
import { dateDay as niceDate, money } from '../lib/format';
import { previousLabel, shiftRange } from '../lib/periods';
import { notify } from '../lib/notify';
import { confirmDialog } from '../ui/confirm';
import { inputCls, labelCls, btnPrimary, btnQuiet, btnDangerQuiet } from '../ui/form';
import { ErrorBanner, Loading } from '../ui/feedback';
import { Avatar, Chip, DataTable, List, ListRow } from '../ui/list';
import { ActionList, Attention, Columns } from '../ui/layout';


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

/** The first screen of Compras: what you spent, what is waiting for you, who you buy from. */
/** Sections stay plain on every screen; on desktop they sit side by side without boxes. */
const PANEL = '';

function ComprasResumen({ invoices, orders, period, dateRange, onGo, onNewOrder, onOpenInvoice }) {
  const navigate = useNavigate();
  const { isAppointments } = useAuth();
  // A restaurant orders from its suppliers far more often than it scans invoices: the order comes first
  const orderFirst = !isAppointments;
  const prev = shiftRange(period, dateRange, -1);

  const counted = (range) => invoices.filter((i) => {
    const day = String(i.invoiceDate || '').slice(0, 10);
    return i.status === 'CONFIRMED' && day >= range.from && day <= range.to;
  });
  const monthInvoices = counted(dateRange);
  const total = monthInvoices.reduce((s, i) => s + Number(i.total || 0), 0);
  const prevTotal = counted(prev).reduce((s, i) => s + Number(i.total || 0), 0);
  const rawChange = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : null;
  const change = rawChange !== null && Math.abs(rawChange) > 300 ? null : rawChange; // a jump that big says nothing

  const bySupplier = Object.values(monthInvoices.reduce((acc, i) => {
    const name = i.supplier?.name || 'Sin proveedor';
    acc[name] = acc[name] || { name, total: 0, count: 0 };
    acc[name].total += Number(i.total || 0);
    acc[name].count += 1;
    return acc;
  }, {})).sort((a, b) => b.total - a.total);
  const topSuppliers = bySupplier.slice(0, 4);
  const maxSupplier = topSuppliers[0]?.total || 1;

  const toReview = invoices.filter((i) => i.status === 'REVIEW' || i.status === 'FAILED');
  const processing = invoices.filter((i) => i.status === 'PROCESSING');
  const drafts = orders.filter((o) => o.status === 'draft');
  const awaiting = orders.filter((o) => o.status === 'sent' || o.status === 'confirmed');

  const todo = [
    toReview.length > 0 && { key: 'review', icon: 'receipt', tone: 'amber', title: `${toReview.length} ${toReview.length === 1 ? 'factura por revisar' : 'facturas por revisar'}`, hint: 'Confírmalas para que cuenten como gasto.', onClick: () => onGo('invoices') },
    processing.length > 0 && { key: 'processing', icon: 'clock', tone: 'violet', title: `${processing.length} ${processing.length === 1 ? 'factura procesándose' : 'facturas procesándose'}`, hint: 'En un momento estará lista para revisar.', onClick: () => onGo('invoices') },
    drafts.length > 0 && { key: 'drafts', icon: 'edit', tone: 'gray', title: `${drafts.length} ${drafts.length === 1 ? 'pedido en borrador' : 'pedidos en borrador'}`, hint: 'Aún no los has enviado al proveedor.', onClick: () => onGo('orders') },
    awaiting.length > 0 && { key: 'awaiting', icon: 'cart', tone: 'violet', title: `${awaiting.length} ${awaiting.length === 1 ? 'pedido por recibir' : 'pedidos por recibir'}`, hint: 'Enviados, pendientes de llegar.', onClick: () => onGo('orders') },
  ].filter(Boolean);

  const actions = orderFirst
    ? [{ icon: 'plus', label: 'Nuevo pedido', onClick: onNewOrder }, { icon: 'camera', label: 'Subir factura', to: '/compras/facturas/nueva' }]
    : [{ icon: 'camera', label: 'Subir factura', to: '/compras/facturas/nueva' }, { icon: 'plus', label: 'Pedido', onClick: onNewOrder }];

  return (
    <div className="space-y-8">
      <Hero label="Has comprado" value={money(total)}
        pill={change !== null && change !== 0 && (
          <Chip tone={change > 0 ? 'amber' : 'green'}>{change > 0 ? '▲' : '▼'} {Math.abs(change)} % vs {previousLabel(period, dateRange)}</Chip>
        )}>
        <p className="mt-2 text-[15px] text-gray-600">
          {monthInvoices.length === 0
            ? 'Sin facturas confirmadas en este periodo.'
            : `${monthInvoices.length} ${monthInvoices.length === 1 ? 'factura' : 'facturas'} de ${bySupplier.length} ${bySupplier.length === 1 ? 'proveedor' : 'proveedores'}.`}
        </p>
      </Hero>

      <div className="lg:hidden"><ActionList items={actions} /></div>

      <Columns aside={(
        <>
          <div className="hidden lg:block"><ActionList title="Acciones" items={actions} /></div>
          {topSuppliers.length > 0 && (
            <Section title="Dónde compras más" aside={<SectionLink onClick={() => onGo('suppliers')}>Proveedores</SectionLink>}>
              <ul className="space-y-3 pt-1">
                {topSuppliers.map((s) => (
                  <li key={s.name}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate text-[15px] font-medium text-gray-900">{s.name}</span>
                      <span className="shrink-0 text-[15px] font-semibold tabular-nums text-gray-900">{money(s.total)}</span>
                    </div>
                    <div className="mt-1.5 h-2 rounded-full bg-gray-100"><div className="h-2 rounded-full bg-violet-500" style={{ width: `${Math.max(4, (s.total / maxSupplier) * 100)}%` }} /></div>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </>
      )}>
        {todo.length > 0 && (
          <Section title="Pendiente">
            <div className="divide-y divide-gray-100">
              {todo.map((t) => <Attention key={t.key} icon={t.icon} tone={t.tone} title={t.title} hint={t.hint} onClick={t.onClick} />)}
            </div>
          </Section>
        )}

        <Section title="Últimas facturas" aside={invoices.length > 0 && <SectionLink onClick={() => onGo('invoices')}>Ver todas</SectionLink>}>
          {invoices.length === 0 ? (
            <Empty>Todavía no hay facturas. Haz una foto a una factura y se rellenará sola.</Empty>
          ) : (
            <List>
              {invoices.slice(0, 5).map((invoice) => (
                <ListRow key={invoice._id} onClick={() => onOpenInvoice(invoice)} title={invoice.supplier?.name || 'Sin proveedor'}
                  subtitle={`${invoice.invoiceNumber || 'Sin número'} · ${niceDate(invoice.invoiceDate)}`}
                  value={money(invoice.total)} valueSub={<InvoiceStatus status={invoice.status} />} />
              ))}
            </List>
          )}
        </Section>
      </Columns>
    </div>
  );
}

export default function Compras() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathTab = location.pathname.split('/')[2];
  const initialTab = ({ resumen: 'summary', facturas: 'invoices', albaranes: 'notes', pedidos: 'orders', productos: 'suppliers', proveedores: 'suppliers' })[pathTab] || 'summary';
  const [tab, setTab] = useState(initialTab);
  const { period, dateRange, onPeriodChange, onShift, onRangeChange } = usePeriod('month');
  const [supView, setSupView] = useState(pathTab === 'productos' ? 'products' : 'suppliers'); // inside the Proveedores tab
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState({});

  const [productModal, setProductModal] = useState(null);
  const [orderModal, setOrderModal] = useState(null);
  const [supplierModal, setSupplierModal] = useState(null);
  const [supplierDetail, setSupplierDetail] = useState(null);
  const [supplierDetailLoading, setSupplierDetailLoading] = useState(false);
  const [orderDetail, setOrderDetail] = useState(null);
  const [openSuppliers, setOpenSuppliers] = useState({});

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [suppliersRes, productsRes, ordersRes, invoicesRes] = await Promise.all([
        api.get('/suppliers'),
        api.get('/purchases/products'),
        api.get('/purchases/orders'),
        api.get('/invoices'),
      ]);
      setSuppliers(suppliersRes.data || []);
      setProducts(productsRes.data || []);
      setOrders(ordersRes.data || []);
      setInvoices(invoicesRes.data || []);
      return {
        suppliers: suppliersRes.data || [],
        products: productsRes.data || [],
        orders: ordersRes.data || [],
        invoices: invoicesRes.data || [],
      };
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudieron cargar los datos de compras');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => {
    setTab(initialTab);
    if (pathTab === 'productos') setSupView('products');
    if (pathTab === 'proveedores') setSupView('suppliers');
  }, [initialTab, pathTab]);

  const openSupplier = useCallback(async (supplier) => {
    setSupplierDetailLoading(true);
    try {
      const { data } = await api.get(`/suppliers/${supplier._id}`);
      setSupplierDetail(data);
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo cargar el proveedor');
    } finally {
      setSupplierDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    const supplierId = new URLSearchParams(location.search).get('supplier');
    const supplier = suppliers.find((item) => String(item._id) === String(supplierId));
    if (supplier && !supplierDetail && !supplierDetailLoading) openSupplier(supplier);
  }, [location.search, suppliers, supplierDetail, supplierDetailLoading, openSupplier]);

  const selectTab = (next) => {
    const slug = { summary: 'resumen', invoices: 'facturas', notes: 'albaranes', orders: 'pedidos', suppliers: 'proveedores' }[next];
    setTab(next);
    if (next === 'suppliers') setSupView('suppliers');
    navigate(`/compras/${slug}`);
  };

  const selectSupView = (next) => {
    setSupView(next);
    navigate(next === 'products' ? '/compras/productos' : '/compras/proveedores');
  };

  const countOf = (supplier) => products.filter((pr) => String(pr.supplier?._id || pr.supplierId) === String(supplier._id)).length;
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
      notify.success('Pedido marcado como enviado por WhatsApp');
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo marcar el pedido como enviado');
    } finally {
      setActionLoading((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const handleDeleteOrder = async (order) => {
    const orderId = String(order?._id || '');
    if (!orderId) return;
    if (!await confirmDialog('¿Eliminar este pedido?')) return;
    try {
      await api.delete(`/purchases/orders/${orderId}`);
      setOrderDetail(null);
      setOrders((prev) => prev.filter((item) => String(item._id) !== orderId));
      notify.success('Pedido eliminado');
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
    invoices: { label: 'Añadir factura', short: 'Factura', onClick: () => navigate('/compras/facturas/nueva') },
    notes: { label: 'Añadir albarán', short: 'Albarán', onClick: () => navigate('/compras/facturas/nueva?tipo=albaran') },
    orders: { label: 'Nuevo pedido', short: 'Pedido', onClick: () => setOrderModal({}) },
    suppliers: supView === 'products'
      ? { label: 'Nuevo producto', short: 'Producto', onClick: () => setProductModal({}) }
      : { label: 'Nuevo proveedor', short: 'Proveedor', onClick: () => setSupplierModal({}) },
  }[tab];

  const reviewCount = invoices.filter((invoice) => invoice.status === 'REVIEW' || invoice.status === 'FAILED').length;
  const pendingOrders = orders.filter((order) => order.status === 'draft').length;
  return (
    <Page title="Compras" sticky primary={primary}
      menu={tab === 'suppliers' && supView === 'suppliers' ? [{ label: 'Exportar a Excel', onClick: exportSuppliersProductsCsv }, { label: 'Exportar a PDF', onClick: exportSuppliersProductsPdf }] : undefined}
      toolbar={tab === 'summary' && <PeriodNavigator period={period} dateRange={dateRange} onPeriodChange={onPeriodChange} onShift={onShift} onRangeChange={onRangeChange} />}
      tabs={{ value: tab, onChange: selectTab, options: [['summary', 'Resumen'], ['invoices', 'Facturas', reviewCount], ['notes', 'Albaranes'], ['orders', 'Pedidos', pendingOrders], ['suppliers', 'Proveedores']] }}>

      {loading && <Loading />}
      {error && <ErrorBanner>{error}</ErrorBanner>}

      {!loading && tab === 'summary' && (
        <ComprasResumen invoices={invoices} orders={orders} period={period} dateRange={dateRange} onGo={selectTab} onNewOrder={() => setOrderModal({})}
          onOpenInvoice={(invoice) => navigate(`/compras/facturas/${invoice._id}`)} />
      )}

      {!loading && tab === 'invoices' && <Invoices embedded kind="INVOICE" />}
      {!loading && tab === 'notes' && <Invoices embedded kind="DELIVERY_NOTE" />}

      {!loading && tab === 'orders' && (
        orders.length === 0 ? (
          <Empty action={<button type="button" onClick={() => setOrderModal({})} className="text-sm font-semibold text-violet-700">+ Hacer el primer pedido</button>}>
            Todavía no hay pedidos.
          </Empty>
        ) : (
          <DataTable rows={orders} rowKey={(o) => o._id} onRowClick={setOrderDetail}
            mobile={(order) => {
              const itemsCount = order.items?.length || 0;
              return {
                title: order.supplierName,
                subtitle: `${niceDate(order.orderDate)} · ${itemsCount} ${itemsCount === 1 ? 'producto' : 'productos'}`,
                status: <OrderStatus status={order.status} />,
                value: order.totalAmount ? money(order.totalAmount) : null,
                chevron: true,
              };
            }}
            columns={[
              { label: 'Fecha', span: 2, render: (o) => niceDate(o.orderDate) },
              { label: 'Proveedor', span: 3, render: (o) => <span className="block truncate text-[15px] font-medium text-gray-900">{o.supplierName}</span> },
              { label: 'Estado', span: 2, render: (o) => <OrderStatus status={o.status} /> },
              { label: 'Productos', span: 1, align: 'right', render: (o) => <span className="tabular-nums">{o.items?.length || 0}</span> },
              { label: 'Total', span: 2, align: 'right', render: (o) => (o.totalAmount ? <b className="font-semibold tabular-nums text-gray-900">{money(o.totalAmount)}</b> : <span className="text-gray-300">—</span>) },
              { label: '', span: 2, render: (o) => {
                const id = String(o._id);
                return (
                  <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <button type="button" onClick={() => handleSendWhatsapp(o)} disabled={!o.items?.length || actionLoading[id]}
                      className="h-8 px-3 rounded-full bg-emerald-50 text-emerald-800 hover:bg-emerald-100 disabled:opacity-40 text-xs font-semibold">{actionLoading[id] ? 'Enviando…' : 'WhatsApp'}</button>
                    <button type="button" onClick={() => setOrderModal(o)} className="h-8 px-3 rounded-full text-xs font-semibold text-gray-700 hover:bg-gray-100">Editar</button>
                  </div>
                );
              } },
            ]} />
        )
      )}

      {!loading && tab === 'suppliers' && (
        <div className="-mt-2"><Segmented size="sm" value={supView} onChange={selectSupView} options={[['suppliers', `Proveedores${suppliers.length ? ` · ${suppliers.length}` : ''}`], ['products', `Productos${products.length ? ` · ${products.length}` : ''}`]]} /></div>
      )}

      {!loading && tab === 'suppliers' && supView === 'products' && (
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
                    <List>
                      {group.products.map((product, idx) => (
                        <ListRow key={product._id} muted={!product.isActive} className="!py-2.5" title={product.name}
                          subtitle={`${product.unit || 'unidad'}${product.defaultUnitCost > 0 ? ` · ${money(product.defaultUnitCost)}` : ''}${!product.isActive ? ' · inactivo' : ''}`}
                          trailing={(
                            <>
                              <button type="button" onClick={() => handleMoveProduct(product, 'up')} disabled={idx === 0} aria-label="Subir" className="w-8 h-8 rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-30">↑</button>
                              <button type="button" onClick={() => handleMoveProduct(product, 'down')} disabled={idx === group.products.length - 1} aria-label="Bajar" className="w-8 h-8 rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-30">↓</button>
                              <button type="button" onClick={() => setProductModal(product)} className="h-8 px-3 rounded-full text-[13px] font-semibold text-gray-700 hover:bg-gray-100">Editar</button>
                            </>
                          )} />
                      ))}
                    </List>
                  )}
                </section>
              );
            })}
          </div>
        )
      )}

      {!loading && tab === 'suppliers' && supView === 'suppliers' && (
        <>
          {suppliers.length === 0 ? (
            <Empty action={<button type="button" onClick={() => setSupplierModal({})} className="text-sm font-semibold text-violet-700">+ Añadir el primero</button>}>
              Todavía no hay proveedores.
            </Empty>
          ) : (
            <DataTable rows={suppliers} rowKey={(x) => x._id} onRowClick={openSupplier}
              mobile={(supplier) => ({
                leading: <Avatar>{(supplier.name || '?').charAt(0).toUpperCase()}</Avatar>,
                title: supplier.name, muted: !supplier.isActive,
                subtitle: `${[supplier.contactName, supplier.whatsappPhone || supplier.phone].filter(Boolean).join(' · ') || 'Sin contacto'}${!supplier.isActive ? ' · inactivo' : ''}`,
                value: countOf(supplier), chevron: true,
              })}
              columns={[
                { label: 'Proveedor', span: 4, render: (supplier) => (
                  <span className="flex items-center gap-3">
                    <Avatar>{(supplier.name || '?').charAt(0).toUpperCase()}</Avatar>
                    <span className="min-w-0"><span className={`block truncate text-[15px] font-medium ${supplier.isActive ? 'text-gray-900' : 'text-gray-400'}`}>{supplier.name}</span>{!supplier.isActive && <span className="block text-[13px] text-gray-400">Inactivo</span>}</span>
                  </span>
                ) },
                { label: 'Contacto', span: 3, render: (x) => x.contactName || <span className="text-gray-300">—</span> },
                { label: 'WhatsApp', span: 3, render: (x) => <span className="tabular-nums">{x.whatsappPhone || x.phone || <span className="text-gray-300">—</span>}</span> },
                { label: 'Productos', span: 2, align: 'right', render: (x) => <span className="tabular-nums">{countOf(x)}</span> },
              ]} />
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

      {supplierDetailLoading && !supplierDetail && <Loading>Cargando proveedor…</Loading>}
      {supplierDetail && (
        <SupplierDetailModal
          data={supplierDetail}
          onClose={() => { setSupplierDetail(null); if (location.search) navigate('/compras/proveedores', { replace: true }); }}
          onInvoice={(invoice) => navigate(`/compras/facturas/${invoice._id}`)}
          onEdit={() => { setSupplierModal(supplierDetail.supplier); setSupplierDetail(null); }}
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
    </Page>
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
          <button type="button" onClick={onDelete} className={btnDangerQuiet}>Eliminar</button>
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

function SupplierDetailModal({ data, onClose, onInvoice, onEdit }) {
  const [tab, setTab] = useState('summary');
  const { supplier, summary, invoices, products, orders } = data;
  return (
    <Modal title={supplier.name} subtitle={[supplier.taxId, supplier.contactName].filter(Boolean).join(' · ')} onClose={onClose} size="lg"
      footer={<div className="flex justify-end gap-2"><button type="button" onClick={onClose} className={btnQuiet}>Cerrar</button><button type="button" onClick={onEdit} className={btnPrimary}>Editar proveedor</button></div>}>
      <div className="space-y-5">
        <Tabs value={tab} onChange={setTab} options={[
          ['summary', 'Resumen'], ['invoices', `Facturas · ${invoices.length}`], ['products', `Productos · ${products.length}`], ['orders', `Pedidos · ${orders.length}`],
        ]} />
        {tab === 'summary' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              ['Gasto este mes', money(summary.spendThisMonth)], ['Gasto este año', money(summary.spendThisYear)],
              ['Facturas', summary.invoices], ['Productos', summary.products], ['Pedidos', summary.orders], ['Última compra', summary.lastPurchase ? niceDate(summary.lastPurchase) : '—'],
            ].map(([label, value]) => <div key={label} className="rounded-xl bg-gray-50 p-3"><p className="text-xs text-gray-500">{label}</p><p className="mt-1 text-base font-semibold text-gray-900 tabular-nums">{value}</p></div>)}
          </div>
        )}
        {tab === 'invoices' && (invoices.length ? <ul className="divide-y divide-gray-100">{invoices.map((invoice) => <li key={invoice._id}><button type="button" onClick={() => onInvoice(invoice)} className="w-full flex items-center gap-3 rounded-xl py-3 text-left hover:bg-gray-50"><div className="min-w-0 flex-1"><p className="font-medium text-gray-900">{invoice.invoiceNumber || 'Sin número'}</p><p className="text-sm text-gray-500">{niceDate(invoice.invoiceDate)} · {invoice.status}</p></div><span className="font-semibold tabular-nums">{money(invoice.total)}</span><Icon name="right" className="h-4 w-4 text-gray-300" /></button></li>)}</ul> : <Empty>Sin facturas relacionadas.</Empty>)}
        {tab === 'products' && (products.length ? <ul className="divide-y divide-gray-100">{products.map((product) => <li key={product._id} className="py-3"><p className="font-medium text-gray-900">{product.name}</p><p className="text-sm text-gray-500">{product.unit || 'unidad'}{product.defaultUnitCost ? ` · ${money(product.defaultUnitCost)}` : ''}</p></li>)}</ul> : <Empty>Sin productos relacionados.</Empty>)}
        {tab === 'orders' && (orders.length ? <ul className="divide-y divide-gray-100">{orders.map((order) => <li key={order._id} className="flex items-center gap-3 py-3"><div className="min-w-0 flex-1"><p className="font-medium text-gray-900">{niceDate(order.orderDate)}</p><OrderStatus status={order.status} /></div><span className="font-semibold tabular-nums">{money(order.totalAmount)}</span></li>)}</ul> : <Empty>Sin pedidos relacionados.</Empty>)}
      </div>
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
      footer={<ModalFooter onCancel={onClose} form="supplier-form" saving={saving} />}>
      <form id="supplier-form" onSubmit={submit} className="space-y-4">
        {error && <ErrorBanner>{error}</ErrorBanner>}
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
    if (!await confirmDialog('¿Eliminar este producto?')) return;
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
      footer={<ModalFooter onCancel={onClose} onDelete={product?._id ? remove : undefined} form="product-form" saving={saving} />}>
      <form id="product-form" onSubmit={submit} className="space-y-4">
        {error && <ErrorBanner>{error}</ErrorBanner>}
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
        {error && <ErrorBanner>{error}</ErrorBanner>}
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
