import type Peer from 'peerjs';
import type { Messages } from '../i18n/en';
import type { DataConnection } from 'peerjs';
import { initialState, reduce, upgradeState, type Action, type GameState, type Role } from './game';
import { cleanName, isGameState, isWire } from './validate';

/**
 * Serverless real-time session over WebRTC.
 * The host's browser owns the authoritative game state; the guest sends actions
 * and renders whatever the host broadcasts. PeerJS's public broker is used only
 * for the initial handshake, after which data flows peer to peer.
 * The guest also keeps a copy of the latest state, so if the host comes back
 * without theirs (storage cleared, another browser), the ritual is restored.
 */

const PREFIX = 'b36q-v1-';
const SESSION_KEY = 'b36q:session';
export const STATE_KEY = (code: string) => `b36q:state:${code}`;
const MIRROR_KEY = (code: string) => `b36q:mirror:${code}`;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const PING_MS = 2500;
const STALE_MS = 9000;

export type ErrorCode = keyof Messages['errors'];

export type Status = 'connecting' | 'waiting' | 'connected' | 'reconnecting' | 'error';

export type ReactionKind = 'heart' | 'spark' | 'laugh' | 'tear';

export type Ephemeral = { type: 'react'; kind: ReactionKind; id: string } | { type: 'touch'; on: boolean };

type Wire =
  | { t: 'hello'; clientId: string; name: string; state?: GameState }
  | { t: 'action'; action: Action }
  | { t: 'state'; state: GameState; clock: number }
  | { t: 'event'; ev: Ephemeral }
  | { t: 'reject'; reason: 'full' }
  | { t: 'ping' }
  | { t: 'pong' };

export interface SavedSession {
  code: string;
  role: Role;
  name: string;
  clientId: string;
  /** Set once a guest has been accepted, so a later reload keeps retrying instead of giving up. */
  joined?: boolean;
  /** One-phone mode: both people share this device and no network is used. */
  local?: boolean;
  partnerName?: string;
}

export interface Snapshot {
  status: Status;
  /** Error key into the `errors` message table; translated at render time. */
  error: ErrorCode | null;
  state: GameState | null;
  partnerOnline: boolean;
  clockOffset: number;
}

/** What the UI needs from a session, whether it runs over the network or on one phone. */
export interface GameSession {
  readonly kind: 'remote' | 'local';
  readonly role: Role;
  readonly code: string;
  readonly me: { name: string; clientId: string };
  subscribe(fn: () => void): () => void;
  getSnapshot(): Snapshot;
  onEvent(fn: (ev: Ephemeral) => void): () => void;
  dispatch(action: Action): void;
  emit(ev: Ephemeral): void;
  now(): number;
  destroy(): void;
  leave(): void;
}

// ---------- storage helpers ----------

export function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSet(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage unavailable, the session still works in memory */
  }
}

// The active session lives in sessionStorage (per tab, survives refresh) so two tabs
// on one machine can play against each other. A copy in localStorage powers "Return to your ritual".
function tabGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function tabSet(key: string, value: string | null) {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export function loadState(key: string): GameState | null {
  const raw = safeGet(key);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isGameState(parsed) ? upgradeState(parsed) : null;
  } catch {
    return null;
  }
}

export function makeCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

export function normalizeCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 6);
}

export function clientId(): string {
  return crypto.randomUUID();
}

function parseSaved(raw: string | null): SavedSession | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as SavedSession;
    return typeof s?.code === 'string' && (s.role === 'host' || s.role === 'guest') ? s : null;
  } catch {
    return null;
  }
}

/** Session of this tab (used to resume after a refresh). */
export function loadActive(): SavedSession | null {
  return parseSaved(tabGet(SESSION_KEY));
}

/** Most recent session on this device (offered on the landing page). */
export function loadSaved(): SavedSession | null {
  return parseSaved(safeGet(SESSION_KEY));
}

export function rememberSession(saved: SavedSession) {
  safeSet(SESSION_KEY, JSON.stringify(saved));
  tabSet(SESSION_KEY, JSON.stringify(saved));
}

