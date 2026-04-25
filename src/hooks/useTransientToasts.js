import { useCallback, useState } from 'react';

export default function useTransientToasts(timeoutMs = 3200) {
  const [toasts, setToasts] = useState([]);

  const pushToast = useCallback((message, type = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, timeoutMs);
  }, [timeoutMs]);

  return { toasts, pushToast };
}

