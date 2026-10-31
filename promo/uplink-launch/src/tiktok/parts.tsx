/** Briques communes de la version TikTok : fonds, gros titres, téléphone, transitions. */
import React from "react";
import { AbsoluteFill, Easing, Freeze, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ACCENT, INK, MUTED } from "../config";
import { clamp01, mix } from "../motion";
import { PHONE_H, Phone } from "../Phone";
import { FONT } from "../tour/kit";

/* Zones sûres TikTok (1080×1920) : rien d'important au-dessus de 230 px, à droite des 150 derniers px, sous 1450 px. */
export const SAFE_L = 64;
export const SAFE_R = 150;
export const TEXT_TOP = 236;
export const CENTER_X = 540;
export const CENTER_Y = 1110;

export const ease = (frame: number, a: number, b: number, easing = Easing.bezier(0.33, 0, 0.2, 1)) =>
  interpolate(frame, [a, b], [0, 1], { easing, extrapolateLeft: "clamp", extrapolateRight: "clamp" });

/** Temps d'un écran accéléré : rapide au début, il se pose sur l'état final. */
export const tmap = (f: number, len: number, from: number, to: number, pow = 2.2) => from + (to - from) * (1 - Math.pow(1 - clamp01(f / (len - 3)), pow));

export const Timed: React.FC<{ screen: React.FC; time: number }> = ({ screen: S, time }) => (
  <Freeze frame={time}>
    <S />
  </Freeze>
);

/* ------------------------------------------------------------------ Fonds */

export type Tone = "light" | "dark";
export const BACKDROPS = {
  light: { tone: "light", css: "radial-gradient(80% 50% at 50% 42%, #F1F4F8 0%, #E1E7EE 42%, #CCD5DF 78%, #BEC8D4 100%)" },
  violet: { tone: "dark", css: "radial-gradient(90% 55% at 50% 38%, #8B5CF6 0%, #6D28D9 50%, #4C1D95 100%)" },
  ink: { tone: "dark", css: "radial-gradient(80% 50% at 50% 42%, #1F1D33 0%, #0F0E18 58%, #08080D 100%)" },
  blurple: { tone: "dark", css: "radial-gradient(90% 55% at 50% 38%, #7C86F6 0%, #5865F2 46%, #3B44C4 100%)" },
} as const satisfies Record<string, { tone: Tone; css: string }>;
export type BackdropKind = keyof typeof BACKDROPS;

export const Backdrop: React.FC<{ kind: BackdropKind }> = ({ kind }) => {
  const frame = useCurrentFrame();
  const b = BACKDROPS[kind];
  return (
    <AbsoluteFill style={{ background: b.css }}>
      {/* Halo lent : le fond n'est jamais complètement figé. */}
      <AbsoluteFill style={{ background: `radial-gradient(40% 26% at ${46 + Math.sin(frame / 20) * 8}% ${36 + Math.cos(frame / 24) * 5}%, ${b.tone === "dark" ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.55)"} 0%, rgba(255,255,255,0) 100%)` }} />
    </AbsoluteFill>
  );
};

/* ----------------------------------------------------------------- Titres */

/** Mot qui monte depuis un masque, puis repart vers le haut. */
export const Word: React.FC<{ children: React.ReactNode; enter: number; exit?: number; color?: string }> = ({ children, enter, exit, color }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - enter, fps, config: { damping: 24, stiffness: 320, mass: 0.6 } });
  const e = exit === undefined ? 0 : ease(frame, exit, exit + 5, Easing.in(Easing.cubic));
  return (
    <span style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", padding: "0.06em 0.03em 0.16em", margin: "-0.06em 0 -0.16em", color }}>
      <span style={{ display: "inline-block", transform: `translateY(${(1 - p) * 112 - e * 118}%)` }}>{children}</span>
    </span>
  );
};

/** Découpe une ligne ; « *mot* » (ponctuation finale admise) passe en accent. Une espace insécable garde plusieurs mots dans le même surlignage. */
export function words(line: string) {
  return line.split(" ").map((w) => {
    const m = /^\*(.+)\*([,.!?]?)$/.exec(w);
    return m ? { text: m[1], tail: m[2], accent: true } : { text: w, tail: "", accent: false };
  });
}

