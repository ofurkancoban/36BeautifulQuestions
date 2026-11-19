// Tiny synthesized sound palette (no audio files): soft bells, a heartbeat and an optional ambient pad.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;
let pad: { stop: () => void } | null = null;

try {
  enabled = localStorage.getItem('b36q:sound') !== 'off';
} catch {
  /* default on */
}

function audio(): AudioContext | null {
  if (!enabled) return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function soundEnabled() {
  return enabled;
}

export function setSoundEnabled(on: boolean) {
  enabled = on;
  try {
    localStorage.setItem('b36q:sound', on ? 'on' : 'off');
  } catch {
    /* ignore */
  }
  if (!on) stopAmbient();
}

function bell(freq: number, when = 0, gain = 0.14, decay = 2.6) {
  const a = audio();
  if (!a || !master) return;
  const t = a.currentTime + when;
  // A bell is a fundamental plus a few inharmonic partials with fast decays.
  const partials: Array<[number, number, number]> = [
    [1, 1, decay],
    [2.01, 0.45, decay * 0.6],
    [3.02, 0.22, decay * 0.4],
    [4.17, 0.1, decay * 0.25],
  ];
  for (const [mul, amp, d] of partials) {
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = 'sine';
    o.frequency.value = freq * mul;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain * amp, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + d + 0.05);
  }
}

export const sfx = {
  reveal() {
    bell(659.25, 0, 0.1);
    bell(987.77, 0.09, 0.06);
  },
  turn() {
    bell(523.25, 0, 0.09);
    bell(783.99, 0.14, 0.08);
    bell(1046.5, 0.28, 0.05);
  },
  chord() {
    [392, 493.88, 587.33, 739.99].forEach((f, i) => bell(f, i * 0.12, 0.08, 3.4));
  },
  soft() {
    bell(880, 0, 0.05, 1.2);
  },
  heartbeat() {
    const a = audio();
    if (!a || !master) return;
    for (const [when, f] of [
      [0, 62],
      [0.22, 54],
    ] as const) {
      const t = a.currentTime + when;
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(f * 1.6, t);
      o.frequency.exponentialRampToValueAtTime(f, t + 0.08);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.5, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      o.connect(g).connect(master);
      o.start(t);
      o.stop(t + 0.3);
    }
  },
};

export function ambientPlaying() {
  return pad !== null;
}

export function startAmbient() {
  const a = audio();
  if (!a || !master || pad) return;
  const out = a.createGain();
  out.gain.setValueAtTime(0, a.currentTime);
  out.gain.linearRampToValueAtTime(0.05, a.currentTime + 4);
  const filter = a.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  filter.Q.value = 0.6;
  const lfo = a.createOscillator();
  const lfoGain = a.createGain();
  lfo.frequency.value = 0.05;
  lfoGain.gain.value = 420;
  lfo.connect(lfoGain).connect(filter.frequency);
  filter.connect(out).connect(master);
  // A warm Dmaj9 voicing, slightly detuned for a slow chorus.
  const notes = [146.83, 220, 277.18, 329.63, 369.99];
  const oscs = notes.flatMap((f) =>
    [-4, 4].map((cents) => {
      const o = a.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      o.detune.value = cents;
      o.connect(filter);
      o.start();
      return o;
    }),
  );
  lfo.start();
  pad = {
    stop() {
      const t = a.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(out.gain.value, t);
      out.gain.linearRampToValueAtTime(0, t + 1.5);
      setTimeout(() => {
        oscs.forEach((o) => o.stop());
        lfo.stop();
      }, 1700);
    },
  };
}

export function stopAmbient() {
  pad?.stop();
  pad = null;
}

// iOS Safari has no Vibration API. Since iOS 18, toggling a native <input type="checkbox" switch>
// plays a system haptic tick, so a hidden switch stands in for vibration there.
let hapticLabel: HTMLLabelElement | null = null;

function iosTick() {
  if (!hapticLabel) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    input.tabIndex = -1;
    input.setAttribute('aria-hidden', 'true');
    label.setAttribute('aria-hidden', 'true');
    label.style.display = 'none';
    label.appendChild(input);
    document.body.appendChild(label);
    hapticLabel = label;
  }
  hapticLabel.click();
}

const isIOSHaptics = () => typeof navigator.vibrate !== 'function' && typeof document !== 'undefined' && 'ontouchend' in document;

/**
 * A light tick for direct taps. iOS only allows haptics inside a real user gesture (a click or touchend),
 * so call this from the tap handler itself, never from timers or network events.
 */
export function tap() {
  vibrate(10);
}

/** An extra attempt for press-and-hold on iOS, where pointerdown alone does not count as a gesture. */
export function iosPressTick() {
  try {
    if (isIOSHaptics()) iosTick();
  } catch {
    /* haptics unavailable */
  }
}

/**
 * Vibrates where the Vibration API exists, and plays haptic ticks on iOS otherwise.
 * A pattern becomes one tick per vibration segment, spaced like the original pattern.
 */
export function vibrate(pattern: number | number[]) {
  try {
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
      return;
    }
    if (!isIOSHaptics()) return;
    const segments = Array.isArray(pattern) ? pattern : [pattern];
    let at = 0;
    segments.forEach((ms, i) => {
      if (i % 2 === 0) {
        if (at === 0) iosTick();
        else window.setTimeout(iosTick, at);
      }
      at += ms;
    });
  } catch {
    /* haptics unavailable */
  }
}
