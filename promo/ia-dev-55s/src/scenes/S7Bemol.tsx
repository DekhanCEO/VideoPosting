import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { bounce, clamp } from "../anim";
import { Pixo } from "../characters/Pixo";
import { Brain, EmojiWarning, Eye, Flask } from "../components/icons";
import { Background, SlideCard } from "../components/ui";
import { CUES, mouthAt } from "../data";
import { C, FONT_BODY, FONT_TITLE } from "../theme";

const K = CUES.bemol;
const CARDS = [
  { text: "Relis le code", Icon: Eye, color: C.violet },
  { text: "Teste", Icon: Flask, color: C.green },
  { text: "Comprends ce que tu fais", Icon: Brain, color: "#F472B6" },
];

export const S7Bemol: React.FC<{ f: number; abs: number }> = ({ f, abs }) => {
  const titleIn = bounce(f, 2);
  const titleOut = interpolate(f, [K.titleOut, K.titleOut + 8], [1, 0], clamp);
  const glow = f >= K.amplify ? Math.min(1, (f - K.amplify) / 30) : 0;
  return (
    <AbsoluteFill>
      <Background frame={abs} tint={C.orange} dim={0.25} />
      {/* « Mais attention ⚠️ » (s'efface quand la 3e carte arrive : 12 mots max à l'écran) */}
      <div
        style={{
          position: "absolute",
          top: 285 - (1 - titleOut) * 60,
          left: 60,
          right: 60,
          textAlign: "center",
          fontFamily: FONT_TITLE,
          fontWeight: 900,
          fontSize: 126,
          lineHeight: 1.0,
          color: C.text,
          transform: `scale(${titleIn})`,
          opacity: titleOut,
          letterSpacing: -1,
        }}
      >
        <div>Mais</div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 26 }}>
          <span style={{ color: C.orange }}>attention</span>
          <span style={{ display: "inline-block", transform: `scale(${1 + 0.08 * Math.sin(f / 3)})` }}>
            <EmojiWarning size={120} />
          </span>
        </div>
      </div>

      {/* Pixo, sérieux, lève un doigt */}
      <div style={{ position: "absolute", left: 540 - 190, top: 560 }}>
        <Pixo
          frame={abs}
          size={380}
          mouth={mouthAt(abs)}
          expr={f >= K.amplify ? "proud" : "serious"}
          fingerUp={interpolate(f, [K.finger, K.finger + 8], [0, 1], clamp)}
          glow={glow > 0 ? (glow * 2) % 1 : 0}
        />
      </div>

      {/* trois cartes en glissement latéral */}
      {CARDS.map((c, i) => (
        <SlideCard
          key={c.text}
          frame={f}
          at={K.cards[i]}
          from={i % 2 ? "right" : "left"}
          style={{ left: 70, top: 1000 + i * 112, width: 940, height: 100, display: "flex", alignItems: "center", gap: 24, padding: "0 30px", boxSizing: "border-box", borderLeft: `14px solid ${c.color}` }}
        >
          <c.Icon size={70} />
          <span style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: 54, color: C.text, whiteSpace: "nowrap" }}>{c.text}</span>
        </SlideCard>
      ))}
    </AbsoluteFill>
  );
};
