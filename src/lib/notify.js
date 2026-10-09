import { toast } from 'sonner';

/**
 * The small messages that appear and fade ("Guardado", "No se ha podido…"). The only way to show one:
 *   notify.success('Guardado') · notify.error('No se ha podido…') · notify('Guardado', 'error')
 */
export function notify(message, type = 'success') {
  if (!message) return;
  if (type === 'error') toast.error(message);
  else if (type === 'warning') toast.warning(message);
  else toast.success(message);
}
notify.success = (message) => notify(message, 'success');
notify.error = (message) => notify(message, 'error');
notify.warning = (message) => notify(message, 'warning');
notify.info = (message) => { if (message) toast(message); };

export default notify;
