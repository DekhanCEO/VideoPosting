import React from "react";
import { AbsoluteFill } from "remotion";
import { Lea } from "./characters/Lea";
import { Pixo } from "./characters/Pixo";
import { CodeIcon } from "./components/icons";
import { Background } from "./components/ui";
import { C, FONT_TITLE, useFonts } from "./theme";

/** Couverture 1080x1920 : « L'IA dans le dev : le guide en 55 s ». */
export const Thumbnail: React.FC = () => {
  useFonts();
  return (
    <AbsoluteFill>
      <Background frame={40} tint={C.violet} />
      <div
        style={{
          position: "absolute",
          top: 290,
          left: 60,
          right: 60,
          fontFamily: FONT_TITLE,
          fontWeight: 900,
          fontSize: 150,
          lineHeight: 1.14,
          letterSpacing: -2,
          color: C.text,
          textShadow: "0 12px 0 rgba(2,6,23,0.5)",
        }}
      >
        <div>
          <span style={{ display: "inline-block", lineHeight: 1.02, color: C.bg, background: C.orange, borderRadius: 32, padding: "0 24px 10px", transform: "rotate(-3deg)" }}>L'IA</span> dans
        </div>
        <div>
          le <span style={{ color: C.cyan }}>dev</span>&nbsp;:
        </div>
        <div style={{ fontSize: 112, marginTop: 40, color: C.violetLight }}>le guide en</div>
        <div style={{ display: "flex", alignItems: "center", gap: 26, marginTop: 10 }}>
          <span
            style={{
              fontSize: 190,
              color: C.white,
              background: C.violet,
              borderRadius: 40,
              padding: "0 34px 10px",
              boxShadow: "0 16px 0 rgba(2,6,23,0.4)",
              transform: "rotate(-4deg)",
              display: "inline-block",
            }}
          >
            55&nbsp;s
          </span>
          <CodeIcon size={150} style={{ transform: "rotate(8deg)" }} />
        </div>
      </div>
      <div style={{ position: "absolute", left: 70, top: 1080 }}>
        <Pixo frame={12} size={400} expr="happy" point={1} pointAngle={-30} lookX={0.4} />
      </div>
      <div style={{ position: "absolute", left: 600, top: 1040 }}>
        <Lea frame={12} size={400} expr="proud" thumb={1} lookX={-0.4} />
      </div>
    </AbsoluteFill>
  );
};
