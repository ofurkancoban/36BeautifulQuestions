import { askerFor, initialState, other, reduce, type Action, type GameState, type Role } from './game';
import { clearSaved, loadState, rememberSession, safeSet, SessionBase, STATE_KEY, type GameSession, type SavedSession } from './session';

/**
 * One-phone mode: both people pass a single device back and forth.
 * Runs the exact same reducer as the network game, with no connection at all,
 * so it also works offline once the app is installed.
 */
export class LocalSession extends SessionBase implements GameSession {
  readonly kind = 'local' as const;
  readonly role: Role = 'host';
  readonly code: string;
  readonly me: { name: string; clientId: string };

  constructor(saved: SavedSession) {
    const host = { name: saved.name, clientId: saved.clientId };
    const guest = { name: saved.partnerName ?? 'Partner', clientId: `${saved.clientId}-partner` };
    let state = loadState(STATE_KEY(saved.code));
    if (!state) state = { ...initialState(saved.code, host), players: { host, guest } };
    super({ status: 'connected', error: null, state, partnerOnline: true, clockOffset: 0 });
    this.code = saved.code;
    this.me = host;
    rememberSession(saved);
  }

  dispatch(action: Action) {
    let s = this.snapshot.state as GameState;
    const now = Date.now();
    switch (action.type) {
      case 'ready':
        // Both people are holding the same phone, so one tap speaks for both.
        s = reduce(s, { type: 'ready', value: true }, 'host', now);
        s = reduce(s, { type: 'ready', value: true }, 'guest', now);
        break;
      case 'reveal':
        s = reduce(s, action, askerFor(s), now);
        break;
      case 'answered': {
        const asker = askerFor(s);
        s = reduce(s, action, s.answered[asker] ? other(asker) : asker, now);
        break;
      }
      case 'favorite':
        s = reduce(s, action, action.role ?? 'host', now);
        break;
      default:
        s = reduce(s, action, 'host', now);
    }
    if (s === this.snapshot.state) return;
    safeSet(STATE_KEY(this.code), JSON.stringify(s));
    this.set({ state: s });
  }

  emit() {
    /* nobody to send gestures to on one phone */
  }

  now() {
    return Date.now();
  }

  destroy() {
    /* nothing to tear down */
  }

  leave() {
    clearSaved();
  }
}
