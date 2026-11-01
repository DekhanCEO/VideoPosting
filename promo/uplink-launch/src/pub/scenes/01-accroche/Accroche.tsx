/** Plan 1 — accroche (0 – 2,5 s) : la phrase apparaît mot par mot, puis le dernier mot est remplacé par l'accent. */
import React from "react";
import { Easing, useCurrentFrame } from "remotion";
import { fadeOut, fadeRise, prog } from "../../components/anim";
import { HOOK_LINES, HOOK_SIZE } from "../../layout";
import { ACCENT, TEXT, TITLE, TITLE_TRACKING } from "../../theme";
import { ACCROCHE, MORPH_MOT_LOGO } from "../../timing";

/** « Trois apps. Trois uploads. Épuisant. » (5 mots) → « Fini. » */
const LINES = [["Trois", "apps."], ["Trois", "uploads."]];
const LAST = "Épuisant.";
export const MOT_FINAL = "Fini.";
const PAD = 30; // marge basse du masque
const PAD_TOP = 6; // le masque commence au ras de la ligne : rien ne déborde sur la ligne du dessus

const line = (top: number): React.CSSProperties => ({ position: "absolute", top, left: 0, right: 0, textAlign: "center", fontFamily: TITLE, fontWeight: 600, fontSize: HOOK_SIZE, letterSpacing: TITLE_TRACKING, lineHeight: 1.1, color: TEXT, whiteSpace: "nowrap" });

export const Accroche: React.FC = () => {
  const f = useCurrentFrame();
  if (f >= ACCROCHE.linesOut[1]) return null;
  const out = fadeOut(f, ACCROCHE.linesOut[0], ACCROCHE.linesOut[1] - ACCROCHE.linesOut[0], 12);
  const at = (i: number) => ACCROCHE.firstWord + i * ACCROCHE.wordInterval;
  // le dernier mot sort vers le haut pendant que le mot d'accent entre
  const swapOut = prog(f, ACCROCHE.swap, ACCROCHE.swap + ACCROCHE.swapOut, Easing.in(Easing.cubic));
  const fini = prog(f, ACCROCHE.swap + 2, ACCROCHE.swap + 2 + ACCROCHE.swapIn);
  return (
    <>
      {LINES.map((words, li) => (
        <div key={li} style={{ ...line(HOOK_LINES[li]), opacity: out.opacity, transform: `translateY(${out.dy}px)` }}>
          {words.map((w, wi) => (
            <span key={wi} style={{ display: "inline-block", marginRight: wi < words.length - 1 ? "0.24em" : 0, ...fadeRise(f, at(li * 2 + wi), ACCROCHE.wordIn) }}>
              {w}
            </span>
          ))}
        </div>
      ))}
      {/* dernier mot : remplacé par le mot d'accent à travers un masque (l'ancien sort par le haut, le nouveau monte) */}
      <div style={{ ...line(HOOK_LINES[2] - PAD_TOP), height: HOOK_SIZE * 1.1 + PAD_TOP + PAD, overflow: "hidden" }}>
        {f < ACCROCHE.swap + ACCROCHE.swapOut && (
          <div style={{ position: "absolute", left: 0, right: 0, top: PAD_TOP, opacity: fadeRise(f, at(4), ACCROCHE.wordIn).opacity, transform: `translateY(${(1 - prog(f, at(4), at(4) + ACCROCHE.wordIn)) * 8 - swapOut * 130}%)` }}>{LAST}</div>
        )}
        {f >= ACCROCHE.swap + 2 && f < MORPH_MOT_LOGO[0] && (
          <div style={{ position: "absolute", left: 0, right: 0, top: PAD_TOP, color: ACCENT, opacity: fini, transform: `translateY(${(1 - fini) * 110}%)` }}>{MOT_FINAL}</div>
        )}
      </div>
    </>
  );
};
