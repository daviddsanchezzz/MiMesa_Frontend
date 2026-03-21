import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authClient } from '../lib/authClient';

export default function ForgotPassword() {
  const [email, setEmail]     = useState('');
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error: err } = await authClient.forgetPassword({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (err) throw new Error(err.message);
      setSent(true);
    } catch (err) {
      setError(err.message || 'Error al enviar el email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-6 h-6">
              <path fillRule="evenodd" d="M15.75 1.5a6.75 6.75 0 0 0-6.651 7.906c.067.39-.032.717-.221.906l-6.5 6.499a3 3 0 0 0-.878 2.121v2.818c0 .414.336.75.75.75H6a.75.75 0 0 0 .75-.75v-1.5h1.5A.75.75 0 0 0 9 19.5V18h1.5a.75.75 0 0 0 .53-.22l2.658-2.658c.19-.189.517-.288.906-.22A6.75 6.75 0 1 0 15.75 1.5Zm0 3a.75.75 0 0 0 0 1.5A2.25 2.25 0 0 1 18 8.25a.75.75 0 0 0 1.5 0 3.75 3.75 0 0 0-3.75-3.75Z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Recuperar contraseña</h2>
          <p className="text-gray-500 text-sm mt-1">Te enviamos un enlace a tu email</p>
        </div>

        {sent ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
            <p className="text-green-700 font-medium text-sm">Email enviado</p>
            <p className="text-green-600 text-sm mt-1">Revisa tu bandeja de entrada y sigue las instrucciones.</p>
            <Link to="/login" className="inline-block mt-4 text-sm text-violet-600 hover:underline font-medium">
              Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 shrink-0">
                  <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm-.75-9.5a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0V5.5Zm.75 6.5a.875.875 0 1 1 0-1.75.875.875 0 0 1 0 1.75Z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email de tu cuenta</label>
                <input
                  type="email" required value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="restaurante@email.com"
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white"
                />
              </div>
              <button
                type="submit" disabled={loading}
                className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
              >
                {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-6">
              <Link to="/login" className="text-violet-600 hover:underline">Volver al inicio de sesión</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
