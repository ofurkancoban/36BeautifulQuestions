import { useSyncExternalStore } from 'react';
import type { Mood } from '../data/questions';

// Tiny global store for the background mood and glow, so any screen can set the atmosphere.

interface Ambience {
  mood: Mood;
  pulse: number;
}

let value: Ambience = { mood: 'night', pulse: 0 };
const listeners = new Set<() => void>();

export function setAmbience(patch: Partial<Ambience>) {
  const next = { ...value, ...patch };
  if (next.mood === value.mood && next.pulse === value.pulse) return;
  value = next;
  listeners.forEach((l) => l());
}

export function useAmbience() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => value,
  );
}
