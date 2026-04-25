export default function ToastStack({ toasts }) {
  if (!Array.isArray(toasts) || toasts.length === 0) return null;
  return (
    <div className="fixed z-[70] right-3 left-3 sm:left-auto sm:right-5 bottom-4 sm:bottom-5 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto rounded-xl px-3 py-2 text-xs font-medium shadow-lg border ${
            toast.type === 'error'
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}

