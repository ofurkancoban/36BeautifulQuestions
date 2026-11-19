import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import type { GameSession } from './session';
import { askerFor, other, type GameState, type Role } from './game';

export const SessionContext = createContext<GameSession | null>(null);

export function useSession(): GameSession {
  const s = useContext(SessionContext);
  if (!s) throw new Error('useSession outside provider');
  return s;
}

export function useSnapshot() {
  const s = useSession();
  return useSyncExternalStore(s.subscribe, s.getSnapshot);
}

/**
 * Convenience view of the game from this device's point of view.
 * On one phone, "me" follows whoever has to act next, and labels use names instead of "You".
 */
export function useGame() {
  const session = useSession();
  const snap = useSnapshot();
  const state = snap.state as GameState;
  const local = session.kind === 'local';
  let me: Role = session.role;
  if (local && state.phase === 'question') {
    const asker = askerFor(state);
    me = state.answered[asker] ? other(asker) : asker;
  }
  const them: Role = other(me);
  const myName = state.players[me]?.name ?? session.me.name;
  const theirName = state.players[them]?.name ?? 'your partner';
  /** How to address a role on screen: "You" for this device's person, otherwise their name. */
  const label = (role: Role) => (!local && role === session.role ? 'You' : (state.players[role]?.name ?? 'Partner'));
  return { session, snap, state, me, them, myName, theirName, local, label };
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
