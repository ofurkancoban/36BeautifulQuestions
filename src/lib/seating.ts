import { useSyncExternalStore } from 'react';

/**
 * One-phone seating, remembered on this device.
 * "across": the phone lies between two people facing each other, so the card turns
 * toward whoever reads it. "side": both look at the phone from the same side.
 */
export type Seating = 'across' | 'side';

const KEY = 'b36q:seating';
const listeners = new Set<() => void>();

function read(): Seating {
  try {
    return localStorage.getItem(KEY) === 'side' ? 'side' : 'across';
  } catch {
    return 'across';
  }
}

let value: Seating = read();

export function setSeating(next: Seating) {
  value = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* keep it for this visit only */
  }
  listeners.forEach((l) => l());
}

export function useSeating(): Seating {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => value,
  );
}
