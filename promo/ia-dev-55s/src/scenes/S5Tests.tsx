import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { bounce, clamp, fade, slide } from "../anim";
import { Pixo } from "../characters/Pixo";
import { Check } from "../components/icons";
import { Background, Card, SectionTitle } from "../components/ui";
import { CUES, mouthAt } from "../data";
import { C, FONT_BODY } from "../theme";

const K = CUES.tests;
const TESTS = ["login", "panier", "paiement", "profil"];
// page de doc : [largeur, couleur, hauteur]
const DOC: [number, string, number][] = [
  [260, C.violet, 34],
  [330, "#94A3B8", 16],
  [300, "#94A3B8", 16],
  [210, "#94A3B8", 16],
  [0, "", 10],
  [180, C.cyan, 24],
  [320, "#CBD5E1", 70],
  [0, "", 10],
  [300, "#94A3B8", 16],
  [250, "#94A3B8", 16],
];

export const S5Tests: React.FC<{ f: number; abs: number }> = ({ f, abs }) => {
  const docIn = K.doc - 14;
  const done = f >= K.prompt + 4;
  const docProgress = done ? DOC.length : interpolate(f, [K.doc - 6, K.prompt], [0, DOC.length * 0.6], clamp);
  const sparkle = interpolate(f, [K.prompt, K.prompt + 4, K.prompt + 22], [0, 1, 0], clamp);
  return (
    <AbsoluteFill>
      <Background frame={abs} tint={C.green} />
      <SectionTitle frame={f} at={K.title} num="3" lines={["Il teste et", "documente."]} accent={["teste", "documente"]} color={C.green} />

      {/* checklist de tests */}
      <Card style={{ position: "absolute", left: 60, top: 600, width: 470, height: 500, padding: "34px 30px", boxSizing: "border-box", transform: `translateX(${slide(f, 4, -900)}px)` }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
          {TESTS.map((t, i) => {
            const at = K.checks[i];
            const ok = f >= at;
            return (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 22 }}>
                <div style={{ width: 76, height: 76, borderRadius: 22, background: ok ? "transparent" : C.panel2, border: ok ? "none" : `5px solid ${C.line}`, boxSizing: "border-box", position: "relative" }}>
                  {ok && (
                    <div style={{ position: "absolute", inset: 0, transform: `scale(${bounce(f, at)})` }}>
                      <Check size={76} />
                    </div>
                  )}
                </div>
                <span style={{ fontFamily: FONT_BODY, fontWeight: 600, fontSize: 54, color: ok ? C.text : C.muted }}>{t}()</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* page de documentation qui s'écrit */}
      <Card
        color={C.white}
        style={{
          position: "absolute",
          left: 560,
          top: 600,
          width: 460,
          height: 500,
          padding: "36px 34px",
          boxSizing: "border-box",
          transform: `translateX(${slide(f, docIn, 700)}px) rotate(2deg)`,
          boxShadow: `0 18px 0 rgba(2,6,23,0.35), 0 0 ${sparkle * 80}px ${sparkle * 16}px rgba(250,204,21,${sparkle * 0.7})`,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {DOC.map(([w, col, h], i) => {
            const p = Math.max(0, Math.min(1, docProgress - i));
            return <div key={i} style={{ width: w * p, height: h, borderRadius: Math.min(h / 2, 12), background: col || "transparent" }} />;
          })}
        </div>
        {done && (
          <div style={{ position: "absolute", right: -26, top: -30, transform: `scale(${bounce(f, K.prompt + 4)})` }}>
            <Check size={96} />
          </div>
        )}
      </Card>

      {/* « en un prompt » : barre de saisie + Pixo qui valide */}
      {f >= K.prompt - 22 && (
        <Card
          style={{
            position: "absolute",
            left: 60,
            top: 1150,
            width: 700,
            height: 120,
            borderRadius: 60,
            display: "flex",
            alignItems: "center",
            gap: 24,
            padding: "0 22px 0 30px",
            boxSizing: "border-box",
            border: `5px solid ${C.violet}`,
            transform: `translateY(${slide(f, K.prompt - 22, 500)}px)`,
          }}
        >
          <svg viewBox="0 0 100 100" width={60} height={60}>
            <path d="M50 4 L58 42 L96 50 L58 58 L50 96 L42 58 L4 50 L42 42 Z" fill={C.yellow} />
          </svg>
          <div style={{ flex: 1, display: "flex", gap: 12 }}>
            <div style={{ width: interpolate(f, [K.prompt - 18, K.prompt - 4], [0, 210], clamp), height: 22, borderRadius: 11, background: "#94A3B8" }} />
            <div style={{ width: interpolate(f, [K.prompt - 10, K.prompt - 2], [0, 140], clamp), height: 22, borderRadius: 11, background: "#94A3B8" }} />
          </div>
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: 42,
              background: f >= K.prompt ? C.green : C.violet,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: `scale(${f >= K.prompt && f < K.prompt + 6 ? 0.85 : 1})`,
            }}
          >
            <svg viewBox="0 0 100 100" width={50} height={50}>
              <path d="M 50 80 L 50 22 M 26 44 L 50 20 L 74 44" stroke={C.white} strokeWidth={12} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </Card>
      )}
      <div style={{ position: "absolute", left: 790, top: 1060, transform: `translateX(${slide(f, 10, 500)}px)` }}>
        <Pixo
          frame={abs}
          size={250}
          mouth={mouthAt(abs)}
          expr={done ? "proud" : "happy"}
          lookX={f < K.doc ? -0.8 : -0.4}
          lookY={-0.5}
          eyes={done && f < K.prompt + 30 ? "star" : "normal"}
          point={f >= K.prompt - 8 && f < K.prompt + 14 ? 1 : 0}
          pointAngle={170}
        />
      </div>
      {sparkle > 0 && <div style={{ position: "absolute", left: 0, top: 0, opacity: fade(f, K.prompt, 2) }} />}
    </AbsoluteFill>
  );
};
