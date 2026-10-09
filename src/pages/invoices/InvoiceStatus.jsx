import { StatusDot } from '../../ui/list';
import { INVOICE_STATUS } from './invoiceUtils';

export default function InvoiceStatus({ status, className = '' }) {
  const config = INVOICE_STATUS[status] || { label: status || 'Sin estado', tone: 'violet' };
  return <StatusDot tone={config.tone} className={className}>{config.label}</StatusDot>;
}
