import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useGame } from '../net/context';
import { useT } from '../i18n';
import type { ReactionKind } from '../net/session';
import { setAmbience } from '../lib/ambience';
import { sfx, vibrate } from '../lib/sound';
import { HeartIcon, LaughIcon, SparkIcon, TearIcon, ease } from './ui';

/**
 * Small gestures that cross the distance between two screens:
 * floating reactions and a shared "hold" that blooms when both press at once.
 */

const ICONS: Record<ReactionKind, (p: { size?: number }) => ReactNode> = {
  heart: (p) => <HeartIcon {...p} filled />,
  spark: SparkIcon,
  laugh: LaughIcon,
  tear: TearIcon,
};


interface Floater {
  id: string;
  kind: ReactionKind;
  mine: boolean;
  x: number;
  drift: number;
  scale: number;
}

export function useIntimacy() {
  const { session } = useGame();
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [theirTouch, setTheirTouch] = useState(false);
  const [myTouch, setMyTouch] = useState(false);

  const spawn = (kind: ReactionKind, mine: boolean) => {
    const burst = mine ? 1 : 3;
    const items: Floater[] = Array.from({ length: burst }, (_, i) => ({
      id: `${Date.now()}-${Math.random()}-${i}`,
      kind,
      mine,
      x: mine ? 0 : (Math.random() - 0.5) * 60,
      drift: (Math.random() - 0.5) * 120,
      scale: 0.8 + Math.random() * 0.7,
    }));
    setFloaters((f) => [...f, ...items]);
    window.setTimeout(() => setFloaters((f) => f.filter((x) => !items.includes(x))), 3600);
  };

  useEffect(
    () =>
      session.onEvent((ev) => {
        if (ev.type === 'react') {
          spawn(ev.kind, false);
          sfx.soft();
          vibrate(20);
        } else if (ev.type === 'touch') setTheirTouch(ev.on);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session],
  );

  const send = (kind: ReactionKind) => {
    spawn(kind, true);
    session.emit({ type: 'react', kind, id: crypto.randomUUID() });
  };

  const setTouch = (on: boolean) => {
    setMyTouch(on);
    session.emit({ type: 'touch', on });
  };

  const both = myTouch && theirTouch;
  useEffect(() => {
    setAmbience({ pulse: both ? 1 : theirTouch || myTouch ? 0.35 : 0 });
    if (!both) return;
    sfx.heartbeat();
    vibrate([30, 120, 30]);
    const id = window.setInterval(() => {
      sfx.heartbeat();
      vibrate([30, 120, 30]);
    }, 1100);
    return () => clearInterval(id);
  }, [both, theirTouch, myTouch]);

  useEffect(() => () => setAmbience({ pulse: 0 }), []);

  return { floaters, send, myTouch, theirTouch, both, setTouch };
}

export function FloatLayer({ floaters }: { floaters: Floater[] }) {
  return (
    <div className="float-layer" aria-hidden>
      <AnimatePresence>
        {floaters.map((f) => {
          const Icon = ICONS[f.kind];
          return (
            <motion.div
              key={f.id}
              className={`floater ${f.mine ? 'floater-mine' : 'floater-theirs'}`}
              style={{ left: `calc(50% + ${f.x}px)` }}
              initial={{ y: 0, opacity: 0, scale: 0.3 }}
              animate={{
                y: f.mine ? -260 : -window.innerHeight * 0.62,
                x: [0, f.drift * 0.5, f.drift],
                opacity: [0, 1, 1, 0],
                scale: f.scale * (f.mine ? 1 : 1.6),
                rotate: f.drift / 6,
              }}
              transition={{ duration: f.mine ? 2.2 : 3.2, ease: 'easeOut', delay: f.mine ? 0 : Math.random() * 0.3 }}
            >
              <Icon size={28} />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export function TouchBloom({ both, theirTouch, theirName }: { both: boolean; theirTouch: boolean; theirName: string }) {
  const m = useT();
  return (
    <AnimatePresence>
      {(both || theirTouch) && (
        <motion.div
          className={`touch-bloom ${both ? 'touch-both' : ''}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease }}
          aria-live="polite"
        >
          <div className="touch-bloom-glow" />
          <motion.div
            className="touch-bloom-text"
            key={both ? 'both' : 'one'}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {both ? m.intimacy.together : m.intimacy.reaching(theirName)}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Dock({
  send,
  myTouch,
  theirTouch,
  both,
  setTouch,
}: Pick<ReturnType<typeof useIntimacy>, 'send' | 'myTouch' | 'theirTouch' | 'both' | 'setTouch'>) {
  const m = useT();
  const holding = useRef(false);
  const start = () => {
    if (holding.current) return;
    holding.current = true;
    setTouch(true);
    vibrate(15);
  };
  const end = () => {
    if (!holding.current) return;
    holding.current = false;
    setTouch(false);
  };

  const kinds: ReactionKind[] = ['heart', 'spark'];
  const kinds2: ReactionKind[] = ['laugh', 'tear'];
  const btn = (k: ReactionKind) => {
    const Icon = ICONS[k];
    return (
      <motion.button key={k} className="dock-btn" whileTap={{ scale: 0.8 }} onClick={() => send(k)} aria-label={m.intimacy[k]} title={m.intimacy[k]}>
        <Icon size={19} />
      </motion.button>
    );
  };

  return (
    <div className="dock">
      {kinds.map(btn)}
      <button
        className={`touch-orb ${myTouch ? 'is-mine' : ''} ${theirTouch ? 'is-theirs' : ''} ${both ? 'is-both' : ''}`}
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          start();
        }}
        onPointerUp={end}
        onPointerCancel={end}
        onPointerLeave={end}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && start()}
        onKeyUp={end}
        aria-label={m.intimacy.holdAria}
        title={m.intimacy.holdAria}
      >
        <span className="touch-orb-ring" />
        <span className="touch-orb-ring touch-orb-ring-2" />
        <HeartIcon size={22} filled={myTouch || both} />
        <span className="touch-orb-label">{m.intimacy.hold}</span>
      </button>
      {kinds2.map(btn)}
    </div>
  );
}
