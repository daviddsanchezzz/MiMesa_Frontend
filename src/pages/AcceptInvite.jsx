import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authClient } from '../lib/authClient';
import api from '../services/api';
import PasswordInput from '../components/PasswordInput';

const ROLE_LABELS = { owner: 'Propietario', manager: 'Manager', staff: 'Staff' };

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const token          = searchParams.get('token');

  const [invite, setInvite]         = useState(null);
  const [fetchError, setFetchError] = useState('');

  const [form, setForm]             = useState({ password: '', confirm: '' });
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [phase, setPhase]           = useState('signup'); // 'signup' | 'login' | 'done'
  // true after signUp succeeds — prevents re-registering on retry
  const [accountCreated, setAccountCreated] = useState(false);

  // Load invitation details
  useEffect(() => {
    if (!token) { setFetchError('Enlace de invitación inválido.'); return; }
    const BASE = import.meta.env.VITE_API_URL || 'https://mimesa-backend.onrender.com';
    fetch(`${BASE}/api/invitations/public/${token}`)
      .then(r => r.ok ? r.json() : r.json().then(d => Promise.reject(d.message)))
      .then(setInvite)
      .catch(msg => setFetchError(msg || 'Invitación inválida o expirada'));
  }, [token]);

  const acceptToken = async () => {
    const { data, error: err } = await api.post(`/invitations/accept/${token}`).catch(e => ({
      data: null, error: e.response?.data?.message || e.message,
    }));
    if (err) throw new Error(typeof err === 'string' ? err : 'Error al aceptar la invitación');
    return data;
  };

  // ── New user — sign up then accept ────────────────────────────────────
  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Las contraseñas no coinciden'); return; }
    if (form.password.length < 8)       { setError('La contraseña debe tener mínimo 8 caracteres'); return; }
    setLoading(true);
    try {
      // If the account was already created in a previous attempt, skip signup and retry accept
      if (!accountCreated) {
        const { error: signUpError } = await authClient.signUp.email({
          name:     invite.name,
          email:    invite.email,
          password: form.password,
        });
        if (signUpError) {
          // Email already registered — switch to login phase
          if (signUpError.code === 'USER_ALREADY_EXISTS' || signUpError.status === 422) {
            setPhase('login');
            setError('Ya tienes una cuenta con ese email. Inicia sesión para aceptar la invitación.');
            return;
          }
          throw new Error(signUpError.message);
        }
        setAccountCreated(true);
      }
      await acceptToken();
      setPhase('done');
      setTimeout(() => navigate(invite.type === 'platform' ? '/onboarding' : '/'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Existing user — sign in then accept ───────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error: signInError } = await authClient.signIn.email({
        email:    invite.email,
        password: form.password,
      });
      if (signInError) throw new Error(signInError.message || 'Credenciales incorrectas');
      await acceptToken();
      setPhase('done');
      setTimeout(() => navigate(invite.type === 'platform' ? '/onboarding' : '/'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── States ─────────────────────────────────────────────────────────────
  if (!token || fetchError) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="max-w-sm w-full text-center bg-white border border-red-200 rounded-2xl p-8 shadow-sm">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-red-500">
            <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd"/>
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Invitación inválida</h2>
        <p className="text-sm text-gray-500">{fetchError || 'El enlace no es válido o ha expirado.'}</p>
      </div>
    </div>
  );

  if (!invite) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 rounded-xl bg-indigo-600 animate-pulse" />
    </div>
  );

  if (phase === 'done') return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="max-w-sm w-full text-center bg-white border border-green-200 rounded-2xl p-8 shadow-sm">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-7 h-7 text-green-600">
            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd"/>
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">¡Cuenta activada!</h2>
        <p className="text-sm text-gray-500">
          {invite.type === 'platform'
            ? 'Redirigiendo para configurar tu restaurante...'
            : <>Te has unido a <strong>{invite.business?.name}</strong>. Redirigiendo...</>
          }
        </p>
      </div>
    </div>
  );

  const brandColor = invite.business?.brandColor || '#4f46e5';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6 py-12">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          {invite.type === 'platform' || !invite.business ? (
            <>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center mx-auto mb-4 text-white shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-7 h-7">
                  <path d="M3 2a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1H3ZM2 9a1 1 0 0 1 1-1h18a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V9ZM1 15a1 1 0 0 1 1-1h8a1 1 0 1 1 0 2H2a1 1 0 0 1-1-1Z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900">MiMesa</h1>
              <p className="text-sm text-gray-500 mt-1">Te han dado acceso a la plataforma</p>
            </>
          ) : (
            <>
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white text-xl font-bold shadow-lg"
                style={{ background: brandColor }}
              >
                {invite.business?.name?.[0]?.toUpperCase() || 'R'}
              </div>
              <h1 className="text-xl font-bold text-gray-900">{invite.business?.name}</h1>
              <p className="text-sm text-gray-500 mt-1">
                Te han invitado como{' '}
                <span className="font-semibold text-gray-700">{ROLE_LABELS[invite.role] || invite.role}</span>
              </p>
            </>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          {/* Pre-filled user info */}
          <div className="space-y-3 mb-5">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nombre</label>
              <div className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-gray-50 text-gray-700">
                {invite.name}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
              <div className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-gray-50 text-gray-500">
                {invite.email}
              </div>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={phase === 'login' ? handleLogin : handleSignup} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                {phase === 'login' ? 'Tu contraseña' : 'Elige una contraseña'}
              </label>
              <PasswordInput
                required
                minLength={8}
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Mínimo 8 caracteres"
              />
            </div>
            {phase === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Confirmar contraseña</label>
                <PasswordInput
                  required
                  value={form.confirm}
                  onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                  placeholder="Repite la contraseña"
                />
              </div>
            )}
            <button
              type="submit" disabled={loading}
              className="w-full text-white py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 mt-2"
              style={{ background: brandColor }}
            >
              {loading
                ? (phase === 'login' ? 'Iniciando sesión...' : 'Activando cuenta...')
                : phase === 'login'
                  ? 'Iniciar sesión'
                  : invite.type === 'platform' ? 'Activar mi cuenta' : 'Activar cuenta y unirme'}
            </button>
          </form>

          {phase === 'signup' && (
            <button
              type="button"
              onClick={() => { setPhase('login'); setError(''); }}
              className="w-full text-center text-xs text-gray-400 hover:text-gray-600 mt-3 transition-colors"
            >
              ¿Ya tienes cuenta? Inicia sesión
            </button>
          )}
          {phase === 'login' && (
            <button
              type="button"
              onClick={() => { setPhase('signup'); setError(''); }}
              className="w-full text-center text-xs text-gray-400 hover:text-gray-600 mt-3 transition-colors"
            >
              ¿Cuenta nueva? Regístrate
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
