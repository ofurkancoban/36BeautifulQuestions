import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { useGame } from '../net/context';
import type { Role } from '../net/game';
import { Button, Flourish, LetterRise, Monogram, Reveal, ease } from '../components/ui';
import { Sheet } from '../components/Sheet';
import { QUESTIONS, TOTAL, roman, setOf } from '../data/questions';
import { downloadText, notesAsText, useNotes } from '../lib/notes';

function minutesBetween(a: number | null, b: number | null) {
  if (!a || !b) return null;
  return Math.max(1, Math.round((b - a) / 60000));
}

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty'];

function plural(n: number, word: string) {
  return n === 1 ? word : `${word}s`;
}

function words(n: number) {
  if (n < 20) return ONES[n];
  const t = TENS[Math.floor(n / 10)];
  return n % 10 ? `${t}-${ONES[n % 10]}` : t;
}

const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

interface Favorite {
  name: string;
  q: number;
}

function wrap(g: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const test = line ? `${line} ${word}` : word;
    if (g.measureText(test).width > maxWidth && line) {
      out.push(line);
      line = word;
    } else line = test;
  }
  if (line) out.push(line);
  if (out.length > maxLines) {
    const kept = out.slice(0, maxLines);
    kept[maxLines - 1] = `${kept[maxLines - 1].replace(/[,.;:]?\s*\S*$/, '')}…`;
    return kept;
  }
  return out;
}

/** Wraps like `wrap`, then narrows the width while the line count holds, so lines come out balanced. */
function balancedWrap(g: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  let best = wrap(g, text, maxWidth, maxLines);
  for (let w = maxWidth - 20; w >= maxWidth * 0.5; w -= 20) {
    const next = wrap(g, text, w, maxLines);
    if (next.length !== best.length || next.some((l) => l.endsWith('\u2026'))) break;
    best = next;
  }
  return best;
}

/** Renders a 1080x1350 keepsake card to PNG and downloads it. */
async function makeKeepsake(a: string, b: string, date: string, answered: number, minutes: number | null, favorites: Favorite[]) {
  await document.fonts.ready;
  const W = 1080;
  const H = 1350;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;

  const bg = g.createRadialGradient(W / 2, H * 0.85, 50, W / 2, H * 0.55, H * 0.9);
  bg.addColorStop(0, '#7a2a3a');
  bg.addColorStop(0.45, '#33101f');
  bg.addColorStop(1, '#0c0510');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);

  // Embers.
  for (let i = 0; i < 140; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const r = Math.random() * Math.random() * 6 + 0.5;
    const rg = g.createRadialGradient(x, y, 0, x, y, r * 4);
    rg.addColorStop(0, `rgba(246,214,160,${0.15 + Math.random() * 0.5})`);
    rg.addColorStop(1, 'rgba(246,214,160,0)');
    g.fillStyle = rg;
    g.beginPath();
    g.arc(x, y, r * 4, 0, Math.PI * 2);
    g.fill();
  }

  const gold = g.createLinearGradient(0, 0, W, H);
  gold.addColorStop(0, '#f7e2b8');
  gold.addColorStop(0.5, '#cf9e62');
  gold.addColorStop(1, '#f2d39c');
  g.strokeStyle = gold;
  g.lineWidth = 2;
  g.strokeRect(48, 48, W - 96, H - 96);
  g.lineWidth = 1;
  g.strokeRect(62, 62, W - 124, H - 124);

  const compact = favorites.length > 0;
  const shift = compact ? -150 : 0;

  g.textAlign = 'center';
  g.fillStyle = '#ecd1a2';
  g.font = '500 22px Manrope, sans-serif';
  g.letterSpacing = '8px';
  g.fillText('36 BEAUTIFUL QUESTIONS', W / 2, 160);
  g.letterSpacing = '0px';

  // Heart medallion.
  g.save();
  g.translate(W / 2, 330 + shift / 2);
  const scale = compact ? 0.75 : 1;
  g.scale(scale, scale);
  g.strokeStyle = gold;
  g.lineWidth = 2;
  g.beginPath();
  g.arc(0, 0, 92, 0, Math.PI * 2);
  g.stroke();
  for (let i = 0; i < 36; i++) {
    g.save();
    g.rotate((i * Math.PI) / 18);
    g.beginPath();
    g.moveTo(0, -104);
    g.lineTo(0, i % 3 === 0 ? -140 : -122);
    g.lineWidth = i % 3 === 0 ? 1.6 : 0.8;
    g.stroke();
    g.restore();
  }
  g.scale(2.2, 2.2);
  g.beginPath();
  g.moveTo(0, 22);
  g.bezierCurveTo(-14, 12.4, -22, 4.6, -22, -5);
  g.bezierCurveTo(-22, -11.4, -17.2, -16.4, -11, -16.4);
  g.bezierCurveTo(-6.4, -16.4, -2.4, -13.6, 0, -9.6);
  g.bezierCurveTo(2.4, -13.6, 6.4, -16.4, 11, -16.4);
  g.bezierCurveTo(17.2, -16.4, 22, -11.4, 22, -5);
  g.bezierCurveTo(22, 4.6, 14, 12.4, 0, 22);
  g.lineWidth = 1;
  g.stroke();
  g.restore();

  const nameSize = compact ? 96 : 112;
  g.fillStyle = '#fbefe4';
  g.font = `400 ${nameSize}px "Pinyon Script", cursive`;
  g.fillText(a, W / 2, 640 + shift);
  g.fillStyle = '#e3b37c';
  g.font = 'italic 300 72px "Cormorant Garamond", serif';
  g.fillText('&', W / 2, 730 + shift);
  g.fillStyle = '#fbefe4';
  g.font = `400 ${nameSize}px "Pinyon Script", cursive`;
  g.fillText(b, W / 2, 840 + shift);

  g.fillStyle = '#f2dfcf';
  g.font = 'italic 400 44px "Cormorant Garamond", serif';
  g.fillText(`asked each other ${words(answered)} ${plural(answered, 'question')}`, W / 2, 960 + shift);
  g.fillText(minutes ? `on ${date}, in ${minutes} ${plural(minutes, 'minute')}.` : `on ${date}.`, W / 2, 1015 + shift);

  if (compact) {
    let y = 935;
    g.fillStyle = '#e3b37c';
    g.font = '500 18px Manrope, sans-serif';
    g.letterSpacing = '6px';
    g.fillText(favorites.length > 1 ? 'THE QUESTIONS THAT STAYED' : 'THE QUESTION THAT STAYED', W / 2, y);
    g.letterSpacing = '0px';
    y += 50;
    for (const f of favorites) {
      g.fillStyle = '#ecd1a2';
      g.font = '500 19px Manrope, sans-serif';
      g.fillText(`${f.name.toUpperCase()}  ·  NO. ${roman(f.q + 1)}`, W / 2, y);
      y += 38;
      g.fillStyle = '#fbefe4';
      g.font = 'italic 400 30px "Cormorant Garamond", serif';
      for (const line of balancedWrap(g, QUESTIONS[f.q].text, 820, 2)) {
        g.fillText(line, W / 2, y);
        y += 36;
      }
      y += 22;
    }
  }

  g.fillStyle = 'rgba(236,209,162,.7)';
  g.font = '400 20px Manrope, sans-serif';
  g.fillText('After Aron et al., 1997', W / 2, H - 92);

  const url = c.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = url;
  link.download = `36-beautiful-questions-${a}-${b}.png`.toLowerCase().replace(/\s+/g, '-');
  link.click();
}

