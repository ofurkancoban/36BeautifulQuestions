import { useEffect, useRef } from 'react';
import type { Mood } from '../data/questions';

/**
 * Full-screen living background: a domain-warped "silk" shader whose palette
 * drifts between moods (dusk, twilight, midnight...), plus a layer of slow
 * rising bokeh embers drawn on a 2D canvas.
 */

type RGB = [number, number, number];
const hex = (h: string): RGB => {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

const PALETTES: Record<Mood, [RGB, RGB, RGB, RGB]> = {
  night: [hex('#07030a'), hex('#24091d'), hex('#5a1631'), hex('#c2705e')],
  dusk: [hex('#0e0510'), hex('#3d1023'), hex('#9a3d52'), hex('#f2a77c')],
  twilight: [hex('#08040f'), hex('#2a0f3b'), hex('#7a3366'), hex('#e59bb6')],
  midnight: [hex('#050208'), hex('#24040f'), hex('#6e0c26'), hex('#d8475e')],
  dawn: [hex('#0f0609'), hex('#4b1c2b'), hex('#b4606a'), hex('#f7cf9f')],
};

const VERT = `
attribute vec2 p;
void main(){ gl_Position = vec4(p,0.,1.); }
`;

const FRAG = `
precision mediump float;
uniform vec2 r;
uniform float t;
uniform float pulse;
uniform vec3 c0; uniform vec3 c1; uniform vec3 c2; uniform vec3 c3;

float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float n(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.-2.*f);
  return mix(mix(h(i), h(i+vec2(1,0)), u.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0., a = .5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for(int i=0;i<5;i++){ v += a*n(p); p = m*p; a *= .5; }
  return v;
}
void main(){
  vec2 uv = gl_FragCoord.xy / r;
  vec2 p = (gl_FragCoord.xy - .5*r) / min(r.x, r.y);
  float tt = t * .035;
  vec2 q = vec2(fbm(p*1.3 + vec2(0., tt)), fbm(p*1.3 + vec2(5.2, -tt*.8)));
  vec2 w = vec2(fbm(p*1.6 + 2.2*q + vec2(1.7, 9.2) + tt*.6), fbm(p*1.6 + 2.2*q + vec2(8.3, 2.8) - tt*.5));
  float f = fbm(p*1.2 + 2.6*w);

  // Silk folds: thin bright ridges where the warped field folds over itself.
  float ridge = pow(1. - abs(sin(f*6.2831 + tt*2.)), 6.) * .22;

  vec3 col = mix(c0, c1, smoothstep(.15, .75, f));
  col = mix(col, c2, smoothstep(.5, 1.05, length(w)) * .7);
  col += c3 * ridge * smoothstep(.3, .9, f);

  // Warm glow rising from below, like candlelight.
  float glow = exp(-2.2 * length(p - vec2(0., -.85))) * (.55 + .15*sin(t*.6) + pulse*.6);
  col += c3 * glow * .32;
  float top = exp(-3. * length(p - vec2(.6, .9)));
  col += c2 * top * .18;

  // Vignette and film grain.
  float vig = smoothstep(1.35, .25, length((uv - .5) * vec2(r.x/r.y, 1.) * 1.05));
  col *= mix(.22, .94, vig);
  col += (h(gl_FragCoord.xy + fract(t)*91.) - .5) * .035;
  gl_FragColor = vec4(col, 1.);
}
`;

interface Props {
  mood: Mood;
  pulse?: number; // 0..1, brightens the candle glow (used for touches and moments)
}

export default function Atmosphere({ mood, pulse = 0 }: Props) {
  const glRef = useRef<HTMLCanvasElement>(null);
  const dustRef = useRef<HTMLCanvasElement>(null);
  const target = useRef(PALETTES[mood]);
  const pulseTarget = useRef(pulse);

  useEffect(() => {
    target.current = PALETTES[mood];
  }, [mood]);
  useEffect(() => {
    pulseTarget.current = pulse;
  }, [pulse]);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canvas = glRef.current!;
    const dust = dustRef.current!;
    const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false });
    const ctx = dust.getContext('2d')!;
    let raf = 0;
    let disposed = false;

    // Current colors lerp toward target for smooth mood changes.
    const cur = PALETTES[mood].map((c) => [...c]) as RGB[];
    let curPulse = 0;

    let prog: WebGLProgram | null = null;
    const u: Record<string, WebGLUniformLocation | null> = {};
    if (gl) {
      const sh = (type: number, src: string) => {
        const s = gl.createShader(type)!;
        gl.shaderSource(s, src);
        gl.compileShader(s);
        return s;
      };
      prog = gl.createProgram()!;
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'p');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      for (const k of ['r', 't', 'pulse', 'c0', 'c1', 'c2', 'c3']) u[k] = gl.getUniformLocation(prog, k);
    }

    // Embers.
    type Mote = { x: number; y: number; r: number; vy: number; vx: number; a: number; tw: number; hue: number };
    let motes: Mote[] = [];
    let W = 0;
    let H = 0;
    // Adaptive quality: slow devices step down the shader resolution and the number of embers.
    const LEVELS = [
      { scale: 0.5, motes: 1 },
      { scale: 0.34, motes: 0.6 },
      { scale: 0.22, motes: 0.35 },
    ];
    let level = 0;
    const spawn = (initial: boolean): Mote => ({
      x: Math.random() * W,
      y: initial ? Math.random() * H : H + 20,
      r: 0.6 + Math.random() * Math.random() * 3.2,
      vy: 0.08 + Math.random() * 0.28,
      vx: (Math.random() - 0.5) * 0.12,
      a: 0.15 + Math.random() * 0.6,
      tw: Math.random() * Math.PI * 2,
      hue: Math.random(),
    });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      const scale = LEVELS[level].scale; // the shader is soft, so it renders below screen resolution
      canvas.width = Math.max(1, Math.floor(W * scale));
      canvas.height = Math.max(1, Math.floor(H * scale));
      dust.width = Math.floor(W * dpr);
      dust.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      gl?.viewport(0, 0, canvas.width, canvas.height);
      const count = Math.round(Math.min(90, (W * H) / 14000) * LEVELS[level].motes);
      motes = Array.from({ length: count }, () => spawn(true));
    };
    resize();
    window.addEventListener('resize', resize);

    const start = performance.now();
    let last = start;
    let slowFrames = 0;
    let sampled = 0;
    const frame = (now: number) => {
      if (disposed) return;
      const dt = now - last;
      last = now;
      // Ignore long gaps (tab hidden, debugger) and only judge steady-state frames.
      if (dt < 250) {
        sampled++;
        if (dt > 24) slowFrames++;
        if (sampled >= 120) {
          if (slowFrames > 60 && level < LEVELS.length - 1) {
            level++;
            resize();
          }
          sampled = 0;
          slowFrames = 0;
        }
      }
      const t = (now - start) / 1000;
      const tgt = target.current;
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) cur[i][j] += (tgt[i][j] - cur[i][j]) * 0.02;
      curPulse += (pulseTarget.current - curPulse) * 0.06;

      if (gl && prog) {
        gl.uniform2f(u.r, canvas.width, canvas.height);
        gl.uniform1f(u.t, reduced ? 12 : t);
        gl.uniform1f(u.pulse, curPulse);
        gl.uniform3fv(u.c0, cur[0]);
        gl.uniform3fv(u.c1, cur[1]);
        gl.uniform3fv(u.c2, cur[2]);
        gl.uniform3fv(u.c3, cur[3]);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }

      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      const accent = cur[3];
      for (const m of motes) {
        if (!reduced) {
          m.y -= m.vy;
          m.x += m.vx + Math.sin(t * 0.5 + m.tw) * 0.08;
        }
        if (m.y < -20) Object.assign(m, spawn(false));
        const twinkle = 0.55 + 0.45 * Math.sin(t * 1.4 + m.tw);
        const alpha = m.a * twinkle * (0.7 + curPulse * 0.6);
        const gold = [246, 214, 160];
        const rr = Math.round(gold[0] * (1 - m.hue * 0.4) + accent[0] * 255 * m.hue * 0.4);
        const gg = Math.round(gold[1] * (1 - m.hue * 0.4) + accent[1] * 255 * m.hue * 0.4);
        const bb = Math.round(gold[2] * (1 - m.hue * 0.4) + accent[2] * 255 * m.hue * 0.4);
        const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 4);
        g.addColorStop(0, `rgba(${rr},${gg},${bb},${alpha})`);
        g.addColorStop(0.35, `rgba(${rr},${gg},${bb},${alpha * 0.35})`);
        g.addColorStop(1, `rgba(${rr},${gg},${bb},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="atmosphere" aria-hidden>
      <canvas ref={glRef} className="atmosphere-silk" />
      <canvas ref={dustRef} className="atmosphere-dust" />
      <div className="atmosphere-grain" />
    </div>
  );
}
