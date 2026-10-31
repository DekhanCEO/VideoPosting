/**
 * Version TikTok « Signal » (15 s, 9:16) : oscilloscope puis plan-séquence keynote.
 * Acte 1 — oscilloscope : accroche lisible dès l'image 0, trace de phosphore continue (sinusoïde → Lissajous →
 * amortissement → ligne plate d'où sort « UPLINK »), extinction cathodique jusqu'à un point.
 * Acte 2 — plan-séquence keynote : le point devient rouge, fait pousser le bouton « Publier », qui devient carte,
 * puis téléphone, puis le « o » de « Publie partout. » ; le point rouge est le point final.
 */
import React from "react";
import { AbsoluteFill, Freeze, Sequence, useCurrentFrame } from "remotion";
import { useFonts } from "../fonts";
import { KEYNOTE_LEN, Keynote } from "./Keynote";
import { SCOPE_END, Scope } from "./Scope";

export const SIGNAL_DURATION = SCOPE_END + KEYNOTE_LEN; // 450 = 15 s
const HOLD_FROM = SIGNAL_DURATION - 30; // dernière seconde immobile

const Film: React.FC = () => (
  <AbsoluteFill style={{ background: "#010302" }}>
    <Sequence durationInFrames={SCOPE_END + 10} layout="none">
      <Scope />
    </Sequence>
    <Sequence from={SCOPE_END} layout="none">
      <Keynote />
    </Sequence>
  </AbsoluteFill>
);

export const TikTokSignal: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  return frame >= HOLD_FROM ? (
    <Freeze frame={HOLD_FROM}>
      <Film />
    </Freeze>
  ) : (
    <Film />
  );
};
