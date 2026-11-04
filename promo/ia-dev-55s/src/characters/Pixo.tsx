import React from "react";
import { autoBlink, breathe } from "../anim";
import { C } from "../theme";

export type PixoExpr = "neutral" | "happy" | "serious" | "wow" | "proud";

export type PixoProps = {
  /** image courante (pour la respiration, le flottement, les clignements) */
  frame: number;
  /** ouverture de la bouche 0..1 (lip-sync piloté par l'amplitude de la voix) */
  mouth?: number;
  expr?: PixoExpr;
  /** direction du regard, -1..1 */
  lookX?: number;
  lookY?: number;
  /** 0 → 1 : bras droit (côté droit de l'image) qui pointe */
  point?: number;
  /** angle du bras qui pointe, en degrés (0 = horizontal vers la droite, négatif = vers le haut) */
  pointAngle?: number;
  /** 0 → 1 : bras gauche levé, index en l'air */
  fingerUp?: number;
  /** salut de la main (bras droit) */
  wave?: boolean;
  /** yeux spéciaux */
  eyes?: "normal" | "clock" | "star";
  /** clignement forcé 0..1 (sinon clignements automatiques) */
  blink?: number;
  /** halo de l'antenne 0..1 (« amplifie ») */
  glow?: number;
  size?: number;
  style?: React.CSSProperties;
};

const BODY = "#EEF2FF";
const BODY_SHADE = "#C7D2FE";
const VISOR = "#0B1124";

