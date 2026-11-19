import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';
import Atmosphere from './components/Atmosphere';
import { Dock, FloatLayer, TouchBloom, useIntimacy } from './components/Intimacy';
import { HowItWorks, Sheet } from './components/Sheet';
import { Button, MenuIcon, Monogram, ease } from './components/ui';
import { setOf, type Mood } from './data/questions';
import { setAmbience, useAmbience } from './lib/ambience';
import { ambientPlaying, setSoundEnabled, soundEnabled, startAmbient, stopAmbient } from './lib/sound';
import { SessionContext, useGame, useSession, useSnapshot } from './net/context';
import type { GameState } from './net/game';
import { LocalSession } from './net/local';
import { inviteLink, loadActive, normalizeCode, Session, type GameSession, type SavedSession } from './net/session';
import { useWakeLock } from './lib/wakeLock';
import Finale from './screens/Finale';
import Landing from './screens/Landing';
import Lobby from './screens/Lobby';
import { Gaze, Interlude, Prelude, QuestionScreen, SetIntro } from './screens/Ritual';

function readInvite(): string | null {
  const m = window.location.hash.match(/join=([A-Za-z]{6})/);
  return m ? normalizeCode(m[1]) : null;
}

function moodFor(state: GameState | null): Mood {
  if (!state) return 'night';
  switch (state.phase) {
    case 'setIntro':
    case 'question':
    case 'interlude':
      return setOf(state.q).mood;
    case 'gaze':
      return 'midnight';
    case 'finale':
      return 'dawn';
    default:
      return 'night';
  }
}

