import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSetMobileHeader } from '../../context/MobileHeaderContext';
import { useUnsavedChanges } from '../../lib/unsavedChanges';
import invoicesApi from '../../services/invoicesApi';
import Icon from '../../ui/Icon';
import { GhostButton, PageHeader, PrimaryButton } from '../../ui/kit';
import { apiErrorMessage } from './invoiceUtils';

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_EXTENSIONS = /\.(pdf|jpe?g|png|webp)$/i;

function validateFile(file) {
  if (!file) return 'Selecciona una factura.';
  if ((file.type && !ALLOWED_TYPES.has(file.type)) || (!file.type && !ALLOWED_EXTENSIONS.test(file.name))) return 'Selecciona un PDF, JPG, PNG o WebP.';
  if (file.size > MAX_SIZE) return 'El archivo no puede superar 10 MB.';
  if (!file.size) return 'El archivo está vacío.';
  return '';
}

function withKnownType(file) {
  if (!file || file.type) return file;
  const extension = file.name.split('.').pop()?.toLowerCase();
  const type = extension === 'pdf' ? 'application/pdf'
    : ['jpg', 'jpeg'].includes(extension) ? 'image/jpeg'
      : extension === 'png' ? 'image/png'
        : extension === 'webp' ? 'image/webp' : '';
  return type ? new File([file], file.name, { type, lastModified: file.lastModified }) : file;
}

export default function InvoiceUpload() {
  const navigate = useNavigate();
  const fileInput = useRef(null);
  const cameraInput = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState('select');
  const [error, setError] = useState('');
  const [failedId, setFailedId] = useState(null);
  const processing = phase === 'processing';
  useUnsavedChanges('factura sin enviar', Boolean(file) || processing);
  useSetMobileHeader({ title: processing ? 'Analizando factura' : 'Subir factura', action: false });

  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) { setPreview(''); return undefined; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const choose = (candidate) => {
    const normalizedFile = withKnownType(candidate);
    const validationError = validateFile(normalizedFile);
    if (validationError) {
      setError(validationError);
      return;
    }
    setFile(normalizedFile);
    setError('');
    setFailedId(null);
    setPhase('select');
  };

  const submit = async () => {
    const validationError = validateFile(file);
    if (validationError) { setError(validationError); return; }
    setError('');
    setPhase('processing');
    try {
      const invoice = await invoicesApi.extract(file);
      navigate(`/compras/facturas/${invoice._id}`, { replace: true });
    } catch (err) {
      setFailedId(err?.response?.data?.invoiceId || null);
      setError(apiErrorMessage(err, 'No hemos podido leer esta factura.'));
      setPhase('failed');
    }
  };

  if (processing) {
    return (
      <div className="min-h-[60dvh] flex items-center justify-center px-4" aria-live="polite" aria-busy="true">
        <div className="text-center max-w-sm">
          <span className="mx-auto w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center mb-5">
            <span className="w-7 h-7 rounded-full border-2 border-violet-200 border-t-violet-600 animate-spin" />
          </span>
          <h1 className="text-xl font-semibold text-gray-900">Analizando factura...</h1>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">Estamos leyendo el proveedor, las líneas y los importes.<br />Esto puede tardar unos segundos.</p>
          <p className="mt-5 text-xs text-gray-400">Mantén esta pantalla abierta mientras terminamos.</p>
        </div>
      </div>
    );
  }

  if (phase === 'failed') {
    return (
      <div className="min-h-[60dvh] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <span className="mx-auto w-14 h-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-5"><Icon name="alert" className="w-7 h-7" /></span>
          <h1 className="text-xl font-semibold text-gray-900">No hemos podido leer esta factura</h1>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">Prueba con una imagen más nítida o sube el PDF original.</p>
          {error && <p className="mt-3 text-sm text-rose-700" role="alert">{error}</p>}
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-2">
            <PrimaryButton icon="camera" onClick={() => { setPhase('select'); setError(''); cameraInput.current?.click(); }}>Intentar de nuevo</PrimaryButton>
            {failedId && <GhostButton onClick={() => navigate(`/compras/facturas/${failedId}`)}>Ver borrador con error</GhostButton>}
            <GhostButton onClick={() => navigate('/compras/facturas')}>Volver a facturas</GhostButton>
          </div>
          <input ref={cameraInput} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" onClick={(e) => { e.currentTarget.value = ''; }} onChange={(e) => choose(e.target.files?.[0])} />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <PageHeader title="Sube tu factura" subtitle="Haz una foto o selecciona un PDF. Vetra extraerá los datos automáticamente." />

      <div
        onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => { e.preventDefault(); if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false); }}
        onDrop={(e) => { e.preventDefault(); setDragging(false); choose(e.dataTransfer.files?.[0]); }}
        className={`rounded-2xl border-2 border-dashed px-5 py-8 sm:py-12 text-center transition-colors ${dragging ? 'border-violet-400 bg-violet-50/60' : 'border-gray-200 bg-gray-50/40'}`}
      >
        {preview ? (
          <img src={preview} alt="Vista previa de la factura" className="mx-auto max-h-60 max-w-full rounded-xl object-contain shadow-sm" />
        ) : (
          <span className="mx-auto w-12 h-12 rounded-2xl bg-white border border-gray-200 text-violet-600 flex items-center justify-center shadow-sm">
            <Icon name="receipt" className="w-6 h-6" />
          </span>
        )}
        <p className="mt-4 text-[15px] font-medium text-gray-900">{file ? file.name : 'Arrastra tu factura aquí'}</p>
        <p className="mt-1 text-xs text-gray-500">{file ? `${(file.size / 1024 / 1024).toLocaleString('es-ES', { maximumFractionDigits: 1 })} MB` : 'PDF, JPG, PNG o WebP · máximo 10 MB'}</p>

        <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2">
          <button type="button" onClick={() => cameraInput.current?.click()}
            className="h-11 px-4 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 inline-flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
            <Icon name="camera" className="w-[18px] h-[18px]" strokeWidth={2} />Hacer foto
          </button>
          <button type="button" onClick={() => fileInput.current?.click()}
            className="h-11 px-4 rounded-xl bg-white border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
            {file ? 'Cambiar archivo' : 'Seleccionar archivo'}
          </button>
        </div>
        <input ref={cameraInput} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" onClick={(e) => { e.currentTarget.value = ''; }} onChange={(e) => choose(e.target.files?.[0])} />
        <input ref={fileInput} type="file" accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp" className="sr-only" onClick={(e) => { e.currentTarget.value = ''; }} onChange={(e) => choose(e.target.files?.[0])} />
      </div>

      {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{error}</p>}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
        <GhostButton onClick={() => navigate('/compras/facturas')} className="h-11 rounded-xl">Cancelar</GhostButton>
        <PrimaryButton onClick={submit} disabled={!file} icon="sparkle" className="h-11">Analizar factura</PrimaryButton>
      </div>
    </div>
  );
}
