import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { bounce, clamp, fade, slide } from "../anim";
import { C, FONT_BODY, FONT_TITLE, softShadow } from "../theme";

/** Fond bleu nuit, grille de points et halos violet/cyan qui dérivent lentement. */
export const Background: React.FC<{ frame: number; tint?: string; dim?: number }> = ({ frame, tint = C.violet, dim = 0 }) => {
  const d = frame / 30;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <defs>
          <pattern id="dots" width={54} height={54} patternUnits="userSpaceOnUse">
            <circle cx={27} cy={27} r={2.4} fill="#1F2A44" />
          </pattern>
          <radialGradient id="halo1">
            <stop offset="0%" stopColor={tint} stopOpacity={0.35} />
            <stop offset="100%" stopColor={tint} stopOpacity={0} />
          </radialGradient>
          <radialGradient id="halo2">
            <stop offset="0%" stopColor={C.cyan} stopOpacity={0.2} />
            <stop offset="100%" stopColor={C.cyan} stopOpacity={0} />
          </radialGradient>
        </defs>
        <rect width={1080} height={1920} fill="url(#dots)" />
        <circle cx={180 + Math.sin(d * 0.5) * 60} cy={420 + Math.cos(d * 0.4) * 50} r={560} fill="url(#halo1)" />
        <circle cx={940 + Math.cos(d * 0.45) * 50} cy={1460 + Math.sin(d * 0.35) * 60} r={600} fill="url(#halo2)" />
      </svg>
      {dim > 0 && <AbsoluteFill style={{ background: `rgba(2,6,23,${dim})` }} />}
    </AbsoluteFill>
  );
};

/** Titre de section (Poppins Black 120 px) : pastille du numéro en tête de la 1re ligne, entrée en rebond.
 *  Les mots qui commencent par une entrée de `accent` sont colorés. */
export const SectionTitle: React.FC<{
  frame: number;
  at: number;
  num: string;
  lines: string[];
  accent?: string[];
  color?: string;
  y?: number;
  size?: number;
  out?: number;
}> = ({ frame, at, num, lines, accent = [], color = C.cyan, y = 285, size = 120, out }) => {
  const s = bounce(frame, at);
  const o = out !== undefined ? interpolate(frame, [out, out + 8], [1, 0], clamp) : 1;
  const sy = out !== undefined ? interpolate(frame, [out, out + 8], [0, -60], clamp) : 0;
  const word = (w: string, j: number, n: number) => (
    <span key={j} style={{ color: accent.some((a) => w.startsWith(a)) ? color : C.text }}>
      {w}
      {j < n - 1 ? " " : ""}
    </span>
  );
  return (
    <div
      style={{
        position: "absolute",
        top: y + sy,
        left: 60,
        right: 60,
        transform: `scale(${s})`,
        transformOrigin: "left center",
        opacity: Math.min(1, s * 2) * o,
        fontFamily: FONT_TITLE,
        fontWeight: 900,
        fontSize: size,
        lineHeight: 1.06,
        color: C.text,
        letterSpacing: -1,
        whiteSpace: "nowrap",
      }}
    >
      {lines.map((l, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 26 }}>
          {i === 0 && (
            <span
              style={{
                flex: "none",
                width: size * 1.02,
                height: size * 1.02,
                borderRadius: size * 0.3,
                background: color,
                color: C.bg,
                fontSize: size * 0.74,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 12px 0 rgba(2,6,23,0.35)",
                transform: `rotate(${-6 + Math.sin(frame / 14) * 2}deg)`,
              }}
            >
              {num}
            </span>
          )}
          <span>{l.split(" ").map((w, j, arr) => word(w, j, arr.length))}</span>
        </div>
      ))}
    </div>
  );
};

/** Carte plate avec ombre portée légère. */
export const Card: React.FC<{ style?: React.CSSProperties; children?: React.ReactNode; color?: string }> = ({ style, children, color = C.panel }) => (
  <div style={{ background: color, borderRadius: 36, boxShadow: softShadow, ...style }}>{children}</div>
);

/** Carte qui glisse latéralement à l'image `at`. */
export const SlideCard: React.FC<{
  frame: number;
  at: number;
  from?: "left" | "right";
  style?: React.CSSProperties;
  children?: React.ReactNode;
  color?: string;
}> = ({ frame, at, from = "left", style, children, color }) => {
  const dx = slide(frame, at, 1100) * (from === "left" ? -1 : 1);
  return (
    <Card color={color} style={{ position: "absolute", transform: `translateX(${dx}px)`, ...style }}>
      {children}
    </Card>
  );
};

/** Icône qui apparaît en fondu rapide + léger zoom. */
export const FadeIcon: React.FC<{ frame: number; at: number; style?: React.CSSProperties; children: React.ReactNode }> = ({
  frame,
  at,
  style,
  children,
}) => {
  const o = fade(frame, at, 5);
  return <div style={{ position: "absolute", opacity: o, transform: `scale(${0.7 + 0.3 * o})`, ...style }}>{children}</div>;
};

export const Body: React.FC<{ children: React.ReactNode; size?: number; color?: string; weight?: number; style?: React.CSSProperties }> = ({
  children,
  size = 52,
  color = C.text,
  weight = 600,
  style,
}) => <div style={{ fontFamily: FONT_BODY, fontWeight: weight, fontSize: size, color, lineHeight: 1.15, ...style }}>{children}</div>;
