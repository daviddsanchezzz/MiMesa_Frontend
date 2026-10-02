import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import publicApi from '../services/publicApi';
import { publicBookingUrl } from '../lib/publicUrl';

/**
 * Old public address (/public/{businessId}/cita or /reserve). It keeps working
 * exactly as before, with no redirect: links, printed QR codes and iframes on
 * business websites must never break. It only tells search engines that the
 * main address is now vetrareserve.com/{slug}.
 */
export default function LegacyPublicPage({ children }) {
  const { businessId } = useParams();

  useEffect(() => {
    let alive = true;
    publicApi.get(`/auth/public/business/${businessId}`)
      .then(({ data }) => {
        if (!alive || !data?.slug) return;
        const href = publicBookingUrl({ id: businessId, slug: data.slug, businessType: data.businessType });
        let el = document.head.querySelector('link[rel="canonical"]');
        if (!el) { el = document.createElement('link'); el.setAttribute('rel', 'canonical'); document.head.appendChild(el); }
        el.setAttribute('href', href);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [businessId]);

  return children;
}
