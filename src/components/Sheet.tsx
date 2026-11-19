import { AnimatePresence, motion } from 'motion/react';
import { useEffect, type ReactNode } from 'react';
import { STUDY } from '../data/questions';
import { CloseIcon, Flourish, ease } from './ui';
import { useT } from '../i18n';

export function Sheet({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: ReactNode; title: string }) {
  const m = useT();
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
            <button className="sheet-close" onClick={onClose} aria-label={m.common.close}>
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
  const m = useT();
  const h = m.how;
  return (
    <div className="prose">
      <p>{h.intro}</p>
      <h3>{h.playTitle}</h3>
      <ol>
        {h.steps.map((step) => (
          <li key={step.lead}>
            <strong>{step.lead}</strong> {step.text}
          </li>
        ))}
      </ol>
      <h3>{h.togetherTitle}</h3>
      <p>{h.together}</p>
      <h3>{h.gesturesTitle}</h3>
      <p>{h.gestures}</p>
      <p className="prose-cite">
        {STUDY.citation}{' '}
        <a href={STUDY.doi} target="_blank" rel="noreferrer">
          {h.readStudy}
        </a>
        {' \u00b7 '}
        <a href={STUDY.essay} target="_blank" rel="noreferrer">
          {h.readEssay}
        </a>
      </p>
    </div>
  );
}
