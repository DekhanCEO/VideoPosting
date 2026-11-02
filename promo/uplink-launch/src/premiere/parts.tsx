/**
 * Briques de « Première » (style Apple × Netflix) : palette noir cinéma + spectre violet → corail, courbes premium,
 * affiches de vidéos générées, apparitions façon keynote, téléphone en studio, bandeaux de notification.
 *
 * Identité de mouvement (skill motion-design de LottieFiles) :
 *  - Personnalité premium à ~90 % (Apple) : décélérations longues, aucun dépassement, 350–800 ms, temps de pause ;
 *    l'énergie (Netflix) est empruntée à trois moments : le mur qui défile, l'impact du générique, le clic.
 *  - Courbe signature : ease-out-quint (0.22, 1, 0.36, 1) pour les entrées ; caméra en ease-in-out ;
 *    sorties en accélération à ~70 % de la durée d'entrée.
 *  - Durées : 11 / 15 / 24 images (≈ 350 / 500 / 800 ms) + 36 pour les révélations.
 *  - Entrée unique : monter de 24–30 px, passer de 98 % à 100 %, sortir d'un léger flou (jamais l'opacité seule).
 */
import React from "react";
import { AbsoluteFill, Easing, Freeze, random } from "remotion";
import { BrandLogo, type Brand } from "../brands";
import { PlayGlyph } from "../icons";
import { IT, clamp01, ez } from "../elan/kit";

