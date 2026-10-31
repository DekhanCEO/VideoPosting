import React from "react";
import { AbsoluteFill, Freeze, useCurrentFrame, useVideoConfig } from "remotion";
import { useFonts } from "./fonts";
import { T } from "./config";
import { FloatingCard } from "./FloatingCard";
import { HomeScreen } from "./HomeScreen";
import { floatProgress, mix, phonePose } from "./motion";
import { Phone } from "./Phone";

const CENTER_X = 540;
const CENTER_Y = 900;

/** Ombre portée au sol : plus large quand le téléphone se présente de trois quarts, plus nette quand il est posé. */
const FloorShadow: React.FC<{ rotY: number; y: number; landed: number; drift: number }> = ({ rotY, y, landed, drift }) => {
  const width = 250 + 330 * Math.cos((rotY * Math.PI) / 180);
  const lift = Math.max(0, -y) / 96; // 1 = encore en l'air
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: CENTER_X - width / 2 + drift,
          top: 1560,
          width,
          height: 84,
          borderRadius: "50%",
          background: "rgba(38,48,68,0.30)",
          filter: `blur(${mix(30, 46, lift)}px)`,
          opacity: mix(1, 0.62, lift),
        }}
      />
      <div
        style={{
          position: "absolute",
          left: CENTER_X - (width * 0.62) / 2 + drift,
          top: 1574,
          width: width * 0.62,
          height: 30,
          borderRadius: "50%",
          background: "rgba(22,28,42,0.42)",
          filter: `blur(${mix(12, 22, lift)}px)`,
          opacity: landed * mix(1, 0.4, lift),
        }}
      />
    </>
  );
};

/** Dernière seconde : plan parfaitement fixe (l'image de fin de flottement est figée). */
export const Launch: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  return frame >= T.floatEnd ? (
    <Freeze frame={T.floatEnd}>
      <Shot />
    </Freeze>
  ) : (
    <Shot />
  );
};

const Shot: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pose = phonePose(frame, fps);
  const f = floatProgress(frame);

  // Parallaxe : plus un plan est proche, plus il se déplace pendant le flottement.
  const drift = (depth: number) => ({ x: f * 12 * depth, y: f * -20 * depth, rot: f * 2.5 * depth });

  return (
    <AbsoluteFill style={{ background: "#D3DBE4", overflow: "hidden" }}>
      {/* Fond gris-bleu doux, lumière haute, sol suggéré */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(70% 46% at ${50 - f * 1.2}% ${36 + f * 0.6}%, #F1F4F8 0%, #E1E7EE 42%, #CCD5DF 78%, #BEC8D4 100%)`,
        }}
      />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0) 66%, rgba(255,255,255,0.22) 76%, rgba(150,164,184,0.16) 100%)" }} />

      <FloorShadow rotY={pose.rotY} y={pose.y} landed={pose.s} drift={pose.x * 0.6} />

      <AbsoluteFill style={{ perspective: 2600, perspectiveOrigin: "50% 42%" }}>
        <Phone {...pose} centerX={CENTER_X} centerY={CENTER_Y}>
          <HomeScreen />
        </Phone>
        <FloatingCard kind="pill" start={T.card1} x={756} y={392} z={150} rotY={-9} rotX={3} drift={drift(1.5)} />
        <FloatingCard kind="chip" start={T.card2} x={266} y={1100} z={230} rotY={-6} rotX={2} drift={drift(1.9)} />
        <FloatingCard kind="disc" start={T.card3} x={758} y={1452} z={180} rotY={-10} rotX={4} drift={drift(1.7)} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
