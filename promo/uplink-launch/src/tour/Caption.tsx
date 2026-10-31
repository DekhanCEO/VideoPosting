import React from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ACCENT, APP_NAME, INK, MUTED } from "../config";
import { PlayGlyph } from "../icons";
import { FONT, prog } from "./kit";

/** Mot qui monte depuis un masque (et repart vers le haut à la sortie). */
const MaskWord: React.FC<{ children: React.ReactNode; enter: number; exit: number; delay: number }> = ({ children, enter, exit, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - enter - delay, fps, config: { damping: 18, stiffness: 160, mass: 0.7 } });
  const e = interpolate(frame, [exit + delay * 0.4, exit + delay * 0.4 + 10], [0, 1], { easing: Easing.in(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <span style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", padding: "0.06em 0.02em 0.14em", margin: "-0.06em 0 -0.14em" }}>
      <span style={{ display: "inline-block", transform: `translateY(${(1 - p) * 110 - e * 115}%)` }}>{children}</span>
    </span>
  );
};

/** Titre de chapitre : numéro, titre en gros, phrase d'explication. */
export const Caption: React.FC<{ n: number; kicker: string; title: string; sub: string; duration: number }> = ({ n, kicker, title, sub, duration }) => {
  const exit = duration - 14;
  const words = title.split(" ");
  const subWords = sub.split(" ");
  return (
    <div style={{ position: "absolute", top: 156, left: 72, right: 72, fontFamily: FONT, color: INK }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 25, fontWeight: 800, letterSpacing: 2.2, textTransform: "uppercase", color: ACCENT }}>
        <MaskWord enter={2} exit={exit} delay={0}>
          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 50, height: 36, borderRadius: 11, background: ACCENT, color: "#fff", fontSize: 19, letterSpacing: 0.5, padding: "0 8px" }}>{String(n).padStart(2, "0")}</span>
        </MaskWord>
        <MaskWord enter={2} exit={exit} delay={2}>
          {kicker}
        </MaskWord>
      </div>
      <div style={{ marginTop: 18, fontSize: 82, fontWeight: 800, letterSpacing: -2.6, lineHeight: 1.02, maxWidth: 936 }}>
        {words.map((w, i) => (
          <React.Fragment key={i}>
            <MaskWord enter={5} exit={exit} delay={i * 2}>
              {w}
            </MaskWord>{" "}
          </React.Fragment>
        ))}
      </div>
      <div style={{ marginTop: 18, fontSize: 34, fontWeight: 500, lineHeight: 1.32, color: MUTED, maxWidth: 900 }}>
        {subWords.map((w, i) => (
          <React.Fragment key={i}>
            <MaskWord enter={14} exit={exit} delay={i * 0.7}>
              {w}
            </MaskWord>{" "}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

/** Barre de progression des chapitres, façon « stories ». */
export const ChapterBar: React.FC<{ count: number; current: number; progress: number; visible: number }> = ({ count, current, progress, visible }) => (
  <div style={{ position: "absolute", top: 82, left: 72, right: 72, display: "flex", gap: 8, transform: `translateY(${(1 - visible) * -40}px)`, opacity: visible }}>
    {Array.from({ length: count }, (_, i) => {
      const fill = i < current ? 1 : i === current ? progress : 0;
      return (
        <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(14,15,20,0.1)", overflow: "hidden" }}>
          <div style={{ width: `${fill * 100}%`, height: "100%", background: ACCENT, borderRadius: 3 }} />
        </div>
      );
    })}
  </div>
);

const LogoMark: React.FC<{ size: number }> = ({ size }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size * 0.3,
      background: `linear-gradient(135deg, #8B5CF6, ${ACCENT} 55%, #5B21B6)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: `0 ${size * 0.18}px ${size * 0.4}px -${size * 0.14}px ${ACCENT}`,
    }}
  >
    <PlayGlyph size={size * 0.46} color="#fff" />
  </div>
);

/** Ouverture : logo, nom, promesse, accueil de l'utilisateur. */
export const IntroLockup: React.FC<{ user: string; duration: number }> = ({ user, duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mark = spring({ frame: frame - 2, fps, config: { damping: 11, stiffness: 140, mass: 0.9 } });
  const out = prog(frame, duration - 18, duration, Easing.in(Easing.cubic));
  const hello = spring({ frame: frame - 38, fps, config: { damping: 12, stiffness: 200, mass: 0.6 } });
  const letters = Array.from(APP_NAME);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 640, display: "flex", flexDirection: "column", alignItems: "center", fontFamily: FONT, color: INK, transform: `translateY(${-out * 900}px) scale(${1 - out * 0.25})` }}>
      <div style={{ transform: `scale(${mark}) rotate(${(1 - mark) * -18}deg)` }}>
        <LogoMark size={168} />
      </div>
      <div style={{ marginTop: 40, fontSize: 150, fontWeight: 800, letterSpacing: -6, lineHeight: 1 }}>
        {letters.map((l, i) => (
          <MaskWord key={i} enter={10} exit={10_000} delay={i * 2}>
            {l}
          </MaskWord>
        ))}
      </div>
      <div style={{ marginTop: 22, fontSize: 40, fontWeight: 600, color: MUTED }}>
        {"Le studio de publication des créateurs".split(" ").map((w, i) => (
          <React.Fragment key={i}>
            <MaskWord enter={22} exit={10_000} delay={i * 1.2}>
              {w}
            </MaskWord>{" "}
          </React.Fragment>
        ))}
      </div>
      <div style={{ marginTop: 44, transform: `scale(${hello})` }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 14, padding: "16px 28px", borderRadius: 40, background: "#fff", fontSize: 36, fontWeight: 800, boxShadow: "0 24px 48px -22px rgba(22,28,45,0.45)" }}>
          <span style={{ width: 52, height: 52, borderRadius: 26, background: INK, color: "#fff", fontSize: 21, display: "flex", alignItems: "center", justifyContent: "center" }}>DK</span>
          Bienvenue, {user}
        </span>
      </div>
    </div>
  );
};

/** Fin : logo, promesse et adresse. */
export const OutroLockup: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mark = spring({ frame: frame - 4, fps, config: { damping: 12, stiffness: 150, mass: 0.8 } });
  const url = spring({ frame: frame - 26, fps, config: { damping: 12, stiffness: 200, mass: 0.6 } });
  return (
    <div style={{ position: "absolute", left: 72, right: 72, top: 150, fontFamily: FONT, color: INK }}>
      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        <div style={{ transform: `scale(${mark}) rotate(${(1 - mark) * -14}deg)` }}>
          <LogoMark size={104} />
        </div>
        <div style={{ fontSize: 104, fontWeight: 800, letterSpacing: -4, lineHeight: 1 }}>
          {Array.from(APP_NAME).map((l, i) => (
            <MaskWord key={i} enter={6} exit={10_000} delay={i * 2}>
              {l}
            </MaskWord>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 26, fontSize: 64, fontWeight: 800, letterSpacing: -2, lineHeight: 1.05 }}>
        {"Publiez partout. Pilotez tout.".split(" ").map((w, i) => (
          <React.Fragment key={i}>
            <MaskWord enter={14} exit={10_000} delay={i * 2}>
              {w}
            </MaskWord>{" "}
          </React.Fragment>
        ))}
      </div>
      <div style={{ marginTop: 22, transform: `scale(${url})`, transformOrigin: "0 50%" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "12px 20px", borderRadius: 30, background: ACCENT, color: "#fff", fontSize: 30, fontWeight: 800 }}>www.dsociety.fr/uplink</span>
      </div>
    </div>
  );
};
