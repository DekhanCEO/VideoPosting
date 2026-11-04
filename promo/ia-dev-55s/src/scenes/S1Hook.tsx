import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { bounce, clamp, lerp, shake } from "../anim";
import { Pixo } from "../characters/Pixo";
import { EmojiSweat } from "../components/icons";
import { Background } from "../components/ui";
import { wordAt } from "../cues";
import { CUES, TL, mouthAt } from "../data";
import { C, FONT_TITLE } from "../theme";

const K = CUES.hook;
// Texte de l'accroche : chaque mot rebondit au moment où il est prononcé.
const LINES: { text: string; cue: string; nth?: number }[][] = [
  [
    { text: "Tu", cue: "tu" },
    { text: "codes", cue: "codes" },
  ],
  [{ text: "encore", cue: "encore" }],
  [
    { text: "sans", cue: "sans" },
    { text: "IA ?", cue: "ia" },
  ],
];

export const S1Hook: React.FC<{ f: number; abs: number }> = ({ f, abs }) => {
  // tremblement entre « IA ? » et le flash, qui s'amortit
  const shakeAmp = f >= K.shake && f < K.flash + 10 ? interpolate(f, [K.shake, K.flash, K.flash + 10], [10, 14, 0], clamp) : 0;
  const sh = shake(f, shakeAmp);
  const flash = interpolate(f, [K.flash, K.flash + 1, K.flash + 9], [0, 0.9, 0], clamp);
  const afterFlash = f >= K.flash;
  // zoom progressif sur les yeux de Pixo
  const zoom = lerp(f, 0, 110, 1.0, 1.55);
  const enter = 0.82 + 0.18 * bounce(f, 0);

  return (
    <AbsoluteFill>
      <Background frame={abs} tint={afterFlash ? C.orange : C.violet} />
      {/* Pixo en gros plan */}
      <div
        style={{
          position: "absolute",
          left: 540 - 400,
          top: 700,
          transform: `scale(${zoom * enter})`,
          transformOrigin: "400px 452px",
        }}
      >
        <Pixo
          frame={abs}
          size={800}
          mouth={mouthAt(abs)}
          expr={f < K.shake ? "neutral" : f < K.clockEyes ? "wow" : "serious"}
          lookX={f < 24 ? 0 : f < 40 ? -0.6 : 0}
          lookY={f < 24 ? 0 : 0.2}
          eyes={f >= K.clockEyes ? "clock" : "normal"}
        />
      </div>
      {/* texte de l'accroche */}
      <div
        style={{
          position: "absolute",
          top: 270,
          left: 60,
          right: 60,
          fontFamily: FONT_TITLE,
          fontWeight: 900,
          fontSize: 146,
          lineHeight: 1.0,
          letterSpacing: -2,
          color: C.text,
          transform: `translate(${sh.x}px, ${sh.y}px) rotate(${shakeAmp ? Math.sin(f * 3) * 1.2 : 0}deg)`,
        }}
      >
        {LINES.map((line, i) => (
          <div key={i} style={{ display: "flex", gap: 34, alignItems: "center" }}>
            {line.map((w) => {
              const at = wordAt(TL, "hook", w.cue, w.nth ?? 0) - 2;
              const s = bounce(f, at);
              const isIA = w.cue === "ia";
              return (
                <span
                  key={w.text}
                  style={{
                    display: "inline-block",
                    transform: `scale(${s}) translateY(${(1 - s) * 40}px)`,
                    opacity: Math.min(1, s * 3),
                    color: isIA ? (afterFlash ? C.bg : C.orange) : C.text,
                    background: isIA && afterFlash ? C.orange : "transparent",
                    borderRadius: 28,
                    padding: isIA ? "0 20px 8px" : 0,
                    textShadow: "0 10px 0 rgba(2,6,23,0.5)",
                  }}
                >
                  {w.text}
                </span>
              );
            })}
            {i === 2 && (
              <span style={{ display: "inline-block", transform: `scale(${bounce(f, K.shake + 4)}) rotate(${Math.sin(f / 4) * 8}deg)` }}>
                <EmojiSweat size={140} />
              </span>
            )}
          </div>
        ))}
      </div>
      {/* flash orange */}
      <AbsoluteFill style={{ background: C.orange, opacity: flash }} />
    </AbsoluteFill>
  );
};
