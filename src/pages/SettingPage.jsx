import Page from '../ui/Page';

/** A setting that used to live inside Configuración, now with its own address and place in the menu. */
export default function SettingPage({ title, subtitle, children }) {
  return <Page title={title} subtitle={subtitle}>{children}</Page>;
}
