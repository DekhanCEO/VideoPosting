import React from "react";
import { PHONE } from "../layout";

/**
 * Cadre de téléphone sobre et sans marque : corps graphite, liseré clair, petite pastille de caméra.
 * L'écran est fourni par l'appelant (il peut naître d'un morphing), le corps peut apparaître en fondu.
 */
export const PhoneBody: React.FC<{ opacity: number }> = ({ opacity }) => (
  <div
    style={{
      position: "absolute",
      left: PHONE.cx - PHONE.w / 2,
      top: PHONE.cy - PHONE.h / 2,
      width: PHONE.w,
      height: PHONE.h,
      borderRadius: PHONE.r,
      opacity,
      background: "linear-gradient(150deg, #2C2C33 0%, #17171C 45%, #101014 100%)",
      boxShadow: "0 70px 140px -40px rgba(0,0,0,0.85), inset 0 0 0 1.5px rgba(255,255,255,0.09), inset 0 2px 0 rgba(255,255,255,0.06)",
    }}
  />
);

export const CameraPill: React.FC<{ opacity: number }> = ({ opacity }) => (
  <div style={{ position: "absolute", left: PHONE.cx - 50, top: PHONE.cy - PHONE.h / 2 + PHONE.inset + 22, width: 100, height: 30, borderRadius: 15, background: "#050507", opacity }} />
);
