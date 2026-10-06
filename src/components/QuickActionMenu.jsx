import Modal from './Modal';
import Icon from '../ui/Icon';

/** What the + button opens: the things you create most, one tap each. */
export default function QuickActionMenu({ actions, onPick, onClose }) {
  return (
    <Modal title="Crear" onClose={onClose} size="sm">
      <ul className="-mx-2 -my-1">
        {actions.map((a) => (
          <li key={a.key}>
            <button type="button" onClick={() => onPick(a.key)}
              className="w-full flex items-center gap-3.5 px-2 py-3 rounded-xl text-left active:bg-gray-50 hover:bg-gray-50 transition-colors">
              <span className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${a.tone === 'primary' ? 'bg-emerald-600 text-white' : 'bg-violet-50 text-violet-700'}`}>
                <Icon name={a.icon} className="w-5 h-5" strokeWidth={1.8} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-gray-900">{a.label}</span>
                <span className="block text-xs text-gray-500 truncate">{a.hint}</span>
              </span>
              <Icon name="right" className="w-4 h-4 text-gray-300 shrink-0" />
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
