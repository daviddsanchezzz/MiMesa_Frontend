/**
 * What a screen shows while it waits, when something fails and when there is nothing yet.
 * Same look everywhere: change it here.
 */

/** A small spinner. */
export function Spinner({ className = 'h-5 w-5' }) {
  return <span role="status" aria-label="Cargando" className={`inline-block animate-spin rounded-full border-2 border-gray-200 border-t-violet-600 ${className}`} />;
}

/** «Cargando…» in the place where the content will go. `block` centres it in a taller area. */
export function Loading({ children = 'Cargando…', block = false, className = '' }) {
  return (
    <p role="status" aria-live="polite" className={`text-sm text-gray-400 ${block ? 'py-10 text-center' : ''} ${className}`}>{children}</p>
  );
}

/** A grey placeholder bar; compose a few of them to sketch the content that is coming. */
export function Skeleton({ className = 'h-4 w-32' }) {
  return <span aria-hidden="true" className={`block animate-pulse rounded bg-gray-100 ${className}`} />;
}

/** The message of something that failed, above or inside the form it belongs to. */
export function ErrorBanner({ children, msg, className = '' }) {
  const text = children ?? msg;
  if (!text) return null;
  return <p role="alert" className={`rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 ${className}`}>{text}</p>;
}

/** Amber warning with the same shape (something to check, not a failure). */
export function WarningBanner({ children, className = '' }) {
  if (!children) return null;
  return <p role="status" className={`rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 ${className}`}>{children}</p>;
}
