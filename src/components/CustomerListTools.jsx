import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { downloadFromApi } from '../services/download';
import ImportCustomersModal from './ImportCustomersModal';
import { MenuButton } from '../ui/kit';


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
    <>
      <MenuButton ariaLabel="Importar o exportar clientes" className="w-9 h-9 justify-center text-lg text-gray-500"
        items={[
          { label: 'Importar desde un archivo (CSV)', onClick: () => setImporting(true) },
          hasRole('owner') && { label: exporting ? 'Exportando…' : 'Exportar todos (CSV)', onClick: exportCsv },
        ]}>
        ⋯
      </MenuButton>
      {importing && <ImportCustomersModal onClose={() => setImporting(false)} onDone={onImported} />}
    </>
  );
}
