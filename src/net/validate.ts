import { TOTAL } from '../data/questions';
import type { Action, GameState, Pacing, Phase, Role } from './game';

/**
 * Runtime guards for everything that arrives over the wire or out of storage.
 * A peer can send anything, so nothing is trusted until it passes these checks.
 */

export const NAME_MAX = 24;

const PHASES: readonly Phase[] = ['lobby', 'prelude', 'setIntro', 'question', 'interlude', 'gaze', 'finale'];
const PACINGS: readonly Pacing[] = ['classic', 'unhurried'];
const ROLES: readonly Role[] = ['host', 'guest'];
const REACTIONS = ['heart', 'spark', 'laugh', 'tear'] as const;

type Obj = Record<string, unknown>;

const isObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x);
const isBool = (x: unknown): x is boolean => typeof x === 'boolean';
const isInt = (x: unknown, min: number, max: number): x is number =>
  typeof x === 'number' && Number.isInteger(x) && x >= min && x <= max;
const isTime = (x: unknown) => x === null || (typeof x === 'number' && Number.isFinite(x) && x >= 0);
const isStr = (x: unknown, max: number): x is string => typeof x === 'string' && x.length > 0 && x.length <= max;
const isPair = (x: unknown, item: (v: unknown) => boolean) => isObj(x) && item(x.host) && item(x.guest);
const oneOf = <T>(list: readonly T[], x: unknown): x is T => list.includes(x as T);

export function cleanName(raw: string): string {
  // Collapse whitespace and drop control characters; React escapes the rest on render.
  return raw
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NAME_MAX);
}

function isPlayer(x: unknown) {
  return isObj(x) && isStr(x.name, NAME_MAX) && isStr(x.clientId, 64);
}

export function isAction(x: unknown): x is Action {
  if (!isObj(x) || typeof x.type !== 'string') return false;
  switch (x.type) {
    case 'ready':
      return isBool(x.value);
    case 'setPacing':
      return oneOf(PACINGS, x.pacing);
    case 'setFirstAsker':
      return oneOf(ROLES, x.role);
    case 'miniTimer':
      return x.seconds === null || isInt(x.seconds, 1, 600);
    case 'favorite':
      return (x.q === null || isInt(x.q, 0, TOTAL - 1)) && (x.role === undefined || oneOf(ROLES, x.role));
    case 'reveal':
    case 'answered':
    case 'openSet':
    case 'skipQuestion':
    case 'nextSet':
    case 'gazeEnd':
    case 'skipGaze':
    case 'restart':
      return true;
    default:
      return false;
  }
}

export function isGameState(x: unknown): x is GameState {
  if (!isObj(x)) return false;
  const players = x.players;
  return (
    isInt(x.v, 0, Number.MAX_SAFE_INTEGER) &&
    typeof x.code === 'string' &&
    /^[A-Z]{6}$/.test(x.code) &&
    oneOf(PHASES, x.phase) &&
    isObj(players) &&
    isPlayer(players.host) &&
    (players.guest === null || isPlayer(players.guest)) &&
    oneOf(PACINGS, x.pacing) &&
    oneOf(ROLES, x.firstAsker) &&
    isPair(x.ready, isBool) &&
    isInt(x.q, 0, TOTAL - 1) &&
    isBool(x.revealed) &&
    isPair(x.answered, isBool) &&
    Array.isArray(x.skipped) &&
    x.skipped.length <= TOTAL &&
    x.skipped.every((n) => isInt(n, 0, TOTAL - 1)) &&
    isTime(x.startedAt) &&
    isTime(x.setStartedAt) &&
    isTime(x.miniTimerEndsAt) &&
    isTime(x.gazeStartedAt) &&
    isTime(x.finishedAt) &&
    (x.favorites === undefined || isPair(x.favorites, (v) => v === null || isInt(v, 0, TOTAL - 1)))
  );
}

function isEphemeral(x: unknown) {
  if (!isObj(x)) return false;
  if (x.type === 'react') return oneOf(REACTIONS, x.kind) && isStr(x.id, 64);
  if (x.type === 'touch') return isBool(x.on);
  return false;
}

/** Validates a message from the peer. Returns false for anything malformed or unexpected. */
export function isWire(x: unknown): boolean {
  if (!isObj(x) || typeof x.t !== 'string') return false;
  switch (x.t) {
    case 'hello':
      return (
        isStr(x.clientId, 64) &&
        typeof x.name === 'string' &&
        cleanName(x.name).length > 0 &&
        (x.state === undefined || isGameState(x.state))
      );
    case 'action':
      return isAction(x.action);
    case 'state':
      return isGameState(x.state) && typeof x.clock === 'number' && Number.isFinite(x.clock);
    case 'event':
      return isEphemeral(x.ev);
    case 'reject':
      return x.reason === 'full';
    case 'ping':
    case 'pong':
      return true;
    default:
      return false;
  }
}
