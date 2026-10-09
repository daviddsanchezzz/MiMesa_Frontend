import { useSetMobileHeader } from '../context/MobileHeaderContext';
import { PAGE_BODY, StickyBar } from './PeriodNavigator';
import { MoreMenu, PageHeader, PrimaryButton, Segmented, Tabs } from './kit';

/**
 * The frame of every screen, phone and desktop from the same place:
 *  - title: the header bar on the phone, the big heading on desktop;
 *  - primary: the one main action — a button on desktop, the header-bar action on the phone;
 *  - mobileAction: only without primary — false hides the header-bar action, left out keeps what the screen inside sets;
 *  - menu: the secondary actions [{ label, onClick }] behind a ⋯ button (header bar on the phone, next to the button on desktop);
 *  - actions: secondary desktop controls next to it (Exportar…);
 *  - summary: the few key figures under the heading (a FigureLine);
 *  - toolbar: the period navigator and the like: top right of the heading on desktop, above the sections on the phone;
 *  - mobileBar: extra controls under the sections on the phone only (the desktop has them in the page);
 *  - tabs: { value, onChange, options: [[key, label, count?]] } — the sections of the screen;
 *  - sticky: keep toolbar and tabs on screen while the page scrolls.
 * Change this component and every screen that uses it changes with it.
 */
export default function Page({ title, mobileTitle, subtitle, primary, mobileAction, menu, actions, summary, toolbar, mobileBar, tabs, sticky = false, className = '', children }) {
  useSetMobileHeader({ title: mobileTitle || title, action: primary ? { label: primary.short || primary.label, onClick: primary.onClick } : mobileAction, menu });
  const showTabs = tabs && tabs.options.length > 1;
  const hv = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('hv') : null;   // PREVIEW ONLY
  const tools = <div className="flex shrink-0 items-center gap-2">{toolbar}{actions}<MoreMenu items={menu} />{primary && <PrimaryButton icon={primary.icon ?? 'plus'} onClick={primary.onClick}>{primary.label}</PrimaryButton>}</div>;
  const tabsOf = (cls = '') => showTabs && <Tabs value={tabs.value} options={tabs.options} onChange={tabs.onChange} className={`!border-b-0 lg:!mx-0 ${cls}`} />;
  const variant = hv === 'A' ? (
    <div className="hidden lg:flex items-end gap-10 border-b border-gray-200">
      <h1 className="pb-3 text-2xl font-semibold tracking-tight text-gray-900">{title}</h1>
      <div className="flex-1">{tabsOf()}</div>
      <div className="pb-2">{tools}</div>
    </div>
  ) : hv === 'B' ? (
    <div className="hidden lg:block">
      <div className="flex items-center justify-between gap-6">
        <div className="flex min-w-0 items-baseline gap-3"><h1 className="text-[28px] font-semibold tracking-tight text-gray-900">{title}</h1>{subtitle && <p className="truncate text-sm text-gray-500">{subtitle}</p>}</div>
        <div className="flex items-center gap-2"><MoreMenu items={menu} />{actions}{primary && <PrimaryButton icon={primary.icon ?? 'plus'} onClick={primary.onClick}>{primary.label}</PrimaryButton>}</div>
      </div>
      <div className="mt-4 flex items-end justify-between gap-6 border-b border-gray-200">
        <div className="flex-1">{tabsOf()}</div>
        <div className="pb-2">{toolbar}</div>
      </div>
    </div>
  ) : hv === 'C' ? (
    <div className="hidden lg:grid grid-cols-[1fr_auto_1fr] items-center gap-6 py-1">
      <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{title}</h1>
      <div>{showTabs && <Segmented value={tabs.value} onChange={tabs.onChange} options={tabs.options.map(([k, l, n]) => [k, n > 0 ? `${l} · ${n}` : l])} />}</div>
      <div className="flex items-center justify-end gap-2">{toolbar}{actions}<MoreMenu items={menu} />{primary && <PrimaryButton icon={primary.icon ?? 'plus'} onClick={primary.onClick}>{primary.label}</PrimaryButton>}</div>
    </div>
  ) : null;
  const bar = (toolbar || showTabs || mobileBar) && (
    <>
      {toolbar && <div className="lg:hidden">{toolbar}</div>}
      {showTabs && <Tabs value={tabs.value} options={tabs.options} onChange={tabs.onChange} className={`${sticky ? '!border-b-0' : ''} ${hv ? 'lg:hidden' : ''}`} />}
      {mobileBar && <div className="lg:hidden">{mobileBar}</div>}
    </>
  );
  return (
    <div className={`w-full ${/space-y-/.test(className) ? '' : 'space-y-6'} pb-16 ${PAGE_BODY} ${className}`}>
      {variant}
      <PageHeader title={title} subtitle={subtitle} className={hv ? 'lg:hidden' : subtitle && !sticky ? '' : 'hidden lg:flex'}
        actions={(actions || primary || toolbar || menu) && <>{toolbar}{actions}<MoreMenu items={menu} />{primary && <PrimaryButton icon={primary.icon ?? 'plus'} onClick={primary.onClick}>{primary.label}</PrimaryButton>}</>} />
      {summary}
      {bar && (sticky ? <StickyBar className={showTabs ? '!pb-0' : 'lg:hidden'}>{bar}</StickyBar> : <div className={`space-y-3 ${showTabs ? '' : 'lg:hidden'}`}>{bar}</div>)}
      {children}
    </div>
  );
}
