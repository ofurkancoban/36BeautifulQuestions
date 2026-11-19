import { motion } from 'motion/react';
import { roman, setOf, type Question } from '../data/questions';
import { ease } from './ui';

interface Props {
  question: Question;
  revealed: boolean;
  canReveal: boolean;
  onReveal: () => void;
  waitingLabel: string;
}

function sizeClass(text: string) {
  if (text.length > 190) return 'q-xs';
  if (text.length > 130) return 'q-sm';
  if (text.length > 70) return 'q-md';
  return 'q-lg';
}

function CardBack({ q }: { q: Question }) {
  const set = setOf(q.n - 1);
  return (
    <div className="card-face card-back">
      <svg className="card-back-art" viewBox="0 0 300 420" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id="cb-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f7e2b8" />
            <stop offset=".5" stopColor="#d4a56a" />
            <stop offset="1" stopColor="#f2d39c" />
          </linearGradient>
          <pattern id="cb-dots" width="14" height="14" patternUnits="userSpaceOnUse">
            <circle cx="7" cy="7" r=".7" fill="#e9c58f" opacity=".28" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="300" height="420" fill="url(#cb-dots)" />
        <rect x="12" y="12" width="276" height="396" rx="10" fill="none" stroke="url(#cb-gold)" strokeWidth="1" />
        <rect x="19" y="19" width="262" height="382" rx="7" fill="none" stroke="url(#cb-gold)" strokeWidth=".5" opacity=".7" />
        {/* corner flourishes */}
        {[
          [19, 19, 1, 1],
          [281, 19, -1, 1],
          [19, 401, 1, -1],
          [281, 401, -1, -1],
        ].map(([x, y, sx, sy], i) => (
          <path
            key={i}
            transform={`translate(${x} ${y}) scale(${sx} ${sy})`}
            d="M0 26 C6 18 12 12 26 0 M0 14 C4 10 8 6 14 0 M8 8 m-2.2 0 a2.2 2.2 0 1 0 4.4 0 a2.2 2.2 0 1 0 -4.4 0"
            fill="none"
            stroke="url(#cb-gold)"
            strokeWidth=".9"
          />
        ))}
        {/* central medallion: rays, rings and a heart */}
        <g transform="translate(150 210)">
          {Array.from({ length: 36 }, (_, i) => (
            <line
              key={i}
              x1="0"
              y1={-58}
              x2="0"
              y2={i % 3 === 0 ? -86 : -72}
              stroke="#e2b77f"
              strokeWidth={i % 3 === 0 ? 0.9 : 0.5}
              opacity={i % 3 === 0 ? 0.9 : 0.55}
              transform={`rotate(${i * 10})`}
            />
          ))}
          <circle r="52" fill="none" stroke="url(#cb-gold)" strokeWidth="1" />
          <circle r="46" fill="none" stroke="url(#cb-gold)" strokeWidth=".5" strokeDasharray="2 3" />
          <circle r="96" fill="none" stroke="url(#cb-gold)" strokeWidth=".5" opacity=".5" />
          <path
            d="M0 22c-14-9.6-22-17.4-22-27 0-6.4 4.8-11.4 11-11.4 4.6 0 8.6 2.8 11 6.8 2.4-4 6.4-6.8 11-6.8 6.2 0 11 5 11 11.4 0 9.6-8 17.4-22 27z"
            fill="none"
            stroke="url(#cb-gold)"
            strokeWidth="1.2"
          />
        </g>
        <text x="150" y="70" textAnchor="middle" fill="#ecd1a2" fontFamily="Manrope, sans-serif" fontSize="9" letterSpacing="4">
          SET {set.numeral}
        </text>
        <text x="150" y="364" textAnchor="middle" fill="#ecd1a2" fontFamily="Cormorant Garamond, serif" fontStyle="italic" fontSize="20">
          {set.name}
        </text>
      </svg>
      <div className="card-sheen" />
    </div>
  );
}

function CardFront({ q }: { q: Question }) {
  const set = setOf(q.n - 1);
  return (
    <div className="card-face card-front">
      <div className="card-paper" />
      <div className="card-frame" />
      <div className="card-front-inner">
        <div className="card-meta">
          <span>No. {roman(q.n)}</span>
          <span className="card-meta-dot">◆</span>
          <span>Set {set.numeral}</span>
        </div>
        <p className={`card-question ${sizeClass(q.text)}`}>{q.text}</p>
        <div className="card-foot">
          <svg viewBox="0 0 120 12" width="96" aria-hidden>
            <path d="M0 6 H48 M72 6 H120" stroke="currentColor" strokeWidth=".7" />
            <path d="M60 1 L65 6 L60 11 L55 6 Z" fill="none" stroke="currentColor" strokeWidth=".8" />
          </svg>
          <span className="card-number">{q.n}</span>
        </div>
      </div>
    </div>
  );
}

export default function QuestionCard({ question, revealed, canReveal, onReveal, waitingLabel }: Props) {
  return (
    <motion.div
      className="card-stage"
      initial={{ opacity: 0, y: 70, rotate: -4, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
      exit={{ opacity: 0, y: -90, x: 40, rotate: 7, scale: 0.9, filter: 'blur(4px)' }}
      transition={{ duration: 0.9, ease }}
    >
      <motion.button
        type="button"
        className={`card ${canReveal && !revealed ? 'card-tappable' : ''}`}
        onClick={() => canReveal && !revealed && onReveal()}
        disabled={!canReveal || revealed}
        aria-label={revealed ? question.text : canReveal ? 'Reveal the card' : waitingLabel}
        animate={{ rotateY: revealed ? 180 : 0 }}
        transition={{ duration: 1.1, ease: [0.65, 0, 0.25, 1] }}
        whileHover={canReveal && !revealed ? { y: -6, rotateZ: -0.6 } : undefined}
      >
        <CardBack q={question} />
        <CardFront q={question} />
      </motion.button>
    </motion.div>
  );
}
