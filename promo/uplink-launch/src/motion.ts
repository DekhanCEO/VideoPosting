import { Easing, interpolate, spring } from "remotion";
import { T } from "./config";

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Arrivée du téléphone : ressort lourd, légère sur-rotation (amortissement ≈ 0,7). */
export function landing(frame: number, fps: number) {
  return spring({ frame, fps, config: { mass: 1.5, damping: 13, stiffness: 55 } });
}

/** Flottement en parallaxe : 0 → 1 entre floatStart et floatEnd, puis plan fixe. */
export function floatProgress(frame: number) {
  return interpolate(frame, [T.floatStart, T.floatEnd], [0, 1], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

/** Pose du téléphone à l'image `frame`. */
export function phonePose(frame: number, fps: number) {
  const s = landing(frame, fps);
  const f = floatProgress(frame);
  return {
    s,
    rotY: mix(-72, -29, s) + f * 5,
    rotX: mix(26, 9, s) - f * 2,
    rotZ: mix(-13, 2.5, s) - f * 0.8,
    x: mix(46, -8, s) + f * 10,
    y: mix(-96, 0, s) - f * 18,
    scale: mix(0.92, 1, s) * 1.12,
  };
}

/** Entrée d'un élément d'interface : ressort vif, sans dépassement visible. */
export function rise(frame: number, fps: number, start: number) {
  return spring({ frame: frame - start, fps, config: { damping: 18, stiffness: 150, mass: 0.7 } });
}
