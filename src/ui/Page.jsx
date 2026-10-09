import { useSetMobileHeader } from '../context/MobileHeaderContext';
import { PAGE_BODY, StickyBar } from './PeriodNavigator';
import { MoreMenu, PageHeader, PrimaryButton, Tabs } from './kit';

/**
 * The frame of every screen, phone and desktop from the same place:
 *  - title: the header bar on the phone, the big heading on desktop (the subtitle sits beside it);
 *  - primary: the one main action — a button on desktop, the header-bar action on the phone;
 *  - mobileAction: only without primary — false hides the header-bar action, left out keeps what the screen inside sets;
 *  - menu: the secondary actions [{ label, onClick }] behind a ⋯ button (header bar on the phone, next to the button on desktop);
 *  - actions: secondary desktop controls next to it (Exportar…);
 *  - summary: the few key figures under the heading (a FigureLine);
 *  - toolbar: the period navigator and the like. Desktop: at the end of the tabs row (or of the heading when there are no tabs); phone: above the sections;
 *  - mobileBar: extra controls under the sections on the phone only (the desktop has them in the page);
 *  - tabs: { value, onChange, options: [[key, label, count?]] } — the sections of the screen;
 *  - sticky: keep toolbar and tabs on screen while the page scrolls.
 * Desktop layout: title row (title + subtitle left, menu and main button right), then the tabs row with a hairline
 * under it and the period at its end. Change this component and every screen that uses it changes with it.
 */
export default function Page({ title, mobileTitle, subtitle, primary, mobileAction, menu, actions, summary, toolbar, mobileBar, tabs, sticky = false, className = '', children }) {
  useSetMobileHeader({ title: mobileTitle || title, action: primary ? { label: primary.short || primary.label, onClick: primary.onClick } : mobileAction, menu });
  const showTabs = tabs && tabs.options.length > 1;
  const bar = (toolbar || showTabs || mobileBar) && (
    <>
      {toolbar && <div className="lg:hidden">{toolbar}</div>}
      {showTabs && (
        <div className={`flex items-end justify-between gap-6 ${sticky ? '' : 'lg:border-b lg:border-gray-200'}`}>
          <div className="min-w-0 flex-1"><Tabs value={tabs.value} options={tabs.options} onChange={tabs.onChange} className={sticky ? '!border-b-0' : 'lg:!border-b-0'} /></div>
          {toolbar && <div className="hidden shrink-0 pb-2 lg:block">{toolbar}</div>}
        </div>
      )}
      {mobileBar && <div className="lg:hidden">{mobileBar}</div>}
    </>
  );
  return (
    <div className={`w-full ${/space-y-/.test(className) ? '' : 'space-y-6'} pb-16 ${PAGE_BODY} ${className}`}>
      <PageHeader title={title} subtitle={subtitle} className={subtitle && !sticky ? '' : 'hidden lg:flex'}
        actions={(actions || primary || menu || (toolbar && !showTabs)) && <>{!showTabs && toolbar}{actions}<MoreMenu items={menu} />{primary && <PrimaryButton icon={primary.icon ?? 'plus'} onClick={primary.onClick}>{primary.label}</PrimaryButton>}</>} />
      {summary}
      {bar && (sticky ? <StickyBar className={showTabs ? '!pb-0' : 'lg:hidden'}>{bar}</StickyBar> : <div className={`space-y-3 ${showTabs ? '' : 'lg:hidden'}`}>{bar}</div>)}
      {children}
    </div>
  );
}
