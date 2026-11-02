/**
 * Identité de mouvement « Élan », dérivée du skill motion-design de LottieFiles :
 *
 *  Personnalité   Énergique à ~90 % (public créateur / gaming : rapide, dépassements francs, éclats de particules),
 *                 Premium emprunté pour la résolution (logo, adresse) : pas de dépassement, 400–800 ms, respiration.
 *  Courbe         ease-out-expo (0.16, 1, 0.3, 1) pour 80 % des entrées ; sorties en ease-in (accélération MD3) à ~70 % de la
 *                 durée d'entrée ; déplacements à l'écran en ease-in-out ; boucles ambiantes en sinus.
 *  Durées         4 / 6 / 9 images (133 / 200 / 300 ms) + 20 images pour la révélation héroïque.
 *  Entrée unique  « La montée » : tout arrive par le bas (vers le haut = élan, croissance — « Uplink »), le texte
 *                 sort d'un masque, les objets montent et grossissent avec un ressort à ~20 %.
 *  Transition     Le volet chevron : trois bandes violettes en forme de ^ qui balaient l'image vers le haut.
 *  Couches        Primaire (le héros, 100 %), secondaire (50–100 ms plus tard, 30–50 % d'amplitude, autre courbe),
 *                 ambiante (aurore, grille en contre-mouvement, poussières, flottement — 10–20 %, en continu).
 */
import React from "react";
import { AbsoluteFill, Easing, interpolate, random, spring } from "remotion";

export const FPS = 30;
export const W = 1080;
export const H = 1920;

/* ------------------------------------------------------------------ Palette (violet de l'application Uplink) */
export const C = {
  bg: "#0B0B12",
  card: "#17151F",
  ink: "#F5F5F7",
  muted: "#A6A3BD",
  violet: "#9B6BFF",
  deep: "#7C3AED",
  night: "#4C1D95",
  lilac: "#E4D8FF",
  hair: "rgba(255,255,255,0.10)",
};
export const IT = '"Inter Tight", sans-serif';

/* ------------------------------------------------------------------ Courbes */
export const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1); // signature (entrées)
export const EXIT = Easing.bezier(0.3, 0, 1, 1); // sorties (accélération MD3)
export const SWEEP = Easing.bezier(0.7, 0, 0.3, 1); // déplacements à l'écran, volets
export const GENTLE = Easing.bezier(0.4, 0, 0.2, 1); // résolution premium
export const BACK = Easing.bezier(0.34, 1.4, 0.64, 1); // ease-out-back ≈ 7 % (motif de succès)

/* ------------------------------------------------------------------ Durées (images à 30 i/s) */
export const D = { s: 4, m: 6, l: 9, hero: 20 } as const;
export const DX = { s: 3, m: 4, l: 6 } as const; // sorties ≈ 70 %

/* ------------------------------------------------------------------ Ressorts (dépassement visé) */
export type SpringCfg = { mass: number; stiffness: number; damping: number };
export const POP: SpringCfg = { mass: 1, stiffness: 220, damping: 13.5 }; // ≈ 20 %
export const SNAP: SpringCfg = { mass: 1, stiffness: 380, damping: 27 }; // ≈ 5 %
export const MOVE: SpringCfg = { mass: 1, stiffness: 150, damping: 16.5 }; // ≈ 6 %
export const RISE: SpringCfg = { mass: 1, stiffness: 140, damping: 13.6 }; // ≈ 11 %

