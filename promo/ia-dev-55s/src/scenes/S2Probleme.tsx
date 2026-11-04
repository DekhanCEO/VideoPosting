import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { bounce, clamp, fade, spr } from "../anim";
import { Lea } from "../characters/Lea";
import { BugSvg, CodeIcon, ErrorWindow, Star } from "../components/icons";
import { Background, SlideCard } from "../components/ui";
import { CUES } from "../data";
import { C, FONT_BODY, FONT_TITLE } from "../theme";

const K = CUES.probleme;

// Points d'atterrissage des fenêtres d'erreur (autour de Léa) ; la dernière écrase l'étoile « fonctionnalités ».
const SPOTS = [
  { x: 40, y: 760, r: -8 },
  { x: 660, y: 720, r: 7 },
  { x: 70, y: 980, r: 5 },
  { x: 640, y: 960, r: -6 },
  { x: 20, y: 870, r: -14 },
  { x: 690, y: 850, r: 12 },
  { x: 90, y: 1090, r: -4 },
  { x: 620, y: 1080, r: 6 },
  { x: 360, y: 1150, r: 4 },
];

/** Compteur animé « N h de … ». */
const Chip: React.FC<{ f: number; at: number; hours: number; label: string; icon: React.ReactNode; y: number }> = ({ f, at, hours, label, icon, y }) => {
  const n = Math.round(interpolate(f, [at + 4, at + 22], [0, hours], clamp));
  return (
    <SlideCard frame={f} at={at} from="left" style={{ left: 60, top: y, height: 112, display: "flex", alignItems: "center", gap: 22, padding: "0 30px 0 22px" }}>
      <div style={{ width: 76, height: 76, display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
      <div style={{ fontFamily: FONT_TITLE, fontWeight: 900, fontSize: 70, color: C.orange, minWidth: 110 }}>{n}&nbsp;h</div>
      <div style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: 54, color: C.text }}>{label}</div>
    </SlideCard>
  );
};

export const S2Probleme: React.FC<{ f: number; abs: number }> = ({ f, abs }) => {
  const lastWin = K.windows[K.windows.length - 1];
  const crushed = spr(f, lastWin + 8, 10, 0.5, 200);
  const starIn = bounce(f, K.star);
  return (
    <AbsoluteFill>
      <Background frame={abs} tint={C.red} />
      {/* compteurs : 6 h de bugs · 3 h de doc · 2 h de boilerplate */}
      <Chip f={f} at={K.chipBugs} hours={6} label="de bugs" y={285} icon={<BugSvg frame={abs} size={70} />} />
      <Chip f={f} at={K.chipDoc} hours={3} label="de doc" y={420} icon={<DocMini />} />
      <Chip f={f} at={K.chipBoiler} hours={2} label="de boilerplate" y={555} icon={<CodeIcon size={70} />} />

      {/* l'étoile « fonctionnalités qui font la différence »… écrasée par une fenêtre d'erreur */}
      {f >= K.star && (
        <div
          style={{
            position: "absolute",
            left: 812,
            top: 300,
            transform: `scale(${starIn}) scaleY(${1 - 0.65 * crushed}) rotate(${Math.sin(f / 5) * 6}deg)`,
            transformOrigin: "50% 100%",
            filter: crushed > 0.5 ? "grayscale(0.8)" : "none",
          }}
        >
          <Star size={190} />
        </div>
      )}

      {/* Léa, fatiguée, derrière son ordinateur */}
      <div style={{ position: "absolute", left: 540 - 230, top: 690 }}>
        <Lea frame={abs} size={460} expr={f < K.star ? "tired" : f < lastWin + 8 ? "surprised" : "tired"} lookX={f >= K.star ? 0.9 : 0} tilt={f > K.yawn && f < K.yawn + 40 ? -4 : 0} />
      </div>
      {/* bureau + ordinateur portable */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 1235, height: 40, background: "#334155", borderRadius: 20 }} />
      <div style={{ position: "absolute", left: 540 - 190, top: 1040, width: 380, height: 210, background: "#CBD5E1", borderRadius: "28px 28px 8px 8px", boxShadow: "0 14px 0 rgba(2,6,23,0.35)" }}>
        <div style={{ position: "absolute", left: 160, top: 75, width: 60, height: 60, borderRadius: 30, background: "#94A3B8" }} />
      </div>
      {/* fenêtres d'erreur en cascade */}
      {K.windows.map((at, i) => {
        if (f < at) return null;
        const isLast = i === K.windows.length - 1;
        const spot = isLast ? { x: 700, y: 330, r: -10 } : SPOTS[i % SPOTS.length];
        const s = spr(f, at, 11, 0.6, 150);
        const y = interpolate(s, [0, 1], [-500, spot.y]);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: spot.x,
              top: y,
              transform: `rotate(${spot.r * s}deg) scale(${isLast ? 0.85 : 0.95})`,
              opacity: fade(f, at, 3),
            }}
          >
            <ErrorWindow w={360} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const DocMini: React.FC = () => (
  <svg viewBox="0 0 100 100" width={70} height={70}>
    <path d="M 18 6 L 64 6 L 84 26 L 84 94 L 18 94 Z" fill={C.white} />
    <path d="M 64 6 L 64 26 L 84 26 Z" fill="#CBD5E1" />
    {[38, 52, 66, 80].map((y, i) => (
      <rect key={y} x={28} y={y} width={i % 2 ? 30 : 46} height={7} rx={3.5} fill={i === 0 ? C.violet : "#94A3B8"} />
    ))}
  </svg>
);
