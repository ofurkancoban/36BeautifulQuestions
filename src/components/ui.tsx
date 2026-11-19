import { motion, type HTMLMotionProps } from 'motion/react';
import type { ReactNode } from 'react';

export const ease = [0.22, 1, 0.36, 1] as const;

export function Button({
  variant = 'primary',
  children,
  className = '',
  ...rest
}: { variant?: 'primary' | 'ghost' | 'quiet'; children: ReactNode } & HTMLMotionProps<'button'>) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={`btn btn-${variant} ${className}`}
      {...rest}
    >
      <span className="btn-label">{children}</span>
    </motion.button>
  );
}

/** Delicate gold flourish used as a divider. */
export function Flourish({ className = '' }: { className?: string }) {
  return (
    <svg className={`flourish ${className}`} viewBox="0 0 240 24" aria-hidden>
      <defs>
        <linearGradient id="fl-g" x1="0" x2="1">
          <stop offset="0" stopColor="var(--gold)" stopOpacity="0" />
          <stop offset=".5" stopColor="var(--gold)" />
          <stop offset="1" stopColor="var(--gold)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M8 12 H100" stroke="url(#fl-g)" strokeWidth="1" />
      <path d="M140 12 H232" stroke="url(#fl-g)" strokeWidth="1" />
      <path
        d="M120 5 C116 9 112 10 106 12 C112 14 116 15 120 19 C124 15 128 14 134 12 C128 10 124 9 120 5 Z"
        fill="none"
        stroke="var(--gold)"
        strokeWidth="1"
      />
      <circle cx="120" cy="12" r="1.6" fill="var(--gold)" />
      <circle cx="98" cy="12" r="1.2" fill="var(--gold)" opacity=".7" />
      <circle cx="142" cy="12" r="1.2" fill="var(--gold)" opacity=".7" />
    </svg>
  );
}

export function HeartIcon({ size = 18, filled = false }: { size?: number; filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 20.5c-5.2-3.7-8.7-6.8-8.7-10.6 0-2.5 1.9-4.4 4.3-4.4 1.8 0 3.4 1.1 4.4 2.7 1-1.6 2.6-2.7 4.4-2.7 2.4 0 4.3 1.9 4.3 4.4 0 3.8-3.5 6.9-8.7 10.6z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SparkIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 2.5c.6 4.6 2.4 6.9 7 7.5-4.6.6-6.4 2.9-7 7.5-.6-4.6-2.4-6.9-7-7.5 4.6-.6 6.4-2.9 7-7.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M19 16.5c.25 1.6.9 2.3 2.5 2.5-1.6.25-2.25.9-2.5 2.5-.25-1.6-.9-2.25-2.5-2.5 1.6-.2 2.25-.9 2.5-2.5z" fill="currentColor" />
    </svg>
  );
}

export function LaughIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M7.5 10c.6-.9 1.6-.9 2.2 0M14.3 10c.6-.9 1.6-.9 2.2 0" />
      <path d="M7.8 13.5c1 2.4 2.6 3.5 4.2 3.5s3.2-1.1 4.2-3.5z" />
    </svg>
  );
}

export function TearIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <path d="M12 3c3.5 4.6 6 8 6 11a6 6 0 0 1-12 0c0-3 2.5-6.4 6-11z" />
      <path d="M9.5 14.5a2.6 2.6 0 0 0 2.5 2.5" strokeLinecap="round" />
    </svg>
  );
}

export function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <path d="M5 9h14M8 15h11" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

/** Fades and lifts children in, staggered by `delay`. */
export function Reveal({ children, delay = 0, className = '', y = 14 }: { children: ReactNode; delay?: number; className?: string; y?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -y / 2, filter: 'blur(6px)', transition: { duration: 0.35, delay: 0 } }}
      transition={{ duration: 0.9, delay, ease }}
    >
      {children}
    </motion.div>
  );
}

/** Splits text into letters that rise in one after another. */
export function LetterRise({ text, delay = 0, className = '' }: { text: string; delay?: number; className?: string }) {
  return (
    <span className={className} aria-label={text}>
      {Array.from(text).map((ch, i) => (
        <motion.span
          key={i}
          aria-hidden
          style={{ display: 'inline-block', whiteSpace: 'pre' }}
          initial={{ opacity: 0, y: '0.45em', filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 1.1, delay: delay + i * 0.045, ease }}
        >
          {ch}
        </motion.span>
      ))}
    </span>
  );
}

export function Monogram({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className="monogram">
      <circle cx="32" cy="32" r="30" fill="none" stroke="var(--gold)" strokeOpacity=".55" strokeWidth=".8" />
      <circle cx="32" cy="32" r="26.5" fill="none" stroke="var(--gold)" strokeOpacity=".3" strokeWidth=".6" strokeDasharray="1 3" />
      <text x="32" y="39.5" textAnchor="middle" fontFamily="Cormorant Garamond, serif" fontStyle="italic" fontSize="22" fill="var(--gold-soft)">
        36
      </text>
    </svg>
  );
}
