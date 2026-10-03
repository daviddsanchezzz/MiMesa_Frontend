import { useEffect, useState } from 'react';
import Modal from '../../components/Modal';
import invoicesApi from '../../services/invoicesApi';
import { apiErrorMessage } from './invoiceUtils';

export default function InvoiceDocumentModal({ invoice, onClose }) {
  const [url, setUrl] = useState('');
  const [type, setType] = useState(invoice.documentMimeType || '');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    let objectUrl = '';
    invoicesApi.document(invoice._id)
      .then((document) => {
        if (!active) return;
        if (document.kind === 'url') {
          setType(document.mimeType || invoice.documentMimeType || '');
          setUrl(document.url);
          return;
        }
        objectUrl = URL.createObjectURL(document.blob);
        setType(document.mimeType || invoice.documentMimeType || '');
        setUrl(objectUrl);
      })
      .catch((err) => active && setError(apiErrorMessage(err, 'No se pudo abrir el documento original.')));
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [invoice._id, invoice.documentMimeType]);

  return (
    <Modal title="Documento original" subtitle={invoice.documentOriginalName} onClose={onClose} size="xl" bodyClassName="p-0 sm:p-3">
      {error && <p className="m-5 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      {!url && !error && (
        <div className="h-[55dvh] flex items-center justify-center" aria-busy="true">
          <span className="w-7 h-7 rounded-full border-2 border-violet-200 border-t-violet-600 animate-spin" aria-label="Cargando documento" />
        </div>
      )}
      {url && type === 'application/pdf' && (
        <div>
          <div className="px-2 pb-2 text-right"><a href={url} target="_blank" rel="noreferrer" className="text-[13px] font-semibold text-violet-700">Abrir en otra pestaña</a></div>
          <iframe title="Factura original" src={url} referrerPolicy="no-referrer" className="w-full h-[68dvh] rounded-xl bg-gray-100" />
        </div>
      )}
      {url && type !== 'application/pdf' && (
        <div className="h-[72dvh] overflow-auto flex items-start justify-center bg-gray-50 rounded-xl p-2">
          <img src={url} alt="Factura original" referrerPolicy="no-referrer" className="max-w-full h-auto object-contain" />
        </div>
      )}
    </Modal>
  );
}
