/**
 * Plan 3 — produit (5 – 10 s). Le logo devient l'écran d'un téléphone sobre, qui apparaît en pivotant de 12° puis se
 * redresse ; trois écrans d'environ 1,6 s s'enchaînent par morphing (bouton → carte horaire → notification), chacun avec
 * sa légende (4 mots au plus).
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { PlayGlyph } from "../../../icons";
import { fadeOut, fadeRise, mix, mixBox, mixColor, prog, productSpring } from "../../components/anim";
import { CameraPill, PhoneBody } from "../../components/PhoneFrame";
import { CAPTION_TOP, LOGO, PHONE, SCREEN, SCREEN_ORIGIN, type Box } from "../../layout";
import { ACCENT, BG, SCREEN_BG, TEXT, TITLE, TITLE_TRACKING } from "../../theme";
import { MORPH_LOGO_ECRAN, PRODUIT } from "../../timing";
import { EcranDiscord } from "./EcranDiscord";
import { EcranProgrammer } from "./EcranProgrammer";
import { EcranPublier } from "./EcranPublier";

const SCREEN_BOX: Box = { cx: PHONE.cx, cy: PHONE.cy, w: SCREEN.w, h: SCREEN.h, r: SCREEN.r };
const CAPTIONS: { text: string; at: readonly [number, number] }[] = [
  { text: "Un envoi. Partout.", at: PRODUIT.captions.a },
  { text: "Programmé à l'heure.", at: PRODUIT.captions.b },
  { text: "Communauté prévenue.", at: PRODUIT.captions.c },
];

export const Produit: React.FC = () => {
  const f = useCurrentFrame();
  if (f < MORPH_LOGO_ECRAN[0] || f >= PRODUIT.pushOut[1]) return null;
  // apparition en rotation 3D (0 → 12° → 0) et poussée finale de la caméra
  const tilt = 12 * prog(f, PRODUIT.tilt[0], PRODUIT.tilt[1]) * (1 - productSpring(f, PRODUIT.straighten));
  const push = prog(f, PRODUIT.pushOut[0], PRODUIT.pushOut[1]);
  // le logo devient l'écran
  const t = productSpring(f, MORPH_LOGO_ECRAN[0]);
  const scr = mixBox(LOGO, SCREEN_BOX, t);
  const bg = mixColor(ACCENT, SCREEN_BG, prog(f, MORPH_LOGO_ECRAN[0], MORPH_LOGO_ECRAN[0] + 16));
  const glyph = 1 - prog(f, MORPH_LOGO_ECRAN[0], MORPH_LOGO_ECRAN[0] + 8);
  const body = prog(f, MORPH_LOGO_ECRAN[0] + 6, MORPH_LOGO_ECRAN[0] + 22);
  const bodyScale = mix(0.94, 1, productSpring(f, MORPH_LOGO_ECRAN[0] + 6));
  return (
    <>
      <AbsoluteFill style={{ perspective: 2000, perspectiveOrigin: "50% 47%" }}>
        <AbsoluteFill style={{ transformOrigin: `${PHONE.cx}px ${PHONE.cy}px`, transform: `rotateY(${tilt}deg) scale(${1 + 0.06 * push})`, opacity: 1 - push }}>
          <div style={{ position: "absolute", inset: 0, transformOrigin: `${PHONE.cx}px ${PHONE.cy}px`, transform: `scale(${bodyScale})` }}>
            <PhoneBody opacity={body} />
          </div>
          {/* écran : contenu fixé à la position finale, révélé par l'écran qui grandit */}
          <div style={{ position: "absolute", left: scr.cx - scr.w / 2, top: scr.cy - scr.h / 2, width: scr.w, height: scr.h, borderRadius: scr.r, background: bg, overflow: "hidden" }}>
            {glyph > 0 && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: glyph }}>
                <div style={{ transform: "translateX(4px)" }}>
                  <PlayGlyph size={LOGO.w * 0.42} color={BG} />
                </div>
              </div>
            )}
            <div style={{ position: "absolute", left: SCREEN_ORIGIN.x - (scr.cx - scr.w / 2), top: SCREEN_ORIGIN.y - (scr.cy - scr.h / 2), width: SCREEN.w, height: SCREEN.h }}>
              <EcranPublier f={f} />
              <EcranProgrammer f={f} />
              <EcranDiscord f={f} />
            </div>
          </div>
          <CameraPill opacity={prog(f, MORPH_LOGO_ECRAN[0] + 14, MORPH_LOGO_ECRAN[1])} />
        </AbsoluteFill>
      </AbsoluteFill>
      {/* légendes : elles se succèdent sans jamais se superposer */}
      {CAPTIONS.map((c) => {
        if (f < c.at[0] || f >= c.at[1] + PRODUIT.captionFade) return null;
        const out = fadeOut(f, c.at[1], PRODUIT.captionFade);
        const inn = fadeRise(f, c.at[0], PRODUIT.captionFade);
        return (
          <div key={c.text} style={{ position: "absolute", top: CAPTION_TOP, left: 0, right: 0, textAlign: "center", fontFamily: TITLE, fontWeight: 600, fontSize: 60, letterSpacing: TITLE_TRACKING, color: TEXT, ...inn, ...(f >= c.at[1] ? { opacity: out.opacity, transform: `translateY(${out.dy}px)` } : {}) }}>
            {c.text}
          </div>
        );
      })}
    </>
  );
};
