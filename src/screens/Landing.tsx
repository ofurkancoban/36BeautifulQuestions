import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Button, Flourish, LetterRise, Monogram, Reveal, ease } from '../components/ui';
import { HowItWorks, Sheet } from '../components/Sheet';
import { clientId, loadSaved, makeCode, normalizeCode, type SavedSession } from '../net/session';
import { cleanName } from '../net/validate';
import { useT } from '../i18n';
import { LangButton } from '../components/LangPicker';
import type { ErrorCode } from '../net/session';

interface Props {
  onStart: (s: SavedSession) => void;
  inviteCode: string | null;
  error: ErrorCode | null;
}

type View = 'home' | 'create' | 'join' | 'local';

function rememberedName() {
  try {
    return localStorage.getItem('b36q:name') ?? '';
  } catch {
    return '';
  }
}

function saveName(name: string) {
  try {
    localStorage.setItem('b36q:name', name);
  } catch {
    /* ignore */
  }
}

export default function Landing({ onStart, inviteCode, error }: Props) {
  const m = useT();
  const L = m.landing;
  const [view, setView] = useState<View>(inviteCode ? 'join' : 'home');
  const [name, setName] = useState(rememberedName);
  const [code, setCode] = useState(inviteCode ?? '');
  const [how, setHow] = useState(false);
  const [partner, setPartner] = useState('');
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  const saved = loadSaved();
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (view === 'home') return;
    const id = window.setTimeout(() => {
      // Focus the first empty field once the form has animated in.
      if (nameRef.current && !nameRef.current.value) nameRef.current.focus();
    }, 700);
    return () => clearTimeout(id);
  }, [view]);

  const trimmed = cleanName(name);
  const partnerTrimmed = cleanName(partner);
  const playLocal = () => {
    if (!trimmed || !partnerTrimmed) return;
    saveName(trimmed);
    onStart({ code: makeCode(), role: 'host', name: trimmed, partnerName: partnerTrimmed, clientId: clientId(), local: true });
  };
  const create = () => {
    if (!trimmed) return;
    saveName(trimmed);
    onStart({ code: makeCode(), role: 'host', name: trimmed, clientId: clientId() });
  };
  const join = () => {
    if (!trimmed || code.length !== 6) return;
    saveName(trimmed);
    onStart({ code, role: 'guest', name: trimmed, clientId: clientId() });
  };

  return (
    <main className={`screen landing ${view === 'home' ? '' : 'is-form'}`}>
      <LangButton className="landing-lang" />
      <div className="landing-hero">
        <Reveal delay={0.1}>
          <Monogram size={56} />
        </Reveal>
        <h1 className="title">
          <span className="title-num">
            <LetterRise text="36" delay={0.25} />
          </span>
          <span className="title-words">
            <LetterRise text="Beautiful Questions" delay={0.5} />
          </span>
        </h1>
        <Reveal delay={1.4}>
          <p className="lede">{L.lede}</p>
        </Reveal>
        <Reveal delay={1.6}>
          <Flourish />
        </Reveal>
      </div>

      <div className="landing-panel">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div key="home" className="panel-stack" exit={{ opacity: 0, y: -10, transition: { duration: 0.3 } }}>
              {error && (
                <Reveal delay={0}>
                  <p className="error-note">{m.errors[error]}</p>
                </Reveal>
              )}
              {!online && (
                <Reveal delay={0}>
                  <p className="error-note">{L.offline}</p>
                </Reveal>
              )}
              {saved && (
                <Reveal delay={1.75}>
                  <Button variant="ghost" className="resume" onClick={() => onStart(saved)}>
                    {saved.local ? (
                      <>{L.resumeLocal(saved.name, saved.partnerName ?? '')}</>
                    ) : (
                      <>
                        {L.resume} <span className="mono">{saved.code}</span>
                      </>
                    )}
                  </Button>
                </Reveal>
              )}
              <Reveal delay={1.8}>
                <Button onClick={() => setView('create')}>{L.begin}</Button>
              </Reveal>
              <Reveal delay={1.9}>
                <Button variant="ghost" onClick={() => setView('join')}>
                  {L.haveInvite}
                </Button>
              </Reveal>
              <Reveal delay={2}>
                <button className="link link-strong" onClick={() => setView('local')}>
                  {L.onePhone}
                </button>
              </Reveal>
              <Reveal delay={2.05}>
                <button className="link" onClick={() => setHow(true)}>
                  {L.how}
                </button>
              </Reveal>
            </motion.div>
          )}

          {view === 'create' && (
            <motion.form
              key="create"
              className="panel-stack"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.6, ease }}
              onSubmit={(e) => {
                e.preventDefault();
                create();
              }}
            >
              <label className="field">
                <span className="field-label">{L.nameQuestion}</span>
                <input
                  ref={nameRef}
                  className="field-input"
                  value={name}
                  maxLength={24}
                  autoComplete="given-name"
                  placeholder={L.namePlaceholder}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <Button type="submit" disabled={!trimmed}>
                {L.createInvite}
              </Button>
              <button type="button" className="link" onClick={() => setView('home')}>
                {m.common.back}
              </button>
            </motion.form>
          )}

          {view === 'local' && (
            <motion.form
              key="local"
              className="panel-stack"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.6, ease }}
              onSubmit={(e) => {
                e.preventDefault();
                playLocal();
              }}
            >
              <p className="muted small center narrow">{L.localIntro}</p>
              <label className="field">
                <span className="field-label">{L.localYourName}</span>
                <input
                  ref={nameRef}
                  className="field-input"
                  value={name}
                  maxLength={24}
                  autoComplete="given-name"
                  placeholder={L.localFirst}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label className="field">
                <span className="field-label">{L.localTheirName}</span>
                <input
                  className="field-input"
                  value={partner}
                  maxLength={24}
                  autoComplete="off"
                  placeholder={L.localSecond}
                  onChange={(e) => setPartner(e.target.value)}
                />
              </label>
              <Button type="submit" disabled={!trimmed || !partnerTrimmed}>
                {L.localBegin}
              </Button>
              <button type="button" className="link" onClick={() => setView('home')}>
                {m.common.back}
              </button>
            </motion.form>
          )}

          {view === 'join' && (
            <motion.form
              key="join"
              className="panel-stack"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.6, ease }}
              onSubmit={(e) => {
                e.preventDefault();
                join();
              }}
            >
              {inviteCode && <p className="invited">{L.invited}</p>}
              <label className="field">
                <span className="field-label">{L.nameQuestion}</span>
                <input
                  ref={nameRef}
                  className="field-input"
                  value={name}
                  maxLength={24}
                  autoComplete="given-name"
                  placeholder={L.namePlaceholder}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label className="field">
                <span className="field-label">{L.inviteCode}</span>
                <CodeInput value={code} onChange={setCode} label={L.codeAria} />
              </label>
              {error && <p className="error-note">{m.errors[error]}</p>}
              <Button type="submit" disabled={!trimmed || code.length !== 6}>
                {L.join}
              </Button>
              <button type="button" className="link" onClick={() => setView('home')}>
                {m.common.back}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      <footer className="landing-foot">
        <Reveal delay={2.2}>
          <span>{L.footer}</span>
        </Reveal>
      </footer>

      <Sheet open={how} onClose={() => setHow(false)} title={m.how.title}>
        <HowItWorks />
      </Sheet>
    </main>
  );
}

function CodeInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  return (
    <div className={`code-input ${focused ? 'is-focused' : ''}`} onClick={() => ref.current?.focus()}>
      <input
        ref={ref}
        className="code-input-real"
        value={value}
        inputMode="text"
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        aria-label={label}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => onChange(normalizeCode(e.target.value))}
      />
      {Array.from({ length: 6 }, (_, i) => (
        <span key={i} className={`code-cell ${i === value.length && focused ? 'is-active' : ''} ${value[i] ? 'is-filled' : ''}`}>
          {value[i] ?? ''}
        </span>
      ))}
    </div>
  );
}
