// Tiny registry of forms with unsaved changes, so switching tab or closing the
// page can warn before the changes are lost.
import { useEffect } from 'react';

const dirty = new Set();
const MESSAGE = 'Tienes cambios sin guardar. ¿Salir sin guardarlos?';

function onBeforeUnload(e) {
  if (!dirty.size) return undefined;
  e.preventDefault();
  e.returnValue = MESSAGE;
  return MESSAGE;
}

export function useUnsavedChanges(key, isDirty) {
  useEffect(() => {
    if (isDirty) dirty.add(key); else dirty.delete(key);
    if (dirty.size) window.addEventListener('beforeunload', onBeforeUnload);
    else window.removeEventListener('beforeunload', onBeforeUnload);
    return () => {
      dirty.delete(key);
      if (!dirty.size) window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [key, isDirty]);
}

/** true when it's fine to leave (nothing pending, or the user agreed). */
export function confirmLeave() {
  if (!dirty.size) return true;
  const ok = window.confirm(MESSAGE);
  if (ok) dirty.clear();
  return ok;
}
