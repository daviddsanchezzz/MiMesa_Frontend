/**
 * Forms: the look of fields, labels and buttons, defined once. Use the components (Field, Input, Select,
 * Textarea) or the class names (inputCls, labelCls, btn*) where a component does not fit.
 */

import { btnDangerQuiet, btnPrimary, btnQuiet, inputCls, labelCls, selectCls } from './formStyles.js';
export * from './formStyles.js';

/** A labelled field: label on top, the control, then a hint or the error below. */
export function Field({ label, hint, error, htmlFor, className = '', children }) {
  return (
    <div className={className}>
      {label && <label htmlFor={htmlFor} className={labelCls}>{label}</label>}
      {children}
      {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : hint ? <p className="mt-1 text-xs text-gray-400">{hint}</p> : null}
    </div>
  );
}

/** The bottom of a form in a Modal: [delete or a note] on the left, Cancelar and Guardar on the right. */
export function ModalFooter({ onCancel, onSave, saving = false, label = 'Guardar', savingLabel = 'Guardando…', form, disabled = false, cancelLabel = 'Cancelar', aside, onDelete, deleteLabel = 'Eliminar' }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 text-xs text-gray-500">
        {onDelete ? <button type="button" onClick={onDelete} disabled={saving} className={btnDangerQuiet}>{deleteLabel}</button> : aside}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {onCancel && <button type="button" onClick={onCancel} disabled={saving} className={btnQuiet}>{cancelLabel}</button>}
        <button type={form ? 'submit' : 'button'} form={form} onClick={form ? undefined : onSave} disabled={saving || disabled} className={btnPrimary}>
          {saving ? savingLabel : label}
        </button>
      </div>
    </div>
  );
}

export function Input({ className = '', invalid = false, ...props }) {
  return <input className={`${inputCls} ${invalid ? '!border-rose-400' : ''} ${className}`} aria-invalid={invalid || undefined} {...props} />;
}

export function Textarea({ className = '', rows = 3, ...props }) {
  return <textarea rows={rows} className={`${inputCls} resize-none leading-snug ${className}`} {...props} />;
}

/** options: [[value, label]] or children. */
export function Select({ options, className = '', children, ...props }) {
  return (
    <select className={`${selectCls} ${className}`} {...props}>
      {options ? options.map(([value, label]) => <option key={value} value={value}>{label}</option>) : children}
    </select>
  );
}

/**
 * A checkbox with its text and an optional line of detail. `color` paints the tick (the brand colour of a public page);
 * without it the app violet is used. The whole row is the target.
 */
export function Checkbox({ checked, onChange, title, hint, color = '#7c3aed', className = '' }) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 ${className}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded" style={{ accentColor: color }} />
      <span className="min-w-0">
        <span className="block text-[14px] leading-snug text-gray-800">{title}</span>
        {hint && <span className="mt-0.5 block text-xs leading-snug text-gray-500">{hint}</span>}
      </span>
    </label>
  );
}
