import React from "react";
import { Easing, interpolate, interpolateColors, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BrandLogo, type Brand } from "../brands";
import { Bars, Calendar, Check, Home, Plus, StatusIcons, User } from "../icons";
import { SCREEN_H, SCREEN_W } from "../Phone";
import { useTheme, useUser } from "../theme";

export const PAD = 20;
export const FONT = '"Plus Jakarta Sans", sans-serif';

/** Progression 0 → 1 entre deux images (avec easing doux par défaut). */
export function prog(frame: number, a: number, b: number, easing = Easing.bezier(0.33, 0, 0.2, 1)) {
  return interpolate(frame, [a, b], [0, 1], { easing, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
}

/** Ressort d'apparition (petit dépassement). */
export function usePop(start: number, config = { damping: 12, stiffness: 200, mass: 0.6 }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame < start ? 0 : spring({ frame: frame - start, fps, config });
}

/** Cadre d'un écran de l'application : barre d'état, titre, avatar, barre d'onglets. */
export const AppScreen: React.FC<{ title: string; eyebrow?: string; tab?: number; children: React.ReactNode }> = ({ title, eyebrow = "Uplink", tab = -1, children }) => {
  const t = useTheme();
  const user = useUser();
  const tabs = [Home, Calendar, null, Bars, User];
  return (
    <div style={{ position: "absolute", inset: 0, width: SCREEN_W, height: SCREEN_H, background: t.bg, color: t.ink, fontFamily: t.font ?? FONT, overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 26, left: 40, right: 34, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 17, fontWeight: 700 }}>9:41</span>
        <StatusIcons color={t.ink} />
      </div>
      <div style={{ position: "absolute", top: 74, left: PAD + 2, right: PAD, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: t.accent, letterSpacing: 0.2 }}>{eyebrow}</div>
          <div style={{ fontSize: 29, fontWeight: 800, letterSpacing: -0.9, marginTop: 1 }}>{title}</div>
        </div>
        <div style={{ width: 38, height: 38, borderRadius: 19, background: t.ink, color: t.dark ? "#0B0B12" : "#fff", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 2 }}>
          {user.initials}
        </div>
      </div>
      <div style={{ position: "absolute", top: 146, left: PAD, right: PAD, bottom: 104 }}>{children}</div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 96, background: t.dark ? "rgba(22,22,31,0.95)" : "rgba(255,255,255,0.95)", borderTop: `1px solid ${t.hairline}`, display: "flex", alignItems: "flex-start", justifyContent: "space-around", paddingTop: 14 }}>
        {tabs.map((Icon, i) =>
          Icon ? (
            <Icon key={i} size={26} color={i === tab ? t.ink : t.muted} />
          ) : (
            <div key={i} style={{ width: 52, height: 52, marginTop: -6, borderRadius: 17, background: t.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Plus size={26} color="#fff" />
            </div>
          ),
        )}
      </div>
      <div style={{ position: "absolute", bottom: 10, left: SCREEN_W / 2 - 68, width: 136, height: 5, borderRadius: 3, background: t.ink }} />
    </div>
  );
};

/** Carte blanche qui monte à son tour. */
export const Card: React.FC<{ start: number; style?: React.CSSProperties; children: React.ReactNode; distance?: number }> = ({ start, style, children, distance = 30 }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const p = usePop(start, { damping: 18, stiffness: 150, mass: 0.7 });
  const shown = Math.min(1, Math.max(0, (frame - start) / 5));
  return (
    <div
      style={{
        background: t.card,
        borderRadius: 22,
        padding: 16,
        boxShadow: t.dark ? `inset 0 0 0 1px ${t.hairline}` : `0 1px 0 ${t.hairline}, 0 12px 26px -20px rgba(14,15,20,0.35)`,
        opacity: shown,
        transform: `translateY(${(1 - p) * distance}px) scale(${0.97 + 0.03 * p})`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const Label: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => {
  const t = useTheme();
  return <div style={{ fontSize: 13.5, fontWeight: 700, color: t.muted, ...style }}>{children}</div>;
};

/** Interrupteur : `on` de 0 (éteint) à 1 (allumé). */
export const Toggle: React.FC<{ on: number }> = ({ on }) => {
  const t = useTheme();
  return (
    <div style={{ width: 48, height: 29, borderRadius: 15, background: interpolateColors(on, [0, 1], [t.dark ? "#33334a" : "#D9DCE4", t.accent]), position: "relative", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 3, left: 3 + on * 19, width: 23, height: 23, borderRadius: 12, background: "#fff", boxShadow: "0 2px 5px rgba(0,0,0,0.18)" }} />
    </div>
  );
};

/** Ligne de réglage : libellé à gauche, contrôle à droite. */
export const SettingRow: React.FC<{ label: string; hint?: string; children: React.ReactNode; last?: boolean }> = ({ label, hint, children, last }) => {
  const t = useTheme();
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "11px 0", borderBottom: last ? "none" : `1px solid ${t.hairline}` }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{label}</div>
        {hint && <div style={{ fontSize: 12.5, fontWeight: 600, color: t.muted, marginTop: 2 }}>{hint}</div>}
      </div>
      {children}
    </div>
  );
};

/** Contrôle segmenté ; `active` peut être fractionnaire pendant une transition. */
export const Segmented: React.FC<{ options: React.ReactNode[]; active: number; height?: number; fontSize?: number }> = ({ options, active, height = 40, fontSize = 14 }) => {
  const t = useTheme();
  const n = options.length;
  return (
    <div style={{ position: "relative", display: "flex", height, borderRadius: 13, background: t.dark ? "#1F1F2B" : "#E9EBF0", padding: 4 }}>
      <div
        style={{
          position: "absolute",
          top: 4,
          bottom: 4,
          left: `calc(4px + ${active} * (100% - 8px) / ${n})`,
          width: `calc((100% - 8px) / ${n})`,
          borderRadius: 10,
          background: t.card,
          boxShadow: "0 2px 6px rgba(14,15,20,0.12)",
        }}
      />
      {options.map((o, i) => (
        <div
          key={i}
          style={{
            position: "relative",
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            fontSize,
            fontWeight: 700,
            color: Math.abs(active - i) < 0.5 ? t.ink : t.muted,
          }}
        >
          {o}
        </div>
      ))}
    </div>
  );
};

export const Badge: React.FC<{ children: React.ReactNode; tone?: "accent" | "neutral" | "solid"; style?: React.CSSProperties }> = ({ children, tone = "accent", style }) => {
  const t = useTheme();
  const tones = {
    accent: { background: `${t.accent}1A`, color: t.accent },
    neutral: { background: t.dark ? "#22222e" : "#EEF0F4", color: t.muted },
    solid: { background: t.accent, color: "#fff" },
  }[tone];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, borderRadius: 10, padding: "5px 9px", fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", ...tones, ...style }}>{children}</span>
  );
};

export const CheckBadge: React.FC<{ label: string; scale?: number }> = ({ label, scale = 1 }) => {
  const t = useTheme();
  return (
    <Badge style={{ transform: `scale(${scale})`, transformOrigin: "100% 50%" }}>
      <Check size={13} color={t.accent} stroke={3} /> {label}
    </Badge>
  );
};

/** Barre de progression / de valeur. */
export const Bar: React.FC<{ value: number; height?: number; color?: string; track?: string }> = ({ value, height = 8, color, track }) => {
  const t = useTheme();
  return (
    <div style={{ height, borderRadius: height / 2, background: track ?? (t.dark ? "#22222e" : "#ECEEF3"), overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.max(0, Math.min(1, value)) * 100}%`, borderRadius: height / 2, background: color ?? t.accent }} />
    </div>
  );
};

/** Logo d'une plateforme dans une vignette neutre (une seule couleur d'accent dans l'image). */
export const BrandTile: React.FC<{ brand: Brand; size?: number; radius?: number }> = ({ brand, size = 44, radius }) => {
  const t = useTheme();
  return (
    <div style={{ width: size, height: size, borderRadius: radius ?? size * 0.3, background: t.dark ? "#22222e" : "#EEF0F4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <BrandLogo brand={brand} size={size * 0.5} color={t.ink} />
    </div>
  );
};

/** Vignette de vidéo ou de photo construite en CSS (titre en capitales sur fond sombre). */
export const Thumb: React.FC<{ title: string; w: number; h: number; radius?: number; glow?: number; badge?: string }> = ({ title, w, h, radius = 14, glow = 0.55, badge }) => {
  const t = useTheme();
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: radius,
        flexShrink: 0,
        position: "relative",
        overflow: "hidden",
        background: `radial-gradient(120% 80% at 80% 10%, ${t.accent}${Math.round(glow * 255).toString(16).padStart(2, "0")} 0%, rgba(0,0,0,0) 55%), linear-gradient(160deg, #2a2b35 0%, #0E0F14 70%)`,
      }}
    >
      <div style={{ position: "absolute", left: w * 0.1, right: w * 0.08, bottom: h * 0.12, color: "#fff", fontWeight: 800, fontSize: Math.max(9, w * 0.13), lineHeight: 1.02, letterSpacing: -0.3, textTransform: "uppercase" }}>{title}</div>
      {badge && (
        <div style={{ position: "absolute", top: 6, left: 6, fontSize: 10, fontWeight: 800, color: "#fff", background: "rgba(0,0,0,0.45)", borderRadius: 6, padding: "2px 6px" }}>{badge}</div>
      )}
    </div>
  );
};

/** Texte qui se tape lettre par lettre (curseur clignotant tant que la saisie n'est pas finie). */
export const Typed: React.FC<{ text: string; start: number; cps?: number }> = ({ text, start, cps = 26 }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chars = Array.from(text);
  const n = Math.max(0, Math.min(chars.length, Math.floor(((frame - start) / fps) * cps)));
  const typing = n < chars.length;
  return (
    <span>
      {chars.slice(0, n).join("")}
      {(typing || Math.floor(frame / 15) % 2 === 0) && frame >= start && <span style={{ display: "inline-block", width: 2, height: "1.05em", background: t.accent, verticalAlign: "text-bottom", marginLeft: 1 }} />}
    </span>
  );
};
