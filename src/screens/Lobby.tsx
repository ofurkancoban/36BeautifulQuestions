import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useGame } from '../net/context';
import { inviteLink } from '../net/session';
import { Button, Flourish, Reveal, ease } from '../components/ui';
import ReadyBar from '../components/ReadyBar';
import { setSeating, useSeating, type Seating } from '../lib/seating';
import { sfx } from '../lib/sound';
import type { Role } from '../net/game';
import { useT } from '../i18n';

function initial(name: string) {
  return (Array.from(name.trim())[0] ?? '?').toUpperCase();
}

export function Orbs({ a, b, linked }: { a: string; b: string | null; linked: boolean }) {
  return (
    <div className={`orbs ${linked ? 'is-linked' : ''}`}>
      <div className="orb orb-a">
        <span>{initial(a)}</span>
      </div>
      <svg className="orbs-thread" viewBox="0 0 120 20" preserveAspectRatio="none" aria-hidden>
        <motion.path
          d="M0 10 C30 0 90 20 120 10"
          fill="none"
          stroke="var(--gold)"
          strokeWidth="1"
          initial={{ pathLength: 0, opacity: 0.2 }}
          animate={{ pathLength: linked ? 1 : 0.15, opacity: linked ? 1 : 0.35 }}
          transition={{ duration: 1.6, ease }}
        />
      </svg>
      <div className={`orb orb-b ${b ? '' : 'is-empty'}`}>
        <AnimatePresence mode="wait">
          {b ? (
            <motion.span key="b" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease }}>
              {initial(b)}
            </motion.span>
          ) : (
            <motion.span key="q" className="orb-wait" animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 2.4, repeat: Infinity }}>
              ?
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Invitation({ code }: { code: string }) {
  const link = inviteLink(code);
  const m = useT();
  const L = m.lobby;
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState<'link' | 'code' | null>(null);

  useEffect(() => {
    // The QR library is only downloaded when an invitation is actually shown.
    import('qrcode')
      .then((m) => m.default.toString(link, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#f3dcb4', light: '#00000000' } }))
      .then(setQr)
      .catch(() => setQr(''));
  }, [link]);

  const copy = async (what: 'link' | 'code') => {
    try {
      await navigator.clipboard.writeText(what === 'link' ? link : code);
      setCopied(what);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      /* clipboard blocked; the code is visible anyway */
    }
  };

  const share = async () => {
    try {
      await navigator.share({ title: m.common.appName, text: L.shareText, url: link });
    } catch {
      void copy('link');
    }
  };

  return (
    <div className="invitation">
      <span className="eyebrow">{L.yourInvitation}</span>
      <button className="invite-code" onClick={() => copy('code')} aria-label={L.codeAria(code)}>
        {Array.from(code).map((ch, i) => (
          <motion.span key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.07, duration: 0.6, ease }}>
            {ch}
          </motion.span>
        ))}
      </button>
      <span className="invite-hint">{copied === 'code' ? L.codeCopied : L.shareHint}</span>
      {qr && <div className="qr" dangerouslySetInnerHTML={{ __html: qr }} aria-label={L.qrAria} />}
      <div className="invite-actions">
        <Button variant="ghost" onClick={() => copy('link')}>
          {copied === 'link' ? L.linkCopied : L.copyLink}
        </Button>
        {typeof navigator.share === 'function' && (
          <Button variant="ghost" onClick={share}>
            {L.share}
          </Button>
        )}
      </div>
    </div>
  );
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: Array<{ v: T; label: string }>; onChange: (v: T) => void }) {
  return (
    <div className="segmented" role="radiogroup">
      {options.map((o) => (
        <button key={o.v} role="radio" aria-checked={value === o.v} className={value === o.v ? 'is-on' : ''} onClick={() => onChange(o.v)}>
          {value === o.v && <motion.span layoutId={`seg-${options.map((x) => x.v).join('')}`} className="segmented-pill" transition={{ duration: 0.5, ease }} />}
          <span className="segmented-label">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export default function Lobby() {
  const { session, snap, state, myName, label, m, local } = useGame();
  const L = m.lobby;
  const guest = state.players.guest;
  const partner = state.players[session.role === 'host' ? 'guest' : 'host'];
  const linked = !!guest && snap.partnerOnline;
  const [flipping, setFlipping] = useState(false);
  const seating = useSeating();

  useEffect(() => {
    if (linked) sfx.chord();
  }, [linked]);

  const fate = () => {
    setFlipping(true);
    const pick: Role = crypto.getRandomValues(new Uint8Array(1))[0] % 2 === 0 ? 'host' : 'guest';
    window.setTimeout(() => {
      session.dispatch({ type: 'setFirstAsker', role: pick });
      setFlipping(false);
      sfx.soft();
    }, 1200);
  };

  return (
    <main className="screen lobby">
      <Reveal>
        <Orbs a={myName} b={partner?.name ?? null} linked={linked} />
      </Reveal>

      <AnimatePresence mode="wait">
        {!linked ? (
          <motion.div key="waiting" className="lobby-body" exit={{ opacity: 0, y: -12, transition: { duration: 0.4 } }}>
            {session.role === 'host' ? (
              <>
                <Reveal delay={0.15}>
                  <h2 className="display-sm">
                    {guest ? L.waitingReturn(guest.name) : L.invite}
                  </h2>
                </Reveal>
                <Reveal delay={0.3}>
                  <Invitation code={state.code} />
                </Reveal>
              </>
            ) : (
              <Reveal delay={0.15}>
                <h2 className="display-sm">{m.session.finding}</h2>
                <p className="muted center">{L.findingSub}</p>
              </Reveal>
            )}
          </motion.div>
        ) : (
          <motion.div key="linked" className="lobby-body" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
            <Reveal delay={0.2}>
              <h2 className="names">
                <span>{state.players.host.name}</span>
                <span className="amp">&amp;</span>
                <span>{guest!.name}</span>
              </h2>
            </Reveal>
            <Reveal delay={0.45}>
              <Flourish />
            </Reveal>

            <Reveal delay={0.6} className="settings">
              <div className="setting">
                <span className="setting-label">{L.pacing}</span>
                <Segmented
                  value={state.pacing}
                  onChange={(pacing) => session.dispatch({ type: 'setPacing', pacing })}
                  options={[
                    { v: 'classic', label: L.classic },
                    { v: 'unhurried', label: L.unhurried },
                  ]}
                />
                <span className="setting-note">
                  {state.pacing === 'classic'
                    ? L.classicNote
                    : L.unhurriedNote}
                </span>
              </div>
              <div className="setting">
                <span className="setting-label">{L.firstCard}</span>
                <Segmented<Role>
                  value={state.firstAsker}
                  onChange={(role) => session.dispatch({ type: 'setFirstAsker', role })}
                  options={(session.role === 'host' ? (['host', 'guest'] as const) : (['guest', 'host'] as const)).map((r) => ({
                    v: r,
                    label: !local && r === session.role ? m.common.me : label(r),
                  }))}
                />
                <button className="link" onClick={fate} disabled={flipping}>
                  {flipping ? (
                    <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 0.6, repeat: Infinity }}>
                      {L.fateDeciding}
                    </motion.span>
                  ) : (
                    L.fate
                  )}
                </button>
              </div>
              {session.kind === 'local' && (
                <div className="setting">
                  <span className="setting-label">{L.seating}</span>
                  <Segmented<Seating>
                    value={seating}
                    onChange={setSeating}
                    options={[
                      { v: 'across', label: L.across },
                      { v: 'side', label: L.side },
                    ]}
                  />
                  <span className="setting-note">
                    {seating === 'across'
                      ? L.acrossNote(state.players.host.name, guest?.name ?? m.common.partner)
                      : L.sideNote}
                  </span>
                </div>
              )}
            </Reveal>

            <Reveal delay={0.8}>
              <ReadyBar label={L.ready} localLabel={L.beginLocal} />
            </Reveal>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