export default function App() {
  const [session, setSession] = useState<GameSession | null>(null);
  const [landingError, setLandingError] = useState<string | null>(null);
  const [invite] = useState(readInvite);
  const ambience = useAmbience();

  const start = useCallback((saved: SavedSession) => {
    setLandingError(null);
    setSession(saved.local ? new LocalSession(saved) : new Session(saved));
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }, []);

  // Resume automatically after a refresh, or when opening an invite you already accepted.
  useEffect(() => {
    const saved = loadActive();
    if (!saved) return;
    if (!invite || invite === saved.code) start(saved);
  }, [invite, start]);

  const leave = useCallback(() => {
    session?.leave();
    setSession(null);
    setAmbience({ mood: 'night', pulse: 0 });
  }, [session]);

  const fail = useCallback(
    (msg: string) => {
      session?.leave();
      setSession(null);
      setLandingError(msg);
    },
    [session],
  );

  useEffect(() => () => session?.destroy(), [session]);

  return (
    <>
      <Atmosphere mood={ambience.mood} pulse={ambience.pulse} />
      <AnimatePresence mode="wait">
        {session ? (
          <SessionContext.Provider value={session} key={`s-${session.code}`}>
            <SessionView onLeave={leave} onFail={fail} />
          </SessionContext.Provider>
        ) : (
          <motion.div key="landing" className="app-frame app-scroll" exit={{ opacity: 0, transition: { duration: 0.5 } }}>
            <Landing onStart={start} inviteCode={invite} error={landingError} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function SessionView({ onLeave, onFail }: { onLeave: () => void; onFail: (msg: string) => void }) {
  const session = useSession();
  const snap = useSnapshot();

  useEffect(() => {
    setAmbience({ mood: moodFor(snap.state) });
  }, [snap.state]);

  useEffect(() => {
    if (snap.status === 'error' && snap.error && (!snap.state || session.role === 'guest')) onFail(snap.error);
  }, [snap.status, snap.error, snap.state, session.role, onFail]);

  if (!snap.state) {
    return (
      <motion.main className="screen center-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <div className="seeking">
          <Monogram size={64} />
          <motion.span className="seeking-ring" animate={{ scale: [1, 1.8], opacity: [0.6, 0] }} transition={{ duration: 2.2, repeat: Infinity }} />
        </div>
        <p className="display-sm">Finding your person</p>
        <p className="muted small">
          Invitation <span className="mono">{session.code}</span>
        </p>
        <Button variant="ghost" onClick={onLeave}>
          Cancel
        </Button>
      </motion.main>
    );
  }
  return <Stage onLeave={onLeave} />;
}

function Stage({ onLeave }: { onLeave: () => void }) {
  const { session, snap, state, theirName, local } = useGame();
  const intimacy = useIntimacy();
  const [menu, setMenu] = useState(false);
  const [how, setHow] = useState(false);
  useWakeLock(true);

  const phaseKey = state.phase === 'question' ? 'question' : `${state.phase}-${Math.floor(state.q / 12)}`;
  const hasPartner = !!state.players.guest;
  const showDock = !local && hasPartner && snap.partnerOnline && state.phase !== 'gaze' && state.phase !== 'lobby';
  const away = !local && hasPartner && !snap.partnerOnline;

  let screen;
  switch (state.phase) {
    case 'lobby':
      screen = <Lobby />;
      break;
    case 'prelude':
      screen = <Prelude />;
      break;
    case 'setIntro':
      screen = <SetIntro />;
      break;
    case 'question':
      screen = <QuestionScreen />;
      break;
    case 'interlude':
      screen = <Interlude />;
      break;
    case 'gaze':
      screen = <Gaze />;
      break;
    case 'finale':
      screen = <Finale onLeave={onLeave} />;
      break;
  }

  return (
    <motion.div className={`app-frame phase-${state.phase}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }}>
      <header className="topbar">
        <div className="brand">
          <Monogram size={30} />
          <span className="brand-name">36 Beautiful Questions</span>
        </div>
        <div className={`presence ${snap.partnerOnline ? 'is-on' : ''}`}>
          <span className="presence-dot" />
          <span>
            {local
              ? 'one phone'
              : snap.partnerOnline
              ? `with ${theirName}`
              : hasPartner
                ? `${theirName} stepped away`
                : snap.status === 'reconnecting' || snap.status === 'connecting'
                  ? 'connecting'
                  : 'awaiting'}
          </span>
        </div>
        <button className="icon-btn" onClick={() => setMenu(true)} aria-label="Menu">
          <MenuIcon />
        </button>
      </header>

      <AnimatePresence>
        {away && state.phase !== 'lobby' && (
          <motion.div className="away-banner" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.5, ease }}>
            Waiting for {theirName} to reconnect. Everything is saved.
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.div
          key={phaseKey}
          className="stage"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, filter: 'blur(8px)' }}
          transition={{ duration: 0.7, ease }}
        >
          {screen}
        </motion.div>
      </AnimatePresence>

      <FloatLayer floaters={intimacy.floaters} />
      <TouchBloom both={intimacy.both} theirTouch={intimacy.theirTouch} theirName={theirName} />
      <AnimatePresence>
        {showDock && (
          <motion.div className="dock-wrap" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.6, ease }}>
            <Dock {...intimacy} />
          </motion.div>
        )}
      </AnimatePresence>

      <Sheet open={menu} onClose={() => setMenu(false)} title="Menu">
        <MenuBody
          state={state}
          onHow={() => {
            setMenu(false);
            setHow(true);
          }}
          onLeave={onLeave}
          close={() => setMenu(false)}
          session={session}
        />
      </Sheet>
      <Sheet open={how} onClose={() => setHow(false)} title="The thirty-six questions">
        <HowItWorks />
      </Sheet>
    </motion.div>
  );
}

function MenuBody({ state, session, onHow, onLeave, close }: { state: GameState; session: GameSession; onHow: () => void; onLeave: () => void; close: () => void }) {
  const [sound, setSound] = useState(soundEnabled());
  const [music, setMusic] = useState(ambientPlaying());
  const [confirm, setConfirm] = useState<'leave' | 'skip' | 'next' | null>(null);
  const [copied, setCopied] = useState(false);

  const twoStep = (what: 'leave' | 'skip' | 'next', run: () => void) => {
    if (confirm === what) {
      run();
      close();
    } else setConfirm(what);
  };

  return (
    <div className="menu">
      <button
        className="menu-row"
        onClick={() => {
          const on = !sound;
          setSound(on);
          setSoundEnabled(on);
          if (!on) setMusic(false);
        }}
      >
        <span>Sound cues</span>
        <span className={`toggle ${sound ? 'is-on' : ''}`} />
      </button>
      <button
        className="menu-row"
        disabled={!sound}
        onClick={() => {
          if (music) stopAmbient();
          else startAmbient();
          setMusic(!music);
        }}
      >
        <span>Ambient music</span>
        <span className={`toggle ${music ? 'is-on' : ''}`} />
      </button>
      {session.kind === 'remote' && (
      <button
        className="menu-row"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(inviteLink(state.code));
            setCopied(true);
          } catch {
            /* ignore */
          }
        }}
      >
        <span>Invitation</span>
        <span className="mono">{copied ? 'link copied' : state.code}</span>
      </button>
      )}
      <button className="menu-row" onClick={onHow}>
        <span>How it works</span>
        <span className="muted">›</span>
      </button>
      {state.phase === 'question' && (
        <>
          <button className="menu-row" onClick={() => twoStep('skip', () => session.dispatch({ type: 'skipQuestion' }))}>
            <span>{confirm === 'skip' ? 'Tap again to pass this question' : 'Pass this question'}</span>
          </button>
          <button className="menu-row" onClick={() => twoStep('next', () => session.dispatch({ type: 'nextSet' }))}>
            <span>{confirm === 'next' ? 'Tap again to move on' : state.q >= 24 ? 'Go to the closing' : 'Move to the next set'}</span>
          </button>
        </>
      )}
      <button className="menu-row menu-danger" onClick={() => twoStep('leave', onLeave)}>
        <span>{confirm === 'leave' ? 'Tap again to leave' : 'Leave the ritual'}</span>
      </button>
    </div>
  );
}
