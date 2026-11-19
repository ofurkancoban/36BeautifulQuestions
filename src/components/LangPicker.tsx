import { useState } from 'react';
import { LANGS, MESSAGES, setLang, useLang, useT, type Lang } from '../i18n';
import { Sheet } from './Sheet';
import { CheckIcon } from './ui';

function GlobeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.6 2.8 3.9 5.8 3.9 9s-1.3 6.2-3.9 9c-2.6-2.8-3.9-5.8-3.9-9S9.4 5.8 12 3Z" />
    </svg>
  );
}

/** The list of languages, each written in its own language. */
export function LangList({ onPick }: { onPick?: (lang: Lang) => void }) {
  const lang = useLang();
  return (
    <div className="lang-list" role="listbox" aria-label={MESSAGES[lang].common.language}>
      {LANGS.map((code) => (
        <button
          key={code}
          role="option"
          aria-selected={code === lang}
          lang={code}
          className={`lang-row ${code === lang ? 'is-active' : ''}`}
          onClick={() => {
            setLang(code);
            onPick?.(code);
          }}
        >
          <span className="lang-code mono">{code.toUpperCase()}</span>
          <span className="lang-name">{MESSAGES[code].meta.name}</span>
          {code === lang && <CheckIcon />}
        </button>
      ))}
    </div>
  );
}

/** A small pill that opens the language sheet. Works anywhere, including mid-ritual. */
export function LangButton({ className = '' }: { className?: string }) {
  const lang = useLang();
  const m = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className={`lang-btn ${className}`} onClick={() => setOpen(true)} aria-label={`${m.common.language}: ${m.meta.name}`}>
        <GlobeIcon />
        <span className="mono">{lang.toUpperCase()}</span>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={m.common.language}>
        <LangList onPick={() => setOpen(false)} />
      </Sheet>
    </>
  );
}
