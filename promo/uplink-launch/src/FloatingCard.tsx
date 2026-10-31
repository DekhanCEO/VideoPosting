import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { Callout, IconTile } from "./Callout";
import { ACCENT, CARDS, INK, MUTED } from "./config";
import { Chat, Check } from "./icons";
import { Num } from "./Num";

type Kind = "pill" | "chip" | "disc";

export const Ring: React.FC<{ progress: number; size?: number; color?: string; track?: string }> = ({ progress, size = 74, color = ACCENT, track = `${ACCENT}22` }) => {
  const r = (size * 25) / 74;
  const stroke = (size * 9) / 74;
  const c = 2 * Math.PI * r;
  const m = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={m} cy={m} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      <circle cx={m} cy={m} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - progress)} transform={`rotate(-90 ${m} ${m})`} />
    </svg>
  );
};

/** Les trois cartes du plan de lancement (contenu dans config.ts). */
export const FloatingCard: React.FC<{
  kind: Kind;
  start: number;
  x: number;
  y: number;
  z: number;
  rotY: number;
  rotX: number;
  drift: { x: number; y: number; rot: number };
}> = ({ kind, start, ...place }) => {
  const frame = useCurrentFrame();
  const ringP = interpolate(frame, [start + 12, start + 28], [0, 1], { easing: Easing.out(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  if (kind === "pill") {
    const c = CARDS.pill;
    return (
      <Callout
        shape="pill"
        start={start}
        {...place}
        seed={
          <span style={{ display: "flex", alignItems: "center", gap: 8, color: "#fff", fontSize: 18, fontWeight: 800 }}>
            <span style={{ width: 9, height: 9, borderRadius: 5, background: "#fff" }} />
            {c.label}
          </span>
        }
      >
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
      </Callout>
    );
  }
  if (kind === "chip") {
    const c = CARDS.chip;
    return (
      <Callout shape="chip" start={start} {...place} seed={<Chat size={30} color={ACCENT} />}>
        <IconTile>
          <Chat size={34} color={ACCENT} />
        </IconTile>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 21.5, fontWeight: 800, letterSpacing: -0.5, color: INK, whiteSpace: "nowrap" }}>{c.title}</div>
          <div style={{ fontSize: 15.5, fontWeight: 600, color: MUTED, marginTop: 4 }}>{c.sub}</div>
        </div>
      </Callout>
    );
  }
  const c = CARDS.disc;
  return (
    <Callout shape="disc" start={start} {...place} seed={<span style={{ color: "#fff", fontSize: 32, fontWeight: 800 }}>%</span>}>
      <Ring progress={ringP * (c.value / 20)} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: MUTED, whiteSpace: "nowrap" }}>{c.title}</div>
        <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: -1, color: INK, lineHeight: 1.1, marginTop: 2, display: "flex", alignItems: "baseline" }}>
          <Num value={Math.round(ringP * c.value * 10) / 10} decimals={1} />
          <span style={{ fontSize: 24, marginLeft: 4 }}>%</span>
        </div>
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: ACCENT, background: `${ACCENT}14`, borderRadius: 12, padding: "7px 10px", alignSelf: "center", whiteSpace: "nowrap" }}>{c.sub}</div>
    </Callout>
  );
};
