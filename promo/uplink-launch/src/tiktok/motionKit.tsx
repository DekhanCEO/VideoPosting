/** Outils communs du style « keynote » : palette, ressorts à 10 %, flou de bougé, ombres en couches, mots masqués. */
import React from "react";
import { Easing, interpolate, spring } from "remotion";

export const GROUND = "#EEEEEC";
export const INK = "#111113";
export const GREY = "#86868B";
export const RED = "#FF3B30";
export const SCREEN = "#F4F4F2";
export const IT = '"Inter Tight", sans-serif';
export const FPS = 30;

/** Ressort à ~10 % de dépassement (amortissement relatif ≈ 0,59). */
export const SPRING10 = { mass: 1, stiffness: 170, damping: 15.4 };

/** Ombres douces en couches (intensité 0 → 1). */
export const shadow = (a: number) =>
  a <= 0.01
    ? "none"
    : [`0 1px 1px rgba(17,17,19,${0.04 * a})`, `0 3px 6px rgba(17,17,19,${0.05 * a})`, `0 10px 20px rgba(17,17,19,${0.06 * a})`, `0 26px 52px rgba(17,17,19,${0.08 * a})`, `0 56px 110px rgba(17,17,19,${0.1 * a})`].join(", ");

/** Ressort qui démarre à l'image `start` (0 avant). */
export const sp = (k: number, start: number, config = SPRING10) => (k < start ? 0 : spring({ frame: k - start, fps: FPS, config }));
export const ease = (k: number, a: number, b: number, e = Easing.inOut(Easing.cubic)) => interpolate(k, [a, b], [0, 1], { easing: e, extrapolateLeft: "clamp", extrapolateRight: "clamp" });

/** Filtre de flou directionnel (écart-type par axe, en px). */
export const Blur: React.FC<{ id: string; sx: number; sy: number }> = ({ id, sx, sy }) => (
  <svg width={0} height={0} style={{ position: "absolute" }}>
    <filter id={id} x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
      <feGaussianBlur stdDeviation={`${sx.toFixed(2)} ${sy.toFixed(2)}`} />
    </filter>
  </svg>
);
/** Flou proportionnel au déplacement par image. */
export const blurOf = (dx: number, dy: number, k = 0.35, max = 14) => ({ sx: Math.min(max, Math.abs(dx) * k), sy: Math.min(max, Math.abs(dy) * k) });
export const blurUrl = (sx: number, sy: number, id: string) => (sx + sy > 0.35 ? `url(#${id})` : undefined);

/** Mot qui monte depuis un masque (ressort à 10 %), et repart vers le haut. */
export const Rise: React.FC<{ children: React.ReactNode; enter: number; exit?: number; k: number }> = ({ children, enter, exit, k }) => {
  if (k < enter) return null;
  const p = sp(k, enter);
  const x = exit === undefined ? 0 : ease(k, exit, exit + 6, Easing.in(Easing.cubic));
  if (x >= 1) return null;
  return (
    <span style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", padding: "0.12em 0.04em 0.18em", margin: "-0.12em 0 -0.18em" }}>
      <span style={{ display: "inline-block", transform: `translateY(${(1 - p) * 115 - x * 125}%)` }}>{children}</span>
    </span>
  );
};
