import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { bounce, clamp, fade, slide } from "../anim";
import { Lea } from "../characters/Lea";
import { Pixo } from "../characters/Pixo";
import { Bulb, Stopwatch } from "../components/icons";
import { Background, Card, SectionTitle } from "../components/ui";
import { CUES, mouthAt } from "../data";
import { C, FONT_BODY, FONT_TITLE } from "../theme";

const K = CUES.code;

// Code « abstrait » : chaque ligne = indentation + segments colorés (aucun mot lisible, pour rester sous 12 mots à l'écran).
type Seg = [number, string];
const P = C.violetLight;
const CY = C.cyan;
const O = C.orangeLight;
const G = "#64748B";
const W_ = "#E2E8F0";
const FILES: Seg[][][] = [
  // Form.tsx
  [
    [[0, P], [120, CY], [90, W_]],
    [[40, W_], [160, O], [70, G]],
    [[80, CY], [110, W_], [140, O]],
    [[80, CY], [130, W_], [90, O]],
    [[80, CY], [100, W_], [160, O]],
    [[40, G], [120, P], [60, W_]],
    [[40, CY], [180, W_]],
    [[0, P], [60, W_]],
  ],
  // User.ts
  [
    [[0, P], [140, CY], [60, W_]],
    [[40, W_], [90, G], [110, O]],
    [[40, W_], [120, G], [80, O]],
    [[40, W_], [70, G], [130, O]],
    [[40, W_], [150, G], [90, CY]],
    [[0, P], [40, W_]],
    [[0, P], [100, CY], [160, W_]],
    [[40, O], [200, W_]],
  ],
  // api.ts
  [
    [[0, P], [100, CY], [140, O]],
    [[40, P], [90, CY], [150, O], [60, W_]],
    [[80, W_], [120, CY]],
    [[80, P], [100, W_], [80, O]],
    [[40, G], [180, CY]],
    [[40, P], [130, W_], [70, CY]],
    [[0, P], [60, W_]],
    [[0, G], [220, G]],
  ],
];
const TABS = ["Form.tsx", "User.ts", "api.ts"];

