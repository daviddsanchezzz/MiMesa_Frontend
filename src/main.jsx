import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { isPublicHost } from './lib/publicUrl';

// vetrareserve.com/{slug} only needs the public booking pages; the rest is the app.
const Root = isPublicHost() ? lazy(() => import('./PublicSite')) : lazy(() => import('./App'));

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Suspense fallback={null}>
      <Root />
    </Suspense>
  </React.StrictMode>
);
