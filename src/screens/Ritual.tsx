import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useGame, useNow } from '../net/context';
import { askerFor, other, SET_MS, type Role } from '../net/game';
import { PER_SET, QUESTIONS, SETS, roman, setOf } from '../data/questions';
import QuestionCard from '../components/QuestionCard';
import ReadyBar from '../components/ReadyBar';
import { Button, CheckIcon, Flourish, LetterRise, PenIcon, Reveal, ease } from '../components/ui';
import { Sheet } from '../components/Sheet';
import { useNotes } from '../lib/notes';
import { sfx, vibrate } from '../lib/sound';

// ---------------------------------------------------------------------------
// Prelude: the three rules of the ritual
// ---------------------------------------------------------------------------

const RULES = [
  { n: 'I', title: 'Take turns holding the card', body: 'Whoever holds it turns it over, reads it aloud, and answers first.' },
  { n: 'II', title: 'Both of you answer', body: 'Every question, every time. Closeness grows from giving and receiving in turn.' },
  { n: 'III', title: 'Be honest, be gentle', body: 'There are no wrong answers. Listen fully. Pause when you need to.' },
];

export function Prelude() {
  return (
    <main className="screen prelude">
      <Reveal>
        <span className="eyebrow">Before you begin</span>
      </Reveal>
      <Reveal delay={0.15}>
        <h2 className="display-md">Three small promises</h2>
      </Reveal>
      <div className="rules">
        {RULES.map((r, i) => (
          <Reveal key={r.n} delay={0.4 + i * 0.25} className="rule">
            <span className="rule-num">{r.n}</span>
            <div>
              <h3>{r.title}</h3>
              <p>{r.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
      <Reveal delay={1.3}>
        <ReadyBar label="I promise" localLabel="We promise" />
      </Reveal>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Set intro: a title card for each act
// ---------------------------------------------------------------------------

export function SetIntro() {
  const { session, state } = useGame();
  const set = setOf(state.q);
  useEffect(() => {
    sfx.chord();
  }, [set.id]);
  return (
    <main className="screen set-intro" key={set.id}>
      <Reveal>
        <span className="eyebrow">Set {set.numeral} of III</span>
      </Reveal>
      <div className="set-numeral" aria-hidden>
        <LetterRise text={set.numeral} delay={0.2} />
      </div>
      <h2 className="set-name">
        <LetterRise text={set.name} delay={0.7} />
      </h2>
      <Reveal delay={1.3}>
        <p className="set-tagline">{set.tagline}</p>
      </Reveal>
      <Reveal delay={1.5}>
        <Flourish />
      </Reveal>
      <Reveal delay={1.7}>
        <p className="set-intro-text">{set.intro}</p>
      </Reveal>
      {state.pacing === 'classic' && (
        <Reveal delay={1.85}>
          <p className="muted small center">About fifteen minutes. The clock starts with the first card.</p>
        </Reveal>
      )}
      <Reveal delay={2}>
        <Button onClick={() => session.dispatch({ type: 'openSet' })}>Draw the first card</Button>
      </Reveal>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Question: the heart of the ritual
// ---------------------------------------------------------------------------

function fmt(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function Progress({ q, skipped }: { q: number; skipped: number[] }) {
  return (
    <div className="progress" aria-label={`Question ${q + 1} of 36`}>
      {SETS.map((set) => (
        <div key={set.id} className="progress-set">
          {Array.from({ length: PER_SET }, (_, i) => {
            const idx = (set.id - 1) * PER_SET + i;
            const cls = idx < q ? (skipped.includes(idx) ? 'is-skipped' : 'is-done') : idx === q ? 'is-current' : '';
            return <span key={idx} className={`progress-dot ${cls}`} />;
          })}
        </div>
      ))}
    </div>
  );
}

function TurnLine({ left, right, activeLeft }: { left: string; right: string; activeLeft: boolean }) {
  return (
    <div className="turn">
      <div className={`turn-name ${activeLeft ? 'is-active' : ''}`}>{left}</div>
      <div className="turn-track">
        <span className="turn-rail" />
        <motion.span className="turn-flame" animate={{ left: activeLeft ? '0%' : '100%' }} transition={{ duration: 1.1, ease }}>
          <svg viewBox="0 0 24 32" width="16" height="22" aria-hidden>
            <path d="M12 1c2 6 8 9 8 17a8 8 0 0 1-16 0c0-5 3-7 4-11 1 3 2 4 4 5-1-4 0-8 0-11z" fill="url(#flame-g)" />
            <defs>
              <radialGradient id="flame-g" cx="50%" cy="70%" r="60%">
                <stop offset="0" stopColor="#fff4d6" />
                <stop offset=".5" stopColor="#f6c27a" />
                <stop offset="1" stopColor="#e0705a" />
              </radialGradient>
            </defs>
          </svg>
        </motion.span>
      </div>
      <div className={`turn-name ${!activeLeft ? 'is-active' : ''}`}>{right}</div>
    </div>
  );
}

function SpeakerChip({ name, state }: { name: string; state: 'waiting' | 'speaking' | 'listening' | 'done' }) {
  const label = { waiting: 'waiting', speaking: 'speaking', listening: 'listening', done: 'answered' }[state];
  return (
    <div className={`chip chip-${state}`}>
      <span className="chip-dot">{state === 'done' ? <CheckIcon size={10} /> : null}</span>
      <span className="chip-name">{name}</span>
      <span className="chip-state">{label}</span>
    </div>
  );
}

function MiniTimer({ endsAt, seconds }: { endsAt: number | null; seconds: number }) {
  const { session } = useGame();
  const now = useNow(250);
  const left = endsAt ? endsAt - now : seconds * 1000;
  const done = endsAt !== null && left <= 0;
  const fired = useRef(false);
  useEffect(() => {
    if (done && !fired.current) {
      fired.current = true;
      sfx.turn();
      vibrate([40, 80, 40]);
    }
    if (!endsAt) fired.current = false;
  }, [done, endsAt]);
  return (
    <div className="mini-timer">
      <span className={`mini-timer-time ${done ? 'is-done' : ''}`}>{done ? 'Time' : fmt(left)}</span>
      <button className="link" onClick={() => session.dispatch({ type: 'miniTimer', seconds: endsAt ? null : seconds })}>
        {endsAt ? 'Reset timer' : 'Start four minutes'}
      </button>
    </div>
  );
}

function SetClock({ startedAt }: { startedAt: number }) {
  const { session, state } = useGame();
  const now = useNow(1000);
  const left = startedAt + SET_MS - now;
  const set = setOf(state.q);
  const last = set.id === 3;
  return (
    <>
      <span className={`set-clock ${left <= 60000 ? 'is-low' : ''}`}>{left > 0 ? fmt(left) : 'Time'}</span>
      <AnimatePresence>
        {left <= 0 && (
          <motion.div
            className="time-banner"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.6, ease }}
          >
            <span>Fifteen minutes have passed. In the study, this is where you would move on.</span>
            <button className="link" onClick={() => session.dispatch({ type: 'nextSet' })}>
              {last ? 'Go to the closing' : `Move to Set ${roman(set.id + 1)}`}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

const UNDO_MS = 3000;

function NoteSheet({ open, onClose, q, value, onChange, partner }: { open: boolean; onClose: () => void; q: number; value: string; onChange: (v: string) => void; partner: string | null }) {
  return (
    <Sheet open={open} onClose={onClose} title="A private note">
      <div className="note-sheet">
        <p className="note-question">
          <span className="mono">No. {roman(q + 1)}</span> {QUESTIONS[q].text}
        </p>
        <textarea
          className="note-input"
          value={value}
          autoFocus
          maxLength={4000}
          placeholder="What do you want to remember about this moment?"
          onChange={(e) => onChange(e.target.value)}
        />
        <p className="muted small">
          {partner ? `Kept only on this device. Never sent to ${partner}.` : 'Kept only on this phone. Never sent anywhere.'} You can read
          all your notes at the end.
        </p>
      </div>
    </Sheet>
  );
}

export function QuestionScreen() {
  const { session, state, me, theirName, local, label } = useGame();
  const question = QUESTIONS[state.q];
  const set = setOf(state.q);
  const asker = askerFor(state);
  const listener = other(asker);
  const askerIsMe = asker === me;
  const askerDone = state.answered[asker];
  const myDone = state.answered[me];
  const askerName = state.players[asker]?.name ?? 'Partner';
  const listenerName = state.players[listener]?.name ?? 'Partner';
  const { notes, setNote } = useNotes(state.code);
  const [noteOpen, setNoteOpen] = useState(false);

  // "I've answered" waits a moment before it is sent, so an accidental tap can be undone.
  const [pending, setPending] = useState<number | null>(null);
  useEffect(() => {
    if (pending === null) return;
    if (pending !== state.q) {
      setPending(null);
      return;
    }
    const id = window.setTimeout(() => {
      setPending(null);
      session.dispatch({ type: 'answered' });
    }, UNDO_MS);
    return () => clearTimeout(id);
  }, [pending, state.q, session]);
  const isPending = pending === state.q;

  // Gentle cues when the card passes or turns over.
  const prevQ = useRef(state.q);
  useEffect(() => {
    if (prevQ.current !== state.q) {
      if (askerIsMe || local) {
        sfx.turn();
        vibrate(35);
      }
      prevQ.current = state.q;
    }
  }, [state.q, askerIsMe, local]);
  const prevRevealed = useRef(state.revealed);
  useEffect(() => {
    if (state.revealed && !prevRevealed.current) sfx.reveal();
    prevRevealed.current = state.revealed;
  }, [state.revealed]);

  const chipState = (role: Role): 'waiting' | 'speaking' | 'listening' | 'done' => {
    if (state.answered[role]) return 'done';
    if (!state.revealed) return 'waiting';
    if (role === asker) return 'speaking';
    return askerDone ? 'speaking' : 'listening';
  };

  const answer = () => setPending(state.q);
  let instruction: string;
  let action: { label: string; onClick?: () => void; disabled?: boolean } | null = null;
  if (local) {
    if (!state.revealed) {
      instruction = `${askerName} holds the card.`;
      action = { label: 'Turn the card over', onClick: () => session.dispatch({ type: 'reveal' }) };
    } else if (!askerDone) {
      instruction = `${askerName}, read it aloud and answer first.`;
      action = { label: `${askerName} has answered`, onClick: answer };
    } else {
      instruction = `${listenerName}, your turn to answer.`;
      action = { label: `${listenerName} has answered`, onClick: answer };
    }
  } else if (!state.revealed) {
    instruction = askerIsMe ? 'You hold the card.' : `${theirName} holds the card.`;
    action = askerIsMe ? { label: 'Turn the card over', onClick: () => session.dispatch({ type: 'reveal' }) } : null;
  } else if (askerIsMe) {
    if (!myDone) {
      instruction = 'Read it aloud, then answer first.';
      action = { label: 'I’ve answered', onClick: answer };
    } else {
      instruction = `Now listen to ${theirName}.`;
      action = { label: `${theirName} is answering`, disabled: true };
    }
  } else if (!askerDone) {
    instruction = `Listen as ${theirName} answers first.`;
    action = { label: 'Your turn comes next', disabled: true };
  } else {
    instruction = 'Your turn to answer.';
    action = { label: 'I’ve answered', onClick: answer };
  }

  const leftRole: Role = session.role;
  const hasNote = !!notes[state.q];

  return (
    <main className="screen question-screen">
      <div className="q-top">
        <div className="q-set">
          <span className="q-set-name">
            Set {set.numeral} · <em>{set.name}</em>
          </span>
          <span className="q-count">
            {question.n} <span className="muted">of 36</span>
            <button
              className={`note-btn ${hasNote ? 'has-note' : ''}`}
              onClick={() => setNoteOpen(true)}
              aria-label={hasNote ? 'Edit your private note' : 'Write a private note'}
              title="Private note"
            >
              <PenIcon />
            </button>
          </span>
          {state.pacing === 'classic' && state.setStartedAt ? <SetClock startedAt={state.setStartedAt} /> : <span />}
        </div>
        <Progress q={state.q} skipped={state.skipped} />
        <TurnLine
          left={state.players[leftRole]?.name ?? ''}
          right={state.players[other(leftRole)]?.name ?? ''}
          activeLeft={asker === leftRole}
        />
      </div>

      <div className="q-card-area">
        <AnimatePresence mode="popLayout">
          <QuestionCard
            key={state.q}
            question={question}
            revealed={state.revealed}
            canReveal={askerIsMe || local}
            onReveal={() => session.dispatch({ type: 'reveal' })}
            waitingLabel={`${askerName} is about to turn the card`}
          />
        </AnimatePresence>
      </div>

      <div className="q-bottom">
        <AnimatePresence mode="wait">
          <motion.p
            key={instruction}
            className="q-instruction"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.45 }}
          >
            {instruction}
          </motion.p>
        </AnimatePresence>
        {state.revealed && question.hint && <p className="q-hint">{question.hint}</p>}
        {state.revealed && question.timerSeconds && <MiniTimer endsAt={state.miniTimerEndsAt} seconds={question.timerSeconds} />}
        {isPending ? (
          <Button variant="ghost" className="btn-undo" onClick={() => setPending(null)} key={`undo-${state.q}`}>
            <span className="btn-undo-fill" style={{ animationDuration: `${UNDO_MS}ms` }} />
            <span className="btn-undo-text">Undo</span>
          </Button>
        ) : (
          action && (
            <Button onClick={action.onClick} disabled={action.disabled} variant={action.disabled ? 'ghost' : 'primary'}>
              {action.label}
            </Button>
          )
        )}
        <div className="chips">
          <SpeakerChip name={label(asker)} state={chipState(asker)} />
          <SpeakerChip name={label(listener)} state={chipState(listener)} />
        </div>
      </div>

      <NoteSheet
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
        q={state.q}
        value={notes[state.q] ?? ''}
        onChange={(v) => setNote(state.q, v)}
        partner={local ? null : theirName}
      />
    </main>
  );
}

// ---------------------------------------------------------------------------
// Interlude: breathe between sets
// ---------------------------------------------------------------------------

export function Interlude() {
  const { state } = useGame();
  const done = SETS[Math.floor(state.q / PER_SET) - 1];
  const next = setOf(state.q);
  return (
    <main className="screen interlude">
      <Reveal>
        <span className="eyebrow">Set {done.numeral} · {done.name}</span>
      </Reveal>
      <Reveal delay={0.2}>
        <h2 className="display-md">Twelve questions, held.</h2>
      </Reveal>
      <Reveal delay={0.5}>
        <div className="breath" aria-hidden>
          <motion.div
            className="breath-circle"
            animate={{ scale: [0.62, 1, 1, 0.62, 0.62] }}
            transition={{ duration: 12, times: [0, 0.33, 0.45, 0.85, 1], repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="breath-circle breath-circle-inner"
            animate={{ scale: [0.5, 0.86, 0.86, 0.5, 0.5] }}
            transition={{ duration: 12, times: [0, 0.33, 0.45, 0.85, 1], repeat: Infinity, ease: 'easeInOut' }}
          />
          <BreathWord />
        </div>
      </Reveal>
      <Reveal delay={0.8}>
        <p className="muted center narrow">
          Take a few slow breaths together. When you are both ready, the next set waits: <em>{next.name}</em>,{' '}
          {next.tagline.toLowerCase()}.
        </p>
      </Reveal>
      <Reveal delay={1}>
        <ReadyBar label={`Continue to Set ${next.numeral}`} localLabel={`Continue to Set ${next.numeral}`} />
      </Reveal>
    </main>
  );
}

function BreathWord() {
  const now = useNow(250);
  const phase = (now / 1000) % 12;
  const word = phase < 4 ? 'breathe in' : phase < 5.4 ? 'hold' : phase < 10.2 ? 'breathe out' : 'rest';
  return (
    <AnimatePresence mode="wait">
      <motion.span key={word} className="breath-word" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
        {word}
      </motion.span>
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Gaze: four minutes of silence
// ---------------------------------------------------------------------------

export function Gaze() {
  const { session, state, theirName, local } = useGame();
  const now = useNow(200);
  const startedAt = state.gazeStartedAt;
  const total = 240_000;
  const sent = useRef(false);

  const elapsed = startedAt ? now - startedAt : -1;
  const counting = startedAt !== null && elapsed < 0;
  const running = startedAt !== null && elapsed >= 0 && elapsed < total;
  const over = startedAt !== null && elapsed >= total;

  useEffect(() => {
    if (running) sfx.soft();
  }, [running]);
  useEffect(() => {
    if (over && !sent.current) {
      sent.current = true;
      sfx.chord();
      session.dispatch({ type: 'gazeEnd' });
    }
  }, [over, session]);

  if (!startedAt) {
    return (
      <main className="screen gaze">
        <Reveal>
          <span className="eyebrow">Thirty-six questions, answered</span>
        </Reveal>
        <Reveal delay={0.2}>
          <h2 className="display-md">One last thing, without words</h2>
        </Reveal>
        <Reveal delay={0.45}>
          <p className="center narrow lede-sm">
            Put the phones down, face up. Look into each other&rsquo;s eyes for four minutes, in silence. If you are apart,
            look into the camera on your call. It will feel strange, then it won&rsquo;t.
          </p>
        </Reveal>
        <Reveal delay={0.6}>
          <p className="muted small center narrow">
            Not part of the 1997 study itself. It comes from Mandy Len Catron&rsquo;s 2015 essay, which made the questions
            famous.
          </p>
        </Reveal>
        <Reveal delay={0.8}>
          <ReadyBar label={'We’re ready'} localLabel={'We’re ready'} />
        </Reveal>
        <Reveal delay={1}>
          <button className="link" onClick={() => session.dispatch({ type: 'skipGaze' })}>
            Skip to the end
          </button>
        </Reveal>
      </main>
    );
  }

  const progress = Math.min(1, Math.max(0, elapsed / total));
  const R = 118;
  const C = 2 * Math.PI * R;
  return (
    <main className="screen gaze gaze-live">
      <div className="gaze-ring">
        <svg viewBox="0 0 260 260" aria-hidden>
          <circle cx="130" cy="130" r={R} fill="none" stroke="var(--line)" strokeWidth="1" />
          <circle
            cx="130"
            cy="130"
            r={R}
            fill="none"
            stroke="var(--gold)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - progress)}
            transform="rotate(-90 130 130)"
            style={{ transition: 'stroke-dashoffset .25s linear' }}
          />
        </svg>
        <div className="gaze-center">
          <AnimatePresence mode="wait">
            {counting ? (
              <motion.span key={Math.ceil(-elapsed / 1000)} className="gaze-count" initial={{ opacity: 0, scale: 1.4 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}>
                {Math.ceil(-elapsed / 1000)}
              </motion.span>
            ) : (
              <motion.span key="look" className="gaze-word" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 2 }}>
                {over ? 'Welcome back' : 'just look'}
              </motion.span>
            )}
          </AnimatePresence>
          {running && <span className="gaze-time">{fmt(total - elapsed)}</span>}
        </div>
      </div>
      <p className="muted small center">{running ? (local ? 'Look at each other. Nothing else is needed.' : `Look at ${theirName}. Nothing else is needed.`) : ''}</p>
      <button className="link gaze-end" onClick={() => session.dispatch({ type: 'skipGaze' })}>
        End here
      </button>
    </main>
  );
}