function FavoriteCard({ name, q }: { name: string; q: number }) {
  return (
    <motion.div className="fav-card" initial={{ opacity: 0, y: 12, rotate: -1 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ duration: 0.8, ease }}>
      <span className="fav-who">
        {name} · No. {roman(q + 1)}
      </span>
      <p className="fav-text">{QUESTIONS[q].text}</p>
    </motion.div>
  );
}

function Picker({ open, onClose, onPick, skipped, current, title }: { open: boolean; onClose: () => void; onPick: (q: number) => void; skipped: number[]; current: number | null; title: string }) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="picker">
        {QUESTIONS.map((q, i) =>
          skipped.includes(i) ? null : (
            <button
              key={q.n}
              className={`picker-row ${current === i ? 'is-on' : ''}`}
              onClick={() => {
                onPick(i);
                onClose();
              }}
            >
              <span className="picker-num">{roman(q.n)}</span>
              <span className="picker-text">{q.text}</span>
              <span className="picker-set">{setOf(i).name}</span>
            </button>
          ),
        )}
      </div>
    </Sheet>
  );
}

export default function Finale({ onLeave }: { onLeave: () => void }) {
  const { session, state, local } = useGame();
  const a = state.players.host.name;
  const b = state.players.guest?.name ?? '';
  const minutes = minutesBetween(state.startedAt, state.finishedAt);
  const answered = TOTAL - state.skipped.length;
  const date = dateFmt.format(new Date(state.finishedAt ?? Date.now()));
  const [busy, setBusy] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [picking, setPicking] = useState<Role | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const { notes } = useNotes(state.code);
  const noteCount = Object.keys(notes).length;

  const favs = state.favorites ?? { host: null, guest: null };
  const me = session.role;
  const them: Role = me === 'host' ? 'guest' : 'host';
  const bothChosen = favs.host !== null && favs.guest !== null;
  // Over the network a partner's choice stays hidden until you have chosen too.
  const visible = (role: Role) => favs[role] !== null && (local || role === me || bothChosen);
  const chosen: Favorite[] = (['host', 'guest'] as const)
    .filter((r) => favs[r] !== null)
    .map((r) => ({ name: state.players[r]?.name ?? '', q: favs[r] as number }));

  const pickerRole = picking;

  return (
    <main className="screen finale">
      <Reveal>
        <Monogram size={52} />
      </Reveal>
      <Reveal delay={0.2}>
        <span className="eyebrow">{date}</span>
      </Reveal>
      <h2 className="names names-lg">
        <LetterRise text={a} delay={0.5} />
        <span className="amp">&amp;</span>
        <LetterRise text={b} delay={0.9} />
      </h2>
      <Reveal delay={1.5}>
        <Flourish />
      </Reveal>
      <Reveal delay={1.7}>
        <p className="finale-line">
          You asked each other {words(answered)} beautiful {answered === 1 ? 'question' : 'questions'}
          {minutes ? <>, in {minutes} {plural(minutes, 'minute')}</> : null}.
        </p>
      </Reveal>
      <Reveal delay={1.95}>
        <p className="muted center narrow">
          Whatever happens next, you now know each other a little better than you did an hour ago. That was the whole point.
        </p>
      </Reveal>

      {answered > 0 && (
        <Reveal delay={2.15} className="favorites">
          <span className="eyebrow">The question that stays with you</span>
          <div className="fav-list">
            <AnimatePresence>
              {(['host', 'guest'] as const).map((r) =>
                visible(r) ? <FavoriteCard key={`${r}-${favs[r]}`} name={state.players[r]?.name ?? ''} q={favs[r] as number} /> : null,
              )}
            </AnimatePresence>
          </div>
          {local ? (
            <div className="fav-actions">
              {(['host', 'guest'] as const).map((r) =>
                favs[r] === null ? (
                  <Button key={r} variant="ghost" onClick={() => setPicking(r)}>
                    {`${state.players[r]?.name}’s choice`}
                  </Button>
                ) : (
                  <button key={r} className="link" onClick={() => setPicking(r)}>
                    {`Change ${state.players[r]?.name}’s choice`}
                  </button>
                ),
              )}
            </div>
          ) : (
            <>
              {favs[them] !== null && favs[me] === null && (
                <p className="muted small center">{state.players[them]?.name} has chosen. Choose yours to see it.</p>
              )}
              {favs[me] !== null && favs[them] === null && (
                <p className="muted small center">Waiting for {state.players[them]?.name} to choose.</p>
              )}
              {favs[me] === null ? (
                <Button variant="ghost" onClick={() => setPicking(me)}>
                  Choose yours
                </Button>
              ) : (
                <button className="link" onClick={() => setPicking(me)}>
                  Change your choice
                </button>
              )}
            </>
          )}
        </Reveal>
      )}

      <Reveal delay={2.35} className="finale-actions">
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await makeKeepsake(a, b, date, answered, minutes, local || bothChosen ? chosen : chosen.filter((f) => f.name === state.players[me]?.name));
            } finally {
              setBusy(false);
            }
          }}
        >
          Keep this moment
        </Button>
        {noteCount > 0 && (
          <Button variant="ghost" onClick={() => setNotesOpen(true)}>
            Your private notes ({noteCount})
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={() => {
            if (!confirmRestart) {
              setConfirmRestart(true);
              window.setTimeout(() => setConfirmRestart(false), 3500);
              return;
            }
            session.dispatch({ type: 'restart' });
          }}
        >
          {confirmRestart ? 'Tap again to begin anew' : 'Begin again together'}
        </Button>
        <button className="link" onClick={onLeave}>
          Leave the ritual
        </button>
      </Reveal>

      <Picker
        open={pickerRole !== null}
        onClose={() => setPicking(null)}
        skipped={state.skipped}
        current={pickerRole ? favs[pickerRole] : null}
        title={local && pickerRole ? `${state.players[pickerRole]?.name}’s question` : 'Your question'}
        onPick={(q) => pickerRole && session.dispatch({ type: 'favorite', q, role: pickerRole })}
      />

      <Sheet open={notesOpen} onClose={() => setNotesOpen(false)} title="Your private notes">
        <div className="notes-list">
          {QUESTIONS.map((q, i) =>
            notes[i] ? (
              <div key={q.n} className="notes-item">
                <span className="mono">No. {roman(q.n)}</span>
                <p className="notes-q">{q.text}</p>
                <p className="notes-text">{notes[i]}</p>
              </div>
            ) : null,
          )}
          <Button onClick={() => downloadText(`36-questions-notes-${state.code.toLowerCase()}.txt`, notesAsText(notes, `${a} & ${b}`, date))}>
            Download as text
          </Button>
          <p className="muted small center">These notes never left this device.</p>
        </div>
      </Sheet>
    </main>
  );
}
