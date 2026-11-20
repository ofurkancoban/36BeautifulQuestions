import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Turns VITE_ICE_SERVERS into strict JSON at build time.
 * Accepts plain JSON or the JavaScript snippet TURN dashboards hand out
 * (`const iceServers = [{ urls: "...", }];`), and fails the build when the value
 * cannot be read, instead of shipping a config the app would silently ignore.
 */
function iceServersJson(raw: string | undefined): string {
  if (!raw || !raw.trim()) return '';
  const relaxed = raw
    .trim()
    .replace(/^(?:const|let|var)\s+\w+\s*=\s*/, '')
    .replace(/;\s*$/, '')
    .replace(/([{,]\s*)([A-Za-z_]\w*)\s*:/g, '$1"$2":')
    .replace(/,\s*([}\]])/g, '$1');
  let parsed: unknown;
  try {
    parsed = JSON.parse(relaxed);
  } catch {
    throw new Error('VITE_ICE_SERVERS is not a readable array of ICE servers.');
  }
  const valid =
    Array.isArray(parsed) &&
    parsed.length > 0 &&
    parsed.every((s) => typeof s === 'object' && s !== null && (typeof s.urls === 'string' || Array.isArray(s.urls)));
  if (!valid) throw new Error('VITE_ICE_SERVERS must be a non-empty array of { urls, username?, credential? }.');
  return JSON.stringify(parsed);
}

// Relative base so the build works on any GitHub Pages path (user.github.io/<repo>/).
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { host: true },
  build: { chunkSizeWarningLimit: 800 },
  define: {
    'import.meta.env.VITE_ICE_SERVERS': JSON.stringify(iceServersJson(process.env.VITE_ICE_SERVERS)),
  },
});
