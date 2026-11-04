import React from "react";
import { C } from "../theme";

type P = { size?: number; style?: React.CSSProperties };

const S: React.FC<P & { vb?: string; children: React.ReactNode }> = ({ size = 120, style, vb = "0 0 100 100", children }) => (
  <svg viewBox={vb} width={size} height={size} style={{ overflow: "visible", display: "block", ...style }}>
    {children}
  </svg>
);

/* ---- émojis dessinés en SVG plat (le moteur de rendu n'a pas de police emoji) ---- */

/** 😅 */
export const EmojiSweat: React.FC<P> = (p) => (
  <S {...p}>
    <circle cx={50} cy={50} r={46} fill={C.yellow} />
    <path d="M 50 92 A 42 42 0 0 0 92 50 A 46 46 0 0 1 50 96 Z" fill="#EAB308" />
    <path d="M 26 40 Q 33 33 40 40" stroke="#713F12" strokeWidth={5} fill="none" strokeLinecap="round" />
    <path d="M 60 40 Q 67 33 74 40" stroke="#713F12" strokeWidth={5} fill="none" strokeLinecap="round" />
    <path d="M 24 56 Q 50 86 76 56 Z" fill="#713F12" />
    <path d="M 30 58 L 70 58 L 66 64 L 34 64 Z" fill={C.white} />
    <path d="M 82 10 q 12 18 0 26 q -12 -8 0 -26 Z" fill={C.cyan} />
  </S>
);

/** ⚠️ */
export const EmojiWarning: React.FC<P> = (p) => (
  <S {...p}>
    <path d="M 50 6 L 96 88 Q 98 94 92 94 L 8 94 Q 2 94 4 88 Z" fill={C.orange} strokeLinejoin="round" />
    <rect x={44} y={32} width={12} height={36} rx={6} fill={C.bg} />
    <circle cx={50} cy={79} r={7} fill={C.bg} />
  </S>
);

/** 👇 : poing fermé, index pointé vers le bas */
export const EmojiPointDown: React.FC<P> = (p) => (
  <S {...p}>
    <rect x={24} y={0} width={56} height={12} rx={5} fill={C.cyan} />
    <rect x={20} y={8} width={64} height={50} rx={18} fill="#FCD34D" />
    <path d="M 52 30 L 52 54 M 66 30 L 66 54" stroke="#D97706" strokeWidth={4} strokeLinecap="round" />
    <ellipse cx={24} cy={34} rx={9} ry={16} fill="#FBBF24" />
    <rect x={30} y={36} width={20} height={60} rx={10} fill="#FCD34D" />
    <path d="M 34 84 Q 40 90 46 84" stroke="#D97706" strokeWidth={3.5} fill="none" strokeLinecap="round" />
  </S>
);

/* ---- icônes ---- */

export const Check: React.FC<P & { color?: string; bg?: string }> = ({ color = C.bg, bg = C.green, ...p }) => (
  <S {...p}>
    <circle cx={50} cy={50} r={46} fill={bg} />
    <path d="M 28 52 L 44 67 L 73 36" stroke={color} strokeWidth={11} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </S>
);

export const Cross: React.FC<P> = (p) => (
  <S {...p}>
    <circle cx={50} cy={50} r={46} fill={C.red} />
    <path d="M 33 33 L 67 67 M 67 33 L 33 67" stroke={C.white} strokeWidth={11} strokeLinecap="round" />
  </S>
);

export const Bulb: React.FC<P> = (p) => (
  <S {...p}>
    <circle cx={50} cy={42} r={32} fill={C.yellow} />
    <rect x={36} y={66} width={28} height={16} rx={4} fill="#CBD5E1" />
    <rect x={40} y={84} width={20} height={8} rx={4} fill="#94A3B8" />
    <path d="M 42 50 L 50 40 L 58 50" stroke="#B45309" strokeWidth={5} fill="none" strokeLinecap="round" />
    <circle cx={38} cy={30} r={7} fill={C.white} opacity={0.7} />
  </S>
);

export const Wireframe: React.FC<P> = (p) => (
  <S {...p}>
    <rect x={14} y={6} width={72} height={88} rx={12} fill={C.white} />
    <rect x={24} y={18} width={52} height={22} rx={5} fill={C.violetLight} />
    <rect x={24} y={46} width={36} height={7} rx={3.5} fill="#CBD5E1" />
    <rect x={24} y={58} width={52} height={7} rx={3.5} fill="#CBD5E1" />
    <rect x={24} y={72} width={28} height={12} rx={6} fill={C.violet} />
  </S>
);