/** Pixo : petit robot rond qui incarne l'IA. SVG plat, animé par props. */
export const Pixo: React.FC<PixoProps> = ({
  frame,
  mouth = 0,
  expr = "neutral",
  lookX = 0,
  lookY = 0,
  point = 0,
  pointAngle = -18,
  fingerUp = 0,
  wave = false,
  eyes = "normal",
  blink,
  glow = 0,
  size = 360,
  style,
}) => {
  const hover = breathe(frame, 0, 7);
  const breath = 1 + breathe(frame, 1.2, 0.012);
  const b = blink ?? autoBlink(frame, 17);
  const ex = lookX * 12;
  const ey = lookY * 9;

  // Bras droit : repos (pend vers le bas) → pointe ; ou salut.
  const restR = 68;
  let angR = restR + (pointAngle - restR) * point;
  if (wave) angR = -60 + Math.sin(frame / 3.2) * 22;
  // Bras gauche : repos → levé (index en l'air)
  const angL = 112;

  // Sourcils selon l'expression
  const brow = {
    neutral: { y: -66, tilt: 0 },
    happy: { y: -72, tilt: -8 },
    serious: { y: -60, tilt: 14 },
    wow: { y: -84, tilt: -4 },
    proud: { y: -70, tilt: -12 },
  }[expr];

  const smile = expr === "happy" || expr === "proud" || expr === "wow";
  // 3 formes de bouche : fermée / mi-ouverte / ouverte
  const shape = mouth < 0.14 ? 0 : mouth < 0.5 ? 1 : 2;

  const eye = (cx: number) => {
    if (eyes === "clock") {
      const a = (frame * 24) % 360;
      const a2 = (frame * 2) % 360;
      return (
        <g transform={`translate(${cx + ex} ${-12 + ey})`}>
          <circle r={30} fill={C.white} stroke={C.cyan} strokeWidth={6} />
          <line x1={0} y1={0} x2={0} y2={-20} stroke={C.bg} strokeWidth={5} strokeLinecap="round" transform={`rotate(${a})`} />
          <line x1={0} y1={0} x2={0} y2={-13} stroke={C.orange} strokeWidth={6} strokeLinecap="round" transform={`rotate(${a2})`} />
          <circle r={4} fill={C.bg} />
        </g>
      );
    }
    if (eyes === "star") {
      return (
        <g transform={`translate(${cx + ex} ${-12 + ey}) scale(${1 + Math.sin(frame / 3) * 0.06})`}>
          <path d="M0 -30 L8 -9 L30 -9 L12 4 L19 26 L0 12 L-19 26 L-12 4 L-30 -9 L-8 -9 Z" fill={C.yellow} />
        </g>
      );
    }
    const ry = 30 * (1 - b * 0.92);
    return (
      <g transform={`translate(${cx + ex} ${-12 + ey})`}>
        <ellipse rx={expr === "wow" ? 28 : 24} ry={expr === "wow" ? ry * 1.12 : ry} fill={C.cyan} />
        <ellipse rx={(expr === "wow" ? 28 : 24) * 0.55} ry={ry * 0.55} fill="#A5F3FC" opacity={0.55} />
        {b < 0.5 && <circle cx={-8} cy={-12} r={7} fill={C.white} />}
        {/* paupière « sérieux » : le haut de l'œil est masqué */}
        {expr === "serious" && <rect x={-30} y={-40} width={60} height={24} fill={VISOR} />}
      </g>
    );
  };

  return (
    <div style={{ width: size, height: size * 1.15, position: "relative", ...style }}>
      <svg viewBox="-210 -250 420 483" width={size} height={size * 1.15} style={{ overflow: "visible" }}>
        {/* ombre au sol */}
        <ellipse cx={0} cy={215} rx={110 - hover * 2} ry={16} fill="rgba(2,6,23,0.45)" />
        <g transform={`translate(0 ${hover}) scale(1 ${breath})`}>
          {/* flamme du propulseur */}
          <path
            d={`M -26 140 Q 0 ${200 + Math.sin(frame / 2) * 10} 26 140 Z`}
            fill={C.orange}
            opacity={0.9}
          />
          <path d={`M -14 140 Q 0 ${178 + Math.sin(frame / 2 + 1) * 6} 14 140 Z`} fill={C.yellow} />
          {/* antenne */}
          <line x1={0} y1={-150} x2={0} y2={-196} stroke={BODY_SHADE} strokeWidth={10} strokeLinecap="round" />
          {glow > 0 && (
            <>
              <circle cx={0} cy={-206} r={22 + glow * 50} fill="none" stroke={C.cyan} strokeWidth={6} opacity={(1 - glow) * 0.8} />
              <circle cx={0} cy={-206} r={22 + ((glow * 2) % 1) * 70} fill="none" stroke={C.violet} strokeWidth={5} opacity={0.6 * (1 - ((glow * 2) % 1))} />
            </>
          )}
          <circle cx={0} cy={-206} r={17} fill={C.orange} />
          <circle cx={-5} cy={-211} r={5} fill={C.orangeLight} />
          {/* bras gauche au repos (derrière le corps) */}
          {fingerUp === 0 && (
            <g transform={`translate(-138 34) rotate(${angL})`}>
              <rect x={0} y={-15} width={78} height={30} rx={15} fill={BODY_SHADE} />
              <circle cx={84} cy={0} r={22} fill={C.violet} />
            </g>
          )}
          {/* oreilles */}
          <rect x={-168} y={-40} width={34} height={70} rx={14} fill={C.violet} />
          <rect x={134} y={-40} width={34} height={70} rx={14} fill={C.violet} />
          {/* corps */}
          <circle cx={0} cy={0} r={150} fill={BODY} />
          <path d="M 150 0 A 150 150 0 0 1 -60 137 A 160 160 0 0 0 150 0 Z" fill={BODY_SHADE} />
          <ellipse cx={-70} cy={-92} rx={36} ry={20} fill={C.white} transform="rotate(-35 -70 -92)" />
          {/* visière */}
          <rect x={-118} y={-86} width={236} height={150} rx={66} fill={C.violet} />
          <rect x={-108} y={-77} width={216} height={132} rx={60} fill={VISOR} />
          {/* joues */}
          <ellipse cx={-82} cy={30} rx={16} ry={9} fill={C.violet} opacity={smile ? 0.75 : 0.35} />
          <ellipse cx={82} cy={30} rx={16} ry={9} fill={C.violet} opacity={smile ? 0.75 : 0.35} />
          {/* yeux */}
          {eye(-46)}
          {eye(46)}
          {/* sourcils */}
          {eyes === "normal" && (
            <>
              <rect x={-66} y={brow.y} width={40} height={9} rx={4.5} fill={C.cyan} transform={`rotate(${brow.tilt} -46 ${brow.y})`} />
              <rect x={26} y={brow.y} width={40} height={9} rx={4.5} fill={C.cyan} transform={`rotate(${-brow.tilt} 46 ${brow.y})`} />
            </>
          )}
          {/* bouche : 3 formes */}
          <g transform={`translate(${ex * 0.4} 30)`}>
            {shape === 0 &&
              (smile ? (
                <path d="M -20 -2 Q 0 16 20 -2" stroke={C.cyan} strokeWidth={7} fill="none" strokeLinecap="round" />
              ) : (
                <rect x={-16} y={-3} width={32} height={7} rx={3.5} fill={C.cyan} />
              ))}
            {shape === 1 && <rect x={-17} y={-8} width={34} height={16} rx={8} fill={C.cyan} />}
            {shape === 2 && (
              <g>
                <ellipse cx={0} cy={2} rx={20} ry={16} fill={C.cyan} />
                <ellipse cx={0} cy={8} rx={11} ry={6} fill={C.orange} />
              </g>
            )}
          </g>
          {/* ventre : voyant */}
          <circle cx={0} cy={100} r={13} fill={C.cyan} opacity={0.5 + 0.5 * Math.abs(Math.sin(frame / 9))} />
          {/* bras gauche levé, index en l'air (devant, hors du corps) */}
          {fingerUp > 0 && (() => {
            const ang = 112 + (-128 - 112) * fingerUp;
            const r = (ang * Math.PI) / 180;
            const hx = -150 + Math.cos(r) * 84;
            const hy = 34 + Math.sin(r) * 84;
            return (
              <g>
                <g transform={`translate(-150 34) rotate(${ang})`}>
                  <rect x={0} y={-15} width={78} height={30} rx={15} fill={BODY_SHADE} />
                </g>
                {fingerUp > 0.5 && <rect x={hx - 9} y={hy - 52} width={18} height={40} rx={9} fill={C.violet} />}
                <circle cx={hx} cy={hy} r={23} fill={C.violet} />
              </g>
            );
          })()}
          {/* bras droit (devant) */}
          <g transform={`translate(138 34) rotate(${angR})`}>
            <rect x={0} y={-15} width={82} height={30} rx={15} fill={BODY_SHADE} />
            <circle cx={88} cy={0} r={22} fill={C.violet} />
            {(point > 0.4 || wave) && <rect x={96} y={-9} width={36} height={18} rx={9} fill={C.violet} />}
          </g>
        </g>
      </svg>
    </div>
  );
};
