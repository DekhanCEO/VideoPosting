/** Plan 2 — révélation (2,5 – 5 s) : le mot d'accent devient le logo, le nom apparaît en grand, puis le sous-titre. */
import React from "react";
import { useCurrentFrame } from "remotion";
import { boxStyle, fadeOut, fadeRise, mix, mixBox, prog, productSpring } from "../../components/anim";
import { PlayGlyph } from "../../../icons";
import { HOOK_SIZE, LOGO, MOT_ACCENT, NAME_TOP, SUB_TOP } from "../../layout";
import { ACCENT, BG, BODY, SUB, TEXT, TITLE, TITLE_TRACKING } from "../../theme";
import { MORPH_LOGO_ECRAN, MORPH_MOT_LOGO, REVELATION } from "../../timing";
import { MOT_FINAL } from "../01-accroche/Accroche";

export const Revelation: React.FC = () => {
  const f = useCurrentFrame();
  if (f < MORPH_MOT_LOGO[0] || f >= 150) return null;
  // Morphing : le mot « Fini. » se rétracte pendant qu'un carré d'accent naît de ses contours et devient le logo.
  const t = productSpring(f, MORPH_MOT_LOGO[0]);
  const box = mixBox(MOT_ACCENT, LOGO, t);
  const shape = prog(f, MORPH_MOT_LOGO[0], MORPH_MOT_LOGO[0] + 6);
  const word = 1 - prog(f, MORPH_MOT_LOGO[0], MORPH_MOT_LOGO[0] + 8);
  const glyph = prog(f, REVELATION.glyph[0], REVELATION.glyph[1]);
  const name = productSpring(f, REVELATION.name);
  const out = fadeOut(f, REVELATION.out[0], REVELATION.out[1] - REVELATION.out[0], 14);
  const showLogo = f < MORPH_LOGO_ECRAN[0];
  return (
    <>
      {showLogo && (
        <div style={{ ...boxStyle(box), background: ACCENT, opacity: shape, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 34px 84px -34px rgba(155,107,255,${0.55 * shape})` }}>
          <div style={{ opacity: glyph, transform: `scale(${0.7 + 0.3 * glyph}) translateX(4px)` }}>
            <PlayGlyph size={LOGO.w * 0.42} color={BG} />
          </div>
        </div>
      )}
      {word > 0 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: box.cy - (HOOK_SIZE * 1.1) / 2, textAlign: "center", fontFamily: TITLE, fontWeight: 600, fontSize: HOOK_SIZE, letterSpacing: TITLE_TRACKING, lineHeight: 1.1, color: ACCENT, opacity: word, transform: `scale(${mix(1, 0.55, t)})` }}>{MOT_FINAL}</div>
      )}
      {f >= REVELATION.name && (
        <div style={{ position: "absolute", top: NAME_TOP, left: 0, right: 0, textAlign: "center", fontFamily: TITLE, fontWeight: 600, fontSize: 210, letterSpacing: TITLE_TRACKING, lineHeight: 1, color: TEXT, opacity: prog(f, REVELATION.name, REVELATION.name + 12) * out.opacity, transform: `translateY(${out.dy}px) scale(${mix(0.85, 1, name)})` }}>
          Uplink
        </div>
      )}
      {f >= REVELATION.sub && (
        <div style={{ position: "absolute", top: SUB_TOP, left: 0, right: 0, textAlign: "center", fontFamily: BODY, fontWeight: 500, fontSize: 46, color: SUB, ...fadeRise(f, REVELATION.sub, 14), ...(f >= REVELATION.out[0] ? { opacity: out.opacity, transform: `translateY(${out.dy}px)` } : {}) }}>
          Une vidéo. Tous tes réseaux.
        </div>
      )}
    </>
  );
};