export const S3Code: React.FC<{ f: number; abs: number }> = ({ f, abs }) => {
  const tabStarts = [K.tabForm, K.tabModel, K.tabApi];
  const tab = f >= K.tabApi ? 2 : f >= K.tabModel ? 1 : 0;
  const t0 = Math.max(0, tabStarts[tab] - 4);
  // frappe : 1 ligne toutes les 5 images ; à « génère », tout le squelette défile d'un coup (24 lignes)
  const burst = f >= K.burst;
  const progress = burst ? 99 : (f - t0) / 5;
  const lines = burst ? [...FILES[0], ...FILES[1], ...FILES[2]] : FILES[tab];
  const scroll = burst ? interpolate(f, [K.burst, K.burst + 22], [0, (24 - 8) * 48], { ...clamp, easing: (x) => 1 - (1 - x) ** 3 }) : 0;
  const glow = burst ? interpolate(f, [K.burst, K.burst + 4, K.burst + 24], [0, 1, 0], clamp) : 0;
  const edIn = slide(f, 4, 1100);
  const sec = interpolate(f, [K.timer - 6, K.timer + 10], [0, 0.8], clamp);
  return (
    <AbsoluteFill>
      <Background frame={abs} tint={C.violet} />
      <SectionTitle frame={f} at={K.title} num="1" lines={["Il écrit le", "code répétitif."]} accent={["répétitif"]} />

      {/* éditeur */}
      <Card
        style={{
          position: "absolute",
          left: 90,
          top: 600,
          width: 900,
          height: 520,
          transform: `translateX(${edIn}px)`,
          overflow: "hidden",
          boxShadow: `0 18px 0 rgba(2,6,23,0.35), 0 0 ${glow * 90}px ${glow * 20}px rgba(34,211,238,${glow * 0.7})`,
        }}
      >
        <div style={{ height: 86, background: "#111A2E", display: "flex", alignItems: "flex-end", gap: 8, padding: "0 20px" }}>
          {TABS.map((t, i) => (
            <div
              key={t}
              style={{
                fontFamily: FONT_BODY,
                fontWeight: 600,
                fontSize: 48,
                padding: "6px 24px 10px",
                borderRadius: "18px 18px 0 0",
                background: i === tab ? C.panel : "transparent",
                color: i === tab ? C.text : C.muted,
                borderTop: i === tab ? `5px solid ${C.cyan}` : "5px solid transparent",
              }}
            >
              {t}
            </div>
          ))}
        </div>
        <div style={{ padding: "28px 36px", display: "flex", flexDirection: "column", gap: 22, height: 434, overflow: "hidden", boxSizing: "border-box" }}>
          {lines.map((segs, li) => {
            const p = Math.max(0, Math.min(1, progress - li));
            if (p <= 0) return null;
            // 1er segment = indentation + mot-clé (barre de 90 px de sa couleur), puis les autres barres
            const [indent, kwColor] = segs[0];
            const bars: Seg[] = [[90, kwColor], ...segs.slice(1)];
            const total = bars.reduce((n, [w]) => n + w, 0);
            let acc = 0;
            return (
              <div key={li} style={{ display: "flex", alignItems: "center", height: 26, transform: `translateY(${-scroll}px)` }}>
                <div style={{ width: 44 + indent, fontFamily: FONT_BODY, fontSize: 22, color: "#475569" }}>{(li % 8) + 1}</div>
                {bars.map(([w, col], si) => {
                  const visible = Math.max(0, Math.min(w, p * total - acc));
                  acc += w;
                  return <div key={si} style={{ width: visible, height: 22, borderRadius: 11, background: col, marginRight: visible > 0 ? 14 : 0 }} />;
                })}
                {p < 1 && <div style={{ width: 14, height: 34, background: C.cyan, borderRadius: 3, opacity: Math.floor(f / 4) % 2 ? 1 : 0.3 }} />}
              </div>
            );
          })}
        </div>
        {/* chronomètre « en quelques secondes » */}
        {f >= K.timer - 6 && (
          <div
            style={{
              position: "absolute",
              right: 26,
              top: 104,
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: C.orange,
              borderRadius: 28,
              padding: "8px 24px 8px 14px",
              transform: `scale(${bounce(f, K.timer - 6)})`,
              boxShadow: "0 10px 0 rgba(2,6,23,0.35)",
            }}
          >
            <Stopwatch size={64} a={f * 18} />
            <span style={{ fontFamily: FONT_TITLE, fontWeight: 900, fontSize: 56, color: C.bg }}>{sec.toFixed(1).replace(".", ",")}&nbsp;s</span>
          </div>
        )}
      </Card>

      {/* Pixo pointe l'écran */}
      <div style={{ position: "absolute", left: 30, top: 975, transform: `translateX(${slide(f, 10, -600)}px)` }}>
        <Pixo frame={abs} size={300} mouth={mouthAt(abs)} expr="happy" point={interpolate(f, [16, 26], [0, 1], clamp)} pointAngle={-52} lookX={0.6} lookY={-0.6} />
      </div>
      {/* Léa sourit */}
      <div style={{ position: "absolute", left: 700, top: 960, transform: `translateX(${slide(f, 14, 600)}px)` }}>
        <Lea frame={abs} size={300} expr={f >= K.idea ? "proud" : f >= K.burst ? "surprised" : "smile"} lookX={-0.7} thumb={interpolate(f, [K.idea, K.idea + 8], [0, 1], clamp)} />
      </div>
      {/* « logique métier » : l'ampoule */}
      {f >= K.idea && (
        <div style={{ position: "absolute", left: 790, top: 850, opacity: fade(f, K.idea, 4), transform: `scale(${bounce(f, K.idea)}) rotate(${Math.sin(f / 6) * 8}deg)` }}>
          <Bulb size={130} />
        </div>
      )}
    </AbsoluteFill>
  );
};
