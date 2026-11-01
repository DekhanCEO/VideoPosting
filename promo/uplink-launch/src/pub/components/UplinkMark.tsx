import React from "react";
import { PlayGlyph } from "../../icons";
import { ACCENT, BG } from "../theme";

/** Pictogramme d'Uplink : carré arrondi à l'accent, triangle de lecture sombre. */
export const UplinkMark: React.FC<{ size: number; glyph?: number }> = ({ size, glyph = 1 }) => (
  <div style={{ width: size, height: size, borderRadius: size * 0.3, background: ACCENT, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 ${size * 0.2}px ${size * 0.5}px -${size * 0.2}px rgba(155,107,255,0.55)` }}>
    <div style={{ opacity: glyph, transform: `scale(${0.7 + 0.3 * glyph}) translateX(${size * 0.02}px)` }}>
      <PlayGlyph size={size * 0.42} color={BG} />
    </div>
  </div>
);
