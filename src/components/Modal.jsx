import { useEffect } from 'react';

// While any modal is open, the page behind must not scroll (on phones the two
// scrolls used to fight). Nested modals share one lock.
let openCount = 0;
let saved = [];
function lockPageScroll() {
  if (openCount++ > 0) return;
  saved = [document.body, ...document.querySelectorAll('main, [data-page-scroll]')].map((el) => [el, el.style.overflow]);
  saved.forEach(([el]) => { el.style.overflow = 'hidden'; });
}
function unlockPageScroll() {
  if (--openCount > 0) return;
  saved.forEach(([el, value]) => { el.style.overflow = value; });
  saved = [];
}

/**
 * Bottom sheet on phones, centered dialog from sm up.
 * header: optional node that replaces the title block.
 * footer: optional node pinned under the scrolling body (main actions).
 */
export default function Modal({ title, subtitle, header = null, footer = null, children, onClose, size = 'sm', bodyClassName = '' }) {
  useEffect(() => {
    lockPageScroll();
    return unlockPageScroll;
  }, []);

  const widths = {
    sm: 'w-full sm:max-w-sm',
    md: 'w-full sm:max-w-md',
    lg: 'w-full sm:max-w-lg',
    wide: 'w-full sm:max-w-2xl',
    xl: 'w-full sm:w-auto sm:max-w-[98vw]',
  };
  const heights = { sm: 'max-h-[92dvh]', md: 'max-h-[92dvh]', lg: 'max-h-[92dvh]', wide: 'max-h-[92dvh]', xl: 'max-h-[98dvh]' };
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center overscroll-contain"
      style={{ backgroundColor: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }}
    >
      <div className={`bg-white ${widths[size]} sm:rounded-2xl rounded-t-2xl shadow-2xl ${heights[size]} flex flex-col min-h-0`}>
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-gray-100 shrink-0">
          {header || (
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-gray-900">{title}</h3>
              {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>
        <div className={`px-5 py-5 overflow-y-auto overflow-x-hidden overscroll-contain min-h-0 ${bodyClassName}`.trim()}>{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-gray-100 px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] bg-white sm:rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
