import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';

const PublicSlugPage = lazy(() => import('./pages/PublicSlugPage'));

/**
 * The app as served at vetrareserve.com/{slug}: only the public booking pages,
 * no session (the website proxies these paths here).
 */
export default function PublicSite() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/:slug" element={<PublicSlugPage />} />
            <Route path="/:slug/cancelar" element={<PublicSlugPage cancel />} />
            <Route path="*" element={<GoHome />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

function GoHome() {
  window.location.replace('https://www.vetrareserve.com/');
  return null;
}
