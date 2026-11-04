import { Easing, interpolate, spring } from "remotion";

export const FPS = 30;

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Ressort générique démarrant à l'image `at`. */
export const spr = (frame: number, at: number, damping = 12, mass = 0.6, stiffness = 140) =>
  spring({ frame: frame - at, fps: FPS, config: { damping, mass, stiffness } });

/** Entrée en rebond (titres) : 0 → 1 avec dépassement. */
export const bounce = (frame: number, at: number) => spr(frame, at, 9, 0.55, 170);

/** Fondu rapide (icônes). */
export const fade = (frame: number, at: number, dur = 6) =>
  interpolate(frame, [at, at + dur], [0, 1], { ...clamp, easing: Easing.out(Easing.quad) });

/** Interpolation bornée et lissée. */
export const lerp = (frame: number, a: number, b: number, from: number, to: number, easing = Easing.inOut(Easing.cubic)) =>
  interpolate(frame, [a, b], [from, to], { ...clamp, easing });

/** Glissement latéral (cartes) : renvoie un décalage en px (≠ 0 avant l'entrée). */
export const slide = (frame: number, at: number, dist = 900) => (1 - spr(frame, at, 14, 0.7, 120)) * dist;

/** Respiration légère, permanente. */
export const breathe = (frame: number, phase = 0, amp = 1) => Math.sin((frame / FPS) * 2 * Math.PI * 0.42 + phase) * amp;

/** Tremblement pseudo-aléatoire déterministe. */
export const shake = (frame: number, amp: number) => ({
  x: Math.sin(frame * 2.3) * amp + Math.sin(frame * 5.1) * amp * 0.5,
  y: Math.cos(frame * 1.9) * amp * 0.6 + Math.sin(frame * 4.3) * amp * 0.4,
});

/** Clignement : renvoie 0 (ouvert) → 1 (fermé) autour des images listées. */
export const blink = (frame: number, times: number[]) => {
  for (const t of times) {
    const d = frame - t;
    if (d >= 0 && d < 6) return d < 3 ? d / 3 : (6 - d) / 3;
  }
  return 0;
};

/** Clignements réguliers « naturels » (toutes les ~2,7 s, décalés par personnage). */
export const autoBlink = (frame: number, offset = 0) => {
  const period = 81;
  const d = (frame + offset) % period;
  return d < 3 ? d / 3 : d < 6 ? (6 - d) / 3 : 0;
};
