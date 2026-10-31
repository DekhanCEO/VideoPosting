import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { clamp01, rise } from "./motion";

/** Apparition d'un bloc d'interface : montée et légère mise à l'échelle, ressort vif. */
export const Rise: React.FC<{ start: number; distance?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ start, distance = 34, children, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = rise(frame, fps, start);
  const shown = clamp01((frame - start) / 6);
  return (
    <div style={{ ...style, opacity: shown, transform: `translateY(${(1 - p) * distance}px) scale(${0.97 + 0.03 * p})`, transformOrigin: "50% 100%" }}>
      {children}
    </div>
  );
};
