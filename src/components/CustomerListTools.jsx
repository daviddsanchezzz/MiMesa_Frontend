import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { downloadFromApi } from '../services/download';
import ImportCustomersModal from './ImportCustomersModal';

const btn = 'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50';

// Import from a CSV (managers) and export all customers (owner).
export default function CustomerListTools({ onImported }) {
  const { hasRole } = useAuth();
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  if (!hasRole('manager')) return null;

  async function exportCsv() {
    setExporting(true);
    try { await downloadFromApi('/customers/export.csv', 'clientes.csv'); } finally { setExporting(false); }
  }

  return (
    <div className="flex items-center gap-2">
      <button type="button" className={btn} onClick={() => setImporting(true)}>
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gray-500" aria-hidden="true"><path d="M10 3a.75.75 0 0 1 .75.75v7.19l2.22-2.22a.75.75 0 1 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 1 1 1.06-1.06l2.22 2.22V3.75A.75.75 0 0 1 10 3ZM3.75 13a.75.75 0 0 1 .75.75v1.5c0 .14.11.25.25.25h10.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 15.25 17H4.75A1.75 1.75 0 0 1 3 15.25v-1.5a.75.75 0 0 1 .75-.75Z" /></svg>
        Importar
      </button>
      {hasRole('owner') && (
        <button type="button" className={btn} onClick={exportCsv} disabled={exporting}>{exporting ? 'Exportando…' : 'Exportar'}</button>
      )}
      {importing && <ImportCustomersModal onClose={() => setImporting(false)} onDone={onImported} />}
    </div>
  );
}
