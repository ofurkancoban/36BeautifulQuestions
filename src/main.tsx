import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

// StrictMode is intentionally off: its double-invoked effects would open two WebRTC peers with the same id in dev.
createRoot(document.getElementById('root')!).render(<App />);
