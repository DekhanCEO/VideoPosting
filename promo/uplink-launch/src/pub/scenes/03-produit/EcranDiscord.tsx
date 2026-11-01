/** Écran C — « Communauté prévenue. » : la carte horaire devient une notification Discord, la communauté est alertée. */
import React from "react";
import { BrandLogo } from "../../../brands";
import { User } from "../../../icons";
import { boxStyle, fadeOut, fadeRise, mix, mixBox, prog, productSpring } from "../../components/anim";
import { BUBBLE, TIME_CARD } from "../../layout";
import { ACCENT, HAIRLINE, SURFACE, SURFACE_2 } from "../../theme";
import { MORPH_BULLE_CARTE, PRODUIT } from "../../timing";
import { PLATFORMS } from "./EcranPublier";

export const EcranDiscord: React.FC<{ f: number }> = ({ f }) => {
  const C = PRODUIT.c;
  if (f < C.morph[0]) return null;
  const t = productSpring(f, C.morph[0]);
  const bubble = mixBox(TIME_CARD, BUBBLE, t);
  const icon = productSpring(f, C.icon);
  const pulse = prog(f, C.icon + 4, C.icon + 26, (x) => x);
  const membersOut = fadeOut(f, C.out[0], C.out[1] - C.out[0], 14);
  return (
    <>
      {/* la notification (le plan suivant la transforme en carte de résultat) */}
      {f < MORPH_BULLE_CARTE[0] && (
        <div style={{ ...boxStyle(bubble), background: SURFACE, boxShadow: `inset 0 0 0 1px ${HAIRLINE}` }}>
          {f >= C.icon && (
            <div style={{ position: "absolute", left: bubble.w / 2 - 198, top: bubble.h / 2 - 48, width: 96, height: 96 }}>
              <div style={{ position: "absolute", inset: -pulse * 40, borderRadius: "50%", border: `3px solid ${ACCENT}`, opacity: 0.6 * (1 - pulse) }} />
              <div style={{ position: "absolute", inset: 0, borderRadius: 48, background: ACCENT, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${mix(0.5, 1, icon)})`, opacity: prog(f, C.icon, C.icon + 6) }}>
                <BrandLogo brand="discord" size={50} color="#FFFFFF" />
              </div>
            </div>
          )}
          {PLATFORMS.map((b, i) =>
            f >= C.links[i] ? (
              <div key={b} style={{ position: "absolute", left: bubble.w / 2 - 78 + i * 102, top: bubble.h / 2 - 32, width: 84, height: 64, borderRadius: 32, background: SURFACE_2, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${mix(0.6, 1, productSpring(f, C.links[i]))})`, opacity: prog(f, C.links[i], C.links[i] + 6) }}>
                <BrandLogo brand={b} size={32} color="#F5F5F7" />
              </div>
            ) : null,
          )}
        </div>
      )}
      {/* la communauté : chacun reçoit l'alerte */}
      <div style={{ position: "absolute", inset: 0, opacity: membersOut.opacity, transform: `translateY(${membersOut.dy}px)` }}>
        {Array.from({ length: 5 }, (_, i) => {
          const x = 266 + (i - 2) * 92;
          const dot = productSpring(f, C.members + 4 + i * 3);
          return (
            <React.Fragment key={i}>
              <div style={{ position: "absolute", left: x - 38, top: 770 - 38, width: 76, height: 76, borderRadius: 38, background: "linear-gradient(160deg, #2C2C35, #1C1C23)", boxShadow: `inset 0 0 0 1px ${HAIRLINE}`, display: "flex", alignItems: "center", justifyContent: "center", ...fadeRise(f, C.members - 4 + i * 2, 10, 10) }}>
                <User size={34} color="#8E8E93" />
              </div>
              {f >= C.members + 4 + i * 3 && <div style={{ position: "absolute", left: x + 24 - 11, top: 770 - 30 - 11, width: 22, height: 22, borderRadius: 11, background: ACCENT, transform: `scale(${dot})`, boxShadow: "0 0 0 4px #0F0F14" }} />}
            </React.Fragment>
          );
        })}
      </div>
    </>
  );
};
