import { useSyncExternalStore } from 'react';
import en, { type Messages } from './en';
import tr from './tr';
import de from './de';
import nl from './nl';
import fr from './fr';
import it from './it';
import es from './es';
import ru from './ru';

export type { Messages } from './en';

export const MESSAGES = { en, tr, de, nl, fr, it, es, ru } satisfies Record<string, Messages>;
export type Lang = keyof typeof MESSAGES;
export const LANGS = Object.keys(MESSAGES) as Lang[];

const KEY = 'b36q:lang';

export function isLang(x: unknown): x is Lang {
  return typeof x === 'string' && x in MESSAGES;
}

/** Pick the first browser language we support, falling back to English. */
function detect(): Lang {
  try {
    const stored = localStorage.getItem(KEY);
    if (isLang(stored)) return stored;
  } catch {
    // Storage may be blocked; fall through to the browser languages.
  }
  const prefs = typeof navigator !== 'undefined' ? (navigator.languages ?? [navigator.language]) : [];
  for (const p of prefs) {
    const base = p?.toLowerCase().split('-')[0];
    if (isLang(base)) return base;
  }
  return 'en';
}

let current: Lang = detect();
const listeners = new Set<() => void>();

function apply(lang: Lang) {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang;
    document.documentElement.dataset.lang = lang;
  }
}
apply(current);

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang) {
  if (lang === current) return;
  current = lang;
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    // Not persisted, but still applied for this visit.
  }
  apply(lang);
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useLang(): Lang {
  return useSyncExternalStore(subscribe, getLang, getLang);
}

/** The message table for the active language. Re-renders on change. */
export function useT(): Messages {
  return MESSAGES[useLang()];
}

/** Non-hook access, for code outside React (canvas rendering, exports). */
export function t(): Messages {
  return MESSAGES[current];
}
