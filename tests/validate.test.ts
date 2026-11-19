import { describe, expect, it } from 'vitest';
import { initialState } from '../src/net/game';
import { cleanName, isAction, isGameState, isWire } from '../src/net/validate';

const state = { ...initialState('ABCDEF', { name: 'Elif', clientId: 'h' }), players: { host: { name: 'Elif', clientId: 'h' }, guest: { name: 'Deniz', clientId: 'g' } } };

describe('isAction', () => {
  it('accepts every well-formed action', () => {
    for (const a of [
      { type: 'ready', value: true },
      { type: 'setPacing', pacing: 'unhurried' },
      { type: 'setFirstAsker', role: 'guest' },
      { type: 'miniTimer', seconds: 240 },
      { type: 'miniTimer', seconds: null },
      { type: 'favorite', q: 35 },
      { type: 'favorite', q: null, role: 'host' },
      { type: 'reveal' },
      { type: 'restart' },
    ]) {
      expect(isAction(a)).toBe(true);
    }
  });

  it('rejects malformed or unknown actions', () => {
    for (const a of [
      null,
      'reveal',
      { type: 'hack' },
      { type: 'ready', value: 'yes' },
      { type: 'setPacing', pacing: 'fast' },
      { type: 'miniTimer', seconds: 99999 },
      { type: 'favorite', q: 36 },
      { type: 'favorite', q: 1.5 },
      { type: 'setFirstAsker', role: 'admin' },
    ]) {
      expect(isAction(a)).toBe(false);
    }
  });
});

describe('isGameState', () => {
  it('accepts a real state', () => {
    expect(isGameState(state)).toBe(true);
  });

  it('rejects tampered states', () => {
    expect(isGameState({ ...state, q: 99 })).toBe(false);
    expect(isGameState({ ...state, phase: 'party' })).toBe(false);
    expect(isGameState({ ...state, code: 'abc' })).toBe(false);
    expect(isGameState({ ...state, skipped: ['x'] })).toBe(false);
    expect(isGameState({ ...state, players: { host: { name: 'x'.repeat(200), clientId: 'h' }, guest: null } })).toBe(false);
  });
});

describe('isWire', () => {
  it('accepts protocol messages', () => {
    expect(isWire({ t: 'ping' })).toBe(true);
    expect(isWire({ t: 'hello', clientId: 'abc', name: 'Deniz' })).toBe(true);
    expect(isWire({ t: 'hello', clientId: 'abc', name: 'Deniz', state })).toBe(true);
    expect(isWire({ t: 'state', state, clock: 123 })).toBe(true);
    expect(isWire({ t: 'event', ev: { type: 'react', kind: 'heart', id: 'x' } })).toBe(true);
    expect(isWire({ t: 'event', ev: { type: 'touch', on: false } })).toBe(true);
  });

  it('rejects junk', () => {
    expect(isWire(undefined)).toBe(false);
    expect(isWire({ t: 'hello', clientId: '', name: 'x' })).toBe(false);
    expect(isWire({ t: 'hello', clientId: 'a', name: '   ' })).toBe(false);
    expect(isWire({ t: 'state', state: { ...state, v: -1 }, clock: 1 })).toBe(false);
    expect(isWire({ t: 'event', ev: { type: 'react', kind: 'bomb', id: 'x' } })).toBe(false);
    expect(isWire({ t: 'reject', reason: 'because' })).toBe(false);
  });
});

describe('cleanName', () => {
  it('trims, collapses whitespace, strips control characters and caps length', () => {
    expect(cleanName('  Ayşe \n\t Nur ')).toBe('Ayşe Nur');
    expect(cleanName('a\u0000b')).toBe('ab');
    expect(cleanName('x'.repeat(40))).toHaveLength(24);
  });
});
