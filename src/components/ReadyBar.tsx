import { motion } from 'motion/react';
import { useGame } from '../net/context';
import { Button, CheckIcon } from './ui';

/** "Both must agree" control used between phases. */
export default function ReadyBar({ label, waitingLabel }: { label: string; waitingLabel?: string }) {
  const { session, state, me, them, theirName } = useGame();
  const mine = state.ready[me];
  const theirs = state.ready[them];
  return (
    <div className="ready-bar">
      <Button variant={mine ? 'ghost' : 'primary'} onClick={() => session.dispatch({ type: 'ready', value: !mine })}>
        {mine ? (waitingLabel ?? `Waiting for ${theirName}`) : label}
      </Button>
      <div className="ready-pips">
        <Pip on={mine} label="You" />
        <span className="ready-thread" />
        <Pip on={theirs} label={theirName} />
      </div>
      {mine && <span className="ready-hint">Tap again if you need another moment.</span>}
    </div>
  );
}

function Pip({ on, label }: { on: boolean; label: string }) {
  return (
    <span className={`pip ${on ? 'is-on' : ''}`}>
      <motion.span className="pip-dot" animate={on ? { scale: [1, 1.25, 1] } : { scale: 1 }} transition={{ duration: 0.6 }}>
        {on && <CheckIcon size={10} />}
      </motion.span>
      <span className="pip-label">{label}</span>
    </span>
  );
}
