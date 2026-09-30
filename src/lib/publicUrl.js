/**
 * Public booking page of a business.
 *
 *   production  https://vetrareserve.com/{slug}   (the website proxies it to this app)
 *   elsewhere   {this origin}/r/{slug}             (dev, local)
 *
 * VITE_PUBLIC_SITE_URL overrides the base. A business without a slug keeps the
 * old /public/{id}/… address, which still works.
 */

const PUBLIC_HOSTS = (import.meta.env.VITE_PUBLIC_HOSTS || 'vetrareserve.com,www.vetrareserve.com')
  .split(',').map((h) => h.trim().toLowerCase()).filter(Boolean);

/** Is this page being served as the public website (vetrareserve.com/{slug})? */
export function isPublicHost(host = window.location.hostname) {
  return PUBLIC_HOSTS.includes(String(host).toLowerCase());
}

export function publicSiteBase() {
  const env = import.meta.env.VITE_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/+$/, '');
  if (window.location.hostname === 'app.vetrareserve.com') return 'https://vetrareserve.com';
  return `${window.location.origin}/r`;
}

/** Path of a slug page on the current host (for in-app navigation). */
export function slugPath(slug) {
  return isPublicHost() ? `/${slug}` : `/r/${slug}`;
}

export function legacyPublicUrl(business) {
  const kind = business?.businessType === 'appointments' ? 'cita' : 'reserve';
  return `${window.location.origin}/public/${business?.id}/${kind}`;
}

export function publicBookingUrl(business) {
  if (!business) return '';
  if (business.slug) return `${publicSiteBase()}/${business.slug}`;
  return legacyPublicUrl(business);
}

/** "vetrareserve.com/" (what goes before the slug), for the settings field. */
export function publicSitePrefix() {
  return `${publicSiteBase().replace(/^https?:\/\//, '')}/`;
}

export const SLUG_RE = /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){1,48}[a-z0-9]$/;

/** Same rules as the server: "Estética Són" → "estetica-son". */
export function slugify(text) {
  return String(text || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/&/g, ' y ')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 50).replace(/-+$/g, '');
}
