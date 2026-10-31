import React from "react";
import { Easing, interpolate, interpolateColors, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ACCENT, CARD_BG, HAIRLINE } from "./config";
import { clamp01, mix } from "./motion";

export type CalloutShape = "pill" | "chip" | "disc";

/** Forme de départ : la carte grandit à partir d'elle, sans jamais apparaître en fondu. */
const SHAPES: Record<CalloutShape, { w: number; h: number; r: number; bg: string }> = {
  pill: { w: 156, h: 52, r: 26, bg: ACCENT },
  chip: { w: 66, h: 66, r: 20, bg: CARD_BG },
  disc: { w: 80, h: 80, r: 40, bg: ACCENT },
};

export const Callout: React.FC<{
  shape: CalloutShape;
  /** Contenu de la forme de départ (libellé de pilule, icône de puce, symbole du disque). */
  seed: React.ReactNode;
  start: number;
  x: number;
  y: number;
  z: number;
  rotY: number;
  rotX: number;
  drift?: { x: number; y: number; rot: number };
  width?: number;
  height?: number;
  /** Image (locale) de sortie : la carte se rétracte et disparaît par l'échelle, jamais en fondu. */
  end?: number;
  children: React.ReactNode;
}> = ({ shape, seed, start, x, y, z, rotY, rotX, drift = { x: 0, y: 0, rot: 0 }, width = 410, height = 134, end, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < start || (end !== undefined && frame >= end)) return null;

  // 1. La forme surgit (ressort vif avec dépassement) — 2. elle se déploie en carte.
  const pop = spring({ frame: frame - start, fps, config: { damping: 10, stiffness: 260, mass: 0.55 } });
  const morph = spring({ frame: frame - start - 7, fps, config: { damping: 15, stiffness: 150, mass: 0.85 } });
  const s = SHAPES[shape];
  const w = mix(s.w, width, morph);
  const h = mix(s.h, height, morph);
  const r = mix(s.r, 32, morph);
  const bg = interpolateColors(morph, [0, 0.55], [s.bg, CARD_BG]);
  const seedScale = 1 - clamp01(morph * 2.4); // le contenu de la forme se rétracte
  const shadow = 0.25 + 0.75 * morph;
  const leave = end === undefined ? 0 : interpolate(frame, [end - 10, end], [0, 1], { easing: Easing.in(Easing.back(1.6)), extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div
      style={{
        position: "absolute",
        left: x - width / 2,
        top: y - height / 2,
        width,
        height,
        transform: `translate3d(${drift.x}px, ${drift.y}px, ${z}px) rotateY(${rotY + drift.rot}deg) rotateX(${rotX}deg) scale(${pop * (1 - leave)})`,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: (width - w) / 2,
          top: (height - h) / 2,
          width: w,
          height: h,
          borderRadius: r,
          background: bg,
          overflow: "hidden",
          boxShadow: `0 ${34 * shadow}px ${64 * shadow}px -24px rgba(22,28,45,${0.38 * shadow}), 0 8px 18px -10px rgba(22,28,45,0.28), inset 0 0 0 1px ${HAIRLINE}`,
          fontFamily: '"Plus Jakarta Sans", sans-serif',
        }}
      >
        {/* Contenu de la carte, découvert par la forme qui grandit */}
        <div
          style={{
            position: "absolute",
            left: (w - width) / 2,
            top: (h - height) / 2,
            width,
            height,
            padding: "0 22px 0 18px",
            display: "flex",
            alignItems: "center",
            gap: 16,
            transform: `scale(${0.86 + 0.14 * morph})`,
          }}
        >
          {children}
        </div>
        {seedScale > 0 && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${seedScale})`, background: s.bg === CARD_BG ? CARD_BG : bg }}>
            {seed}
          </div>
        )}
      </div>
    </div>
  );
};

/** Vignette d'icône teintée de l'accent, utilisée dans les cartes. */
export const IconTile: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ width: 74, height: 74, borderRadius: 22, background: `${ACCENT}14`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{children}</div>
);
