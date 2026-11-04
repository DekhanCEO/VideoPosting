import "@fontsource/poppins/700.css";
import "@fontsource/poppins/800.css";
import "@fontsource/poppins/900.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/inter/800.css";
import { useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";

export const C = {
  bg: "#0F172A",
  bg2: "#162036",
  panel: "#1E293B",
  panel2: "#273449",
  line: "#334155",
  violet: "#8B5CF6",
  violetDark: "#6D28D9",
  violetLight: "#C4B5FD",
  cyan: "#22D3EE",
  cyanDark: "#0891B2",
  orange: "#F97316",
  orangeLight: "#FDBA74",
  text: "#F8FAFC",
  muted: "#94A3B8",
  red: "#F43F5E",
  green: "#22C55E",
  yellow: "#FACC15",
  white: "#FFFFFF",
  shadow: "rgba(2, 6, 23, 0.45)",
};

export const FONT_TITLE = "Poppins, sans-serif";
export const FONT_BODY = "Inter, sans-serif";

export const W = 1080;
export const H = 1920;
/** Zones de sécurité TikTok / Shorts / Reels : rien d'important au-dessus de 250 px ni sous 1920 - 350 = 1570 px. */
export const SAFE_TOP = 250;
export const SAFE_BOTTOM = 1570;

const FACES = [
  '700 40px "Poppins"',
  '800 40px "Poppins"',
  '900 40px "Poppins"',
  '500 40px "Inter"',
  '600 40px "Inter"',
  '700 40px "Inter"',
  '800 40px "Inter"',
];

/** Bloque le rendu tant que les polices ne sont pas chargées. */
export function useFonts() {
  const [handle] = useState(() => delayRender("Chargement des polices"));
  useEffect(() => {
    Promise.all(FACES.map((f) => document.fonts.load(f))).then(() => continueRender(handle));
  }, [handle]);
}

/** Ombre portée légère des aplats. */
export const dropShadow = "drop-shadow(0 14px 0 rgba(2,6,23,0.35))";
export const softShadow = "0 18px 0 rgba(2,6,23,0.35), 0 30px 60px rgba(2,6,23,0.35)";
