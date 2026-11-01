import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { SWEEP_DUR, SWEEPS } from "../timing";

/** Lumière diagonale (dégradé blanc à 8 %) qui balaie l'écran à chaque transition majeure. */
export const LightSweep: React.FC = () => {
  const f = useCurrentFrame();
  const at = SWEEPS.find((s) => f >= s && f < s + SWEEP_DUR);
  if (at === undefined) return null;
  const x = interpolate(f, [at, at + SWEEP_DUR], [-900, 1500], { easing: Easing.inOut(Easing.cubic) });
  return (
    <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -600, left: x, width: 520, height: 3200, transform: "rotate(22deg)", background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0) 100%)" }} />
    </AbsoluteFill>
  );
};
