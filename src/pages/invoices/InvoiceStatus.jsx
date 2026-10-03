import { INVOICE_STATUS } from './invoiceUtils';

const tones = {
  violet: 'bg-violet-500',
  amber: 'bg-amber-400',
  green: 'bg-emerald-500',
  rose: 'bg-rose-400',
};

export default function InvoiceStatus({ status, className = '' }) {
  const config = INVOICE_STATUS[status] || { label: status || 'Sin estado', tone: 'violet' };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 ${className}`}>
      <span className={`w-2 h-2 rounded-full shrink-0 ${tones[config.tone]}`} aria-hidden="true" />
      {config.label}
    </span>
  );
}
