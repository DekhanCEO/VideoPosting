import React from "react";
import { AbsoluteFill } from "remotion";
import { BG } from "../theme";

/** Fond noir profond avec un léger dégradé radial (la lumière vient d'au-dessus du centre). */
export const Background: React.FC = () => (
  <AbsoluteFill style={{ background: BG }}>
    <AbsoluteFill style={{ background: "radial-gradient(70% 42% at 50% 40%, #191922 0%, rgba(11,11,15,0) 72%)" }} />
  </AbsoluteFill>
);
