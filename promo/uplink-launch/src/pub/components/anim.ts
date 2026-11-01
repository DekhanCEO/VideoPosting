/** Courbes du film : ease-out cubique pour les entrées, ressort doux (damping 20, stiffness 120) pour le produit. */
import type React from "react";
import { Easing, interpolate, interpolateColors, spring } from "remotion";
import { FPS } from "../timing";
import type { Box } from "../layout";

export const EASE_OUT = Easing.out(Easing.cubic);
export const PRODUCT_SPRING = { damping: 20, stiffness: 120, mass: 1 };

/** Progression 0 → 1 entre deux images. */
export const prog = (f: number, a: number, b: number, easing = EASE_OUT) => interpolate(f, [a, b], [0, 1], { easing, extrapolateLeft: "clamp", extrapolateRight: "clamp" });

/** Ressort « produit » qui démarre à l'image `start`. */
export const productSpring = (f: number, start: number) => (f < start ? 0 : spring({ frame: f - start, fps: FPS, config: PRODUCT_SPRING }));

export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Entrée en fondu avec un léger décalage vertical (8 px par défaut). */
export function fadeRise(f: number, start: number, dur = 12, dist = 8): React.CSSProperties {
  const p = prog(f, start, start + dur);
  return { opacity: p, transform: `translateY(${(1 - p) * dist}px)` };
}
/** Sortie en fondu vers le haut. */
export function fadeOut(f: number, start: number, dur = 10, dist = 8): { opacity: number; dy: number } {
  const p = prog(f, start, start + dur, Easing.in(Easing.cubic));
  return { opacity: 1 - p, dy: -p * dist };
}

/** Interpolation de deux boîtes (centre, taille, rayon) et d'une couleur. */
export const mixBox = (a: Box, b: Box, t: number): Box => ({ cx: mix(a.cx, b.cx, t), cy: mix(a.cy, b.cy, t), w: mix(a.w, b.w, t), h: mix(a.h, b.h, t), r: mix(a.r, b.r, t) });
export const boxStyle = (b: Box): React.CSSProperties => ({ position: "absolute", left: b.cx - b.w / 2, top: b.cy - b.h / 2, width: b.w, height: b.h, borderRadius: b.r });
export const mixColor = (a: string, b: string, t: number) => interpolateColors(Math.min(1, Math.max(0, t)), [0, 1], [a, b]);
