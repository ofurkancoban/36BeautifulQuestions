import Peer, { type DataConnection } from 'peerjs';
import { initialState, reduce, type Action, type GameState, type Role } from './game';

/**
 * Serverless real-time session over WebRTC.
 * The host's browser owns the authoritative game state; the guest sends actions
 * and renders whatever the host broadcasts. PeerJS's public broker is used only
 * for the initial handshake, after which data flows peer to peer.
 */

const PREFIX = 'b36q-v1-';
const SESSION_KEY = 'b36q:session';
const STATE_KEY = (code: string) => `b36q:state:${code}`;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const PING_MS = 2500;
const STALE_MS = 9000;

export type Status = 'connecting' | 'waiting' | 'connected' | 'reconnecting' | 'error';

export type Ephemeral =
  | { type: 'react'; kind: ReactionKind; id: string }
  | { type: 'touch'; on: boolean };

export type ReactionKind = 'heart' | 'spark' | 'laugh' | 'tear';

type Wire =
  | { t: 'hello'; clientId: string; name: string }
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
}

export interface Snapshot {
  status: Status;
  error: string | null;
  state: GameState | null;
  partnerOnline: boolean;
  clockOffset: number;
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage unavailable, the session still works in memory */
  }
}

export function makeCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

export function normalizeCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6);
}

export function clientId(): string {
  return crypto.randomUUID();
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

function parse(raw: string | null): SavedSession | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SavedSession;
  } catch {
    return null;
  }
}

/** Session of this tab (used to resume after a refresh). */
export function loadActive(): SavedSession | null {
  return parse(tabGet(SESSION_KEY));
}

/** Most recent session on this device (offered on the landing page). */
export function loadSaved(): SavedSession | null {
  return parse(safeGet(SESSION_KEY));
}

export function clearSaved() {
  const s = loadActive() ?? loadSaved();
  if (s) safeSet(STATE_KEY(s.code), null);
  safeSet(SESSION_KEY, null);
  tabSet(SESSION_KEY, null);
}

export function inviteLink(code: string): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#join=${code}`;
}

type Listener = () => void;
type EventListener = (ev: Ephemeral) => void;

export class Session {
  readonly role: Role;
  readonly code: string;
  readonly me: { name: string; clientId: string };

  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private snapshot: Snapshot;
  private listeners = new Set<Listener>();
  private eventListeners = new Set<EventListener>();
  private lastSeen = 0;
  private everConnected = false;
  private destroyed = false;
  private timers: number[] = [];
  private retryTimer: number | null = null;
  private hostRetries = 0;
  private saved: SavedSession;

  constructor(saved: SavedSession) {
    this.saved = saved;
    this.everConnected = !!saved.joined;
    this.role = saved.role;
    this.code = saved.code;
    this.me = { name: saved.name, clientId: saved.clientId };
    safeSet(SESSION_KEY, JSON.stringify(saved));
    tabSet(SESSION_KEY, JSON.stringify(saved));

    let state: GameState | null = null;
    if (this.role === 'host') {
      const raw = safeGet(STATE_KEY(this.code));
      try {
        state = raw ? (JSON.parse(raw) as GameState) : null;
      } catch {
        state = null;
      }
      if (!state) state = initialState(this.code, { name: saved.name, clientId: saved.clientId });
      state = { ...state, players: { ...state.players, host: { name: saved.name, clientId: saved.clientId } } };
    }
    this.snapshot = { status: 'connecting', error: null, state, partnerOnline: false, clockOffset: 0 };

    this.timers.push(window.setInterval(() => this.heartbeat(), PING_MS));
    document.addEventListener('visibilitychange', this.onVisible);
    this.start();
  }

  // ---------- public API ----------

  subscribe = (fn: Listener) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getSnapshot = () => this.snapshot;

  onEvent(fn: EventListener) {
    this.eventListeners.add(fn);
    return () => {
      this.eventListeners.delete(fn);
    };
  }

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
    safeSet(SESSION_KEY, JSON.stringify(saved));
    tabSet(SESSION_KEY, JSON.stringify(saved));
  }

  private set(patch: Partial<Snapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((l) => l());
  }

  private start() {
    if (this.destroyed) return;
    if (this.role === 'host') this.startHost();
    else this.startGuest();
  }

  private startHost() {
    const peer = new Peer(PREFIX + this.code, { debug: 0 });
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
          this.set({ status: 'error', error: 'This ritual seems to be open in another tab or device.' });
          return;
        }
        this.set({ status: 'reconnecting' });
        this.retryTimer = window.setTimeout(() => this.startHost(), 2500);
      } else if (type === 'network' || type === 'server-error' || type === 'socket-error' || type === 'socket-closed') {
        this.set({ status: 'reconnecting' });
        peer.destroy();
        this.retryTimer = window.setTimeout(() => this.startHost(), 3000);
      } else if (type === 'browser-incompatible') {
        this.set({ status: 'error', error: 'This browser cannot open a direct connection. Try a recent Chrome, Safari or Firefox.' });
      }
    });
  }

  private acceptGuest(conn: DataConnection) {
    conn.on('data', (raw) => {
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
        const guest = { name: msg.name.slice(0, 24), clientId: msg.clientId };
        const next = existing && existing.clientId === guest.clientId && existing.name === guest.name
          ? state
          : { ...state, players: { ...state.players, guest }, ready: { host: false, guest: false }, v: state.v + 1 };
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
    const peer = new Peer({ debug: 0 });
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
            error: 'We couldn’t find a ritual with that code. Ask your partner to keep their invitation open.',
          });
        }
      } else if (type === 'network' || type === 'server-error' || type === 'socket-error' || type === 'socket-closed') {
        this.set({ status: 'reconnecting' });
        peer.destroy();
        this.retryTimer = window.setTimeout(() => this.startGuest(), 3000);
      } else if (type === 'browser-incompatible') {
        this.set({ status: 'error', error: 'This browser cannot open a direct connection. Try a recent Chrome, Safari or Firefox.' });
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
      conn.send({ t: 'hello', clientId: this.me.clientId, name: this.me.name } satisfies Wire);
    });
    conn.on('data', (raw) => {
      if (conn !== this.conn) return;
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
        const cur = this.snapshot.state;
        if (cur && msg.state.v < cur.v && msg.state.code === cur.code && msg.state.phase !== 'lobby') return;
        if (!this.saved.joined) this.persist({ ...this.saved, joined: true });
        this.everConnected = true;
        this.set({ state: msg.state, clockOffset: msg.clock - Date.now(), status: 'connected', error: null });
        break;
      }
      case 'action':
        if (this.role === 'host') this.apply(msg.action, 'guest');
        break;
      case 'event':
        this.eventListeners.forEach((l) => l(msg.ev));
        break;
      case 'reject':
        this.set({ status: 'error', error: 'This ritual already has two people in it.' });
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
    const next = reduce(cur, action, by, Date.now());
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