/* ------------------------------------------------------------------ Outils */
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const ez = (f: number, a: number, b: number, e: (t: number) => number = EXPO_OUT) =>
  interpolate(f, [a, b], [0, 1], { easing: e, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
export const sp = (f: number, start: number, config: SpringCfg = POP) => (f < start ? 0 : spring({ frame: f - start, fps: FPS, config }));
/** Sinus de période `period` images (couche ambiante). */
export const wave = (f: number, period: number, phase = 0) => Math.sin((f / period + phase) * Math.PI * 2);

/* ------------------------------------------------------------------ Flou de bougé directionnel */
export const Blur: React.FC<{ id: string; sx: number; sy: number; region?: number }> = ({ id, sx, sy, region = 50 }) => (
  <svg width={0} height={0} style={{ position: "absolute" }}>
    <filter id={id} x={`-${region}%`} y={`-${region}%`} width={`${100 + region * 2}%`} height={`${100 + region * 2}%`} colorInterpolationFilters="sRGB">
      <feGaussianBlur stdDeviation={`${sx.toFixed(2)} ${sy.toFixed(2)}`} />
    </filter>
  </svg>
);
export type BlurAmt = { sx: number; sy: number };
export const blurOf = (dx: number, dy: number, k = 0.3, max = 14): BlurAmt => ({ sx: Math.min(max, Math.abs(dx) * k), sy: Math.min(max, Math.abs(dy) * k) });
export const blurUrl = (b: BlurAmt, id: string) => (b.sx + b.sy > 0.4 ? `url(#${id})` : undefined);

/* ------------------------------------------------------------------ L'entrée unique : la montée */
/** Texte qui monte depuis un masque (expo-out, 9 images) et repart vers le haut (expo-in, 6 images). */
export const Up: React.FC<{ f: number; enter: number; exit?: number; dur?: number; children: React.ReactNode }> = ({ f, enter, exit, dur = D.l, children }) => {
  if (f < enter) return null;
  const p = ez(f, enter, enter + dur, EXPO_OUT);
  const x = exit === undefined ? 0 : ez(f, exit, exit + DX.l, EXIT);
  if (x >= 1) return null;
  return (
    <span style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", padding: "0.1em 0.04em 0.22em", margin: "-0.1em 0 -0.22em" }}>
      <span style={{ display: "inline-block", transform: `translateY(${(1 - p) * 112 - x * 125}%)` }}>{children}</span>
    </span>
  );
};

/* ------------------------------------------------------------------ Couche ambiante */
/** Aurore : trois halos qui dérivent lentement (cycles de 12 à 17 s, imperceptibles d'un coup d'œil). */
export const Aurora: React.FC<{ f: number; tone?: "dark" | "violet" }> = ({ f, tone = "dark" }) => {
  const a = { x: 50 + wave(f, 360) * 7, y: 60 + wave(f, 420, 0.25) * 4 };
  const b = { x: 18 + wave(f, 510, 0.5) * 6, y: 22 + wave(f, 450) * 4 };
  const c = { x: 86 + wave(f, 390, 0.7) * 5, y: 88 + wave(f, 480, 0.1) * 3 };
  const layers =
    tone === "dark"
      ? [
          `radial-gradient(46% 30% at ${a.x}% ${a.y}%, rgba(124,58,237,0.34) 0%, rgba(124,58,237,0) 100%)`,
          `radial-gradient(40% 24% at ${b.x}% ${b.y}%, rgba(79,70,229,0.20) 0%, rgba(79,70,229,0) 100%)`,
          `radial-gradient(44% 26% at ${c.x}% ${c.y}%, rgba(168,85,247,0.16) 0%, rgba(168,85,247,0) 100%)`,
        ]
      : [
          `radial-gradient(52% 34% at ${a.x}% ${40 + wave(f, 420) * 4}%, rgba(196,170,255,0.55) 0%, rgba(196,170,255,0) 100%)`,
          `radial-gradient(44% 28% at ${b.x}% ${b.y}%, rgba(99,60,230,0.45) 0%, rgba(99,60,230,0) 100%)`,
          `radial-gradient(50% 30% at ${c.x}% ${c.y}%, rgba(46,12,110,0.55) 0%, rgba(46,12,110,0) 100%)`,
        ];
  return <AbsoluteFill style={{ background: layers.join(", ") }} />;
};

/** Grille de points (fond, vitesse 0,2× : contre-mouvement du héros). */
export const DotGrid: React.FC<{ ox: number; oy: number; color?: string }> = ({ ox, oy, color = "rgba(255,255,255,0.075)" }) => (
  <AbsoluteFill
    style={{
      backgroundImage: `radial-gradient(circle, ${color} 1.7px, transparent 2.1px)`,
      backgroundSize: "54px 54px",
      backgroundPosition: `${ox}px ${oy}px`,
      WebkitMaskImage: "radial-gradient(70% 55% at 50% 52%, #000 25%, transparent 100%)",
      maskImage: "radial-gradient(70% 55% at 50% 52%, #000 25%, transparent 100%)",
    }}
  />
);

/** Poussières : 9 points qui montent lentement en ondulant (2–5 px, 20–50 % d'opacité). */
export const Motes: React.FC<{ f: number; color?: string }> = ({ f, color = "#CDB8FF" }) => (
  <AbsoluteFill>
    {Array.from({ length: 9 }, (_, i) => {
      const speed = 0.5 + random(`mote-v${i}`) * 0.6; // 15–33 px/s
      const size = 2 + random(`mote-s${i}`) * 3;
      const x0 = 60 + random(`mote-x${i}`) * 960;
      const span = H + 200;
      const y = H + 100 - ((random(`mote-y${i}`) * span + f * speed) % span);
      const x = x0 + wave(f, 140 + i * 17, i / 9) * 16;
      return <div key={i} style={{ position: "absolute", left: x, top: y, width: size, height: size, borderRadius: size, background: color, opacity: 0.2 + random(`mote-o${i}`) * 0.3, boxShadow: `0 0 ${size * 3}px ${color}` }} />;
    })}
  </AbsoluteFill>
);

/** Grain de pellicule (change à chaque image). */
export const Grain: React.FC<{ f: number; opacity?: number }> = ({ f, opacity = 0.075 }) => (
  <AbsoluteFill style={{ opacity, mixBlendMode: "overlay", pointerEvents: "none" }}>
    <svg width={W} height={H}>
      <filter id="elan-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={f % 24} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width={W} height={H} filter="url(#elan-grain)" />
    </svg>
  </AbsoluteFill>
);

export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.5 }) => (
  <AbsoluteFill style={{ background: `radial-gradient(120% 80% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,${strength}) 100%)`, pointerEvents: "none" }} />
);

/* ------------------------------------------------------------------ Éclats et ondes */
/** Éclat de particules avec traînée (vitesse freinée, légère gravité) : couche de célébration. */
export const Burst: React.FC<{ f: number; at: number; x: number; y: number; n?: number; speed?: number; life?: number; seed: string; colors?: string[]; size?: number; gravity?: number }> = ({
  f,
  at,
  x,
  y,
  n = 22,
  speed = 1500,
  life = 0.75,
  seed,
  colors = ["#FFFFFF", C.lilac, C.violet],
  size = 12,
  gravity = 420,
}) => {
  const t = (f - at) / FPS;
  if (t < 0 || t > life) return null;
  const k = 5.5; // frein
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const th = (i / n) * Math.PI * 2 + (random(`${seed}a${i}`) - 0.5) * 0.7;
        const v = speed * (0.4 + 0.6 * random(`${seed}v${i}`));
        const d = (v * (1 - Math.exp(-k * t))) / k;
        const vx = Math.cos(th) * v * Math.exp(-k * t);
        const vy = Math.sin(th) * v * Math.exp(-k * t) + gravity * t * 2;
        const px = x + Math.cos(th) * d;
        const py = y + Math.sin(th) * d + gravity * t * t;
        const sz = size * (0.5 + 0.5 * random(`${seed}s${i}`)) * (1 - (t / life) * 0.6);
        const len = Math.max(sz, Math.min(110, (Math.hypot(vx, vy) / FPS) * 0.9));
        const ang = (Math.atan2(vy, vx) * 180) / Math.PI;
        const color = colors[i % colors.length];
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: px,
              top: py,
              width: len,
              height: sz,
              borderRadius: sz,
              background: color,
              opacity: 1 - Math.pow(t / life, 2),
              transform: `translate(-100%, -50%) rotate(${ang}deg)`,
              transformOrigin: "100% 50%",
              boxShadow: `0 0 ${sz * 1.6}px ${color}`,
            }}
          />
        );
      })}
    </>
  );
};