export const palette = (tone: Tone) =>
  tone === "light" ? { ink: INK, sub: MUTED, hl: `${ACCENT}1F`, accent: ACCENT } : { ink: "#fff", sub: "rgba(255,255,255,0.82)", hl: "#fff", accent: ACCENT };

/**
 * Gros titre lisible d'un coup d'œil : 2 lignes au plus (séparées par « | »), une phrase courte en dessous.
 * Les mots clés sont surlignés d'un coup de feutre.
 */
export const BigCaption: React.FC<{ title: string; sub?: string; tone: Tone; exit?: number; enter?: number }> = ({ title, sub, tone, exit, enter = 0 }) => {
  const frame = useCurrentFrame();
  const c = palette(tone);
  let k = 0;
  return (
    <div style={{ position: "absolute", top: TEXT_TOP, left: SAFE_L, right: SAFE_R, fontFamily: FONT, color: c.ink }}>
      <div style={{ fontSize: 112, fontWeight: 800, letterSpacing: -4, lineHeight: 1.04 }}>
        {title.split("|").map((line, l) => (
          <div key={l} style={{ whiteSpace: "nowrap" }}>
            {words(line.trim()).map((w, i) => {
              const at = enter + k++ * 2;
              const sweep = ease(frame, at + 3, at + 10, Easing.out(Easing.cubic)) * (exit === undefined ? 1 : 1 - ease(frame, exit, exit + 5));
              return (
                <React.Fragment key={i}>
                  <span style={{ position: "relative", display: "inline-block" }}>
                    {w.accent && <span style={{ position: "absolute", left: -10, right: -10, top: "8%", bottom: "-2%", borderRadius: 18, background: c.hl, transform: `scaleX(${sweep})`, transformOrigin: "0 50%" }} />}
                    <span style={{ position: "relative" }}>
                      <Word enter={at} exit={exit} color={w.accent ? c.accent : undefined}>
                        {w.text}
                      </Word>
                    </span>
                  </span>
                  {w.tail && (
                    <Word enter={at} exit={exit}>
                      {w.tail}
                    </Word>
                  )}{" "}
                </React.Fragment>
              );
            })}
          </div>
        ))}
      </div>
      {sub && (
        <div style={{ marginTop: 20, fontSize: 44, fontWeight: 700, letterSpacing: -0.8, lineHeight: 1.2, color: c.sub, whiteSpace: "nowrap" }}>
          <Word enter={enter + k * 2 + 2} exit={exit}>
            {sub}
          </Word>
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------- Téléphone */

export interface Pose {
  rotY: number;
  rotX: number;
  rotZ: number;
  x: number;
  y: number;
  scale: number;
}
export const pose = (rotY: number, rotX = 8, rotZ = 0, x = 0, y = 0, scale = 1): Pose => ({ rotY, rotX, rotZ, x, y, scale });
export const mixPose = (a: Pose, b: Pose, t: number): Pose => ({
  rotY: mix(a.rotY, b.rotY, t),
  rotX: mix(a.rotX, b.rotX, t),
  rotZ: mix(a.rotZ, b.rotZ, t),
  x: mix(a.x, b.x, t),
  y: mix(a.y, b.y, t),
  scale: mix(a.scale, b.scale, t),
});

/** Scène 3D (perspective commune aux téléphones et aux cartes). */
export const Stage3D: React.FC<{ children: React.ReactNode; perspective?: number }> = ({ children, perspective = 2600 }) => (
  <AbsoluteFill style={{ perspective, perspectiveOrigin: "50% 58%" }}>{children}</AbsoluteFill>
);

export const PhoneAt: React.FC<{ p: Pose; children: React.ReactNode }> = ({ p, children }) => (
  <Phone {...p} centerX={CENTER_X} centerY={CENTER_Y}>
    {children}
  </Phone>
);

export const FloorShadow: React.FC<{ p: Pose }> = ({ p }) => {
  const width = (250 + 320 * Math.abs(Math.cos((p.rotY * Math.PI) / 180))) * p.scale;
  const top = CENTER_Y + (PHONE_H * p.scale) / 2 + 100 + p.y * 0.2;
  const away = clamp01(p.y / 500);
  return (
    <>
      <div style={{ position: "absolute", left: CENTER_X - width / 2 + p.x * 0.6, top, width, height: 80, borderRadius: "50%", background: "rgba(38,48,68,0.30)", filter: "blur(32px)", opacity: 1 - away }} />
      <div style={{ position: "absolute", left: CENTER_X - (width * 0.6) / 2 + p.x * 0.6, top: top + 14, width: width * 0.6, height: 28, borderRadius: "50%", background: "rgba(22,28,42,0.40)", filter: "blur(14px)", opacity: 1 - away }} />
    </>
  );
};

/** Écran qui pousse le précédent vers la gauche à l'image `at`. */
export const PushSwap: React.FC<{ a: React.ReactNode; b: React.ReactNode; at: number; dur?: number }> = ({ a, b, at, dur = 6 }) => {
  const frame = useCurrentFrame();
  const e = ease(frame, at, at + dur, Easing.bezier(0.3, 0, 0.15, 1));
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {e < 1 && <AbsoluteFill style={{ transform: `translateX(${-e * 30}%)`, filter: `brightness(${1 - e * 0.12})` }}>{a}</AbsoluteFill>}
      {e > 0 && <AbsoluteFill style={{ transform: `translateX(${(1 - e) * 100}%)`, boxShadow: e < 1 ? "-20px 0 40px rgba(0,0,0,0.18)" : "none" }}>{b}</AbsoluteFill>}
    </AbsoluteFill>
  );
};

/** Élément qui surgit en 3D (ressort avec dépassement, jamais en fondu). */
export const Pop3D: React.FC<{ start: number; x: number; y: number; z?: number; rotZ?: number; children: React.ReactNode }> = ({ start, x, y, z = 120, rotZ = 0, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < start) return null;
  const s = spring({ frame: frame - start, fps, config: { damping: 10, stiffness: 240, mass: 0.55 } });
  const fl = Math.sin((frame - start) / 12) * 6;
  return <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) translate3d(0, ${fl}px, ${z}px) rotateZ(${rotZ * (1 - s)}deg) scale(${s})` }}>{children}</div>;
};

/* ------------------------------------------------------------- Transitions */

export type Trans = "portal" | "whipL" | "whipR" | "zoom" | "flash";
export const WHIP = 6;

/**
 * Enveloppe d'un plan : entrée (filé, zoom, coup de zoom), sortie filée si le plan suivant arrive en filé.
 * `outWhip` : direction du plan suivant (1 = il arrive par la droite, -1 = par la gauche).
 */
export const ShotFrame: React.FC<{ len: number; inT: Trans; outWhip?: 1 | -1; pre?: number; portalAt?: { x: number; y: number }; children: React.ReactNode }> = ({ len, inT, outWhip, pre = 0, portalAt, children }) => {
  const frame = useCurrentFrame();
  const f = frame - pre;
  let tx = 0;
  let blur = 0;
  let scale = 1;
  if (inT === "whipL" || inT === "whipR") {
    const p = ease(f, 0, WHIP, Easing.out(Easing.cubic));
    tx = (1 - p) * 1080 * (inT === "whipR" ? 1 : -1);
    blur = (1 - p) * 22;
  } else if (inT === "zoom") {
    const p = ease(f, 0, 8, Easing.out(Easing.cubic));
    scale = mix(1.4, 1, p);
    blur = (1 - p) * 16;
  } else if (inT === "flash") {
    scale = 1 + 0.07 * (1 - ease(f, 0, 9, Easing.out(Easing.cubic)));
  }
  if (outWhip && f >= len) {
    const q = ease(f, len, len + WHIP, Easing.in(Easing.cubic));
    tx += -q * 1080 * outWhip;
    blur += q * 22;
  }
  const r = inT === "portal" && portalAt ? interpolate(frame, [0, pre], [0, 2300], { easing: Easing.bezier(0.6, 0, 0.4, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  return (
    <AbsoluteFill
      style={{
        overflow: "hidden",
        transform: tx || scale !== 1 ? `translateX(${tx}px) scale(${scale})` : undefined,
        filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
        clipPath: inT === "portal" && portalAt && frame < pre ? `circle(${r}px at ${portalAt.x}px ${portalAt.y}px)` : undefined,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
