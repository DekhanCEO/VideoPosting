import React from "react";
import { Easing, interpolate, interpolateColors, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ACCENT, CARD_BG, CARDS, HAIRLINE, INK, MUTED } from "./config";
import { Chat, Check } from "./icons";
import { clamp01, mix } from "./motion";
import { Num } from "./Num";

export const CARD_W = 410;
export const CARD_H = 134;
const CARD_R = 32;

type Kind = "pill" | "chip" | "disc";

/** Forme de départ de chaque carte : la carte grandit à partir d'elle, sans jamais apparaître en fondu. */
const SHAPES: Record<Kind, { w: number; h: number; r: number; bg: string }> = {
  pill: { w: 156, h: 52, r: 26, bg: ACCENT },
  chip: { w: 66, h: 66, r: 20, bg: CARD_BG },
  disc: { w: 80, h: 80, r: 40, bg: ACCENT },
};

const IconTile: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ width: 74, height: 74, borderRadius: 22, background: `${ACCENT}14`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{children}</div>
);

const Ring: React.FC<{ progress: number }> = ({ progress }) => {
  const r = 25;
  const c = 2 * Math.PI * r;
  return (
    <svg width="74" height="74" viewBox="0 0 74 74" style={{ flexShrink: 0 }}>
      <circle cx="37" cy="37" r={r} fill="none" stroke={`${ACCENT}22`} strokeWidth="9" />
      <circle cx="37" cy="37" r={r} fill="none" stroke={ACCENT} strokeWidth="9" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - progress)} transform="rotate(-90 37 37)" />
    </svg>
  );
};

export const FloatingCard: React.FC<{
  kind: Kind;
  start: number;
  x: number;
  y: number;
  z: number;
  rotY: number;
  rotX: number;
  drift: { x: number; y: number; rot: number };
}> = ({ kind, start, x, y, z, rotY, rotX, drift }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < start) return null;

  // 1. La forme surgit (ressort vif avec dépassement) — 2. elle se déploie en carte.
  const pop = spring({ frame: frame - start, fps, config: { damping: 10, stiffness: 260, mass: 0.55 } });
  const morph = spring({ frame: frame - start - 7, fps, config: { damping: 15, stiffness: 150, mass: 0.85 } });
  const shape = SHAPES[kind];
  const w = mix(shape.w, CARD_W, morph);
  const h = mix(shape.h, CARD_H, morph);
  const r = mix(shape.r, CARD_R, morph);
  const bg = interpolateColors(morph, [0, 0.55], [shape.bg, CARD_BG]);
  const shapeContent = 1 - clamp01(morph * 2.4); // le contenu de la forme se rétracte
  const content = 0.86 + 0.14 * morph;
  const shadow = 0.25 + 0.75 * morph;

  const ringP = interpolate(frame, [start + 12, start + 28], [0, 1], { easing: Easing.out(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  let body: React.ReactNode;
  if (kind === "pill") {
    const c = CARDS.pill;
    body = (
      <>
        <IconTile>
          <div style={{ width: 40, height: 40, borderRadius: 20, background: ACCENT, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Check size={24} color="#fff" />
          </div>
        </IconTile>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: -0.5, color: INK }}>{c.title}</div>
          <div style={{ fontSize: 15.5, fontWeight: 600, color: MUTED, marginTop: 4 }}>{c.sub}</div>
        </div>
        <div style={{ fontSize: 15, fontWeight: 800, color: ACCENT, background: `${ACCENT}14`, borderRadius: 12, padding: "7px 11px" }}>{c.aside}</div>
      </>
    );
  } else if (kind === "chip") {
    const c = CARDS.chip;
    body = (
      <>
        <IconTile>
          <Chat size={34} color={ACCENT} />
        </IconTile>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 21.5, fontWeight: 800, letterSpacing: -0.5, color: INK, whiteSpace: "nowrap" }}>{c.title}</div>
          <div style={{ fontSize: 15.5, fontWeight: 600, color: MUTED, marginTop: 4 }}>{c.sub}</div>
        </div>
      </>
    );
  } else {
    const c = CARDS.disc;
    body = (
      <>
        <Ring progress={ringP * (c.value / 20)} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: MUTED, whiteSpace: "nowrap" }}>{c.title}</div>
          <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: -1, color: INK, lineHeight: 1.1, marginTop: 2, display: "flex", alignItems: "baseline" }}>
            <Num value={Math.round(ringP * c.value * 10) / 10} decimals={1} />
            <span style={{ fontSize: 24, marginLeft: 4 }}>%</span>
          </div>
        </div>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: ACCENT, background: `${ACCENT}14`, borderRadius: 12, padding: "7px 10px", alignSelf: "center", whiteSpace: "nowrap" }}>{c.sub}</div>
      </>
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        left: x - CARD_W / 2,
        top: y - CARD_H / 2,
        width: CARD_W,
        height: CARD_H,
        transform: `translate3d(${drift.x}px, ${drift.y}px, ${z}px) rotateY(${rotY + drift.rot}deg) rotateX(${rotX}deg) scale(${pop})`,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: (CARD_W - w) / 2,
          top: (CARD_H - h) / 2,
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
            left: (w - CARD_W) / 2,
            top: (h - CARD_H) / 2,
            width: CARD_W,
            height: CARD_H,
            padding: "0 22px 0 18px",
            display: "flex",
            alignItems: "center",
            gap: 16,
            transform: `scale(${content})`,
          }}
        >
          {body}
        </div>
        {/* Contenu de la forme de départ (libellé de la pilule, icône de la puce, % du disque) */}
        {shapeContent > 0 && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${shapeContent})`, background: shape.bg === CARD_BG ? CARD_BG : bg }}>
            {kind === "pill" && (
              <span style={{ display: "flex", alignItems: "center", gap: 8, color: "#fff", fontSize: 18, fontWeight: 800 }}>
                <span style={{ width: 9, height: 9, borderRadius: 5, background: "#fff" }} />
                {CARDS.pill.label}
              </span>
            )}
            {kind === "chip" && <Chat size={30} color={ACCENT} />}
            {kind === "disc" && <span style={{ color: "#fff", fontSize: 32, fontWeight: 800 }}>%</span>}
          </div>
        )}
      </div>
    </div>
  );
};