export function clearSaved() {
  const s = loadActive() ?? loadSaved();
  if (s) {
    safeSet(STATE_KEY(s.code), null);
    safeSet(MIRROR_KEY(s.code), null);
  }
  safeSet(SESSION_KEY, null);
  tabSet(SESSION_KEY, null);
}

export function inviteLink(code: string): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#join=${code}`;
}

/** Small observable base shared by the network and one-phone sessions. */
export abstract class SessionBase {
  protected snapshot: Snapshot;
  private listeners = new Set<() => void>();
  protected eventListeners = new Set<(ev: Ephemeral) => void>();

  constructor(initial: Snapshot) {
    this.snapshot = initial;
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  getSnapshot = () => this.snapshot;

  onEvent(fn: (ev: Ephemeral) => void) {
    this.eventListeners.add(fn);
    return () => {
      this.eventListeners.delete(fn);
    };
  }

  protected set(patch: Partial<Snapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((l) => l());
  }
}

let peerModule: Promise<typeof import('peerjs')> | null = null;
/** PeerJS is loaded on demand, so the landing page and one-phone mode never download it. */
function loadPeer() {
  peerModule ??= import('peerjs');
  return peerModule;
}

export class Session extends SessionBase implements GameSession {
  readonly kind = 'remote' as const;
  readonly role: Role;
  readonly code: string;
  readonly me: { name: string; clientId: string };

  private PeerCtor: typeof Peer | null = null;
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private lastSeen = 0;
  private everConnected: boolean;
  private destroyed = false;
  private timers: number[] = [];
  private retryTimer: number | null = null;
  private hostRetries = 0;
  private saved: SavedSession;

  constructor(saved: SavedSession) {
    let state: GameState | null = null;
    if (saved.role === 'host') {
      state = loadState(STATE_KEY(saved.code)) ?? initialState(saved.code, { name: saved.name, clientId: saved.clientId });
      state = { ...state, players: { ...state.players, host: { name: saved.name, clientId: saved.clientId } } };
    }
    super({ status: 'connecting', error: null, state, partnerOnline: false, clockOffset: 0 });
    this.saved = saved;
    this.everConnected = !!saved.joined;
    this.role = saved.role;
    this.code = saved.code;
    this.me = { name: saved.name, clientId: saved.clientId };
    rememberSession(saved);

    this.timers.push(window.setInterval(() => this.heartbeat(), PING_MS));
    document.addEventListener('visibilitychange', this.onVisible);
    loadPeer()
      .then((m) => {
        this.PeerCtor = m.default;
        this.start();
      })
      .catch(() => this.set({ status: 'error', error: 'loadFailed' }));
  }

  // ---------- public API ----------

  dispatch(action: Action) {
    if (this.role === 'host') this.apply(action, 'host');
    else this.send({ t: 'action', action });
  }

  emit(ev: Ephemeral) {
    this.send({ t: 'event', ev });
  }

  /** Host clock in ms, so both screens agree on timers. */
  now() {
    return Date.now() + this.snapshot.clockOffset;
  }

  destroy() {
    this.destroyed = true;
    this.timers.forEach((t) => clearInterval(t));
    if (this.retryTimer) clearTimeout(this.retryTimer);
    document.removeEventListener('visibilitychange', this.onVisible);
    try {
      this.conn?.close();
      this.peer?.destroy();
    } catch {
      /* ignore */
    }
  }

  leave() {
    clearSaved();
    this.destroy();
  }

  // ---------- internals ----------

  private persist(saved: SavedSession) {
    this.saved = saved;
    rememberSession(saved);
  }

  private start() {
    if (this.destroyed) return;
    if (this.role === 'host') this.startHost();
    else this.startGuest();
  }

