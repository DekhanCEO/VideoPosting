/**
 * Plan 4 — détail (10 – 13 s). La notification devient la carte de résultat : les trois publications se remplissent et
 * le compteur passe de 0/3 à 3/3. Zoom lent de 1 à 1,15, qui se fige sur la dernière demi-seconde.
 */
import React from "react";
import { AbsoluteFill, Easing, useCurrentFrame } from "remotion";
import { BrandLogo } from "../../../brands";
import { Check } from "../../../icons";
import { fadeOut, fadeRise, mix, mixBox, mixColor, prog, productSpring } from "../../components/anim";
import { BUBBLE_GLOBAL, RESULT_CARD, ZOOM_MAX, ZOOM_ORIGIN } from "../../layout";
import { ACCENT, BG, BODY, HAIRLINE, SUB, SURFACE, SURFACE_2, TEXT, TITLE } from "../../theme";
import { DETAIL, MORPH_BULLE_CARTE, MORPH_CARTE_BOUTON } from "../../timing";
import { PLATFORMS } from "../03-produit/EcranPublier";

export const CARD_BG = "#15151B";
const ROWS_Y = [120, 260, 400];

/** Échelle du zoom à l'image f (aussi utilisée par le plan 5 pour reprendre la carte). */
export const zoomAt = (f: number) => 1 + (ZOOM_MAX - 1) * prog(f, DETAIL.zoom[0], DETAIL.zoom[1], Easing.inOut(Easing.sin));
const rowDone = (f: number, i: number) => f >= DETAIL.bars + i * DETAIL.barStagger + DETAIL.barDur;

export const Detail: React.FC = () => {
  const f = useCurrentFrame();
  if (f < MORPH_BULLE_CARTE[0] || f >= DETAIL.out[1] + 2) return null;
  const t = productSpring(f, MORPH_BULLE_CARTE[0]);
  const card = mixBox(BUBBLE_GLOBAL, RESULT_CARD, t);
  const done = [0, 1, 2].filter((i) => rowDone(f, i)).length;
  const out = fadeOut(f, DETAIL.out[0], DETAIL.out[1] - DETAIL.out[0], 10);
  const cardLeft = card.cx - card.w / 2;
  const cardTop = card.cy - card.h / 2;
  return (
    <AbsoluteFill style={{ transformOrigin: `${ZOOM_ORIGIN.x}px ${ZOOM_ORIGIN.y}px`, transform: `scale(${zoomAt(f)})` }}>
      {/* le chiffre clé */}
      {f >= DETAIL.number && (
        <div style={{ position: "absolute", top: 470, left: 0, right: 0, textAlign: "center", fontFamily: TITLE, fontWeight: 600, fontSize: 250, letterSpacing: "-0.03em", lineHeight: 1, color: TEXT, fontFeatureSettings: '"tnum"', ...fadeRise(f, DETAIL.number, 14, 12), ...(f >= DETAIL.out[0] ? { opacity: out.opacity, transform: `translateY(${out.dy}px)` } : {}) }}>
          <span style={{ color: ACCENT }}>{done}</span>/3
        </div>
      )}
      {f >= DETAIL.label && (
        <div style={{ position: "absolute", top: 738, left: 0, right: 0, textAlign: "center", fontFamily: BODY, fontWeight: 500, fontSize: 48, color: SUB, ...fadeRise(f, DETAIL.label, 12), ...(f >= DETAIL.out[0] ? { opacity: out.opacity, transform: `translateY(${out.dy}px)` } : {}) }}>
          en ligne
        </div>
      )}
      {/* la carte de résultat (le plan 5 la transforme en bouton) */}
      {f < MORPH_CARTE_BOUTON[0] && (
        <div style={{ position: "absolute", left: cardLeft, top: cardTop, width: card.w, height: card.h, borderRadius: card.r, background: mixColor(SURFACE, CARD_BG, t), boxShadow: `inset 0 0 0 1px ${HAIRLINE}, 0 60px 120px -50px rgba(0,0,0,0.9)`, overflow: "hidden" }}>
          <div style={{ position: "absolute", left: RESULT_CARD.cx - RESULT_CARD.w / 2 - cardLeft, top: RESULT_CARD.cy - RESULT_CARD.h / 2 - cardTop, width: RESULT_CARD.w, height: RESULT_CARD.h, opacity: f >= DETAIL.out[0] ? out.opacity : 1 }}>
            {PLATFORMS.map((b, i) => {
              const fill = prog(f, DETAIL.bars + i * DETAIL.barStagger, DETAIL.bars + i * DETAIL.barStagger + DETAIL.barDur, Easing.inOut(Easing.cubic));
              const check = productSpring(f, DETAIL.bars + i * DETAIL.barStagger + DETAIL.barDur);
              return (
                <div key={b} style={{ position: "absolute", left: 0, top: ROWS_Y[i] - 52, width: RESULT_CARD.w, height: 104, ...fadeRise(f, DETAIL.rows + i * 3, 12, 10) }}>
                  <div style={{ position: "absolute", left: 56, top: 0, width: 104, height: 104, borderRadius: 30, background: SURFACE_2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <BrandLogo brand={b} size={50} color="#F5F5F7" />
                  </div>
                  <div style={{ position: "absolute", left: 196, top: 42, width: 404, height: 20, borderRadius: 10, background: "#2A2A33", overflow: "hidden" }}>
                    <div style={{ width: `${fill * 100}%`, height: "100%", borderRadius: 10, background: ACCENT }} />
                  </div>
                  <div style={{ position: "absolute", left: 636, top: 24, width: 56, height: 56, borderRadius: 28, background: rowDone(f, i) ? ACCENT : "#2A2A33", display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${rowDone(f, i) ? mix(0.6, 1, check) : 1})` }}>
                    {rowDone(f, i) && <Check size={30} color={BG} stroke={3.4} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
