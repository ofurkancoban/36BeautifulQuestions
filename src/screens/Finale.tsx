import { useState } from 'react';
import { useGame } from '../net/context';
import { Button, Flourish, LetterRise, Monogram, Reveal } from '../components/ui';
import { TOTAL } from '../data/questions';



function minutesBetween(a: number | null, b: number | null) {
  if (!a || !b) return null;
  return Math.max(1, Math.round((b - a) / 60000));
}

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty'];

function words(n: number) {
  if (n < 20) return ONES[n];
  const t = TENS[Math.floor(n / 10)];
  return n % 10 ? `${t}-${ONES[n % 10]}` : t;
}

const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

/** Renders a 1080x1350 keepsake card to PNG and downloads it. */
async function makeKeepsake(a: string, b: string, date: string, answered: number, minutes: number | null) {
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

  g.textAlign = 'center';
  g.fillStyle = '#ecd1a2';
  g.font = '500 22px Manrope, sans-serif';
  g.letterSpacing = '8px';
  g.fillText('36 BEAUTIFUL QUESTIONS', W / 2, 190);
  g.letterSpacing = '0px';

  // Heart medallion.
  g.save();
  g.translate(W / 2, 360);
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

  g.fillStyle = '#fbefe4';
  g.font = '400 112px "Pinyon Script", cursive';
  g.fillText(a, W / 2, 660);
  g.fillStyle = '#e3b37c';
  g.font = 'italic 300 80px "Cormorant Garamond", serif';
  g.fillText('&', W / 2, 760);
  g.fillStyle = '#fbefe4';
  g.font = '400 112px "Pinyon Script", cursive';
  g.fillText(b, W / 2, 880);

  g.fillStyle = '#f2dfcf';
  g.font = 'italic 400 46px "Cormorant Garamond", serif';
  g.fillText(`asked each other ${words(answered)} questions`, W / 2, 1010);
  g.fillText(minutes ? `on ${date}, in ${minutes} minutes.` : `on ${date}.`, W / 2, 1068);

  g.fillStyle = 'rgba(236,209,162,.7)';
  g.font = '400 20px Manrope, sans-serif';
  g.fillText('After Aron et al., 1997', W / 2, H - 120);

  const url = c.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = url;
  link.download = `36-beautiful-questions-${a}-${b}.png`.toLowerCase().replace(/\s+/g, '-');
  link.click();
}

export default function Finale({ onLeave }: { onLeave: () => void }) {
  const { session, state } = useGame();
  const a = state.players.host.name;
  const b = state.players.guest?.name ?? '';
  const minutes = minutesBetween(state.startedAt, state.finishedAt);
  const answered = TOTAL - state.skipped.length;
  const date = dateFmt.format(new Date(state.finishedAt ?? Date.now()));
  const [busy, setBusy] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);

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
          {minutes ? <>, in {minutes} minutes</> : null}.
        </p>
      </Reveal>
      <Reveal delay={1.95}>
        <p className="muted center narrow">
          Whatever happens next, you now know each other a little better than you did an hour ago. That was the whole point.
        </p>
      </Reveal>
      <Reveal delay={2.2} className="finale-actions">
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await makeKeepsake(a, b, date, answered, minutes);
            } finally {
              setBusy(false);
            }
          }}
        >
          Keep this moment
        </Button>
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
    </main>
  );
}
