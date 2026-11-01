/** Écran B — « Programmé à l'heure. » : le bouton devient la carte horaire « 19:00 », un jour est choisi. */
import React from "react";
import { boxStyle, fadeOut, fadeRise, mix, mixBox, mixColor, prog, productSpring } from "../../components/anim";
import { PILL, TIME_CARD } from "../../layout";
import { ACCENT, BG, BODY, HAIRLINE, SURFACE, SURFACE_2, TEXT, TITLE } from "../../theme";
import { PRODUIT } from "../../timing";

export const EcranProgrammer: React.FC<{ f: number }> = ({ f }) => {
  const B = PRODUIT.b;
  if (f < B.morph[0]) return null;
  const t = productSpring(f, B.morph[0]);
  const card = mixBox(PILL, TIME_CARD, t);
  const surface = prog(f, B.morph[0], B.morph[0] + 10);
  const time = fadeRise(f, B.time, 12, 10);
  const timeOut = fadeOut(f, PRODUIT.c.morph[0], 6, 6);
  const dotsOut = fadeOut(f, B.out[0], B.out[1] - B.out[0], 14);
  const pick = productSpring(f, B.pick);
  return (
    <>
      {/* carte horaire (l'écran suivant la transforme en notification) */}
      {f < PRODUIT.c.morph[0] && (
        <div style={{ ...boxStyle(card), background: mixColor(ACCENT, SURFACE, surface), boxShadow: `inset 0 0 0 1px ${surface > 0.5 ? HAIRLINE : "transparent"}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          {surface < 1 && <span style={{ position: "absolute", fontFamily: BODY, fontWeight: 600, fontSize: 42, color: BG, opacity: 1 - surface }}>Publier</span>}
        </div>
      )}
      {f >= B.time && (
        <div style={{ position: "absolute", left: TIME_CARD.cx - TIME_CARD.w / 2, top: TIME_CARD.cy - 76, width: TIME_CARD.w, textAlign: "center", fontFamily: TITLE, fontWeight: 600, fontSize: 132, letterSpacing: "-0.03em", lineHeight: 1.15, color: TEXT, fontFeatureSettings: '"tnum"', ...time, ...(f >= PRODUIT.c.morph[0] ? { opacity: timeOut.opacity } : {}) }}>
          19:00
        </div>
      )}
      {/* la semaine : un jour est retenu */}
      <div style={{ position: "absolute", inset: 0, opacity: dotsOut.opacity, transform: `translateY(${dotsOut.dy}px)` }}>
        {Array.from({ length: 7 }, (_, i) => {
          const x = 266 + (i - 3) * 62;
          const chosen = i === 4;
          return (
            <React.Fragment key={i}>
              <div style={{ position: "absolute", left: x - 23, top: 720 - 23, width: 46, height: 46, borderRadius: 23, background: SURFACE_2, ...fadeRise(f, B.dots + i * 2, 10, 10) }} />
              {chosen && f >= B.pick && <div style={{ position: "absolute", left: x - 23, top: 720 - 23, width: 46, height: 46, borderRadius: 23, background: ACCENT, transform: `scale(${mix(0.4, 1, pick)})`, boxShadow: `0 0 0 ${6 * pick}px rgba(155,107,255,0.25)` }} />}
            </React.Fragment>
          );
        })}
      </div>
    </>
  );
};
