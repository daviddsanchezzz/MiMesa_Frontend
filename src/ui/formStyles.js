/** Class names of fields and buttons (plain JS so non-React modules can use them). The components are in form.jsx. */

export const inputCls = 'w-full min-w-0 rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500';
export const selectCls = `${inputCls} h-10 !py-0`;
export const labelCls = 'block text-xs font-medium text-gray-600 mb-1.5';

const btn = 'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50';
export const btnPrimary = `${btn} bg-violet-600 text-white hover:bg-violet-700`;
export const btnSecondary = `${btn} border border-gray-300 text-gray-700 hover:bg-gray-50`;
export const btnQuiet = `${btn} text-gray-700 hover:bg-gray-100`;
export const btnDanger = `${btn} bg-rose-600 text-white hover:bg-rose-700`;
export const btnDangerQuiet = `${btn} text-rose-600 hover:bg-rose-50`;
