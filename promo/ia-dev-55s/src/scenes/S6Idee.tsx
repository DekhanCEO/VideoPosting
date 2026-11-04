import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { bounce, clamp, lerp, slide, spr } from "../anim";
import { Lea } from "../characters/Lea";
import { Pixo } from "../characters/Pixo";
import { Bulb, Calendar, Check, CodeIcon, Cross, Rocket, Wireframe } from "../components/icons";
import { Background, SectionTitle } from "../components/ui";
import { CUES, mouthAt } from "../data";
import { C, FONT_BODY, FONT_TITLE } from "../theme";

const K = CUES.idee;
const STEPS = [
  { label: "Idée", color: C.yellow, Icon: Bulb },
  { label: "Maquette", color: C.violetLight, Icon: Wireframe },
  { label: "Code", color: C.cyan, Icon: CodeIcon },
  { label: "Mise en ligne", color: C.orange, Icon: Rocket },
];
const ROW0 = 600;
const ROW = 182;

export const S6Idee: React.FC<{ f: number; abs: number }> = ({ f, abs }) => {
  // phase 1 : frise verticale ; phase 2 (« Une application complète… ») : frise compacte en haut + compteur x3
  const ph2 = spr(f, K.switch, 15, 0.7, 110);
  const lit = (i: number) => f >= K.steps[i];
  const line = interpolate(f, [K.steps[0], K.steps[3]], [0, 3], clamp);
  // compteur : apparaît après la bascule, x1 → x3 au moment de « jours »
  const count = Math.round(interpolate(f, [K.switch + 20, K.x3 + 4], [1, 3], clamp));
  const xIn = K.switch + 10;

  return (
    <AbsoluteFill>
      <Background frame={abs} tint={C.orange} />
      <SectionTitle frame={f} at={K.title} num="4" lines={["De l'idée à", "l'application."]} accent={["l'idée", "l'application"]} color={C.orange} out={K.steps[1] - 8} />

      {/* frise : Idée → Maquette → Code → Mise en ligne */}
      {STEPS.map((s, i) => {
        // position phase 1 (verticale, à gauche) → phase 2 (horizontale, en haut)
        const x1 = 90;
        const y1 = ROW0 + i * ROW;
        const x2 = 150 + i * 210;
        const y2 = 300;
        const x = interpolate(ph2, [0, 1], [x1, x2]);
        const y = interpolate(ph2, [0, 1], [y1, y2]);
        const sc = interpolate(ph2, [0, 1], [1, 0.72]);
        const on = lit(i);
        const pop = on ? bounce(f, K.steps[i]) : 0;
        const visible = f >= K.steps[0] - 10 + i * 3;
        if (!visible) return null;
        return (
          <React.Fragment key={s.label}>
            {/* segment de liaison vers l'étape suivante */}
            {i < 3 && (
              <div
                style={{
                  position: "absolute",
                  left: ph2 < 0.5 ? x + 66 * sc : x + 140 * sc,
                  top: ph2 < 0.5 ? y + 140 * sc : y + 66 * sc,
                  width: ph2 < 0.5 ? 14 : (210 - 140 * sc) * Math.max(0, Math.min(1, line - i)),
                  height: ph2 < 0.5 ? (ROW - 140) * Math.max(0, Math.min(1, line - i)) : 14,
                  background: C.cyan,
                  borderRadius: 7,
                  opacity: ph2 > 0.4 && ph2 < 0.6 ? 0 : 1,
                }}
              />
            )}
            <div style={{ position: "absolute", left: x, top: y, transform: `scale(${sc})`, transformOrigin: "0 0", opacity: Math.min(1, (f - (K.steps[0] - 10 + i * 3)) / 5) }}>
              <div
                style={{
                  width: 146,
                  height: 146,
                  borderRadius: 46,
                  background: on ? s.color : C.panel,
                  border: on ? "none" : `5px dashed ${C.line}`,
                  boxSizing: "border-box",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: on ? `0 12px 0 rgba(2,6,23,0.35), 0 0 ${40 * (1 - Math.min(1, (f - K.steps[i]) / 20))}px ${s.color}` : "none",
                  transform: `scale(${on ? 0.85 + 0.15 * pop : 0.85})`,
                }}
              >
                <div style={{ opacity: on ? 1 : 0.25, filter: on ? "none" : "grayscale(1)" }}>
                  <s.Icon size={100} />
                </div>
              </div>
              {on && (
                <div style={{ position: "absolute", right: -16, top: -16, transform: `scale(${bounce(f, K.steps[i] + 3)})` }}>
                  <Check size={58} />
                </div>
              )}
              {/* libellé (phase 1 uniquement) */}
              {on && (
                <div
                  style={{
                    position: "absolute",
                    left: 186,
                    top: 34,
                    whiteSpace: "nowrap",
                    fontFamily: FONT_BODY,
                    fontWeight: 700,
                    fontSize: 64,
                    color: C.text,
                    transform: `translateX(${slide(f, K.steps[i], -300)}px)`,
                    opacity: 1 - ph2 * 1.6,
                  }}
                >
                  {s.label}
                </div>
              )}
            </div>
          </React.Fragment>
        );
      })}

      {/* phase 2 : x3 plus rapide, jours vs semaines */}
      {f >= K.switch && (
        <>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 450,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 30,
              transform: `scale(${bounce(f, xIn) * (1 + 0.12 * Math.max(0, 1 - Math.abs(f - K.x3 - 4) / 6))})`,
              opacity: f >= xIn ? 1 : 0,
            }}
          >
            <span style={{ fontFamily: FONT_TITLE, fontWeight: 900, fontSize: 260, lineHeight: 1, color: C.orange, textShadow: "0 16px 0 rgba(2,6,23,0.4)" }}>
              x{count}
            </span>
            <span style={{ fontFamily: FONT_TITLE, fontWeight: 900, fontSize: 92, lineHeight: 1.0, color: C.text }}>
              plus
              <br />
              rapide
            </span>
          </div>
          {/* calendriers : jours ✓ / semaines ✗ */}
          <div style={{ position: "absolute", left: 220, top: 760, transform: `scale(${bounce(f, K.x3)})` }}>
            <Calendar size={190} color={C.green} />
            <div style={{ position: "absolute", right: -20, bottom: -10 }}>
              <Check size={78} />
            </div>
          </div>
          <div style={{ position: "absolute", left: 670, top: 760, transform: `scale(${bounce(f, K.weeks - 4) * (1 - 0.15 * lerp(f, K.weeks, K.weeks + 10, 0, 1))})`, opacity: f >= K.weeks - 4 ? 1 : 0 }}>
            <div style={{ filter: "grayscale(0.7)", opacity: 0.8 }}>
              <Calendar size={190} color={C.muted} />
            </div>
            <div style={{ position: "absolute", right: -20, bottom: -10, transform: `scale(${bounce(f, K.weeks + 2)})` }}>
              <Cross size={78} />
            </div>
          </div>
        </>
      )}

      {/* Léa (démo) : surprise puis fière ; Pixo la rejoint en phase 2 */}
      <div
        style={{
          position: "absolute",
          left: interpolate(ph2, [0, 1], [700, 720]),
          top: interpolate(ph2, [0, 1], [820, 985]),
          transform: `translateX(${slide(f, 6, 500)}px) scale(${interpolate(ph2, [0, 1], [1, 0.82])})`,
          transformOrigin: "50% 0",
        }}
      >
        <Lea
          frame={abs}
          size={360}
          expr={f >= K.steps[3] ? "proud" : f >= K.steps[1] ? "surprised" : "smile"}
          lookX={-0.6}
          thumb={f >= K.x3 ? interpolate(f, [K.x3, K.x3 + 8], [0, 1], clamp) : 0}
        />
      </div>
      {f >= K.switch && (
        <div style={{ position: "absolute", left: 40, top: 1030, transform: `translateX(${slide(f, K.switch + 4, -500)}px)` }}>
          <Pixo frame={abs} size={260} mouth={mouthAt(abs)} expr="happy" wave={f < K.x3} lookX={0.5} />
        </div>
      )}
    </AbsoluteFill>
  );
};
