import React from "react";
import { autoBlink, breathe } from "../anim";
import { C } from "../theme";

export type LeaExpr = "tired" | "surprised" | "relieved" | "proud" | "smile";

export type LeaProps = {
  frame: number;
  expr?: LeaExpr;
  /** regard -1..1 */
  lookX?: number;
  /** inclinaison de la tête en degrés */
  tilt?: number;
  /** 0..1 : pouce levé (main droite) */
  thumb?: number;
  /** 0..1 : salut (main gauche) */
  wave?: number;
  size?: number;
  style?: React.CSSProperties;
};

const SKIN = "#E7AE84";
const SKIN_SHADE = "#CF8F66";
const HAIR = "#3A2418";
const HAIR_LIGHT = "#5A3726";
const HOODIE = C.violet;
const HOODIE_DARK = "#6D28D9";
const INK = "#1F1630";

/** Léa : développeuse en sweat à capuche (buste). Expressions : fatiguée, surprise, soulagée, fière. */
export const Lea: React.FC<LeaProps> = ({ frame, expr = "smile", lookX = 0, tilt = 0, thumb = 0, wave = 0, size = 380, style }) => {
  const breath = breathe(frame, 0.6, 1);
  const b = expr === "relieved" ? 0 : autoBlink(frame, 40);
  const headTilt = tilt + (expr === "tired" ? 6 + breathe(frame, 0, 1.5) : expr === "proud" ? -4 : 0);
  const headY = expr === "tired" ? 10 : 0;
  const ex = lookX * 6;

  const eyes = () => {
    if (expr === "relieved") {
      // yeux fermés, apaisés (arcs)
      return (
        <>
          <path d="M -58 -6 Q -42 6 -26 -6" stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round" />
          <path d="M 26 -6 Q 42 6 58 -6" stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round" />
        </>
      );
    }
    const big = expr === "surprised";
    const ry = (big ? 16 : 12) * (1 - b * 0.9);
    const lid = expr === "tired" ? 0.55 : expr === "proud" ? 0.25 : 0;
    return (
      <>
        {[-42, 42].map((cx) => (
          <g key={cx}>
            <ellipse cx={cx} cy={-4} rx={big ? 15 : 12} ry={ry + 2} fill={C.white} />
            <ellipse cx={cx + ex} cy={-2} rx={big ? 8 : 9} ry={Math.max(1, ry * 0.75)} fill={INK} />
            <circle cx={cx + ex + 3} cy={-6} r={2.6} fill={C.white} />
            {lid > 0 && <rect x={cx - 18} y={-26} width={36} height={22 * lid + 8} fill={SKIN} />}
            {lid > 0 && <line x1={cx - 15} x2={cx + 15} y1={-18 + 22 * lid} y2={-18 + 22 * lid} stroke={INK} strokeWidth={4} strokeLinecap="round" />}
            {expr === "tired" && <path d={`M ${cx - 12} 14 Q ${cx} 22 ${cx + 12} 14`} stroke="#9F6BA8" strokeWidth={4} fill="none" strokeLinecap="round" />}
          </g>
        ))}
      </>
    );
  };

  const brows = {
    tired: [12, -30],
    surprised: [-4, -48],
    relieved: [-6, -36],
    proud: [-10, -38],
    smile: [-4, -34],
  }[expr];

  const mouth = () => {
    switch (expr) {
      case "tired":
        return <path d="M -16 52 Q 0 46 16 52" stroke={INK} strokeWidth={5} fill="none" strokeLinecap="round" />;
      case "surprised":
        return <ellipse cx={0} cy={52} rx={11} ry={14} fill={INK} />;
      case "relieved":
        return <path d="M -20 46 Q 0 62 20 46" stroke={INK} strokeWidth={5.5} fill="none" strokeLinecap="round" />;
      case "proud":
        return (
          <g>
            <path d="M -26 42 Q 0 76 26 42 Z" fill={INK} />
            <path d="M -20 44 L 20 44 L 17 50 L -17 50 Z" fill={C.white} />
          </g>
        );
      default:
        return <path d="M -20 46 Q 0 60 20 46" stroke={INK} strokeWidth={5.5} fill="none" strokeLinecap="round" />;
    }
  };

  const thumbAng = 70 + (-30 - 70) * thumb;
  const waveAng = 110 + (-120 - 110) * wave + (wave > 0.5 ? Math.sin(frame / 3) * 18 : 0);

  return (
    <div style={{ width: size, height: size * 1.25, position: "relative", ...style }}>
      <svg viewBox="-200 -260 400 500" width={size} height={size * 1.25} style={{ overflow: "visible" }}>
        {/* torse (sweat à capuche) */}
        <g transform={`translate(0 ${breath * 1.5})`}>
          {/* bras gauche (salut) derrière */}
          <g transform={`translate(-112 110) rotate(${waveAng})`}>
            <rect x={0} y={-24} width={120} height={48} rx={24} fill={HOODIE_DARK} />
            <circle cx={128} cy={0} r={22} fill={SKIN} />
          </g>
          <path d="M -150 240 Q -150 92 -70 72 L 70 72 Q 150 92 150 240 Z" fill={HOODIE} />
          {/* capuche derrière le cou */}
          <path d="M -86 78 Q 0 30 86 78 Q 60 112 0 112 Q -60 112 -86 78 Z" fill={HOODIE_DARK} />
          {/* cou */}
          <rect x={-24} y={44} width={48} height={44} rx={12} fill={SKIN_SHADE} />
          {/* cordons */}
          <path d={`M -26 104 L -30 ${168 + breath * 2}`} stroke={C.white} strokeWidth={7} strokeLinecap="round" />
          <path d={`M 26 104 L 30 ${168 + breath * 2}`} stroke={C.white} strokeWidth={7} strokeLinecap="round" />
          {/* poche kangourou */}
          <path d="M -72 240 L -56 186 L 56 186 L 72 240 Z" fill={HOODIE_DARK} opacity={0.55} />
          {/* logo </> sur la poitrine */}
          <g transform="translate(70 134)" stroke={C.cyan} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M -12 -10 L -22 0 L -12 10" />
            <path d="M 12 -10 L 22 0 L 12 10" />
            <path d="M 4 -13 L -4 13" />
          </g>
          {/* bras droit : pouce levé */}
          {thumb > 0.02 && (
            <g transform={`translate(112 120) rotate(${thumbAng})`}>
              <rect x={0} y={-24} width={110} height={48} rx={24} fill={HOODIE_DARK} />
              <circle cx={120} cy={0} r={24} fill={SKIN} />
              <rect x={112} y={-48} width={16} height={34} rx={8} fill={SKIN} transform={`rotate(${-thumbAng + 0} 120 0)`} />
            </g>
          )}
        </g>
        {/* tête */}
        <g transform={`translate(0 ${headY + breath}) rotate(${headTilt} 0 40)`}>
          {/* cheveux arrière */}
          <ellipse cx={0} cy={-30} rx={118} ry={124} fill={HAIR} />
          {/* chignon */}
          <circle cx={30} cy={-150} r={44} fill={HAIR} />
          <circle cx={18} cy={-162} r={14} fill={HAIR_LIGHT} />
          {/* oreilles */}
          <ellipse cx={-98} cy={4} rx={16} ry={22} fill={SKIN_SHADE} />
          <ellipse cx={98} cy={4} rx={16} ry={22} fill={SKIN_SHADE} />
          {/* visage */}
          <ellipse cx={0} cy={0} rx={98} ry={106} fill={SKIN} />
          {/* frange */}
          <path d="M -104 -20 Q -96 -112 0 -116 Q 96 -112 104 -20 Q 70 -66 10 -70 Q -40 -48 -104 -20 Z" fill={HAIR} />
          <path d="M -30 -88 Q 0 -104 40 -96" stroke={HAIR_LIGHT} strokeWidth={8} fill="none" strokeLinecap="round" />
          {/* joues */}
          <ellipse cx={-62} cy={32} rx={16} ry={9} fill="#F08A7E" opacity={expr === "tired" ? 0.2 : 0.5} />
          <ellipse cx={62} cy={32} rx={16} ry={9} fill="#F08A7E" opacity={expr === "tired" ? 0.2 : 0.5} />
          {eyes()}
          {/* lunettes rondes */}
          <g stroke={INK} strokeWidth={5} fill="none">
            <circle cx={-42} cy={-2} r={27} />
            <circle cx={42} cy={-2} r={27} />
            <path d="M -15 -4 Q 0 -12 15 -4" />
          </g>
          {/* sourcils */}
          <rect x={-62} y={brows[1]} width={36} height={8} rx={4} fill={HAIR} transform={`rotate(${-brows[0]} -44 ${brows[1]})`} />
          <rect x={26} y={brows[1]} width={36} height={8} rx={4} fill={HAIR} transform={`rotate(${brows[0]} 44 ${brows[1]})`} />
          {/* nez */}
          <path d="M -2 18 Q 6 28 -4 32" stroke={SKIN_SHADE} strokeWidth={5} fill="none" strokeLinecap="round" />
          {mouth()}
          {/* goutte de sueur quand elle est fatiguée */}
          {expr === "tired" && (
            <path
              d={`M 104 ${-50 + ((frame * 1.5) % 40)} q 10 18 0 26 q -10 -8 0 -26 Z`}
              fill={C.cyan}
              opacity={0.85}
            />
          )}
        </g>
      </svg>
    </div>
  );
};
