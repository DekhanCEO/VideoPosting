/**
 * Plan 5 — appel à l'action (13 – 15 s). La carte de résultat devient le bouton ; le logo revient en petit en haut avec la
 * lumière diagonale ; slogan, bouton, adresse. Fondu au noir sur les 10 dernières images (dans la composition).
 */
import React from "react";
import { useCurrentFrame } from "remotion";
import { boxStyle, fadeRise, mix, mixBox, mixColor, prog, productSpring } from "../../components/anim";
import { UplinkMark } from "../../components/UplinkMark";
import { BUTTON, RESULT_CARD, ZOOM_ORIGIN, type Box } from "../../layout";
import { ACCENT, BG, BODY, SUB, TEXT, TITLE, TITLE_TRACKING } from "../../theme";
import { CTA, MORPH_CARTE_BOUTON } from "../../timing";
import { CARD_BG, zoomAt } from "../04-detail/Detail";

export const Cta: React.FC = () => {
  const f = useCurrentFrame();
  if (f < MORPH_CARTE_BOUTON[0]) return null;
  // la carte telle que le zoom du plan 4 l'a laissée
  const z = zoomAt(MORPH_CARTE_BOUTON[0]);
  const from: Box = { cx: ZOOM_ORIGIN.x + (RESULT_CARD.cx - ZOOM_ORIGIN.x) * z, cy: ZOOM_ORIGIN.y + (RESULT_CARD.cy - ZOOM_ORIGIN.y) * z, w: RESULT_CARD.w * z, h: RESULT_CARD.h * z, r: RESULT_CARD.r * z };
  const t = productSpring(f, MORPH_CARTE_BOUTON[0]);
  const btn = mixBox(from, BUTTON, t);
  const accent = prog(f, MORPH_CARTE_BOUTON[0] + 2, MORPH_CARTE_BOUTON[0] + 14);
  const logo = productSpring(f, CTA.logo);
  return (
    <>
      {/* logo en petit, en haut */}
      {f >= CTA.logo && (
        <div style={{ position: "absolute", top: 250, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 24, opacity: prog(f, CTA.logo, CTA.logo + 12), transform: `scale(${mix(0.85, 1, logo)})` }}>
          <UplinkMark size={96} />
          <span style={{ fontFamily: TITLE, fontWeight: 600, fontSize: 80, letterSpacing: TITLE_TRACKING, color: TEXT }}>Uplink</span>
        </div>
      )}
      {f >= CTA.slogan && (
        <div style={{ position: "absolute", top: 700, left: 0, right: 0, textAlign: "center", fontFamily: TITLE, fontWeight: 600, fontSize: 132, letterSpacing: TITLE_TRACKING, lineHeight: 1, color: TEXT, ...fadeRise(f, CTA.slogan, 14) }}>
          Publie partout.
        </div>
      )}
      {/* le bouton, né de la carte de résultat */}
      <div style={{ ...boxStyle(btn), background: mixColor(CARD_BG, ACCENT, accent), boxShadow: `0 30px 70px -30px rgba(155,107,255,${0.7 * accent})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {f >= CTA.label && <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: 46, color: BG, letterSpacing: "-0.01em", ...fadeRise(f, CTA.label, 12, 6) }}>Essayer maintenant</span>}
      </div>
      {f >= CTA.small && (
        <div style={{ position: "absolute", top: 1300, left: 0, right: 0, textAlign: "center", fontFamily: BODY, fontWeight: 500, fontSize: 40, color: SUB, ...fadeRise(f, CTA.small, 12) }}>
          dsociety.fr/uplink
        </div>
      )}
    </>
  );
};
