import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function PublicUnsubscribe() {
  const [params] = useSearchParams();
  const token    = params.get('token');
  const [state, setState] = useState('loading'); // loading | success | error
  const [name,  setName]  = useState('');

  useEffect(() => {
    if (!token) { setState('error'); return; }
    axios.get(`${API}/api/marketing/public/unsubscribe`, { params: { token } })
      .then(r => { setName(r.data.name || ''); setState('success'); })
      .catch(() => setState('error'));
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm text-center">
        <img src="/logo.svg" alt="Tableo" className="w-12 h-12 mx-auto mb-6" />

        {state === 'loading' && (
          <p className="text-gray-500 text-sm">Procesando...</p>
        )}

        {state === 'success' && (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-emerald-600">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-lg font-bold text-gray-900 mb-2">Baja procesada</h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              {name ? `${name}, ya` : 'Ya'} no recibirás más comunicaciones de marketing de este establecimiento.
            </p>
          </div>
        )}

        {state === 'error' && (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-red-500">
                <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-lg font-bold text-gray-900 mb-2">Enlace inválido</h1>
            <p className="text-sm text-gray-500">El enlace de baja no es válido o ya fue procesado anteriormente.</p>
          </div>
        )}

        <p className="text-xs text-gray-300 mt-6">
          Powered by <a href={import.meta.env.VITE_LANDING_URL || 'https://tableo.app'} className="text-violet-400 font-medium">Tableo</a>
        </p>
      </div>
    </div>
  );
}
