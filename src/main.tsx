import { createRoot } from 'react-dom/client';
import App from './App';
import './fonts';
import './styles.css';

// StrictMode is intentionally off: its double-invoked effects would open two WebRTC peers with the same id in dev.
createRoot(document.getElementById('root')!).render(<App />);

// Offline support: a small service worker caches the app shell (production builds only).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  });
}
