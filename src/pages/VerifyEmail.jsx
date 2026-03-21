import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { authClient } from '../lib/authClient';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Enlace de verificación inválido.');
      return;
    }
    authClient.verifyEmail({ query: { token } })
      .then(({ error }) => {
        if (error) {
          setStatus('error');
          setMessage(error.message || 'No se pudo verificar el email.');
        } else {
          setStatus('success');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Error al verificar el email.');
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-sm text-center">
        {status === 'loading' && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600 animate-pulse" />
            <p className="text-gray-500 text-sm">Verificando tu email...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-8">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-green-600">
                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Email verificado</h2>
            <p className="text-gray-500 text-sm mb-6">Tu cuenta está activa. Ya puedes acceder al panel.</p>
            <Link to="/" className="inline-block bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors">
              Ir al panel
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Error de verificación</h2>
            <p className="text-red-600 text-sm mb-6">{message}</p>
            <Link to="/login" className="inline-block text-sm text-violet-600 hover:underline font-medium">
              Volver al inicio de sesión
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