export const CodeIcon: React.FC<P> = (p) => (
  <S {...p}>
    <rect x={4} y={10} width={92} height={80} rx={16} fill={C.panel2} />
    <g stroke={C.cyan} strokeWidth={8} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M 36 34 L 22 50 L 36 66" />
      <path d="M 64 34 L 78 50 L 64 66" />
    </g>
    <path d="M 55 30 L 45 70" stroke={C.orange} strokeWidth={8} strokeLinecap="round" />
  </S>
);

export const Rocket: React.FC<P & { flame?: number }> = ({ flame = 1, ...p }) => (
  <S {...p}>
    <path d={`M 40 74 Q 50 ${74 + 24 * flame} 60 74 Z`} fill={C.orange} />
    <path d="M 50 4 Q 76 26 70 70 L 30 70 Q 24 26 50 4 Z" fill={C.white} />
    <path d="M 30 50 L 14 74 L 32 70 Z" fill={C.violet} />
    <path d="M 70 50 L 86 74 L 68 70 Z" fill={C.violet} />
    <circle cx={50} cy={38} r={10} fill={C.cyan} stroke={C.violet} strokeWidth={4} />
  </S>
);

export const Eye: React.FC<P> = (p) => (
  <S {...p}>
    <path d="M 4 50 Q 50 4 96 50 Q 50 96 4 50 Z" fill={C.white} />
    <circle cx={50} cy={50} r={20} fill={C.violet} />
    <circle cx={50} cy={50} r={9} fill={C.bg} />
    <circle cx={56} cy={44} r={5} fill={C.white} />
  </S>
);

export const Flask: React.FC<P> = (p) => (
  <S {...p}>
    <path d="M 38 6 L 62 6 L 62 14 L 58 14 L 58 40 L 86 86 Q 90 94 80 94 L 20 94 Q 10 94 14 86 L 42 40 L 42 14 L 38 14 Z" fill={C.white} />
    <path d="M 30 64 L 70 64 L 82 86 Q 84 90 78 90 L 22 90 Q 16 90 18 86 Z" fill={C.green} />
    <circle cx={44} cy={76} r={5} fill={C.white} opacity={0.7} />
    <circle cx={58} cy={70} r={3.5} fill={C.white} opacity={0.7} />
  </S>
);

export const Brain: React.FC<P> = (p) => (
  <S {...p}>
    <path
      d="M 48 12 Q 30 6 22 22 Q 6 26 10 44 Q 2 58 16 68 Q 18 86 36 86 Q 44 94 48 88 Z"
      fill="#F9A8D4"
    />
    <path d="M 52 12 Q 70 6 78 22 Q 94 26 90 44 Q 98 58 84 68 Q 82 86 64 86 Q 56 94 52 88 Z" fill="#F472B6" />
    <g stroke="#BE185D" strokeWidth={4} fill="none" strokeLinecap="round">
      <path d="M 26 36 Q 36 34 38 44" />
      <path d="M 22 60 Q 32 54 40 62" />
      <path d="M 74 36 Q 64 34 62 44" />
      <path d="M 78 60 Q 68 54 60 62" />
    </g>
  </S>
);

export const Bubble: React.FC<P & { dots?: number }> = ({ dots = 3, ...p }) => (
  <S {...p}>
    <path d="M 14 10 L 86 10 Q 96 10 96 20 L 96 62 Q 96 72 86 72 L 40 72 L 22 90 L 24 72 L 14 72 Q 4 72 4 62 L 4 20 Q 4 10 14 10 Z" fill={C.white} />
    {[0, 1, 2].slice(0, dots).map((i) => (
      <circle key={i} cx={30 + i * 20} cy={41} r={7} fill={C.violet} />
    ))}
  </S>
);

export const Star: React.FC<P & { color?: string }> = ({ color = C.yellow, ...p }) => (
  <S {...p}>
    <path d="M50 4 L62 36 L96 38 L70 60 L79 94 L50 75 L21 94 L30 60 L4 38 L38 36 Z" fill={color} strokeLinejoin="round" />
  </S>
);

export const Hourglass: React.FC<P & { t?: number }> = ({ t = 0, ...p }) => (
  <S {...p}>
    <rect x={18} y={4} width={64} height={10} rx={5} fill={C.orange} />
    <rect x={18} y={86} width={64} height={10} rx={5} fill={C.orange} />
    <path d="M 26 14 L 74 14 Q 74 40 54 50 Q 74 60 74 86 L 26 86 Q 26 60 46 50 Q 26 40 26 14 Z" fill={C.white} />
    <path d={`M ${34 + t * 10} ${22 + t * 18} L ${66 - t * 10} ${22 + t * 18} Q 60 40 50 48 Q 40 40 ${34 + t * 10} ${22 + t * 18} Z`} fill={C.yellow} />
    <path d={`M 32 80 L 68 80 Q 62 ${74 - t * 14} 50 ${70 - t * 16} Q 38 ${74 - t * 14} 32 80 Z`} fill={C.yellow} />
  </S>
);

