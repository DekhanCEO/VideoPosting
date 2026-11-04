import React from "react";
import { C } from "../theme";

const COLORS = [C.violet, C.cyan, C.orange, C.yellow, C.green, "#F472B6"];

// pseudo-aléatoire déterministe (même rendu à chaque image)
const rnd = (i: number, k: number) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Explosion de confettis à partir de (x, y), démarrant à l'image `at`. */
export const Confetti: React.FC<{ frame: number; at: number; x: number; y: number; count?: number; spread?: number }> = ({
  frame,
  at,
  x,
  y,
  count = 70,
  spread = 1,
}) => {
  const t = frame - at;
  if (t < 0 || t > 50) return null;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}>
      {Array.from({ length: count }, (_, i) => {
        const a = rnd(i, 1) * Math.PI * 2;
        const v = (12 + rnd(i, 2) * 26) * spread;
        const px = x + Math.cos(a) * v * t * (1 - t / 120);
        const py = y + Math.sin(a) * v * t * (1 - t / 120) + 0.55 * t * t;
        const rot = rnd(i, 3) * 360 + t * (rnd(i, 4) * 20 - 10);
        const o = t < 34 ? 1 : 1 - (t - 34) / 16;
        const w = 14 + rnd(i, 5) * 14;
        return (
          <rect
            key={i}
            x={px - w / 2}
            y={py - 6}
            width={w}
            height={i % 3 === 0 ? w : 12}
            rx={i % 3 === 0 ? w / 2 : 3}
            fill={COLORS[i % COLORS.length]}
            opacity={o}
            transform={`rotate(${rot} ${px} ${py})`}
          />
        );
      })}
    </svg>
  );
};
