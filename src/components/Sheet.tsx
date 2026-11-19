import { AnimatePresence, motion } from 'motion/react';
import { useEffect, type ReactNode } from 'react';
import { STUDY } from '../data/questions';
import { CloseIcon, Flourish, ease } from './ui';

export function Sheet({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: ReactNode; title: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.5, ease }}
          >
            <button className="sheet-close" onClick={onClose} aria-label="Close">
              <CloseIcon />
            </button>
            <h2 className="sheet-title">{title}</h2>
            <Flourish className="sheet-flourish" />
            <div className="sheet-body">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function HowItWorks() {
  return (
    <div className="prose">
      <p>
        In 1997 the psychologist <em>Arthur Aron</em> and his colleagues asked pairs of strangers to spend forty-five minutes
        trading answers to thirty-six questions. The questions grow steadily more personal across three sets, and the
        pairs reported feeling remarkably close by the end. The idea is simple: closeness grows through{' '}
        <em>sustained, escalating, reciprocal</em> self-disclosure.
      </p>
      <h3>How to play</h3>
      <ol>
        <li>
          <strong>Take turns holding the card.</strong> Whoever holds it turns it over, reads the question aloud and answers
          first. Then the other answers. Next question, the card passes.
        </li>
        <li>
          <strong>Both of you answer every question.</strong> That reciprocity is the heart of the method.
        </li>
        <li>
          <strong>Three sets, about fifteen minutes each.</strong> In <em>Classic</em> pacing a gentle clock follows the study:
          when fifteen minutes pass, you are invited to move on even if questions remain. <em>Unhurried</em> pacing has no
          clock at all.
        </li>
        <li>
          <strong>Close with silence.</strong> Optionally, end with four minutes of looking into each other&rsquo;s eyes, a
          ritual made famous by Mandy Len Catron&rsquo;s 2015 <em>Modern Love</em> essay.
        </li>
      </ol>
      <h3>Together or apart</h3>
      <p>
        Sit across from each other with a phone each, or play over a video call from different cities. Your screens stay in
        sync directly, device to device. Nothing you say is recorded, and the app never hears your answers.
      </p>
      <h3>Little gestures</h3>
      <p>
        Send a heart, a spark, a laugh or a tear at any moment. Press and hold the heart in the middle: when you both hold
        it at the same time, your screens glow and beat together.
      </p>
      <p className="prose-cite">
        {STUDY.citation}{' '}
        <a href={STUDY.doi} target="_blank" rel="noreferrer">
          Read the study
        </a>
        {' · '}
        <a href={STUDY.essay} target="_blank" rel="noreferrer">
          Read the essay
        </a>
      </p>
    </div>
  );
}
