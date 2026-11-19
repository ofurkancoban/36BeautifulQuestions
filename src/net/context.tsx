import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import type { Session } from './session';
import { other, type GameState, type Role } from './game';

export const SessionContext = createContext<Session | null>(null);

export function useSession(): Session {
  const s = useContext(SessionContext);
  if (!s) throw new Error('useSession outside provider');
  return s;
}

export function useSnapshot() {
  const s = useSession();
  return useSyncExternalStore(s.subscribe, s.getSnapshot);
}

/** Convenience view of the game from this device's point of view. */
export function useGame() {
  const session = useSession();
  const snap = useSnapshot();
  const state = snap.state as GameState;
  const me: Role = session.role;
  const them: Role = other(me);
  const myName = state.players[me]?.name ?? session.me.name;
  const theirName = state.players[them]?.name ?? 'your partner';
  return { session, snap, state, me, them, myName, theirName };
}

/** Re-renders every `ms` and returns the shared (host) clock. */
export function useNow(ms = 500) {
  const session = useSession();
  const [now, setNow] = useState(() => session.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(session.now()), ms);
    return () => clearInterval(id);
  }, [session, ms]);
  return now;
}
