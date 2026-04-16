export default function Modal({ title, subtitle, children, onClose, size = 'sm', bodyClassName = '' }) {
  const widths = {
    sm: 'w-full sm:max-w-sm',
    md: 'w-full sm:max-w-md',
    lg: 'w-full sm:max-w-lg',
    xl: 'w-full sm:w-auto sm:max-w-[98vw]',
  };
  const heights = { sm: 'max-h-[92vh]', md: 'max-h-[92vh]', lg: 'max-h-[92vh]', xl: 'max-h-[98vh]' };
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ backgroundColor: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }}
    >
      <div className={`bg-white ${widths[size]} sm:rounded-2xl rounded-t-2xl shadow-2xl ${heights[size]} flex flex-col`}>
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors ml-4 shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>
        <div className={`px-5 py-5 overflow-y-auto overflow-x-hidden ${bodyClassName}`.trim()}>{children}</div>
      </div>
    </div>
  );
}
