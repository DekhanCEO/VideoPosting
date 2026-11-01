/**
 * Publicité verticale Uplink (15 s, 1080 × 1920, 30 i/s) : sombre premium, un seul accent, morphings entre les plans,
 * lumière diagonale aux transitions majeures, bruitages synthétisés (souffle, clic, carillon).
 */
import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { prog } from "./components/anim";
import { Background } from "./components/Background";
import { LightSweep } from "./components/LightSweep";
import { usePubFonts } from "./fonts";
import { Accroche } from "./scenes/01-accroche/Accroche";
import { Revelation } from "./scenes/02-revelation/Revelation";
import { Produit } from "./scenes/03-produit/Produit";
import { Detail } from "./scenes/04-detail/Detail";
import { Cta } from "./scenes/05-cta/Cta";
import { CTA, DETAIL, SFX } from "./timing";

const Sfx: React.FC = () => (
  <>
    {SFX.whoosh.map((at) => (
      <Sequence key={at} from={at} durationInFrames={20} layout="none">
        <Audio src={staticFile("pub/sfx/whoosh.wav")} volume={0.45} />
      </Sequence>
    ))}
    <Sequence from={SFX.tick} durationInFrames={6} layout="none">
      <Audio src={staticFile("pub/sfx/tick.wav")} volume={0.6} />
    </Sequence>
    <Sequence from={SFX.chime} durationInFrames={48} layout="none">
      <Audio src={staticFile("pub/sfx/chime.wav")} volume={0.5} />
    </Sequence>
  </>
);

export const UplinkPub: React.FC = () => {
  usePubFonts();
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background />
      {/* plan 4 : le fond s'assombrit légèrement sur la dernière demi-seconde (et le reste jusqu'à la fin) */}
      <AbsoluteFill style={{ background: "#000", opacity: 0.35 * prog(f, DETAIL.darken[0], DETAIL.darken[1]) }} />
      <Accroche />
      <Revelation />
      <Produit />
      <Detail />
      <Cta />
      <LightSweep />
      <AbsoluteFill style={{ background: "#000", opacity: prog(f, CTA.fadeBlack[0], CTA.fadeBlack[1] - 1, (x) => x) }} />
      <Sfx />
    </AbsoluteFill>
  );
};