  private startHost() {
    if (this.destroyed || !this.PeerCtor) return;
    const peer = new this.PeerCtor(PREFIX + this.code, { debug: 0 });
    this.peer = peer;
    peer.on('open', () => {
      this.hostRetries = 0;
      this.set({ status: this.snapshot.partnerOnline ? 'connected' : 'waiting', error: null });
    });
    peer.on('connection', (conn) => this.acceptGuest(conn));
    peer.on('disconnected', () => {
      if (!this.destroyed && !peer.destroyed) setTimeout(() => !peer.destroyed && peer.reconnect(), 1500);
    });
    peer.on('error', (err) => {
      const type = (err as { type?: string }).type;
      if (type === 'unavailable-id') {
        // A previous tab (or our own refresh) still holds the id on the broker. Wait for it to free up.
        peer.destroy();
        this.hostRetries++;
        if (this.hostRetries > 14) {
          this.set({ status: 'error', error: 'otherTab' });
          return;
        }
        this.set({ status: 'reconnecting' });
        this.retryTimer = window.setTimeout(() => this.startHost(), 2500);
      } else if (type === 'network' || type === 'server-error' || type === 'socket-error' || type === 'socket-closed') {
        this.set({ status: 'reconnecting' });
        peer.destroy();
        this.retryTimer = window.setTimeout(() => this.startHost(), 3000);
      } else if (type === 'browser-incompatible') {
        this.set({ status: 'error', error: 'incompatible' });
      }
    });
  }

  private acceptGuest(conn: DataConnection) {
    conn.on('data', (raw) => {
      if (!isWire(raw)) return;
      const msg = raw as Wire;
      const state = this.snapshot.state!;
      if (msg.t === 'hello') {
        const existing = state.players.guest;
        if (existing && existing.clientId !== msg.clientId && this.snapshot.partnerOnline) {
          conn.send({ t: 'reject', reason: 'full' } satisfies Wire);
          setTimeout(() => conn.close(), 500);
          return;
        }
        if (this.conn && this.conn !== conn) {
          try {
            this.conn.close();
          } catch {
            /* ignore */
          }
        }
        this.conn = conn;
        this.everConnected = true;
        this.lastSeen = Date.now();
        const guest = { name: cleanName(msg.name), clientId: msg.clientId };

        // The guest's copy wins when ours is older, e.g. after the host lost local storage.
        let base = state;
        const mirror = msg.state;
        const mirrorUsable = !!mirror && mirror.code === this.code && mirror.v > state.v;
        if (mirror && mirrorUsable && (!existing || existing.clientId === msg.clientId)) {
          base = upgradeState({ ...mirror, players: { ...mirror.players, host: state.players.host } });
        }

        const same = base.players.guest?.clientId === guest.clientId && base.players.guest?.name === guest.name;
        const next =
          same && base === state
            ? state
            : {
                ...base,
                players: { ...base.players, guest },
                ready: same ? base.ready : { host: false, guest: false },
                v: Math.max(base.v, state.v) + 1,
              };
        this.commit(next);
        this.set({ status: 'connected', partnerOnline: true });
        return;
      }
      if (conn !== this.conn) return;
      this.receive(msg);
    });
    conn.on('close', () => {
      if (conn === this.conn) this.set({ partnerOnline: false, status: 'waiting' });
    });
  }

  private startGuest() {
    if (this.destroyed || !this.PeerCtor) return;
    const peer = new this.PeerCtor({ debug: 0 });
    this.peer = peer;
    peer.on('open', () => this.connectToHost());
    peer.on('disconnected', () => {
      if (!this.destroyed && !peer.destroyed) setTimeout(() => !peer.destroyed && peer.reconnect(), 1500);
    });
    peer.on('error', (err) => {
      const type = (err as { type?: string }).type;
      if (type === 'peer-unavailable') {
        if (this.everConnected || this.snapshot.state) {
          this.set({ status: 'reconnecting', partnerOnline: false });
          this.scheduleGuestRetry();
        } else {
          this.set({
            status: 'error',
            error: 'notFound',
          });
        }
      } else if (type === 'network' || type === 'server-error' || type === 'socket-error' || type === 'socket-closed') {
        this.set({ status: 'reconnecting' });
        peer.destroy();
        this.retryTimer = window.setTimeout(() => this.startGuest(), 3000);
      } else if (type === 'browser-incompatible') {
        this.set({ status: 'error', error: 'incompatible' });
      }
    });
  }

  private scheduleGuestRetry() {
    if (this.retryTimer || this.destroyed) return;
    this.retryTimer = window.setTimeout(() => {
      this.retryTimer = null;
      if (this.peer && !this.peer.destroyed && !this.peer.disconnected) this.connectToHost();
      else {
        this.peer?.destroy();
        this.startGuest();
      }
    }, 3000);
  }

