/**
 * Acte 1 — l'oscilloscope (0–3,6 s). Écran vert-noir, graticule qui s'efface vers les bords, une seule trace de
 * phosphore (cœur presque blanc, halo vert, courte rémanence). La trace est UNE ligne continue : sinusoïde qui
 * défile puis se verrouille, se replie en figure de Lissajous qui tourne, se relâche en onde qui s'amortit jusqu'à
 * une ligne plate, d'où montent les capitales « UPLINK ». Puis extinction d'écran cathodique jusqu'à un point.
 * L'accroche est lisible dès la première image ; le cinquième inférieur reste vide.
 */
import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const SCOPE_END = 108; // le point lumineux est seul à l'écran
export const LINE_Y = 1000;
export const DOT_X = 540;
const IT = '"Inter Tight", sans-serif';

const W = 1080;
const N = 420; // points de la trace
const AMP = 210;

/** Ressort à ~10 % de dépassement (amortissement relatif ≈ 0,59). */
export const SPRING10 = { mass: 1, stiffness: 170, damping: 15.4 };

const ease = (f: number, a: number, b: number, e = Easing.inOut(Easing.cubic)) => interpolate(f, [a, b], [0, 1], { easing: e, extrapolateLeft: "clamp", extrapolateRight: "clamp" });

/** Phase de défilement : vitesse constante, puis décélération jusqu'au verrouillage (images 8 → 16). */
function phase(t: number) {
  const v0 = 0.34;
  if (t <= 8) return v0 * t;
  const d = Math.min(t, 16) - 8;
  return v0 * 8 + v0 * (d - (d * d) / 16);
}

/** Amplitude de l'onde : pleine, puis oscillation amortie (images 50 → 64) jusqu'à la ligne plate. */
function amplitude(t: number) {
  if (t <= 50) return 1;
  const d = t - 50;
  return Math.exp(-d / 3.4) * Math.cos(d * 0.95) * (1 - ease(t, 58, 64));
}

/** Point u ∈ [0, 1] de la trace à l'instant t (fraction d'image possible). */
function point(u: number, t: number): [number, number] {
  const wx = 50 + u * (W - 100);
  const wy = LINE_Y - AMP * amplitude(t) * Math.sin(2 * Math.PI * 2.5 * u - phase(t));
  const fold = ease(t, 16, 28) * (1 - ease(t, 42, 50));
  if (fold <= 0) return [wx, wy];
  const delta = Math.PI / 2 + 0.07 * Math.max(0, t - 16); // la figure tourne lentement
  const lx = 540 + 360 * Math.sin(2 * Math.PI * 3 * u + delta);
  const ly = LINE_Y - 300 * Math.sin(2 * Math.PI * 2 * u);
  return [wx + (lx - wx) * fold, wy + (ly - wy) * fold];
}

