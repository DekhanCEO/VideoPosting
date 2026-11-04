import React, { useRef } from "react";
import { AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame } from "remotion";
import { clamp } from "./anim";
import { useAudit } from "./components/Audit";
import { Subtitles } from "./components/Subtitles";
import type { SceneId } from "./cues";
import { TL } from "./data";
import { S1Hook } from "./scenes/S1Hook";
import { S2Probleme } from "./scenes/S2Probleme";
import { S3Code } from "./scenes/S3Code";
import { S4Debug } from "./scenes/S4Debug";
import { S5Tests } from "./scenes/S5Tests";
import { S6Idee } from "./scenes/S6Idee";
import { S7Bemol } from "./scenes/S7Bemol";
import { S8Cta } from "./scenes/S8Cta";
import { C, useFonts } from "./theme";

type SceneComp = React.FC<{ f: number; abs: number }>;
const SCENES: Record<SceneId, SceneComp> = {
  hook: S1Hook,
  probleme: S2Probleme,
  code: S3Code,
  debug: S4Debug,
  tests: S5Tests,
  idee: S6Idee,
  bemol: S7Bemol,
  cta: S8Cta,
};

/** Entrées en zoom-flash (moments clés) ; les autres coupes sont des balayages horizontaux de 6 images. */
const ZOOM: SceneId[] = ["code", "bemol", "cta"];
const WIPE = 6;
const ZF = 4;

export const Video: React.FC<{ showSafe?: boolean; audit?: boolean }> = ({ showSafe = false, audit = false }) => {
  useFonts();
  const frame = useCurrentFrame();
  const root = useRef<HTMLDivElement>(null);
  useAudit(root, frame, audit);
  const layers: React.ReactNode[] = [];

  TL.scenes.forEach((s, i) => {
    const next = TL.scenes[i + 1];
    const zoomIn = ZOOM.includes(s.id as SceneId) && i > 0;
    const zoomOut = next && ZOOM.includes(next.id as SceneId);
    const start = i === 0 ? 0 : zoomIn ? s.from : s.from - WIPE / 2;
    const end = next ? (zoomOut ? next.from : next.from + WIPE / 2) : s.to;
    if (frame < start || frame >= end) return;
    const Comp = SCENES[s.id as SceneId];
    const f = frame - s.from;
    let style: React.CSSProperties = {};
    let edge: React.ReactNode = null;
    if (zoomIn && f < ZF * 2) {
      // zoom-flash : la nouvelle scène arrive en dézoomant
      const k = interpolate(f, [0, ZF * 2], [1.22, 1], clamp);
      style = { transform: `scale(${k})` };
    } else if (zoomOut && frame >= next.from - ZF) {
      const k = interpolate(frame, [next.from - ZF, next.from], [1, 1.3], clamp);
      style = { transform: `scale(${k})` };
    } else if (i > 0 && !zoomIn && f < WIPE / 2) {
      // balayage horizontal : la nouvelle scène est révélée de droite à gauche
      const p = interpolate(f, [-WIPE / 2, WIPE / 2], [100, 0], clamp);
      style = { clipPath: `inset(0 0 0 ${p}%)` };
      edge = (
        <div style={{ position: "absolute", top: 0, bottom: 0, left: `${p}%`, width: 46, marginLeft: -23, background: C.cyan, boxShadow: `-30px 0 0 ${C.violet}` }} />
      );
    }
    layers.push(
      <AbsoluteFill key={s.id} style={style}>
        <Comp f={f} abs={frame} />
      </AbsoluteFill>,
      edge && <React.Fragment key={`${s.id}-edge`}>{edge}</React.Fragment>,
    );
  });

  // flash blanc-cyan des zooms
  let flash = 0;
  for (const s of TL.scenes) {
    if (ZOOM.includes(s.id as SceneId) && s.from > 0) {
      flash = Math.max(flash, interpolate(frame, [s.from - ZF, s.from, s.from + ZF * 2], [0, 0.85, 0], clamp));
    }
  }

  return (
    <AbsoluteFill ref={root} style={{ background: C.bg, overflow: "hidden" }}>
      {layers}
      {flash > 0 && <AbsoluteFill style={{ background: "#E0F2FE", opacity: flash }} />}
      <Subtitles frame={frame} />
      <Audio src={staticFile("soundtrack.wav")} />
      {showSafe && (
        <>
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 250, background: "rgba(244,63,94,0.35)" }} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 350, background: "rgba(244,63,94,0.35)" }} />
        </>
      )}
    </AbsoluteFill>
  );
};