/** Fenêtre d'erreur plate (aucun texte : icône + barres). */
export const ErrorWindow: React.FC<P & { w?: number }> = ({ w = 380, style }) => (
  <div style={{ width: w, borderRadius: 26, overflow: "hidden", background: C.panel, boxShadow: "0 14px 0 rgba(2,6,23,0.35)", ...style }}>
    <div style={{ height: 52, background: C.red, display: "flex", alignItems: "center", gap: 12, padding: "0 18px" }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ width: 16, height: 16, borderRadius: 8, background: "rgba(255,255,255,0.65)" }} />
      ))}
    </div>
    <div style={{ display: "flex", gap: 22, padding: 24, alignItems: "center" }}>
      <Cross size={74} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ height: 14, borderRadius: 7, background: "#475569", width: "90%" }} />
        <div style={{ height: 14, borderRadius: 7, background: "#475569", width: "65%" }} />
        <div style={{ height: 14, borderRadius: 7, background: C.red, width: "40%", opacity: 0.8 }} />
      </div>
    </div>
  </div>
);

/** Insecte (bug) plat, pattes animées. */
export const BugSvg: React.FC<P & { frame: number }> = ({ frame, ...p }) => {
  const k = Math.sin(frame * 1.6) * 10;
  return (
    <S {...p} vb="-60 -60 120 120">
      <g stroke="#1E293B" strokeWidth={6} strokeLinecap="round">
        {[-18, 0, 18].map((y, i) => (
          <g key={y}>
            <line x1={-20} y1={y} x2={-46} y2={y + (i % 2 ? k : -k)} />
            <line x1={20} y1={y} x2={46} y2={y + (i % 2 ? -k : k)} />
          </g>
        ))}
        <line x1={-8} y1={-36} x2={-22} y2={-54} />
        <line x1={8} y1={-36} x2={22} y2={-54} />
      </g>
      <ellipse cx={0} cy={6} rx={30} ry={38} fill={C.red} />
      <line x1={0} y1={-30} x2={0} y2={44} stroke="#9F1239" strokeWidth={5} />
      <circle cx={-13} cy={0} r={7} fill="#1E293B" />
      <circle cx={14} cy={18} r={6} fill="#1E293B" />
      <circle cx={0} cy={-34} r={16} fill="#1E293B" />
      <circle cx={-6} cy={-37} r={4} fill={C.white} />
      <circle cx={6} cy={-37} r={4} fill={C.white} />
    </S>
  );
};

/** Loupe plate. */
export const Magnifier: React.FC<P> = (p) => (
  <S {...p} vb="0 0 200 200">
    <rect x={118} y={112} width={36} height={86} rx={18} fill={C.orange} transform="rotate(-45 136 155)" />
    <circle cx={84} cy={84} r={70} fill="rgba(34,211,238,0.18)" stroke={C.white} strokeWidth={16} />
    <path d="M 44 64 Q 54 40 78 34" stroke={C.white} strokeWidth={9} fill="none" strokeLinecap="round" opacity={0.7} />
  </S>
);

/** Chronomètre. */
export const Stopwatch: React.FC<P & { a?: number }> = ({ a = 0, ...p }) => (
  <S {...p}>
    <rect x={42} y={2} width={16} height={12} rx={4} fill={C.orange} />
    <circle cx={50} cy={56} r={40} fill={C.white} />
    <circle cx={50} cy={56} r={32} fill="none" stroke={C.cyan} strokeWidth={6} />
    <line x1={50} y1={56} x2={50} y2={32} stroke={C.orange} strokeWidth={6} strokeLinecap="round" transform={`rotate(${a} 50 56)`} />
    <circle cx={50} cy={56} r={5} fill={C.bg} />
  </S>
);

export const Calendar: React.FC<P & { color?: string }> = ({ color = C.violet, ...p }) => (
  <S {...p}>
    <rect x={8} y={14} width={84} height={78} rx={14} fill={C.white} />
    <rect x={8} y={14} width={84} height={24} rx={12} fill={color} />
    <rect x={8} y={28} width={84} height={10} fill={color} />
    {[0, 1, 2, 3].map((i) =>
      [0, 1, 2].map((j) => <rect key={`${i}-${j}`} x={18 + i * 19} y={46 + j * 15} width={12} height={9} rx={3} fill="#CBD5E1" />),
    )}
    <rect x={26} y={6} width={8} height={18} rx={4} fill={C.bg} />
    <rect x={66} y={6} width={8} height={18} rx={4} fill={C.bg} />
  </S>
);
