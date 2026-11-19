import { PER_SET, TOTAL, CLASSIC_SET_MINUTES } from '../data/questions';

export type Role = 'host' | 'guest';
export type Phase = 'lobby' | 'prelude' | 'setIntro' | 'question' | 'interlude' | 'gaze' | 'finale';
export type Pacing = 'classic' | 'unhurried';

export interface Player {
  name: string;
  clientId: string;
}

export interface Pair<T> {
  host: T;
  guest: T;
}

export interface GameState {
  v: number;
  code: string;
  phase: Phase;
  players: { host: Player; guest: Player | null };
  pacing: Pacing;
  firstAsker: Role;
  ready: Pair<boolean>;
  q: number; // current question index 0..35
  revealed: boolean;
  answered: Pair<boolean>;
  skipped: number[];
  startedAt: number | null;
  setStartedAt: number | null;
  miniTimerEndsAt: number | null;
  gazeStartedAt: number | null;
  finishedAt: number | null;
  /** The question index each partner chose as the one that stays with them. */
  favorites: Pair<number | null>;
}

export type Action =
  | { type: 'ready'; value: boolean }
  | { type: 'setPacing'; pacing: Pacing }
  | { type: 'setFirstAsker'; role: Role }
  | { type: 'reveal' }
  | { type: 'answered' }
  | { type: 'openSet' }
  | { type: 'skipQuestion' }
  | { type: 'nextSet' }
  | { type: 'miniTimer'; seconds: number | null }
  | { type: 'gazeEnd' }
  | { type: 'skipGaze' }
  | { type: 'favorite'; q: number | null; role?: Role }
  | { type: 'restart' };

export const GAZE_SECONDS = 240;
export const SET_MS = CLASSIC_SET_MINUTES * 60 * 1000;

export function other(role: Role): Role {
  return role === 'host' ? 'guest' : 'host';
}

export function askerFor(state: GameState, q = state.q): Role {
  return q % 2 === 0 ? state.firstAsker : other(state.firstAsker);
}

export function initialState(code: string, host: Player): GameState {
  return {
    v: 1,
    code,
    phase: 'lobby',
    players: { host, guest: null },
    pacing: 'classic',
    firstAsker: 'host',
    ready: { host: false, guest: false },
    q: 0,
    revealed: false,
    answered: { host: false, guest: false },
    skipped: [],
    startedAt: null,
    setStartedAt: null,
    miniTimerEndsAt: null,
    gazeStartedAt: null,
    finishedAt: null,
    favorites: { host: null, guest: null },
  };
}

/** Fills fields added in later versions so older saved states keep working. */
export function upgradeState(s: GameState): GameState {
  return { ...initialState(s.code, s.players.host), ...s, favorites: s.favorites ?? { host: null, guest: null } };
}

const NOT_READY: Pair<boolean> = { host: false, guest: false };

/** Moves to question index `next`, routing through interludes and the closing ritual. */
function advanceTo(s: GameState, next: number): GameState {
  const base = { ...s, revealed: false, answered: { ...NOT_READY }, miniTimerEndsAt: null, ready: { ...NOT_READY } };
  if (next >= TOTAL) return { ...base, q: TOTAL - 1, phase: 'gaze', gazeStartedAt: null };
  if (next % PER_SET === 0) return { ...base, q: next, phase: 'interlude' };
  return { ...base, q: next, phase: 'question' };
}

/** Pure reducer. Runs only on the host, which is the single source of truth. */
export function reduce(s: GameState, a: Action, by: Role, now: number): GameState {
  const bump = (n: GameState): GameState => (n === s ? s : { ...n, v: s.v + 1 });

  switch (a.type) {
    case 'ready': {
      const ready = { ...s.ready, [by]: a.value };
      const both = ready.host && ready.guest && !!s.players.guest;
      if (!both) return bump({ ...s, ready });
      if (s.phase === 'lobby') return bump({ ...s, ready: { ...NOT_READY }, phase: 'prelude' });
      if (s.phase === 'prelude')
        return bump({ ...s, ready: { ...NOT_READY }, phase: 'setIntro', startedAt: s.startedAt ?? now });
      if (s.phase === 'interlude') return bump({ ...s, ready: { ...NOT_READY }, phase: 'setIntro' });
      if (s.phase === 'gaze' && s.gazeStartedAt === null)
        return bump({ ...s, ready: { ...NOT_READY }, gazeStartedAt: now + 3000 });
      return bump({ ...s, ready });
    }
    case 'setPacing':
      return s.phase === 'lobby' ? bump({ ...s, pacing: a.pacing }) : s;
    case 'setFirstAsker':
      return s.phase === 'lobby' ? bump({ ...s, firstAsker: a.role }) : s;
    case 'openSet':
      if (s.phase !== 'setIntro') return s;
      return bump({ ...s, phase: 'question', setStartedAt: now, revealed: false, answered: { ...NOT_READY } });
    case 'reveal':
      if (s.phase !== 'question' || s.revealed || by !== askerFor(s)) return s;
      return bump({ ...s, revealed: true });
    case 'answered': {
      if (s.phase !== 'question' || !s.revealed) return s;
      const asker = askerFor(s);
      // The reader answers first, as in the original procedure.
      if (by !== asker && !s.answered[asker]) return s;
      const answered = { ...s.answered, [by]: true };
      if (answered.host && answered.guest) return bump(advanceTo(s, s.q + 1));
      return bump({ ...s, answered });
    }
    case 'skipQuestion':
      if (s.phase !== 'question') return s;
      return bump(advanceTo({ ...s, skipped: [...s.skipped, s.q] }, s.q + 1));
    case 'nextSet': {
      if (s.phase !== 'question') return s;
      const next = (Math.floor(s.q / PER_SET) + 1) * PER_SET;
      const skipped = [...s.skipped];
      for (let i = s.q; i < Math.min(next, TOTAL); i++) skipped.push(i);
      return bump(advanceTo({ ...s, skipped }, next));
    }
    case 'miniTimer':
      if (s.phase !== 'question') return s;
      return bump({ ...s, miniTimerEndsAt: a.seconds ? now + a.seconds * 1000 : null });
    case 'gazeEnd':
    case 'skipGaze':
      if (s.phase !== 'gaze') return s;
      return bump({ ...s, phase: 'finale', finishedAt: now, ready: { ...NOT_READY } });
    case 'favorite': {
      if (s.phase !== 'finale') return s;
      if (a.q !== null && (a.q < 0 || a.q >= TOTAL || s.skipped.includes(a.q))) return s;
      return bump({ ...s, favorites: { ...(s.favorites ?? { host: null, guest: null }), [by]: a.q } });
    }
    case 'restart':
      return bump({
        ...initialState(s.code, s.players.host),
        players: s.players,
        pacing: s.pacing,
        firstAsker: other(s.firstAsker),
        v: s.v,
      });
  }
}
