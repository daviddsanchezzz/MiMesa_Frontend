import { Component } from 'react';

const RELOAD_FLAG = 'app:chunk-reload';

function isChunkLoadError(error) {
  const msg = String(error?.message || '');
  return /dynamically imported module|Loading chunk|Importing a module script failed/i.test(msg);
}

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error('[ErrorBoundary]', error);
    // After a new deploy, old chunk URLs 404: reload once to pick up the new build.
    if (isChunkLoadError(error)) {
      try {
        if (!sessionStorage.getItem(RELOAD_FLAG)) {
          sessionStorage.setItem(RELOAD_FLAG, '1');
          window.location.reload();
        }
      } catch {
        // sessionStorage unavailable: fall through to the manual reload button
      }
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-6">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl shadow-sm p-8 text-center">
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Algo ha salido mal</h1>
          <p className="text-sm text-gray-500 mb-6">
            Ha ocurrido un error inesperado. Recarga la página para continuar; si el problema persiste, contacta con soporte.
          </p>
          <button
            type="button"
            onClick={() => {
              try { sessionStorage.removeItem(RELOAD_FLAG); } catch { /* ignore */ }
              window.location.reload();
            }}
            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors"
          >
            Recargar
          </button>
        </div>
      </div>
    );
  }
}
