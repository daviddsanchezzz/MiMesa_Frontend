import { useSetMobileHeader } from '../context/MobileHeaderContext';
import { PageHeader } from '../ui/kit';

/** A setting that used to live inside Configuración, now with its own address and place in the menu. */
export default function SettingPage({ title, subtitle, children }) {
  useSetMobileHeader({ title });
  return (
    <div className="w-full space-y-6">
      <PageHeader title={title} subtitle={subtitle} />
      {children}
    </div>
  );
}
