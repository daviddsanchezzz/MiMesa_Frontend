import { useSetMobileHeader } from '../context/MobileHeaderContext';
import { PAGE_BODY, StickyBar } from './PeriodNavigator';
import { PageHeader, PrimaryButton, Tabs } from './kit';

/**
 * The frame of every screen, phone and desktop from the same place:
 *  - title: the header bar on the phone, the big heading on desktop;
 *  - primary: the one main action — a button on desktop, the header-bar action on the phone;
 *  - actions: secondary desktop controls next to it (Exportar…);
 *  - summary: the few key figures under the heading (a FigureLine);
 *  - toolbar: what goes above the sections (period navigator…);
 *  - tabs: { value, onChange, options: [[key, label, count?]] } — the sections of the screen;
 *  - sticky: keep toolbar and tabs on screen while the page scrolls.
 * Change this component and every screen that uses it changes with it.
 */
export default function Page({ title, mobileTitle, subtitle, primary, actions, summary, toolbar, tabs, sticky = false, className = '', children }) {
  useSetMobileHeader({ title: mobileTitle || title, action: primary ? { label: primary.short || primary.label, onClick: primary.onClick } : false });
  const showTabs = tabs && tabs.options.length > 1;
  const bar = (toolbar || showTabs) && (
    <>
      {toolbar}
      {showTabs && <Tabs value={tabs.value} options={tabs.options} onChange={tabs.onChange} />}
    </>
  );
  return (
    <div className={`w-full space-y-6 pb-16 ${PAGE_BODY} ${className}`}>
      <PageHeader title={title} subtitle={subtitle} className={subtitle ? '' : 'hidden lg:flex'}
        actions={(actions || primary) && <>{actions}{primary && <PrimaryButton icon={primary.icon ?? 'plus'} onClick={primary.onClick}>{primary.label}</PrimaryButton>}</>} />
      {summary}
      {bar && (sticky ? <StickyBar>{bar}</StickyBar> : <div className="space-y-3">{bar}</div>)}
      {children}
    </div>
  );
}
