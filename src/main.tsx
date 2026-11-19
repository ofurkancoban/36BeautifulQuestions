import { createRoot } from 'react-dom/client';
import App from './App';
import './fonts';
import './styles.css';

// StrictMode is intentionally off: its double-invoked effects would open two WebRTC peers with the same id in dev.
createRoot(document.getElementById('root')!).render(<App />);

// Offline support: a small service worker caches the app shell (production builds only).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js', { updateViaCache: 'none' })
      .then(async (reg) => {
        // Hand the worker everything this page already loaded, so the app opens offline after one visit.
        const ready = await navigator.serviceWorker.ready;
        const urls = performance
          .getEntriesByType('resource')
          .map((e) => e.name)
          .filter((u) => u.startsWith(window.location.origin));
        ready.active?.postMessage({ type: 'cache-urls', urls: [...urls, window.location.href.split('#')[0]] });
        // Check for a new version whenever the app comes back to the foreground.
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') void reg.update().catch(() => undefined);
        });
      })
      .catch(() => undefined);
    // When a new service worker takes over, reload once so the new version is what people see.
    // Skipped on the very first visit, when there was no previous version to replace.
    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded || !hadController) return;
      reloaded = true;
      window.location.reload();
    });
  });
}
