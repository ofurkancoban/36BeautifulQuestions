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
import { inviteLink, loadActive, normalizeCode, Session, type ErrorCode, type GameSession, type SavedSession } from './net/session';
import { useWakeLock } from './lib/wakeLock';
import { useT } from './i18n';
import { LangButton, LangList } from './components/LangPicker';
import { useSeating } from './lib/seating';
import { askerFor } from './net/game';
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
  const [landingError, setLandingError] = useState<ErrorCode | null>(null);
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
    (msg: ErrorCode) => {
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

function SessionView({ onLeave, onFail }: { onLeave: () => void; onFail: (msg: ErrorCode) => void }) {
  const session = useSession();
  const snap = useSnapshot();
  const m = useT();

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
        <p className="display-sm">{m.session.finding}</p>
        <p className="muted small">
          {m.session.invitation} <span className="mono">{session.code}</span>
        </p>
        <Button variant="ghost" onClick={onLeave}>
          {m.session.cancel}
        </Button>
      </motion.main>
    );
  }
  return <Stage onLeave={onLeave} />;
}

function Stage({ onLeave }: { onLeave: () => void }) {
  const { session, snap, state, theirName, local, m } = useGame();
  const intimacy = useIntimacy();
  const [menu, setMenu] = useState(false);
  const [how, setHow] = useState(false);
  useWakeLock(true);
  const seating = useSeating();
  // One phone across a table: the first person sits at the phone's bottom edge. While a card is in play
  // (or about to be drawn), the whole screen turns to face whoever holds it.
  const canTurn = local && seating === 'across';
  const turned = canTurn && ['setIntro', 'question', 'interlude'].includes(state.phase) && askerFor(state) === 'guest';

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
    <motion.div className={`app-frame phase-${state.phase} ${canTurn ? 'can-turn' : ''} ${turned ? 'is-turned' : ''}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }}>
      <header className="topbar">
        <div className="brand">
          <Monogram size={30} />
          <span className="brand-name">{m.common.appName}</span>
        </div>
        <div className={`presence ${snap.partnerOnline ? 'is-on' : ''}`}>
          <span className="presence-dot" />
          <span>
            {local
              ? m.session.onePhone
              : snap.partnerOnline
              ? m.session.withName(theirName)
              : hasPartner
                ? m.session.away(theirName)
                : snap.status === 'reconnecting' || snap.status === 'connecting'
                  ? m.session.connecting
                  : m.session.awaiting}
          </span>
        </div>
        <div className="topbar-actions">
          <LangButton />
          <button className="icon-btn" onClick={() => setMenu(true)} aria-label={m.menu.title}>
            <MenuIcon />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {away && state.phase !== 'lobby' && (
          <motion.div className="away-banner" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.5, ease }}>
            {m.session.awayBanner(theirName)}
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

      <Sheet open={menu} onClose={() => setMenu(false)} title={m.menu.title}>
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
      <Sheet open={how} onClose={() => setHow(false)} title={m.how.title}>
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
  const [langOpen, setLangOpen] = useState(false);
  const m = useT();

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
        <span>{m.menu.sound}</span>
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
        <span>{m.menu.music}</span>
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
        <span>{m.menu.invitation}</span>
        <span className="mono">{copied ? m.menu.linkCopied : state.code}</span>
      </button>
      )}
      <button className="menu-row" onClick={() => setLangOpen((v) => !v)} aria-expanded={langOpen}>
        <span>{m.common.language}</span>
        <span className="muted">{m.meta.name}</span>
      </button>
      {langOpen && <LangList onPick={() => setLangOpen(false)} />}
      <button className="menu-row" onClick={onHow}>
        <span>{m.menu.how}</span>
        <span className="muted">›</span>
      </button>
      {state.phase === 'question' && (
        <>
          <button className="menu-row" onClick={() => twoStep('skip', () => session.dispatch({ type: 'skipQuestion' }))}>
            <span>{confirm === 'skip' ? m.menu.passConfirm : m.menu.pass}</span>
          </button>
          <button className="menu-row" onClick={() => twoStep('next', () => session.dispatch({ type: 'nextSet' }))}>
            <span>{confirm === 'next' ? m.menu.moveConfirm : state.q >= 24 ? m.menu.closing : m.menu.nextSet}</span>
          </button>
        </>
      )}
      <button className="menu-row menu-danger" onClick={() => twoStep('leave', onLeave)}>
        <span>{confirm === 'leave' ? m.menu.leaveConfirm : m.menu.leave}</span>
      </button>
    </div>
  );
}
