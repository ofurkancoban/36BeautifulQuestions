import { useSyncExternalStore } from 'react';

// Anonymous visitor counts through Abacus (https://abacus.jasoncameron.dev), a free counter API.
// Nothing but counter increments is sent: no names, answers, notes or identifiers.
//
// Total: each device adds one to `users` the first time it opens the site.
// Active: time is split into two minute windows; each open, visible device adds one to the current
// window's counter once. The larger of the current and previous window approximates the number of
// devices active in the last few minutes (counters can only go up, so they cannot track departures).

export const COUNTER_NS = '36beautifulquestions';
const API = 'https://abacus.jasoncameron.dev';
const WINDOW_MS = 2 * 60_000;
const POLL_MS = 60_000;
const COUNTED_KEY = 'b36q:counted';
const WINDOW_KEY = 'b36q:active-window';

export interface Presence {
  active: number | null;
  total: number | null;
}

let state: Presence = { active: null, total: null };
const listeners = new Set<() => void>();

function set(next: Partial<Presence>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

async function call(kind: 'hit' | 'get', key: string): Promise<number | null> {
  try {
    const res = await fetch(`${API}/${kind}/${COUNTER_NS}/${key}`, { cache: 'no-store' });
    if (res.status === 404) return 0;
    if (!res.ok) return null;
    const body = (await res.json()) as { value?: unknown };
    return typeof body.value === 'number' ? body.value : null;
  } catch {
    return null;
  }
}

function storage(key: string, value?: string): string | null {
  try {
    if (value !== undefined) localStorage.setItem(key, value);
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

async function countTotal() {
  // Count each device once. If storage is unavailable, only read the total.
  const counted = storage(COUNTED_KEY) === '1';
  const total = counted ? await call('get', 'users') : await call('hit', 'users');
  if (!counted && total !== null) storage(COUNTED_KEY, '1');
  if (total !== null) set({ total });
}

async function tickActive() {
  if (document.visibilityState !== 'visible' || !navigator.onLine) return;
  const slot = Math.floor(Date.now() / WINDOW_MS);
  // Shared across tabs, so one device counts once per window.
  const mine = storage(WINDOW_KEY) === String(slot);
  const [current, previous] = await Promise.all([
    mine ? call('get', `active-${slot}`) : call('hit', `active-${slot}`),
    call('get', `active-${slot - 1}`),
  ]);
  if (!mine && current !== null) storage(WINDOW_KEY, String(slot));
  if (current === null && previous === null) return;
  set({ active: Math.max(1, current ?? 0, previous ?? 0) });
}

let started = false;

/** Starts counting once per page load. Skipped in development and automated browsers. */
export function startPresence() {
  if (started || typeof window === 'undefined') return;
  started = true;
  if (import.meta.env.DEV || navigator.webdriver) return;
  void countTotal();
  void tickActive();
  window.setInterval(() => void tickActive(), POLL_MS);
  document.addEventListener('visibilitychange', () => void tickActive());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function usePresence(): Presence {
  return useSyncExternalStore(subscribe, () => state, () => state);
}
