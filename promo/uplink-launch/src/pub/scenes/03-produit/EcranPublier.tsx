/** Écran A — « Un envoi. Partout. » : une vidéo, trois plateformes reliées, le bouton « Publier » pressé. */
import React from "react";
import { BrandLogo, type Brand } from "../../../brands";
import { Check, PlayGlyph } from "../../../icons";
import { boxStyle, fadeOut, fadeRise, mix, prog, productSpring } from "../../components/anim";
import { PILL } from "../../layout";
import { ACCENT, BG, BODY, HAIRLINE, SURFACE } from "../../theme";
import { PRODUIT } from "../../timing";

export const PLATFORMS: Brand[] = ["tiktok", "youtube", "instagram"];
const XS = [106, 266, 426];
const TILE_Y = 650;

export const EcranPublier: React.FC<{ f: number }> = ({ f }) => {
  const A = PRODUIT.a;
  if (f >= A.out[1] + 2 && f >= PRODUIT.b.morph[0]) return null;
  const out = fadeOut(f, A.out[0], A.out[1] - A.out[0], 16);
  const lines = prog(f, A.lines[0], A.lines[1]);
  const press = f >= A.press ? Math.sin(prog(f, A.press, A.press + 8, (x) => x) * Math.PI) : 0;
  const pill = productSpring(f, A.pill);
  return (
    <>
      <div style={{ position: "absolute", inset: 0, opacity: out.opacity, transform: `translateY(${out.dy}px)` }}>
        {/* la vidéo */}
        <div style={{ position: "absolute", left: 46, top: 150, width: 440, height: 280, borderRadius: 40, background: "linear-gradient(160deg, #2B2540 0%, #17141F 100%)", boxShadow: `inset 0 0 0 1px ${HAIRLINE}`, display: "flex", alignItems: "center", justifyContent: "center", ...fadeRise(f, A.card, 14, 16) }}>
          <div style={{ width: 104, height: 104, borderRadius: 52, background: ACCENT, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ transform: "translateX(3px)" }}>
              <PlayGlyph size={44} color={BG} />
            </div>
          </div>
        </div>
        {/* liaisons vidéo → plateformes */}
        <svg width={532} height={1112} style={{ position: "absolute", inset: 0 }}>
          {XS.map((x) => (
            <path key={x} d={`M266 430 C266 520, ${x} 500, ${x} 588`} fill="none" stroke={ACCENT} strokeWidth={4} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - lines} opacity={0.9} />
          ))}
        </svg>
        {/* plateformes */}
        {PLATFORMS.map((b, i) => {
          const s = productSpring(f, A.tiles[i]);
          const c = productSpring(f, A.checks[i]);
          return (
            <React.Fragment key={b}>
              <div style={{ position: "absolute", left: XS[i] - 60, top: TILE_Y - 60, width: 120, height: 120, borderRadius: 34, background: SURFACE, boxShadow: `inset 0 0 0 1px ${HAIRLINE}`, display: "flex", alignItems: "center", justifyContent: "center", opacity: prog(f, A.tiles[i], A.tiles[i] + 8), transform: `scale(${mix(0.6, 1, s)})` }}>
                <BrandLogo brand={b} size={56} color="#F5F5F7" />
              </div>
              {f >= A.checks[i] && (
                <div style={{ position: "absolute", left: XS[i] + 44 - 22, top: TILE_Y - 44 - 22, width: 44, height: 44, borderRadius: 22, background: ACCENT, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${c})`, boxShadow: "0 0 0 5px #0F0F14" }}>
                  <Check size={24} color={BG} stroke={3.4} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
      {/* le bouton, que l'écran suivant transforme en carte horaire */}
      {f < PRODUIT.b.morph[0] && f >= A.pill && (
        <div style={{ ...boxStyle(PILL), background: ACCENT, display: "flex", alignItems: "center", justifyContent: "center", opacity: prog(f, A.pill, A.pill + 8), transform: `scale(${mix(0.8, 1, pill) * (1 - 0.06 * press)})`, boxShadow: "0 24px 50px -24px rgba(155,107,255,0.7)" }}>
          <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: 42, color: BG, letterSpacing: "-0.01em" }}>Publier</span>
        </div>
      )}
    </>
  );
};