function tracePath(t: number) {
  let d = "";
  for (let i = 0; i <= N; i++) {
    const [x, y] = point(i / N, t);
    d += `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
}

const PHOSPHOR = "#F2FFF6";
const GLOW_TEXT = "0 0 3px #9DFFC2, 0 0 12px #2BF878, 0 0 30px rgba(24,245,102,0.55)";

/** Graticule : divisions de 120 px, axes gradués, effacement radial vers les bords (rien dans le bas). */
const Graticule: React.FC = () => {
  const lines: React.ReactNode[] = [];
  for (let k = -4; k <= 4; k++) lines.push(<line key={`v${k}`} x1={540 + k * 120} y1={0} x2={540 + k * 120} y2={1920} stroke={k === 0 ? "rgba(90,255,150,0.16)" : "rgba(90,255,150,0.08)"} strokeWidth={1.5} />);
  for (let k = -8; k <= 8; k++) lines.push(<line key={`h${k}`} x1={0} y1={LINE_Y + k * 120} x2={W} y2={LINE_Y + k * 120} stroke={k === 0 ? "rgba(90,255,150,0.16)" : "rgba(90,255,150,0.08)"} strokeWidth={1.5} />);
  for (let k = -40; k <= 40; k++) {
    if (k % 5 === 0) continue;
    lines.push(<line key={`tx${k}`} x1={540 + k * 24} y1={LINE_Y - 7} x2={540 + k * 24} y2={LINE_Y + 7} stroke="rgba(90,255,150,0.14)" strokeWidth={1.5} />);
    lines.push(<line key={`ty${k}`} x1={533} y1={LINE_Y + k * 24} x2={547} y2={LINE_Y + k * 24} stroke="rgba(90,255,150,0.14)" strokeWidth={1.5} />);
  }
  return (
    <AbsoluteFill style={{ maskImage: "radial-gradient(ellipse 58% 34% at 50% 51%, #000 35%, transparent 100%)", WebkitMaskImage: "radial-gradient(ellipse 58% 34% at 50% 51%, #000 35%, transparent 100%)" }}>
      <svg width={W} height={1920}>{lines}</svg>
    </AbsoluteFill>
  );
};

/** Lettre fine posée sur la trace, qui en sort par le bas avec un léger dépassement. */
const RisingLetter: React.FC<{ ch: string; cx: number; start: number }> = ({ ch, cx, start }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = f < start ? 0 : spring({ frame: f - start, fps, config: SPRING10 });
  const size = LETTER_SIZE;
  return (
    <div style={{ position: "absolute", left: cx - 140, width: 280, top: LINE_Y - 320, height: 320, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: -size * 0.136, textAlign: "center", fontFamily: IT, fontWeight: 200, fontSize: size, lineHeight: 1, color: PHOSPHOR, textShadow: GLOW_TEXT, transform: `translateY(${(1 - s) * 112}%)` }}>{ch}</div>
    </div>
  );
};

const WORD = "UPLINK";
const LETTER_SIZE = 190;
/** Chasse approximative des capitales d'Inter Tight ExtraLight (em) : espacement optique, pas mécanique. */
const ADVANCE: Record<string, number> = { U: 0.7, P: 0.6, L: 0.5, I: 0.25, N: 0.73, K: 0.63 };
const TRACK = 0.12;
const LETTERS = (() => {
  const adv = Array.from(WORD).map((c) => (ADVANCE[c] ?? 0.6) * LETTER_SIZE);
  const total = adv.reduce((a, b) => a + b, 0) + TRACK * LETTER_SIZE * (adv.length - 1);
  let x = 540 - total / 2;
  return Array.from(WORD).map((ch, i) => {
    const cx = x + adv[i] / 2;
    x += adv[i] + TRACK * LETTER_SIZE;
    return { ch, cx };
  });
})();

/** Petit afficheur d'instrument (l'unique inscription en dehors des textes). */
function readout(t: number) {
  if (t < 16) return "CH1 · BALAYAGE";
  if (t < 42) return "CH1 · X–Y 3:2";
  if (t < 60) return "CH1 · AMORTI";
  return "CH1 · 1 VIDÉO → 3 SORTIES";
}

export const Scope: React.FC = () => {
  const f = useCurrentFrame();
  // Extinction cathodique : écrasement vertical, puis horizontal, vers le point (540, LINE_Y).
  const sy = interpolate(f, [96, 102], [1, 0.006], { easing: Easing.in(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sx = interpolate(f, [102, 108], [1, 0.006], { easing: Easing.in(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const boost = 1 + 1.6 * ease(f, 96, 104);
  const flicker = 1 + 0.035 * Math.sin(f * 2.7) * Math.sin(f * 1.3);
  const trail = [1, 2, 3, 4, 5, 6].map((k) => ({ d: tracePath(f - k * 0.75), o: 0.42 * Math.pow(0.62, k - 1) }));
  const cur = tracePath(f);
  const dot = ease(f, 100, 108, Easing.out(Easing.cubic));
  const big: React.CSSProperties = { fontFamily: IT, fontWeight: 300, fontSize: 74, letterSpacing: "0.06em", lineHeight: 1.1, color: PHOSPHOR, textShadow: GLOW_TEXT };

  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 60% at 50% 50%, #04140B 0%, #020906 55%, #010302 100%)" }}>
      <AbsoluteFill style={{ transformOrigin: `${DOT_X}px ${LINE_Y}px`, transform: `scale(${sx}, ${sy})`, filter: `brightness(${boost * flicker})` }}>
        <Graticule />
        {/* Accroche (lisible dès l'image 0) */}
        <div style={{ position: "absolute", top: 236, left: 40, right: 40, textAlign: "center" }}>
          <div style={big}>ARRÊTE DE POSTER</div>
          <div style={{ ...big, fontWeight: 200, fontSize: 196, letterSpacing: "0.03em", lineHeight: 1 }}>3 FOIS</div>
          <div style={big}>LA MÊME VIDÉO.</div>
        </div>
        <svg width={W} height={1920} style={{ position: "absolute", inset: 0 }}>
          <defs>
            <filter id="ph-wide" filterUnits="userSpaceOnUse" x={0} y={0} width={W} height={1920}>
              <feGaussianBlur stdDeviation={14} />
            </filter>
            <filter id="ph-mid" filterUnits="userSpaceOnUse" x={0} y={0} width={W} height={1920}>
              <feGaussianBlur stdDeviation={4.5} />
            </filter>
            <filter id="ph-soft" filterUnits="userSpaceOnUse" x={0} y={0} width={W} height={1920}>
              <feGaussianBlur stdDeviation={1.2} />
            </filter>
          </defs>
          {/* Rémanence : les dernières positions du faisceau */}
          {trail.map((p, k) => (
            <path key={k} d={p.d} fill="none" stroke="#2BFF7A" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" opacity={p.o} filter="url(#ph-mid)" />
          ))}
          <path d={cur} fill="none" stroke="#14F062" strokeWidth={28} strokeLinecap="round" strokeLinejoin="round" opacity={0.26} filter="url(#ph-wide)" />
          <path d={cur} fill="none" stroke="#3DFF88" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" opacity={0.8} filter="url(#ph-mid)" />
          <path d={cur} fill="none" stroke="#B8FFD3" strokeWidth={4.6} strokeLinecap="round" strokeLinejoin="round" filter="url(#ph-soft)" />
          <path d={cur} fill="none" stroke={PHOSPHOR} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {LETTERS.map((l, i) => (
          <RisingLetter key={i} ch={l.ch} cx={l.cx} start={58 + i * 2.5} />
        ))}
        <div style={{ position: "absolute", top: 1336, left: 0, right: 0, textAlign: "center", fontFamily: IT, fontWeight: 500, fontSize: 24, letterSpacing: "0.22em", color: "rgba(140,255,185,0.78)", textShadow: "0 0 8px rgba(40,245,110,0.55)" }}>{readout(f)}</div>
        {/* Balayage fin, texture d'écran */}
        <AbsoluteFill style={{ background: "repeating-linear-gradient(180deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 2px, rgba(0,0,0,0.16) 3px)", mixBlendMode: "multiply" }} />
      </AbsoluteFill>
      {/* Point lumineux final (l'écran s'est refermé sur lui) */}
      {dot > 0 && (
        <div style={{ position: "absolute", left: DOT_X - 9, top: LINE_Y - 9, width: 18, height: 18, borderRadius: 9, background: PHOSPHOR, boxShadow: `0 0 ${10 + 30 * dot}px ${4 + 8 * dot}px rgba(40,250,120,${0.5 + 0.4 * dot})`, transform: `scale(${dot})` }} />
      )}
    </AbsoluteFill>
  );
};