  private connectToHost() {
    if (this.destroyed || !this.peer) return;
    const conn = this.peer.connect(PREFIX + this.code, { reliable: true, serialization: 'json' });
    conn.on('open', () => {
      if (this.conn && this.conn !== conn) this.conn.close();
      this.conn = conn;
      this.lastSeen = Date.now();
      const mirror = this.snapshot.state ?? loadState(MIRROR_KEY(this.code)) ?? undefined;
      conn.send({ t: 'hello', clientId: this.me.clientId, name: this.me.name, state: mirror } satisfies Wire);
    });
    conn.on('data', (raw) => {
      if (conn !== this.conn || !isWire(raw)) return;
      this.receive(raw as Wire);
    });
    conn.on('close', () => {
      if (conn !== this.conn) return;
      this.conn = null;
      this.set({ partnerOnline: false, status: 'reconnecting' });
      this.scheduleGuestRetry();
    });
    conn.on('error', () => this.scheduleGuestRetry());
  }

  private receive(msg: Wire) {
    this.lastSeen = Date.now();
    if (!this.snapshot.partnerOnline) this.set({ partnerOnline: true, status: 'connected' });
    switch (msg.t) {
      case 'state': {
        if (this.role !== 'guest') return;
        const cur = this.snapshot.state;
        if (msg.state.code !== this.code) return;
        if (cur && msg.state.v < cur.v && msg.state.phase !== 'lobby') return;
        if (!this.saved.joined) this.persist({ ...this.saved, joined: true });
        this.everConnected = true;
        const state = upgradeState(msg.state);
        safeSet(MIRROR_KEY(this.code), JSON.stringify(state));
        this.set({ state, clockOffset: msg.clock - Date.now(), status: 'connected', error: null });
        break;
      }
      case 'action':
        if (this.role === 'host') this.apply(msg.action, 'guest');
        break;
      case 'event':
        this.eventListeners.forEach((l) => l(msg.ev));
        break;
      case 'reject':
        if (this.role !== 'guest') return;
        this.set({ status: 'error', error: 'full' });
        this.destroy();
        break;
      case 'ping':
        this.send({ t: 'pong' });
        break;
    }
  }

  private apply(action: Action, by: Role) {
    const cur = this.snapshot.state;
    if (!cur) return;
    // The host decides who acted; a role carried inside the action is only meaningful on one phone.
    const next = reduce(cur, action.type === 'favorite' ? { ...action, role: undefined } : action, by, Date.now());
    if (next !== cur) this.commit(next);
  }

  private commit(state: GameState) {
    safeSet(STATE_KEY(this.code), JSON.stringify(state));
    this.set({ state });
    this.send({ t: 'state', state, clock: Date.now() });
  }

  private send(msg: Wire) {
    const c = this.conn;
    if (c && c.open) {
      try {
        c.send(msg);
      } catch {
        /* connection is dying, heartbeat will notice */
      }
    }
  }

  private heartbeat() {
    if (this.destroyed) return;
    this.send({ t: 'ping' });
    if (this.snapshot.partnerOnline && Date.now() - this.lastSeen > STALE_MS) {
      this.set({ partnerOnline: false, status: this.role === 'host' ? 'waiting' : 'reconnecting' });
      if (this.role === 'guest') {
        try {
          this.conn?.close();
        } catch {
          /* ignore */
        }
        this.conn = null;
        this.scheduleGuestRetry();
      }
    }
    // Host re-broadcasts periodically so a guest that missed a message heals itself.
    if (this.role === 'host' && this.snapshot.partnerOnline && this.snapshot.state) {
      this.send({ t: 'state', state: this.snapshot.state, clock: Date.now() });
    }
  }

  private onVisible = () => {
    if (document.visibilityState !== 'visible' || this.destroyed) return;
    if (this.peer?.disconnected && !this.peer.destroyed) this.peer.reconnect();
    if (this.role === 'guest' && (!this.conn || !this.conn.open)) this.scheduleGuestRetry();
  };
}
