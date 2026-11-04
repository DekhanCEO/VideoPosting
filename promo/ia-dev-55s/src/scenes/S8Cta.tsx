import React from "react";
import { AbsoluteFill } from "remotion";
import { bounce, slide } from "../anim";
import { Lea } from "../characters/Lea";
import { Pixo } from "../characters/Pixo";
import { Bubble, EmojiPointDown } from "../components/icons";
import { Background } from "../components/ui";
import { CUES, mouthAt } from "../data";
import { C, FONT_TITLE } from "../theme";

const K = CUES.cta;

/** Zone réservée au logo / nom de marque (aucun fourni : laissée vide volontairement). */
export const BRAND_SLOT = { top: 1170, height: 160 };

export const S8Cta: React.FC<{ f: number; abs: number }> = ({ f, abs }) => {
  const t = bounce(f, K.text);
  const dots = 1 + (Math.floor(f / 6) % 3);
  return (
    <AbsoluteFill>
      <Background frame={abs} tint={C.violet} />
      <div
        style={{
          position: "absolute",
          top: 285,
          left: 60,
          right: 60,
          textAlign: "center",
          fontFamily: FONT_TITLE,
          fontWeight: 900,
          fontSize: 120,
          lineHeight: 1.04,
          color: C.text,
          letterSpacing: -1,
          transform: `scale(${t})`,
        }}
      >
        <div>
          Tu codes <span style={{ color: C.cyan }}>avec</span>
        </div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 22 }}>
          <span>
            ou <span style={{ color: C.orange }}>sans</span> IA&nbsp;?
          </span>
          <span style={{ display: "inline-block", transform: `translateY(${Math.abs(Math.sin(f / 5)) * 18}px)` }}>
            <EmojiPointDown size={118} />
          </span>
        </div>
      </div>

      {/* Pixo et Léa côte à côte */}
      <div style={{ position: "absolute", left: 90, top: 590, transform: `translateX(${slide(f, 0, -600)}px)` }}>
        <Pixo frame={abs} size={380} mouth={mouthAt(abs)} expr="happy" wave={f > 10 && f < K.follow} lookX={0.3} />
      </div>
      <div style={{ position: "absolute", left: 590, top: 550, transform: `translateX(${slide(f, 4, 600)}px)` }}>
        <Lea frame={abs} size={380} expr={f >= K.follow ? "proud" : "smile"} wave={f > 14 ? 1 : 0} thumb={f >= K.follow ? 1 : 0} lookX={-0.3} />
      </div>

      {/* « dis-moi en commentaire » */}
      {f >= K.comment && (
        <div style={{ position: "absolute", left: 850, top: 530, transform: `scale(${bounce(f, K.comment)}) rotate(6deg)` }}>
          <Bubble size={170} dots={dots} />
        </div>
      )}
      {/* « suis pour la suite » */}
      {f >= K.follow && (
        <div
          style={{
            position: "absolute",
            left: 540 - 190,
            top: 1030,
            width: 380,
            height: 120,
            borderRadius: 60,
            background: C.orange,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
            fontFamily: FONT_TITLE,
            fontWeight: 900,
            fontSize: 66,
            color: C.white,
            boxShadow: "0 12px 0 rgba(2,6,23,0.4)",
            transform: `scale(${bounce(f, K.follow) * (1 + 0.04 * Math.sin(f / 4))})`,
          }}
        >
          <span style={{ fontSize: 84, lineHeight: 1, marginTop: -8 }}>+</span> Suivre
        </div>
      )}
      {/* bloc logo / marque : vide (aucune marque fournie) */}
      <div style={{ position: "absolute", left: 140, right: 140, top: BRAND_SLOT.top, height: BRAND_SLOT.height }} />
    </AbsoluteFill>
  );
};
