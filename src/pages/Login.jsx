import { useState } from 'react';
import { useSignupMode } from '../lib/signupMode';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authClient } from '../lib/authClient';
import PasswordInput from '../components/PasswordInput';

export default function Login() {
  const signupMode = useSignupMode();
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm]     = useState({ email: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: `${window.location.origin}/`,
      });
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión con Google');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="relative z-10 w-full max-w-md">
          <div className="flex items-center gap-3 mb-10">
            <img src="/logo.svg" alt="" className="w-11 h-11" />
            <span className="text-2xl font-bold text-white tracking-tight">Vetra</span>
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight">Tu negocio,<br />bien organizado.</h1>
          <p className="text-violet-200/90 text-base leading-relaxed mt-4 max-w-sm">
            Reservas, agenda, clientes y caja en un solo sitio. Para restaurantes, peluquerías y cualquier negocio que trabaje con cita.
          </p>

          {/* A glimpse of the app: one day, both kinds of business */}
          <div className="mt-10 rounded-2xl bg-white/[0.06] border border-white/10 backdrop-blur-sm p-4 space-y-2.5">
            <div className="flex items-center justify-between px-1 pb-1">
              <p className="text-xs font-semibold text-violet-200">Hoy</p>
              <p className="text-[11px] text-violet-300/80">3 reservadas online</p>
            </div>
            {[
              { time: '10:30', name: 'Laia Font', what: 'Corte y color · con Marta', line: '#10b981', tag: 'Cobrada' },
              { time: '13:45', name: 'Mesa 6 · 4 personas', what: 'Terraza · cumpleaños', line: '#7c3aed', tag: 'Siguiente' },
              { time: '17:00', name: 'Jordi Puig', what: 'Fisioterapia · 45 min', line: '#d1d5db', tag: '' },
            ].map((r) => (
              <div key={r.time} className="flex items-center gap-3 rounded-xl bg-white px-3.5 py-2.5 shadow-sm">
                <span className="text-sm font-bold text-gray-900 tabular-nums w-11">{r.time}</span>
                <span className="w-1 self-stretch rounded-full" style={{ backgroundColor: r.line }} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{r.name}</p>
                  <p className="text-xs text-gray-500 truncate">{r.what}</p>
                </div>
                {r.tag && <span className="text-[10px] font-semibold text-gray-500">{r.tag}</span>}
              </div>
            ))}
          </div>

          <ul className="mt-8 grid grid-cols-3 gap-4 text-sm">
            {[
              ['Reserva online', 'Tus clientes reservan 24 h'],
              ['Recordatorios', 'Menos citas perdidas'],
              ['Clientes y caja', 'Historial y cierres del día'],
            ].map(([t, d]) => (
              <li key={t}>
                <p className="font-semibold text-white">{t}</p>
                <p className="text-violet-300/80 text-xs mt-0.5 leading-snug">{d}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gray-50">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <img src="/logo.svg" alt="Vetra" className="w-12 h-12 mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-gray-900">Vetra</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Hola de nuevo</h2>
            <p className="text-gray-500 text-sm mt-1">Inicia sesión en tu cuenta</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 shrink-0">
                <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm-.75-9.5a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0V5.5Zm.75 6.5a.875.875 0 1 1 0-1.75.875.875 0 0 1 0 1.75Z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 py-2.5 rounded-xl text-sm font-medium transition-colors mb-4"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continuar con Google
          </button>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center text-xs text-gray-400 bg-gray-50 px-2 w-fit mx-auto">o con email</div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email" required value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="tu@email.com"
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white transition-shadow"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">Contraseña</label>
                <Link to="/forgot-password" className="text-xs text-violet-600 hover:text-violet-700">
                  ¿Olvidaste la contraseña?
                </Link>
              </div>
              <PasswordInput
                required
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full bg-violet-600 hover:bg-violet-700 active:bg-violet-800 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-violet-200 mt-2"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            {signupMode === 'open' ? '¿No tienes cuenta?' : '¿Quieres usar Vetra?'}{' '}
            <Link to="/register" className="text-violet-600 hover:text-violet-700 font-semibold">{signupMode === 'open' ? 'Regístrate gratis' : 'Solicita acceso'}</Link>
          </p>

        </div>
      </div>
    </div>
  );
}