/** Onde circulaire qui s'élargit (expo-out) et s'efface. */
export const Ring: React.FC<{ f: number; at: number; x: number; y: number; r0?: number; r1: number; dur: number; w0: number; w1?: number; color: string; alpha?: number }> = ({
  f,
  at,
  x,
  y,
  r0 = 0,
  r1,
  dur,
  w0,
  w1 = 1,
  color,
  alpha = 1,
}) => {
  const t = (f - at) / dur;
  if (t < 0 || t >= 1) return null;
  const e = EXPO_OUT(t);
  const r = mix(r0, r1, e);
  const w = mix(w0, w1, e);
  return <div style={{ position: "absolute", left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: "50%", border: `${w}px solid ${color}`, opacity: alpha * Math.pow(1 - t, 1.4), boxSizing: "border-box" }} />;
};

/* ------------------------------------------------------------------ Le volet chevron */
export const WIPE_DEPTH = 340;
const WIPE_TRAVEL = 8; // images par bord
const WIPE_LAG = 5; // décalage bord d'attaque → bord de fuite
const WIPE_STAGGER = 2; // décalage entre bandes (profondeur)
const edgeY = (f: number, start: number) => mix(H + 40, -WIPE_DEPTH - 40, ez(f, start, start + WIPE_TRAVEL, SWEEP));
export const wipeLead = (f: number, s: number, i = 0) => edgeY(f, s + WIPE_STAGGER * i);
export const wipeTrail = (f: number, s: number, i: number) => edgeY(f, s + WIPE_LAG + WIPE_STAGGER * i);
export const WIPE_END = (s: number, layers = 3) => s + WIPE_LAG + WIPE_STAGGER * (layers - 1) + WIPE_TRAVEL;

/** Bandes du volet (la première mène, les suivantes la suivent à 2 images : effet de profondeur). */
export const ChevronBands: React.FC<{ f: number; s: number; colors: string[] }> = ({ f, s, colors }) => {
  if (f < s || f > WIPE_END(s, colors.length)) return null;
  const D_ = WIPE_DEPTH;
  const polys = colors.map((color, i) => {
    const l = wipeLead(f, s, i);
    const t = wipeTrail(f, s, i);
    return { color, pts: `0,${l + D_} 540,${l} ${W},${l + D_} ${W},${t + D_} 540,${t} 0,${t + D_}` };
  });
  const l0 = wipeLead(f, s, 0);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {[...polys].reverse().map((p, i) => (
          <polygon key={i} points={p.pts} fill={p.color} />
        ))}
        <polyline points={`0,${l0 + D_} 540,${l0} ${W},${l0 + D_}`} fill="none" stroke="#fff" strokeWidth={5} strokeOpacity={0.85} />
      </svg>
    </AbsoluteFill>
  );
};

/** Zone sous un bord en chevron (pour la scène qui arrive). */
export const belowChevron = (y: number) => `polygon(0px ${y + WIPE_DEPTH}px, 540px ${y}px, ${W}px ${y + WIPE_DEPTH}px, ${W}px ${H + 600}px, 0px ${H + 600}px)`;
