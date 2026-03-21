import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function Onboarding() {
  const navigate = useNavigate();
  const { refreshBusiness, session } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', phone: '', cif: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/businesses', form);
      await refreshBusiness();
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-200">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-7 h-7">
              <path d="M3 2a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1H3ZM2 9a1 1 0 0 1 1-1h18a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V9ZM1 15a1 1 0 0 1 1-1h8a1 1 0 1 1 0 2H2a1 1 0 0 1-1-1Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Crea tu restaurante</h1>
          {session?.user?.name && (
            <p className="text-sm text-gray-500 mt-1">
              Hola, <strong>{session.user.name}</strong>. Configura tu negocio para empezar.
            </p>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nombre del restaurante *
              </label>
              <input
                required
                value={form.name}
                onChange={set('name')}
                placeholder="Restaurante El Patio"
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Correo del restaurante *
              </label>
              <input
                required
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="info@mirestaurante.com"
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Teléfono <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input
                value={form.phone}
                onChange={set('phone')}
                placeholder="+34 600 000 000"
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                CIF / NIF <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input
                value={form.cif}
                onChange={set('cif')}
                placeholder="B12345678"
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors mt-2"
            >
              {loading ? 'Creando...' : 'Crear restaurante'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Podrás cambiar estos datos más adelante en Configuración.
        </p>
      </div>
    </div>
  );
}
