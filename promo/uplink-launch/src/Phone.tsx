import React from "react";

export const PHONE_W = 500;
export const PHONE_H = 1030;
export const RADIUS = 80;
export const DEPTH = 30;
export const BEZEL = 13;
export const SCREEN_W = PHONE_W - BEZEL * 2;
export const SCREEN_H = PHONE_H - BEZEL * 2;

const SLICES = 18;
// Tranche métallique : l'éclairage varie le long du contour.
const METAL = "linear-gradient(90deg, #15171c 0%, #4b515b 7%, #23262d 22%, #2c3038 50%, #1e2127 76%, #626a75 93%, #17191e 100%)";

const SideButton: React.FC<{ side: "left" | "right"; top: number; height: number }> = ({ side, top, height }) => {
  const w = DEPTH * 0.56;
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: side === "right" ? PHONE_W - w / 2 : -w / 2,
        width: w,
        height,
        borderRadius: w / 2,
        background: "linear-gradient(180deg, #5d636d, #2a2d34 45%, #4a505a)",
        transform: `translateX(${side === "right" ? 2.5 : -2.5}px) rotateY(90deg)`,
      }}
    />
  );
};

export const Phone: React.FC<{
  rotX: number;
  rotY: number;
  rotZ: number;
  x: number;
  y: number;
  scale: number;
  centerX: number;
  centerY: number;
  children: React.ReactNode;
}> = ({ rotX, rotY, rotZ, x, y, scale, centerX, centerY, children }) => {
  // Reflet : il glisse sur l'écran quand le téléphone pivote.
  const glare = 18 + ((rotY + 72) / 43) * 52;
  return (
    <div
      style={{
        position: "absolute",
        left: centerX - PHONE_W / 2,
        top: centerY - PHONE_H / 2,
        width: PHONE_W,
        height: PHONE_H,
        transformStyle: "preserve-3d",
        transform: `translate3d(${x}px, ${y}px, 0) rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg) scale(${scale})`,
      }}
    >
      {/* Épaisseur : tranches empilées */}
      {Array.from({ length: SLICES }, (_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: RADIUS,
            background: METAL,
            transform: `translateZ(${-DEPTH / 2 + (i * DEPTH) / (SLICES - 1)}px)`,
          }}
        />
      ))}
      <SideButton side="left" top={210} height={46} />
      <SideButton side="left" top={290} height={86} />
      <SideButton side="left" top={392} height={86} />
      <SideButton side="right" top={320} height={132} />
      {/* Dos */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: RADIUS,
          background: "linear-gradient(140deg, #2a2e36, #1b1d22)",
          transform: `translateZ(${-DEPTH / 2 - 0.6}px) rotateY(180deg)`,
        }}
      />
      {/* Face avant : verre noir, écran, île */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: RADIUS,
          background: "#07080a",
          boxShadow: "inset 0 0 0 1.5px #3a3f48, inset 0 0 0 3px #0c0d10",
          transform: `translateZ(${DEPTH / 2 + 0.6}px)`,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: BEZEL,
            top: BEZEL,
            width: SCREEN_W,
            height: SCREEN_H,
            borderRadius: RADIUS - BEZEL,
            overflow: "hidden",
            transform: "translateZ(0)",
          }}
        >
          {children}
          <div
            style={{
              position: "absolute",
              top: 18,
              left: SCREEN_W / 2 - 62,
              width: 124,
              height: 36,
              borderRadius: 18,
              background: "#050506",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background: "linear-gradient(112deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.24) 44%, rgba(255,255,255,0.06) 52%, rgba(255,255,255,0) 62%)",
              backgroundSize: "260% 100%",
              backgroundPosition: `${glare}% 0`,
              mixBlendMode: "screen",
            }}
          />
        </div>
      </div>
    </div>
  );
};
