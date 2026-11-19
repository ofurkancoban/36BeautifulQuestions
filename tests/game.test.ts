import { describe, expect, it } from 'vitest';
import { askerFor, initialState, reduce, upgradeState, type Action, type GameState, type Role } from '../src/net/game';

const host = { name: 'Elif', clientId: 'h' };
const guest = { name: 'Deniz', clientId: 'g' };

function paired(): GameState {
  return { ...initialState('ABCDEF', host), players: { host, guest } };
}

function run(s: GameState, steps: Array<[Action, Role]>, now = 1000) {
  return steps.reduce((acc, [a, by]) => reduce(acc, a, by, now), s);
}

/** Plays from the lobby to the first question. */
function toFirstQuestion() {
  return run(paired(), [
    [{ type: 'ready', value: true }, 'host'],
    [{ type: 'ready', value: true }, 'guest'],
    [{ type: 'ready', value: true }, 'host'],
    [{ type: 'ready', value: true }, 'guest'],
    [{ type: 'openSet' }, 'guest'],
  ]);
}

/** Reveals and answers the current question in the required order. */
function answerCurrent(s: GameState) {
  const asker = askerFor(s);
  const listener: Role = asker === 'host' ? 'guest' : 'host';
  return run(s, [
    [{ type: 'reveal' }, asker],
    [{ type: 'answered' }, asker],
    [{ type: 'answered' }, listener],
  ]);
}

describe('lobby and phases', () => {
  it('needs both partners ready to leave the lobby', () => {
    let s = reduce(paired(), { type: 'ready', value: true }, 'host', 0);
    expect(s.phase).toBe('lobby');
    s = reduce(s, { type: 'ready', value: true }, 'guest', 0);
    expect(s.phase).toBe('prelude');
    expect(s.ready).toEqual({ host: false, guest: false });
  });

  it('cannot leave the lobby without a guest', () => {
    const s = run(initialState('ABCDEF', host), [
      [{ type: 'ready', value: true }, 'host'],
      [{ type: 'ready', value: true }, 'guest'],
    ]);
    expect(s.phase).toBe('lobby');
  });

  it('starts the set clock when the first card is drawn', () => {
    const s = toFirstQuestion();
    expect(s.phase).toBe('question');
    expect(s.setStartedAt).toBe(1000);
    expect(s.startedAt).toBe(1000);
  });

  it('only changes settings in the lobby', () => {
    const s = toFirstQuestion();
    expect(reduce(s, { type: 'setPacing', pacing: 'unhurried' }, 'host', 0)).toBe(s);
  });

  it('bumps the version on every change and keeps it on no-ops', () => {
    const s = paired();
    const next = reduce(s, { type: 'setPacing', pacing: 'unhurried' }, 'host', 0);
    expect(next.v).toBe(s.v + 1);
    expect(reduce(next, { type: 'reveal' }, 'host', 0)).toBe(next);
  });
});

describe('turn taking', () => {
  it('alternates the asker every question', () => {
    const s = toFirstQuestion();
    expect(askerFor(s)).toBe('host');
    const next = answerCurrent(s);
    expect(next.q).toBe(1);
    expect(askerFor(next)).toBe('guest');
  });

  it('only lets the asker reveal the card', () => {
    const s = toFirstQuestion();
    expect(reduce(s, { type: 'reveal' }, 'guest', 0)).toBe(s);
    expect(reduce(s, { type: 'reveal' }, 'host', 0).revealed).toBe(true);
  });

  it('requires the reader to answer first', () => {
    const s = reduce(toFirstQuestion(), { type: 'reveal' }, 'host', 0);
    expect(reduce(s, { type: 'answered' }, 'guest', 0)).toBe(s);
    const afterHost = reduce(s, { type: 'answered' }, 'host', 0);
    expect(afterHost.answered.host).toBe(true);
    const afterBoth = reduce(afterHost, { type: 'answered' }, 'guest', 0);
    expect(afterBoth.q).toBe(1);
    expect(afterBoth.revealed).toBe(false);
  });

  it('cannot answer before the card is turned', () => {
    const s = toFirstQuestion();
    expect(reduce(s, { type: 'answered' }, 'host', 0)).toBe(s);
  });
});

describe('sets and the closing', () => {
  it('pauses in an interlude after twelve questions', () => {
    let s = toFirstQuestion();
    for (let i = 0; i < 12; i++) s = answerCurrent(s);
    expect(s.phase).toBe('interlude');
    expect(s.q).toBe(12);
  });

  it('moves to the next set early and records the skipped questions', () => {
    let s = answerCurrent(toFirstQuestion());
    s = reduce(s, { type: 'nextSet' }, 'guest', 0);
    expect(s.phase).toBe('interlude');
    expect(s.q).toBe(12);
    expect(s.skipped).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it('goes to the gaze after the last question, then to the finale', () => {
    let s = toFirstQuestion();
    for (let set = 0; set < 3; set++) {
      for (let i = 0; i < 12; i++) s = answerCurrent(s);
      if (set < 2) {
        s = run(s, [
          [{ type: 'ready', value: true }, 'host'],
          [{ type: 'ready', value: true }, 'guest'],
          [{ type: 'openSet' }, 'host'],
        ]);
      }
    }
    expect(s.phase).toBe('gaze');
    s = run(s, [
      [{ type: 'ready', value: true }, 'host'],
      [{ type: 'ready', value: true }, 'guest'],
    ], 5000);
    expect(s.gazeStartedAt).toBe(8000);
    s = reduce(s, { type: 'gazeEnd' }, 'host', 9000);
    expect(s.phase).toBe('finale');
    expect(s.finishedAt).toBe(9000);
    expect(s.skipped).toEqual([]);
  });

  it('records favorites only in the finale and never a skipped question', () => {
    let s = reduce(toFirstQuestion(), { type: 'skipQuestion' }, 'host', 0);
    expect(reduce(s, { type: 'favorite', q: 3 }, 'host', 0)).toBe(s);
    s = { ...s, phase: 'finale' };
    expect(reduce(s, { type: 'favorite', q: 0 }, 'host', 0)).toBe(s);
    s = reduce(s, { type: 'favorite', q: 4 }, 'guest', 0);
    expect(s.favorites).toEqual({ host: null, guest: 4 });
  });

  it('restarts with the first asker swapped and names kept', () => {
    const s = reduce({ ...toFirstQuestion(), phase: 'finale' }, { type: 'restart' }, 'guest', 0);
    expect(s.phase).toBe('lobby');
    expect(s.firstAsker).toBe('guest');
    expect(s.players.guest?.name).toBe('Deniz');
  });
});

describe('upgradeState', () => {
  it('fills fields missing from older saved states', () => {
    const old = { ...paired() } as Partial<GameState>;
    delete old.favorites;
    expect(upgradeState(old as GameState).favorites).toEqual({ host: null, guest: null });
  });
});