export const INK = "#050507";
export const PANEL = "#141418";
export const MUTED = "#A1A1AA";
export const SPECTRAL = "linear-gradient(90deg, #8B5CF6 0%, #B794FF 30%, #E879F9 65%, #FF5C7A 100%)";
export const SPECTRUM: [number, string][] = [
  [0, "#6D28D9"],
  [0.33, "#9B6BFF"],
  [0.66, "#E879F9"],
  [1, "#FF5C7A"],
];
export const gradText: React.CSSProperties = { background: SPECTRAL, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" };

/* ------------------------------------------------------------------ Courbes et durées */
export const ENTER = Easing.bezier(0.22, 1, 0.36, 1); // signature
export const CAMERA = Easing.bezier(0.65, 0, 0.35, 1);
export const LEAVE = Easing.bezier(0.4, 0, 1, 1);
export const DUR = { s: 11, m: 15, l: 24, hero: 36 } as const;

/** L'entrée unique : monte, grandit de 98 à 100 %, sort du flou. */
export const appear = (f: number, start: number, dur: number = DUR.m, dist = 28, blur = 8): React.CSSProperties => {
  const e = ez(f, start, start + dur, ENTER);
  return {
    opacity: e,
    transform: `translateY(${(1 - e) * dist}px) scale(${0.98 + 0.02 * e})`,
    filter: blur > 0 && e < 0.999 ? `blur(${((1 - e) * blur).toFixed(2)}px)` : undefined,
  };
};
/** Sortie : monte un peu, se trouble, s'efface (≈ 70 % de la durée d'entrée). */
export const leave = (f: number, start: number, dur = 10, dist = -24, blur = 6): React.CSSProperties => {
  const e = ez(f, start, start + dur, LEAVE);
  return { opacity: 1 - e, transform: `translateY(${e * dist}px)`, filter: e > 0.001 ? `blur(${(e * blur).toFixed(2)}px)` : undefined };
};
/** Combine deux styles d'apparition / sortie (opacités multipliées, transformations enchaînées). */
export const both = (a: React.CSSProperties, b: React.CSSProperties): React.CSSProperties => ({
  opacity: (a.opacity === undefined ? 1 : Number(a.opacity)) * (b.opacity === undefined ? 1 : Number(b.opacity)),
  transform: [a.transform, b.transform].filter(Boolean).join(" ") || undefined,
  filter: [a.filter, b.filter].filter(Boolean).join(" ") || undefined,
});

/* ------------------------------------------------------------------ Affiches de vidéos (art généré) */
const TITLES = ["Live 12h", "Setup", "Ranked", "Tuto", "Best of", "IRL", "Speedrun", "Q&A", "Vlog", "Réaction", "Top 5", "Montage", "Finale", "Collab", "Dreamhack", "Clutch"];
const PAL: [string, string, string][] = [
  ["#1E0838", "#6D28D9", "#E9D5FF"],
  ["#03161D", "#0E7490", "#A5F3FC"],
  ["#240606", "#B91C1C", "#FECACA"],
  ["#1C1100", "#B45309", "#FDE68A"],
  ["#06170C", "#15803D", "#BBF7D0"],
  ["#0C0C1C", "#3730A3", "#C7D2FE"],
  ["#1C0614", "#BE185D", "#FBCFE8"],
  ["#111114", "#3F3F46", "#E4E4E7"],
];
const BRANDS: Brand[] = ["tiktok", "youtube", "instagram"];

export const Poster: React.FC<{ i: number; w: number; h: number; title?: string; radius?: number; palette?: number; badge?: boolean }> = ({ i, w, h, title, radius = 18, palette, badge = true }) => {
  const p = PAL[(palette ?? i) % PAL.length];
  const t = title ?? TITLES[i % TITLES.length];
  const r1 = random(`pa${i}`);
  const r2 = random(`pb${i}`);
  const unit = Math.min(w, h * 0.5625);
  const hx = 30 + r2 * 40;
  return (
    <div style={{ position: "relative", width: w, height: h, borderRadius: radius, overflow: "hidden", background: `radial-gradient(120% 70% at ${20 + r1 * 60}% 8%, ${p[2]}55 0%, transparent 60%), linear-gradient(165deg, ${p[1]} 0%, ${p[0]} 78%)` }}>
      {/* silhouette du créateur (art d'affiche) */}
      <div style={{ position: "absolute", left: `${hx}%`, top: h * 0.26, width: unit * 0.4, height: unit * 0.4, borderRadius: "50%", background: p[0], opacity: 0.8, transform: "translateX(-50%)" }} />
      <div style={{ position: "absolute", left: `${hx}%`, top: h * 0.26 + unit * 0.46, width: unit * 0.82, height: h, borderRadius: unit * 0.32, background: p[0], opacity: 0.8, transform: "translateX(-50%)" }} />
      <div style={{ position: "absolute", left: `${hx + 14}%`, top: h * 0.2, width: unit * 0.9, height: unit * 0.9, borderRadius: "50%", background: `radial-gradient(closest-side, ${p[2]}40, transparent)` }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0) 42%, rgba(0,0,0,0.78) 100%)" }} />
      <div style={{ position: "absolute", left: unit * 0.08, right: unit * 0.08, bottom: unit * 0.09, fontFamily: IT, fontWeight: 800, fontSize: unit * 0.15, lineHeight: 0.95, letterSpacing: "-0.035em", color: "#fff", textTransform: "uppercase" }}>{t}</div>
      {badge && (
        <div style={{ position: "absolute", left: unit * 0.08, top: unit * 0.08, opacity: 0.85 }}>
          <BrandLogo brand={BRANDS[i % 3]} size={unit * 0.11} color="#fff" />
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ Logo Uplink (tuile violette, bouton lecture) */
export const UplinkMark: React.FC<{ size: number; sheen?: number }> = ({ size, sheen = -1 }) => (
  <div style={{ position: "relative", width: size, height: size, borderRadius: size * 0.3, overflow: "hidden", background: "linear-gradient(140deg, #A78BFA 0%, #7C3AED 52%, #4C1D95 100%)", boxShadow: `0 ${size * 0.16}px ${size * 0.45}px -${size * 0.1}px rgba(124,58,237,0.7), inset 0 1.5px 0 rgba(255,255,255,0.35)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
    <PlayGlyph size={size * 0.46} color="#fff" />
    {sheen > 0 && sheen < 1 && <div style={{ position: "absolute", top: -size * 0.2, bottom: -size * 0.2, left: `${-60 + sheen * 190}%`, width: "45%", transform: "rotate(18deg)", background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0) 100%)" }} />}
  </div>
);

/* ------------------------------------------------------------------ Écrans figés et changement d'écran */
export const At: React.FC<{ screen: React.FC; time: number }> = ({ screen: S, time }) => (
  <Freeze frame={Math.max(0, time)}>
    <S />
  </Freeze>
);
export const remap = (f: number, len: number, from: number, to: number) => from + (to - from) * (1 - Math.pow(1 - clamp01(f / len), 2.2));

export const LiftSwap: React.FC<{ t: number; at: number; a: React.ReactNode; b: React.ReactNode }> = ({ t, at, a, b }) => {
  const e = ez(t, at, at + 12, CAMERA);
  if (e <= 0) return <>{a}</>;
  if (e >= 1) return <>{b}</>;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `translateY(${-e * 30}%)` }}>
        {a}
        <AbsoluteFill style={{ background: `rgba(5,5,10,${e * 0.6})` }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ transform: `translateY(${(1 - e) * 100}%)`, boxShadow: "0 -24px 48px rgba(0,0,0,0.45)" }}>{b}</AbsoluteFill>
    </AbsoluteFill>
  );
};
