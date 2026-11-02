/**
 * « Première » — film de 25 s (9:16) dans un style Apple × Netflix, construit avec le skill motion-design de
 * LottieFiles (identité de mouvement : ./parts.tsx). Noir cinéma, spectre violet → corail, typographie keynote.
 *
 *  0–2,2 s    Le mur : des dizaines d'affiches de vidéos défilent en perspective puis ralentissent ;
 *             « Publie une fois. Diffuse partout. »
 *  2,2–5 s    L'aperçu : une affiche sort du mur, se retourne vers nous et devient une fiche (titre, formats,
 *             TikTok / YouTube / Instagram, « ▶ Publier partout ») ; on appuie, la publication se remplit.
 *  5–8,5 s    Le générique : la fiche s'éteint en un trait de lumière ; des rubans spectraux en jaillissent et
 *             dessinent le logo, compression, impact, « Uplink », « Une création dsociety ». On plonge dans le
 *             triangle du bouton lecture.
 *  8,5–10 s   La liste des épisodes ; on lance le premier, sa vignette s'agrandit jusqu'au plein écran.
 *  10–22 s    Quatre épisodes (barre de lecture, minuteur, « Suivant ») : publier, programmer, Discord, stats.
 *  22–25 s    Fin keynote : logo, « Uplink », « Publie partout. Pilote tout. », « ▶ dsociety.fr/uplink ».
 */
import React from "react";
import { AbsoluteFill, Audio, Easing, interpolateColors, random, staticFile, useCurrentFrame } from "remotion";
import { BrandLogo, type Brand } from "../brands";
import { useFonts } from "../fonts";
import { Check, PlayGlyph } from "../icons";
import { Phone } from "../Phone";
import { DARK, ThemeProvider, UserProvider } from "../theme";
import { ComposerScreen, ScheduleScreen } from "../tour/screens1";
import { DiscordScreen, PublishScreen } from "../tour/screens2";
import { USER } from "../tour/Tour";
import { Blur, Burst, Grain, IT, Ring, SNAP, type SpringCfg, Vignette, blurOf, blurUrl, clamp01, ez, mix, sp, wave } from "../elan/kit";
import { At, CAMERA, DUR, ENTER, INK, LEAVE, LiftSwap, MUTED, PANEL, Poster, SPECTRAL, SPECTRUM, UplinkMark, appear, both, gradText, leave, remap } from "./parts";

export const PREMIERE_DURATION = 750;
const CINE = Easing.bezier(0.4, 0, 0.2, 1);

const T = {
  textOut: 52,
  settle: 64,
  hover: 58,
  pull: 66,
  morph: 72,
  panel: 86,
  info: 96,
  tap: 122,
  prog: 125,
  done: 141,
  off: 150,
  strands: 157,
  compress: 188,
  impact: 196,
  word: 204,
  credit: 214,
  zoom: 240,
  list: 256,
  pick: 276,
  tapRow: 285,
  expand: 290,
  end: 660,
};
const EPS = [
  { start: 300, end: 390 },
  { start: 390, end: 480 },
  { start: 480, end: 570 },
  { start: 570, end: 660 },
];

/* ================================================================== 1. Le mur d'affiches */
const COLS = 11;
const ROWS = 7;
const PW = 200;
const PH = 356;
const PX = PW + 22;
const PY = PH + 22;
const WALL = { rx: 26, ry: -16, rz: 10 };
const ROW_AMP = [1000, -800, 1200, -1100, 900, -1300, 1000];
const HERO_C = 5;
const HERO_R = 3;
const CAM_END = 1.16;
const Z_END = 430;
const PERSP = 1800;
const K = 1 / (CAM_END * (PERSP / (PERSP - Z_END))); // échelle qui rend la fiche à sa taille finale à l'écran

const rowOff = (f: number, r: number) => ROW_AMP[r] * (1 - ez(f, 0, T.settle, ENTER)) + (r % 2 ? -1 : 1) * Math.max(0, f - T.settle) * 0.35;
const wrap = (x: number) => ((((x + 5.5 * PX) % (COLS * PX)) + COLS * PX) % (COLS * PX)) - 5.5 * PX;
const camS = (f: number) => mix(1, CAM_END, ez(f, -20, 84, CAMERA));
const rad = (d: number) => (d * Math.PI) / 180;
/** Position 3D d'un point (sx, 0) du plan du mur (mêmes rotations que le CSS : X puis Y puis Z). */
function wallPoint(sx: number) {
  const a = rad(WALL.rx);
  const b = rad(WALL.ry);
  const c = rad(WALL.rz);
  const x1 = sx * Math.cos(c);
  const y1 = sx * Math.sin(c);
  const x2 = x1 * Math.cos(b);
  const z2 = -x1 * Math.sin(b);
  return { x: x2, y: y1 * Math.cos(a) - z2 * Math.sin(a), z: y1 * Math.sin(a) + z2 * Math.cos(a) };
}

const Row: React.FC<{ f: number; r: number }> = ({ f, r }) => {
  const off = rowOff(f, r);
  const b = blurOf(off - rowOff(f - 1, r), 0, 0.28, 16);
  return (
    <div style={{ position: "absolute", left: 0, top: (r - HERO_R) * PY, filter: blurUrl(b, `row${r}`) }}>
      <Blur id={`row${r}`} sx={b.sx} sy={0} region={5} />
      {Array.from({ length: COLS }, (_, c) => {
        const x = wrap((c - HERO_C) * PX + off);
        if (r === HERO_R && c === HERO_C) {
          return <div key={c} style={{ position: "absolute", left: x - PW / 2, top: -PH / 2, width: PW, height: PH, borderRadius: 18, background: "rgba(255,255,255,0.03)", border: "1.5px solid rgba(255,255,255,0.08)" }} />;
        }
        return (
          <div key={c} style={{ position: "absolute", left: x - PW / 2, top: -PH / 2 }}>
            <Poster i={r * COLS + c} w={PW} h={PH} palette={(r * 3 + c * 5) % 8} />
          </div>
        );
      })}
    </div>
  );
};

const PLATS: { b: Brand; name: string }[] = [
  { b: "tiktok", name: "TikTok" },
  { b: "youtube", name: "YouTube" },
  { b: "instagram", name: "Instagram" },
];

/** La fiche « aperçu » : l'affiche sortie du mur. */
const PreviewCard: React.FC<{ f: number }> = ({ f }) => {
  const m = ez(f, T.morph, T.morph + DUR.l, CINE);
  const m2 = ez(f, T.panel, T.panel + 20, ENTER);
  const W = mix(PW / K, 760, m);
  const IH = mix(PH / K, 520, m);
  const prog = ez(f, T.prog, T.done, Easing.linear); // barre de progression : linéaire
  const roll = ez(f, T.done, T.done + 8, ENTER);
  const press = f >= T.tap ? 1 - 0.05 * Math.sin(Math.PI * clamp01((f - T.tap) / 5)) : 1;
  const finger = f < T.tap - 4 ? 0 : f < T.tap + 3 ? sp(f, T.tap - 4, SNAP) * (f >= T.tap ? 0.85 : 1) : 0.85 * (1 - ez(f, T.tap + 3, T.tap + 8, LEAVE));
  const success = ez(f, T.done, T.done + 6, ENTER) * (1 - ez(f, T.done + 6, T.done + 20, CINE));
  const label = (color: string, text: React.ReactNode) => (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, color }}>{text}</div>
  );
  const btnText = (color: string) => (
    <>
      <div style={{ position: "absolute", inset: 0, transform: `translateY(${-roll * 100}%)` }}>
        {label(
          color,
          <>
            <PlayGlyph size={34} color={color} /> Publier partout
          </>,
        )}
      </div>
      <div style={{ position: "absolute", inset: 0, transform: `translateY(${(1 - roll) * 100}%)` }}>
        {label(
          color,
          <>
            <Check size={34} color={color} stroke={3.2} /> En ligne partout
          </>,
        )}
      </div>
    </>
  );
  return (
    <div style={{ width: W, borderRadius: mix(18 / K, 30, m), overflow: "hidden", background: PANEL, boxShadow: `0 40px 120px rgba(0,0,0,0.75), 0 0 ${110 * m}px rgba(155,107,255,${0.3 * m + 0.35 * success})`, fontFamily: IT }}>
      <div style={{ position: "relative", height: IH }}>
        <Poster i={99} w={W} h={IH} title="" radius={0} palette={0} badge={false} />
        <div style={{ position: "absolute", left: "50%", top: "46%", width: 120, height: 120, margin: -60, borderRadius: 60, background: "rgba(255,255,255,0.16)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", border: "2px solid rgba(255,255,255,0.35)", display: "flex", alignItems: "center", justifyContent: "center", opacity: m2, transform: `scale(${(0.9 + 0.1 * m2) * (1 + 0.08 * success)})` }}>
          <div style={{ marginLeft: 8 }}>
            <PlayGlyph size={58} color="#fff" />
          </div>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 140, background: `linear-gradient(180deg, rgba(20,20,24,0), ${PANEL})`, opacity: m2 }} />
        <div style={{ position: "absolute", left: 30, top: 28, opacity: m2, display: "flex", alignItems: "center", gap: 12 }}>
          <UplinkMark size={46} />
          <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: "0.28em", color: "rgba(255,255,255,0.85)" }}>UPLINK</span>
        </div>
      </div>
      <div style={{ height: mix(0, 380, m2), overflow: "hidden" }}>
        <div style={{ padding: "22px 34px 0" }}>
          <div style={{ ...appear(f, T.info, DUR.s, 16, 4), fontSize: 50, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>Clutch 1v4 en ranked</div>
          <div style={{ ...appear(f, T.info + 4, DUR.s, 16, 4), display: "flex", alignItems: "center", gap: 14, marginTop: 14, fontSize: 28, fontWeight: 600, color: MUTED }}>
            <span style={{ color: "#C4B5FD", fontWeight: 800 }}>Nouveau</span>
            <span>0:14</span>
            <span style={{ border: "2px solid rgba(255,255,255,0.4)", borderRadius: 6, padding: "0 8px", fontSize: 22, fontWeight: 800, color: "#E4E4E7" }}>HD</span>
            <span>9:16</span>
          </div>
          <div style={{ ...appear(f, T.info + 8, DUR.s, 16, 4), display: "flex", gap: 12, marginTop: 22 }}>
            {PLATS.map((p, i) => {
              const on = sp(f, T.prog + 4 + i * 4, SNAP);
              return (
                <div key={p.b} style={{ position: "relative", display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 18, background: "rgba(255,255,255,0.08)", border: `2px solid ${interpolateColors(clamp01(on), [0, 1], ["rgba(255,255,255,0.08)", "rgba(183,148,255,0.9)"])}`, fontSize: 25, fontWeight: 700, color: "#fff" }}>
                  <BrandLogo brand={p.b} size={28} color="#fff" />
                  {p.name}
                  <div style={{ position: "absolute", right: -8, top: -8, width: 28, height: 28, borderRadius: 14, background: "#8B5CF6", display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${on})` }}>
                    <Check size={17} color="#fff" stroke={3.4} />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ ...appear(f, T.info + 12, DUR.s, 16, 4), display: "flex", gap: 16, marginTop: 28 }}>
            <div style={{ position: "relative", flex: 1.45, height: 92, borderRadius: 18, background: "#fff", overflow: "hidden", fontSize: 34, fontWeight: 800, transform: `scale(${press})` }}>
              {btnText("#0A0A0C")}
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${prog * 100}%`, overflow: "hidden", background: SPECTRAL }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 400 }}>{btnText("#fff")}</div>
              </div>
              {finger > 0.01 && <div style={{ position: "absolute", left: "50%", top: "50%", width: 70, height: 70, margin: -35, borderRadius: 35, background: "rgba(124,58,237,0.35)", border: "3px solid rgba(255,255,255,0.8)", transform: `scale(${finger})` }} />}
            </div>
            <div style={{ flex: 1, height: 92, borderRadius: 18, background: "rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontSize: 30, fontWeight: 700, color: "#fff" }}>
              <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round">
                <circle cx="12" cy="12" r="8.5" />
                <path d="M12 7.5V12l3 2" />
              </svg>
              Programmer
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const WallScene: React.FC<{ f: number }> = ({ f }) => {
  const dim = ez(f, T.hover, T.hover + 20, CINE);
  const fade = ez(f, T.off - 2, T.off + 6, LEAVE);
  const pull = ez(f, T.pull, T.pull + 30, CAMERA);
  const hover = ez(f, T.hover, T.hover + 8, ENTER) * (1 - pull);
  const sx = wrap(rowOff(f, HERO_R)); // l'affiche suit sa rangée tant qu'elle n'est pas sortie
  const wp = wallPoint(sx);
  const off = ez(f, T.off, T.off + 5, LEAVE);
  const tilt = 1 - pull;
  const z = mix(wp.z + 1, Z_END, pull) + hover * 40;
  return (
    <AbsoluteFill style={{ perspective: PERSP, perspectiveOrigin: "50% 48%" }}>
      <div style={{ position: "absolute", left: 540, top: 960, width: 0, height: 0, transformStyle: "preserve-3d", transform: `scale(${camS(f)})` }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: 0, height: 0, transform: `rotateX(${WALL.rx}deg) rotateY(${WALL.ry}deg) rotateZ(${WALL.rz}deg)`, opacity: 1 - fade, filter: `brightness(${0.78 - 0.5 * dim}) blur(${(dim * 3).toFixed(2)}px)` }}>
          {Array.from({ length: ROWS }, (_, r) => (
            <Row key={r} f={f} r={r} />
          ))}
        </div>
        {f < T.off + 5 && (
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: 0,
              height: 0,
              transformStyle: "preserve-3d",
              transform: `translate3d(${mix(wp.x, 0, pull)}px, ${mix(wp.y, -40, pull) + wave(f, 90) * 3 * pull}px, ${z}px) rotateX(${WALL.rx * tilt}deg) rotateY(${WALL.ry * tilt}deg) rotateZ(${WALL.rz * tilt}deg)`,
            }}
          >
            <div style={{ position: "absolute", left: 0, top: 0, transform: `translate(-50%, -50%) scale(${K * (1 + hover * 0.04)}) scale(${mix(1, 1.08, off)}, ${mix(1, 0.008, off)})`, filter: off > 0 ? `brightness(${1 + off * 4})` : undefined }}>
              <PreviewCard f={f} />
            </div>
          </div>
        )}
      </div>
      {/* L'accroche, sur un voile sombre */}
      <AbsoluteFill style={{ background: "radial-gradient(75% 30% at 50% 47%, rgba(5,5,7,0.85) 0%, rgba(5,5,7,0.45) 60%, rgba(5,5,7,0) 100%)", opacity: 1 - ez(f, T.textOut, T.textOut + 12, LEAVE) }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 800, textAlign: "center", fontFamily: IT, fontWeight: 800, fontSize: 104, letterSpacing: "-0.045em", lineHeight: 1.1, color: "#fff" }}>
        <div style={both(appear(f, -6, DUR.m, 40, 12), leave(f, T.textOut))}>Publie une fois.</div>
        <div style={both(appear(f, 14, DUR.m, 40, 12), leave(f, T.textOut + 2))}>
          <span style={gradText}>Diffuse partout.</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ================================================================== 2. Le générique : rubans → logo */
const LG = { cx: 540, cy: 900, S: 440 };
const N_STR = 44;
const PITCH = LG.S / N_STR;
const TRI = { L: LG.cx - 0.12 * LG.S, A: LG.cx + 0.25 * LG.S, H: 0.2 * LG.S };
const L_LEFT = LG.cx - LG.S / 2;
const L_TOP = LG.cy - LG.S / 2;
const L_BOTTOM = LG.cy + LG.S / 2;
const L_R = LG.S * 0.3;
type Seg = { x: number; y0: number; y1: number; i: number };
const SEGS: Seg[] = (() => {
  const out: Seg[] = [];
  const edge = LG.S / 2 - L_R;
  for (let i = 0; i < N_STR; i++) {
    const x = L_LEFT + PITCH * (i + 0.5);
    const d = Math.abs(x - LG.cx);
    let y0 = L_TOP;
    let y1 = L_BOTTOM;
    if (d > edge) {
      const dx = d - edge;
      const dy = Math.sqrt(Math.max(0, L_R * L_R - dx * dx));
      y0 = L_TOP + L_R - dy;
      y1 = L_BOTTOM - L_R + dy;
    }
    if (x > TRI.L && x < TRI.A) {
      const h = (TRI.H * (TRI.A - x)) / (TRI.A - TRI.L);
      out.push({ x, y0, y1: LG.cy - h, i }, { x, y0: LG.cy + h, y1, i });
    } else out.push({ x, y0, y1, i });
  }
  return out;
})();
const R = L_R;
const L_RIGHT = LG.cx + LG.S / 2;
const TILE_PATH = `M ${L_LEFT + R} ${L_TOP} H ${L_RIGHT - R} A ${R} ${R} 0 0 1 ${L_RIGHT} ${L_TOP + R} V ${L_BOTTOM - R} A ${R} ${R} 0 0 1 ${L_RIGHT - R} ${L_BOTTOM} H ${L_LEFT + R} A ${R} ${R} 0 0 1 ${L_LEFT} ${L_BOTTOM - R} V ${L_TOP + R} A ${R} ${R} 0 0 1 ${L_LEFT + R} ${L_TOP} Z M ${TRI.L} ${LG.cy - TRI.H} L ${TRI.A} ${LG.cy} L ${TRI.L} ${LG.cy + TRI.H} Z`;
const SPRAY = Array.from({ length: 38 }, (_, k) => ({
  x: 20 + random(`sx${k}`) * 1040,
  s: T.strands + random(`ss${k}`) * 12,
  w: 2 + random(`sw${k}`) * 4,
  end: -200 - random(`se${k}`) * 700,
  dur: 14 + random(`sd${k}`) * 10,
}));
const spectrumAt = (u: number) => interpolateColors(u, SPECTRUM.map((s) => s[0]), SPECTRUM.map((s) => s[1]));
const IMPACT: SpringCfg = { mass: 1, stiffness: 300, damping: 15 };

const TitleScene: React.FC<{ f: number }> = ({ f }) => {
  const zoomE = ez(f, T.zoom, T.zoom + 16, Easing.bezier(0.6, 0, 0.9, 0.45));
  const zs = Math.exp(Math.log(22) * zoomE);
  const zsPrev = Math.exp(Math.log(22) * ez(f - 1, T.zoom, T.zoom + 16, Easing.bezier(0.6, 0, 0.9, 0.45)));
  const zoomBlur = Math.min(10, (zs - zsPrev) * 1.2);
  const comp = 1 - 0.035 * ez(f, T.compress, T.compress + 6, CAMERA);
  const scale = f >= T.impact ? mix(0.965, 1, sp(f, T.impact, IMPACT)) : comp;
  const close = ez(f, T.impact, T.impact + 3, ENTER);
  const smooth = ez(f, T.impact + 2, T.impact + 10, ENTER);
  const bright = ez(f, T.compress, T.compress + 8, CINE);
  const sheen = ez(f, T.impact + 12, T.impact + 36, CINE);
  const flash = f >= T.impact ? 1 - ez(f, T.impact, T.impact + 16, ENTER) : 0;
  const line = f >= T.off + 4 && f < T.strands + 16;
  const lineW = 900 * mix(1, 0.3, ez(f, T.off + 6, T.strands + 12, LEAVE));
  const lineO = 1 - ez(f, T.strands + 2, T.strands + 16, LEAVE);
  const sw = mix(PITCH * 0.7, PITCH + 0.8, close);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transformOrigin: "0px 0px", transform: `translate(${LG.cx}px, ${LG.cy}px) scale(${zs}) translate(${-LG.cx}px, ${-LG.cy}px)`, filter: zoomBlur > 0.3 ? `blur(${zoomBlur.toFixed(2)}px)` : undefined }}>
        {line && <div style={{ position: "absolute", left: LG.cx - lineW / 2, top: LG.cy - 3, width: lineW, height: 6, borderRadius: 3, background: "#fff", opacity: lineO, boxShadow: "0 0 30px #fff, 0 0 80px #9B6BFF" }} />}
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible", filter: `drop-shadow(0 0 ${24 + bright * 30}px rgba(155,107,255,${(0.55 + 0.3 * bright) * (1 - zoomE)}))` }}>
          <defs>
            <linearGradient id="pm-spec" gradientUnits="userSpaceOnUse" x1={L_LEFT} y1={0} x2={L_RIGHT} y2={0}>
              {SPECTRUM.map(([o, c]) => (
                <stop key={o} offset={o} stopColor={c} />
              ))}
            </linearGradient>
            <linearGradient id="pm-hi" gradientUnits="userSpaceOnUse" x1={0} y1={L_TOP} x2={0} y2={L_BOTTOM}>
              <stop offset={0} stopColor="#fff" stopOpacity={0.4} />
              <stop offset={0.55} stopColor="#fff" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="pm-sheen" x1={0} y1={0} x2={1} y2={0}>
              <stop offset={0} stopColor="#fff" stopOpacity={0} />
              <stop offset={0.5} stopColor="#fff" stopOpacity={0.6} />
              <stop offset={1} stopColor="#fff" stopOpacity={0} />
            </linearGradient>
            <clipPath id="pm-tile">
              <path d={TILE_PATH} clipRule="evenodd" fillRule="evenodd" />
            </clipPath>
          </defs>
          {/* Rubans décoratifs qui filent vers le haut */}
          {SPRAY.map((s, k) => {
            const head = mix(LG.cy, s.end, ez(f, s.s, s.s + s.dur, ENTER));
            const tail = mix(LG.cy, s.end, ez(f, s.s + 4, s.s + s.dur + 8, ENTER));
            const o = 0.85 * (1 - ez(f, s.s + s.dur * 0.6, s.s + s.dur + 8, LEAVE));
            if (f < s.s || o <= 0.01) return null;
            return <rect key={k} x={s.x - s.w / 2} y={head} width={s.w} height={Math.max(0, tail - head)} rx={s.w / 2} fill={spectrumAt(s.x / 1080)} opacity={o} />;
          })}
          <g transform={`translate(${LG.cx} ${LG.cy}) scale(${scale}) translate(${-LG.cx} ${-LG.cy})`}>
            <g opacity={1 - smooth}>
              {SEGS.map((s, k) => {
                const d = Math.abs(s.i - (N_STR - 1) / 2) * 0.5; // du centre vers les bords
                const g = ez(f, T.strands + d, T.strands + d + 16, ENTER);
                if (g <= 0) return null;
                const y0 = mix(LG.cy, s.y0, g);
                const y1 = mix(LG.cy, s.y1, g);
                if (y1 - y0 < 0.5) return null;
                return (
                  <g key={k}>
                    <rect x={s.x - sw / 2} y={y0} width={sw} height={y1 - y0} rx={mix(sw / 2, 0, close)} fill="url(#pm-spec)" />
                    <rect x={s.x - sw / 2} y={y0} width={sw} height={y1 - y0} rx={mix(sw / 2, 0, close)} fill="url(#pm-hi)" opacity={0.6 + 0.4 * bright} />
                  </g>
                );
              })}
            </g>
            {smooth > 0 && <path d={`M ${TRI.L} ${LG.cy - TRI.H} L ${TRI.A} ${LG.cy} L ${TRI.L} ${LG.cy + TRI.H} Z`} fill={INK} />}
            {smooth > 0 && (
              <g opacity={smooth}>
                <path d={TILE_PATH} fill="url(#pm-spec)" fillRule="evenodd" />
                <path d={TILE_PATH} fill="url(#pm-hi)" fillRule="evenodd" />
              </g>
            )}
            {sheen > 0 && sheen < 1 && (
              <g clipPath="url(#pm-tile)">
                <rect x={L_LEFT - 260 + sheen * (LG.S + 520)} y={L_TOP - 120} width={160} height={LG.S + 240} fill="url(#pm-sheen)" transform={`rotate(18 ${LG.cx} ${LG.cy})`} />
              </g>
            )}
          </g>
        </svg>
        <div style={{ position: "absolute", left: 0, right: 0, top: 604, textAlign: "center", fontFamily: IT, fontSize: 28, fontWeight: 600, letterSpacing: "0.34em", color: "rgba(255,255,255,0.62)", ...appear(f, T.credit, DUR.m, 20, 6) }}>UNE CRÉATION DSOCIETY</div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 1170, display: "flex", justifyContent: "center", fontFamily: IT, fontSize: 156, fontWeight: 800, letterSpacing: "-0.05em", color: "#fff", lineHeight: 1 }}>
          {"Uplink".split("").map((ch, i) => (
            <span key={i} style={{ display: "inline-block", ...appear(f, T.word + i * 2, DUR.m, 34, 10) }}>
              {ch}
            </span>
          ))}
        </div>
      </AbsoluteFill>
      {flash > 0 && <AbsoluteFill style={{ background: `radial-gradient(55% 32% at 50% ${(LG.cy / 1920) * 100}%, rgba(255,255,255,${0.75 * flash}) 0%, rgba(183,148,255,${0.4 * flash}) 40%, rgba(124,58,237,0) 100%)` }} />}
      <Ring f={f} at={T.impact} x={LG.cx} y={LG.cy} r0={250} r1={820} dur={22} w0={10} color="#fff" alpha={0.7} />
      <Ring f={f} at={T.impact + 2} x={LG.cx} y={LG.cy} r0={250} r1={680} dur={20} w0={6} color="#E879F9" alpha={0.5} />
      <Burst f={f} at={T.impact} x={LG.cx} y={LG.cy} n={26} speed={1700} life={0.8} seed="pm" size={11} colors={["#FFFFFF", "#C4B5FD", "#E879F9", "#FF5C7A"]} gravity={200} />
    </AbsoluteFill>
  );
};

/* ================================================================== 3. La liste des épisodes */
const LIST = [
  { title: "Publie partout", desc: "Une vidéo, trois réseaux, un seul clic." },
  { title: "Programme", desc: "Uplink publie à ta place, à l'heure choisie." },
  { title: "Ta commu prévenue", desc: "Les liens partent sur Discord." },
  { title: "Tes stats, tes revenus", desc: "Abonnés, vues et revenus au même endroit." },
];
const LIST_Y = [400, 626, 852, 1078];
const TW = 320;
const TH = 180;

const ThumbArt: React.FC<{ i: number }> = ({ i }) => (
  <div style={{ position: "absolute", inset: 0, background: `radial-gradient(90% 90% at 80% 0%, rgba(155,107,255,0.55), transparent 60%), linear-gradient(150deg, #1E1A2E, #0B0A10)`, display: "flex", alignItems: "center", justifyContent: "center", gap: 14, fontFamily: IT }}>
    {i === 0 && PLATS.map((p) => <BrandLogo key={p.b} brand={p.b} size={44} color="#fff" />)}
    {i === 1 && <span style={{ fontSize: 76, fontWeight: 200, color: "#fff", letterSpacing: "-0.02em" }}>19:00</span>}
    {i === 2 && <BrandLogo brand="discord" size={70} color="#fff" />}
    {i === 3 && (
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 90 }}>
        {[34, 52, 44, 70, 62, 90].map((h, k) => (
          <div key={k} style={{ width: 18, height: h, borderRadius: 5, background: k === 5 ? SPECTRAL : "rgba(183,148,255,0.7)" }} />
        ))}
      </div>
    )}
  </div>
);

const ListScene: React.FC<{ f: number }> = ({ f }) => {
  const pick = ez(f, T.pick, T.pick + 8, ENTER);
  const out = leave(f, T.expand - 2, 10, 40, 4);
  return (
    <AbsoluteFill style={{ fontFamily: IT, color: "#fff" }}>
      <div style={{ position: "absolute", left: 64, right: 150, top: 262, display: "flex", alignItems: "center", justifyContent: "space-between", ...both(appear(f, T.list), out) }}>
        <span style={{ fontSize: 64, fontWeight: 800, letterSpacing: "-0.04em" }}>Épisodes</span>
        <span style={{ fontSize: 28, fontWeight: 700, padding: "12px 22px", borderRadius: 14, background: "rgba(255,255,255,0.12)" }}>Saison 1 ▾</span>
      </div>
      {LIST.map((row, i) => (
        <div key={i} style={{ position: "absolute", left: 64, right: 150, top: LIST_Y[i], height: 200, display: "flex", gap: 28, ...(i === 0 ? appear(f, T.list + 4) : both(appear(f, T.list + 4 + i * 4), out)) }}>
          <div style={{ position: "relative", width: TW, height: TH, flexShrink: 0, borderRadius: 16, overflow: "hidden", opacity: i === 0 && f >= T.expand ? 0 : 1, transform: i === 0 ? `scale(${1 + 0.03 * pick})` : undefined, boxShadow: i === 0 ? `0 0 0 ${3 * pick}px rgba(255,255,255,${0.9 * pick}), 0 20px 50px rgba(0,0,0,0.5)` : "0 20px 50px rgba(0,0,0,0.5)" }}>
            <ThumbArt i={i} />
            {i === 0 && pick > 0 && (
              <div style={{ position: "absolute", left: "50%", top: "50%", width: 70, height: 70, margin: -35, borderRadius: 35, background: "rgba(255,255,255,0.92)", display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${pick})` }}>
                <PlayGlyph size={34} color="#0A0A0C" />
              </div>
            )}
          </div>
          <div style={{ flex: 1, paddingTop: 18, ...(i === 0 ? out : {}) }}>
            <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-0.02em" }}>
              {i + 1}. {row.title}
            </div>
            <div style={{ fontSize: 26, fontWeight: 500, color: MUTED, marginTop: 10, lineHeight: 1.35 }}>{row.desc}</div>
          </div>
        </div>
      ))}
      <Ring f={f} at={T.tapRow} x={64 + TW / 2} y={LIST_Y[0] + TH / 2} r0={30} r1={150} dur={12} w0={8} color="#fff" alpha={0.9} />
    </AbsoluteFill>
  );
};

/* ================================================================== 4. Les épisodes */
const EP = [
  { n: 1, title: "Publie|partout.", sub: "TikTok, YouTube, Instagram.", next: "Programme" },
  { n: 2, title: "Programme.", sub: "Uplink publie à ta place.", next: "Discord" },
  { n: 3, title: "Ta commu|prévenue.", sub: "Les liens partent sur Discord.", next: "Statistiques" },
  { n: 4, title: "Tes stats.|Tes revenus." },
];

/** Habillage « lecteur » : épisode, barre de lecture, minuteur, puis « Suivant ». */
const Chrome: React.FC<{ t: number; k: number }> = ({ t: tt, k }) => {
  const ep = EP[k];
  const lead = k > 0 ? 8 : 0; // le titre arrive avec le glissé
  const t = tt + lead;
  const lines = ep.title.split("|");
  let w = 0;
  const words = lines.reduce((a, l) => a + l.split(" ").length, 0);
  const track = ez(t, 2, 2 + DUR.l, ENTER);
  const p = clamp01(tt / 90); // lecture : linéaire
  const sec = Math.min(3, Math.floor(Math.max(0, tt) / 30));
  const nextE = ep.next ? ez(tt, 64, 72, ENTER) : 0;
  return (
    <div style={{ position: "absolute", top: 236, left: 64, right: 150, fontFamily: IT, color: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: 36, ...appear(t, 2, DUR.s, 12, 0) }}>
        <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: "0.22em", ...gradText }}>ÉPISODE {ep.n}</span>
        <span style={{ position: "relative", height: 36, minWidth: 330, overflow: "hidden", fontSize: 24, fontWeight: 600, color: "rgba(255,255,255,0.62)", fontVariantNumeric: "tabular-nums" }}>
          <span style={{ position: "absolute", right: 0, top: 4, transform: `translateY(${-nextE * 120}%)` }}>0:0{sec} / 0:03</span>
          {ep.next && (
            <span style={{ position: "absolute", right: 0, top: 4, transform: `translateY(${(1 - nextE) * 120}%)`, color: "#fff" }}>
              Suivant · {ep.next} ›
            </span>
          )}
        </span>
      </div>
      <div style={{ position: "relative", marginTop: 14, height: 6, width: `${track * 100}%`, borderRadius: 3, background: "rgba(255,255,255,0.16)" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${p * 100}%`, borderRadius: 3, background: SPECTRAL }} />
        <div style={{ position: "absolute", left: `${p * 100}%`, top: -5, width: 16, height: 16, marginLeft: -8, borderRadius: 8, background: "#fff", boxShadow: "0 0 12px rgba(255,255,255,0.7)", opacity: track }} />
      </div>
      <div style={{ marginTop: 24 }}>
        {lines.map((line, li) => (
          <div key={li} style={{ fontSize: 124, fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 1.0, whiteSpace: "nowrap" }}>
            {line.split(" ").map((word, wi, arr) => {
              const i = w++;
              const last = li === lines.length - 1 && wi === arr.length - 1 && word.endsWith(".");
              return (
                <React.Fragment key={wi}>
                  <span style={{ display: "inline-block", ...appear(t, 4 + i * 3, DUR.m, 34, 10) }}>
                    {last ? (
                      <>
                        {word.slice(0, -1)}
                        <span style={gradText}>.</span>
                      </>
                    ) : (
                      word
                    )}
                  </span>
                  {wi < arr.length - 1 ? " " : null}
                </React.Fragment>
              );
            })}
          </div>
        ))}
      </div>
      {ep.sub && <div style={{ marginTop: 22, fontSize: 46, fontWeight: 600, color: MUTED, letterSpacing: "-0.02em", whiteSpace: "nowrap", ...appear(t, 4 + words * 3 + 3, DUR.m, 22, 6) }}>{ep.sub}</div>}
    </div>
  );
};

interface Pose {
  rotY: number;
  rotX: number;
  rotZ: number;
  x: number;
  y: number;
  scale: number;
}
/** Téléphone en studio : halo, reflet au sol, flou de bougé, écran en thème sombre. */
const StudioPhone: React.FC<{ p: Pose; q: Pose; id: string; children: React.ReactNode }> = ({ p, q, id, children }) => {
  const b = blurOf(Math.abs(p.x - q.x) + Math.abs(p.rotY - q.rotY) * 3, Math.abs(p.y - q.y) + Math.abs(p.rotX - q.rotX) * 3, 0.3, 10);
  const cx = 540 + p.x;
  const cy = 1110 + p.y;
  return (
    <>
      <div style={{ position: "absolute", left: cx - 520 * p.scale, top: cy - 700 * p.scale, width: 1040 * p.scale, height: 1400 * p.scale, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(124,58,237,0.32), rgba(124,58,237,0))" }} />
      <div style={{ position: "absolute", left: cx - 300 * p.scale, top: cy + 515 * p.scale + 20, width: 600 * p.scale, height: 70, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(255,255,255,0.16), rgba(255,255,255,0))" }} />
      <Blur id={id} sx={b.sx} sy={b.sy} region={8} />
      <AbsoluteFill style={{ filter: blurUrl(b, id) }}>
        <AbsoluteFill style={{ perspective: 2400, perspectiveOrigin: "50% 55%" }}>
          <Phone {...p} centerX={540} centerY={1110}>
            <ThemeProvider theme={DARK}>
              <UserProvider user={USER}>{children}</UserProvider>
            </ThemeProvider>
          </Phone>
        </AbsoluteFill>
      </AbsoluteFill>
    </>
  );
};

/* --- Épisode 1 : publier partout (bandeaux de notification façon iOS) */
const Banner: React.FC<{ t: number; at: number; y: number; p: { b: Brand; name: string } }> = ({ t, at, y, p }) => {
  if (t < at) return null;
  const e = sp(t, at, SNAP);
  const draw = ez(t, at + 6, at + 11, ENTER);
  return (
    <div
      style={{
        position: "absolute",
        left: 110,
        width: 820,
        top: y,
        height: 116,
        borderRadius: 38,
        background: "rgba(38,38,46,0.66)",
        backdropFilter: "blur(26px) saturate(160%)",
        WebkitBackdropFilter: "blur(26px) saturate(160%)",
        border: "1.5px solid rgba(255,255,255,0.12)",
        boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        gap: 22,
        padding: "0 26px",
        fontFamily: IT,
        opacity: Math.min(1, e * 2),
        transform: `translateY(${(1 - e) * -50}px) scale(${0.94 + 0.06 * e})`,
      }}
    >
      <UplinkMark size={68} />
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, fontWeight: 700, color: "rgba(255,255,255,0.55)", letterSpacing: "0.06em" }}>
          <span>UPLINK</span>
          <span style={{ letterSpacing: 0 }}>maintenant</span>
        </div>
        <div style={{ fontSize: 33, fontWeight: 700, color: "#fff", marginTop: 4, display: "flex", alignItems: "center", gap: 10 }}>
          Publiée sur <BrandLogo brand={p.b} size={30} color="#fff" /> {p.name}
        </div>
      </div>
      <svg width={52} height={52} viewBox="0 0 52 52">
        <circle cx={26} cy={26} r={24} fill="url(#pm-ok)" />
        <defs>
          <linearGradient id="pm-ok" x1={0} y1={0} x2={1} y2={1}>
            <stop offset={0} stopColor="#9B6BFF" />
            <stop offset={1} stopColor="#E879F9" />
          </linearGradient>
        </defs>
        <path d="M15 27 L23 34 L37 19" fill="none" stroke="#fff" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
      </svg>
    </div>
  );
};

const e1Pose = (t: number): Pose => {
  const turn = ez(t, -14, 84, CINE);
  return { rotY: mix(-28, -8, turn), rotX: mix(9, 6, turn), rotZ: mix(-3, 0, turn), x: 0, y: 250 + wave(t, 120) * 6, scale: 0.82 };
};
const Ep1: React.FC<{ t: number }> = ({ t }) => (
  <>
    <StudioPhone p={e1Pose(t)} q={e1Pose(t - 1)} id="ep1">
      <LiftSwap t={t} at={28} a={<At screen={ComposerScreen} time={remap(t + 14, 40, 30, 112)} />} b={<At screen={PublishScreen} time={remap(t - 28, 34, 88, 126)} />} />
    </StudioPhone>
    {PLATS.map((p, i) => (
      <Banner key={p.b} t={t} at={36 + i * 5} y={700 + i * 132} p={p} />
    ))}
    <Chrome t={t} k={0} />
  </>
);

/* --- Épisode 2 : « 19:00 » comme sur l'écran verrouillé */
const CLOCK: ({ seq: string[]; d: number } | { colon: true; d: number })[] = [
  { seq: ["", "6", "7", "8", "9", "0", "1"], d: 0 },
  { seq: ["", "3", "4", "5", "6", "7", "8", "9"], d: 2 },
  { colon: true, d: 4 },
  { seq: ["", "7", "8", "9", "0"], d: 5 },
  { seq: ["", "5", "6", "7", "8", "9", "0"], d: 7 },
];
const CLK = 300;
const e2Pose = (t: number): Pose => {
  const turn = ez(t, -10, 88, CINE);
  return { rotY: mix(20, 8, turn), rotX: 10, rotZ: mix(4, 2, turn), x: 30, y: 440 + wave(t, 120) * 6, scale: 0.74 };
};
const Ep2: React.FC<{ t: number }> = ({ t }) => (
  <>
    <StudioPhone p={e2Pose(t)} q={e2Pose(t - 1)} id="ep2">
      <At screen={ScheduleScreen} time={remap(t, 40, 0, 44)} />
    </StudioPhone>
    <div style={{ position: "absolute", left: 0, right: 0, top: 568, textAlign: "center", fontFamily: IT, fontSize: 38, fontWeight: 600, color: "rgba(255,255,255,0.72)", ...appear(t, 8, DUR.m, 16, 6) }}>Ce soir</div>
    <div style={{ position: "absolute", left: 0, right: 0, top: 620, height: CLK, display: "flex", justifyContent: "center", fontFamily: IT, fontSize: CLK, fontWeight: 200, lineHeight: 1, color: "#fff", letterSpacing: "-0.02em", textShadow: "0 0 60px rgba(155,107,255,0.45)" }}>
      {CLOCK.map((col, ci) => {
        if ("colon" in col) {
          return (
            <div key={ci} style={{ width: "0.3em", textAlign: "center", marginTop: "-0.05em", ...appear(t, 10 + col.d, DUR.m, 20, 0) }}>
              :
            </div>
          );
        }
        const k = ez(t, 10 + col.d, 10 + col.d + 20, ENTER) * (col.seq.length - 1);
        const kp = ez(t - 1, 10 + col.d, 10 + col.d + 20, ENTER) * (col.seq.length - 1);
        const b = blurOf(0, (k - kp) * CLK, 0.2, 18);
        return (
          <div key={ci} style={{ width: "0.56em", height: "1em", overflow: "hidden", textAlign: "center", filter: blurUrl(b, `clk${ci}`) }}>
            <Blur id={`clk${ci}`} sx={0} sy={b.sy} region={10} />
            <div style={{ transform: `translateY(${-k}em)` }}>
              {col.seq.map((d, di) => (
                <div key={di} style={{ height: "1em", fontVariantNumeric: "tabular-nums" }}>
                  {d || " "}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
    <Chrome t={t} k={1} />
  </>
);

/* --- Épisode 3 : le message Discord sort de l'écran */
const e3Pose = (t: number): Pose => {
  const turn = ez(t, -10, 88, CINE);
  return { rotY: mix(-28, -16, turn), rotX: -3, rotZ: -2, x: 170, y: 250 + wave(t, 120) * 6, scale: 0.88 };
};
const discFly = (t: number) => {
  const e = sp(t, 14, { mass: 1, stiffness: 120, damping: 16 }); // ≈ 3 % : à peine un dépassement
  return { x: mix(720, 450, e), y: mix(1300, 1060, e), z: mix(-20, 220, e), ry: mix(-28, -8, e), s: mix(0.32, 1, e) };
};
const DiscordCard: React.FC<{ t: number }> = ({ t }) => {
  const link = (s: string) => <span style={{ color: "#00A8FC" }}>{s}</span>;
  const b = (s: string) => <b style={{ color: "#fff", fontWeight: 700 }}>{s}</b>;
  const lines: React.ReactNode[] = [
    <>{b("Clutch 1v4 en ranked")} est en ligne !</>,
    <>
      {b("TikTok")} · {link("tiktok.com/@dekhan/video/7425…")}
    </>,
    <>
      {b("YouTube")} · {link("youtube.com/shorts/Vq3dX8…")}
    </>,
    <>
      {b("Instagram")} · {link("instagram.com/reel/DBk2pQ…")}
    </>,
  ];
  return (
    <div style={{ width: 700, padding: "26px 30px", borderRadius: 34, background: "linear-gradient(180deg, #2B2D31, #232428)", border: "1.5px solid rgba(255,255,255,0.08)", boxShadow: "0 40px 90px rgba(0,0,0,0.6), 0 0 70px rgba(88,101,242,0.25)", fontFamily: IT, color: "#B5BAC1" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <UplinkMark size={60} />
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: "#fff" }}>Uplink</span>
          <span style={{ fontSize: 14, fontWeight: 800, background: "#5865F2", color: "#fff", borderRadius: 6, padding: "3px 7px" }}>APP</span>
          <span style={{ fontSize: 19, fontWeight: 500, color: "#949BA4" }}>Aujourd'hui à 19:00</span>
        </div>
        <BrandLogo brand="discord" size={38} color="#fff" />
      </div>
      <div style={{ marginTop: 12, fontSize: 23, fontWeight: 500, lineHeight: 1.55, whiteSpace: "nowrap" }}>
        {lines.map((l, i) => (
          <div key={i} style={appear(t, 18 + i * 3, DUR.s, 12, 3)}>
            {l}
          </div>
        ))}
      </div>
    </div>
  );
};
const Ep3: React.FC<{ t: number }> = ({ t }) => {
  const c = discFly(t);
  const q = discFly(t - 1);
  const b = blurOf(c.x - q.x + (c.s - q.s) * 300, c.y - q.y, 0.3, 12);
  return (
    <>
      <StudioPhone p={e3Pose(t)} q={e3Pose(t - 1)} id="ep3">
        <At screen={DiscordScreen} time={remap(t, 46, 20, 96)} />
      </StudioPhone>
      {t >= 14 && (
        <AbsoluteFill style={{ perspective: 2400, perspectiveOrigin: "50% 55%", filter: blurUrl(b, "disc3") }}>
          <Blur id="disc3" sx={b.sx} sy={b.sy} region={10} />
          <div style={{ position: "absolute", left: c.x, top: c.y, transform: `translate(-50%, -50%) translate3d(0, ${wave(t, 70) * 5}px, ${c.z}px) rotateY(${c.ry}deg) scale(${c.s})` }}>
            <DiscordCard t={t} />
          </div>
        </AbsoluteFill>
      )}
      <Ring f={t} at={26} x={772} y={958} r0={20} r1={120} dur={16} w0={6} color="#A5B4FC" alpha={0.9} />
      <Ring f={t} at={31} x={772} y={958} r0={20} r1={120} dur={16} w0={6} color="#A5B4FC" alpha={0.6} />
      <Chrome t={t} k={2} />
    </>
  );
};

/* --- Épisode 4 : le « Top 3 » et la courbe des revenus */
const TOP = [
  { title: "Live 12h", pal: 0 },
  { title: "Dreamhack", pal: 1 },
  { title: "Clutch 1v4", pal: 6 },
];
const REV: [number, number][] = [
  [0, 150],
  [120, 132],
  [240, 138],
  [360, 108],
  [480, 96],
  [600, 64],
  [720, 50],
  [814, 14],
];
const smoothPath = (pts: [number, number][]) => {
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    d += ` C ${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6}, ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6}, ${p2[0]} ${p2[1]}`;
  }
  return d;
};
const REV_D = smoothPath(REV);
const Ep4: React.FC<{ t: number }> = ({ t }) => {
  const draw = ez(t, 26, 52, ENTER);
  const dot = sp(t, 48, SNAP);
  return (
    <>
      <div style={{ position: "absolute", left: 64, top: 594, fontFamily: IT, fontSize: 34, fontWeight: 700, color: "#fff", ...appear(t, 8, DUR.m, 16, 6) }}>Top 3 de tes vidéos</div>
      {TOP.map((v, i) => {
        const left = 64 + i * 286;
        return (
          <React.Fragment key={i}>
            <div style={{ position: "absolute", left, top: 640, fontFamily: IT, fontSize: 330, fontWeight: 800, lineHeight: 1, color: INK, WebkitTextStroke: "5px rgba(255,255,255,0.78)", letterSpacing: "-0.06em", ...appear(t, 10 + i * 4, DUR.m, 30, 8) }}>{i + 1}</div>
            <div style={{ position: "absolute", left: left + 100, top: 660, boxShadow: "0 24px 60px rgba(0,0,0,0.6)", borderRadius: 16, ...appear(t, 12 + i * 4, DUR.m, 30, 8) }}>
              <Poster i={40 + i} w={180} h={320} title={v.title} palette={v.pal} radius={16} />
            </div>
          </React.Fragment>
        );
      })}
      <div style={{ position: "absolute", left: 64, top: 1024, width: 866, padding: "24px 26px 26px", borderRadius: 34, background: "linear-gradient(180deg, rgba(36,34,48,0.95), rgba(20,20,24,0.95))", border: "1.5px solid rgba(255,255,255,0.10)", boxShadow: "0 40px 80px rgba(0,0,0,0.5)", fontFamily: IT, ...appear(t, 22, DUR.m, 30, 8) }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <span style={{ fontSize: 34, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>Revenus</span>
          <span style={{ width: 48, height: 48, borderRadius: 15, background: "rgba(155,107,255,0.2)", color: "#C4B5FD", fontSize: 28, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>€</span>
        </div>
        <svg width={814} height={170} style={{ overflow: "visible", display: "block" }}>
          <defs>
            <linearGradient id="pm-line" x1={0} y1={0} x2={1} y2={0}>
              <stop offset={0} stopColor="#8B5CF6" />
              <stop offset={0.6} stopColor="#E879F9" />
              <stop offset={1} stopColor="#FF5C7A" />
            </linearGradient>
            <linearGradient id="pm-area" x1={0} y1={0} x2={0} y2={1}>
              <stop offset={0} stopColor="#B794FF" stopOpacity={0.4} />
              <stop offset={1} stopColor="#B794FF" stopOpacity={0} />
            </linearGradient>
            <clipPath id="pm-reveal">
              <rect x={-10} y={-20} width={10 + 834 * draw} height={210} />
            </clipPath>
          </defs>
          <path d={`${REV_D} L 814 170 L 0 170 Z`} fill="url(#pm-area)" clipPath="url(#pm-reveal)" />
          <path d={REV_D} fill="none" stroke="url(#pm-line)" strokeWidth={7} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
          {dot > 0 && <circle cx={814} cy={14} r={11 * dot} fill="#fff" stroke="#FF5C7A" strokeWidth={5} />}
        </svg>
      </div>
      <Chrome t={t} k={3} />
    </>
  );
};
const EPISODES = [Ep1, Ep2, Ep3, Ep4];

/** Un épisode à l'écran : entrée et sortie en glissé horizontal (le « suivant »), flou de bougé. */
const EpisodeSlot: React.FC<{ f: number; k: number }> = ({ f, k }) => {
  const { start, end } = EPS[k];
  const E = EPISODES[k];
  const xAt = (g: number) => (k > 0 ? 1080 * (1 - ez(g, start - 6, start + 6, CAMERA)) : 0) - (k < 3 ? 1080 * ez(g, end - 6, end + 6, CAMERA) : 0);
  const x = xAt(f);
  const b = blurOf(x - xAt(f - 1), 0, 0.3, 24);
  const fadeOut = k === 3 ? leave(f, T.end - 8, 10, -20, 6) : {};
  return (
    <AbsoluteFill style={{ transform: `translateX(${x}px)`, filter: blurUrl(b, `slide${k}`), ...(k === 3 ? { opacity: fadeOut.opacity, transform: `translateX(${x}px) scale(${1 - 0.04 * (1 - Number(fadeOut.opacity ?? 1))})` } : {}) }}>
      <Blur id={`slide${k}`} sx={b.sx} sy={0} region={4} />
      <E t={f - start} />
    </AbsoluteFill>
  );
};

/** Le premier épisode naît de sa vignette : elle s'agrandit jusqu'au plein écran. */
const ExpandFromList: React.FC<{ f: number }> = ({ f }) => {
  const e = ez(f, T.expand, T.expand + 14, CAMERA);
  const x = mix(64, 0, e);
  const y = mix(LIST_Y[0], 0, e);
  const w = mix(TW * 1.03, 1080, e);
  const h = mix(TH * 1.03, 1920, e);
  const s = Math.max(w / 1080, h / 1920);
  const art = 1 - ez(f, T.expand, T.expand + 6, CINE);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: mix(16, 0, e), overflow: "hidden", background: INK }}>
      <div style={{ position: "absolute", left: w / 2, top: h / 2, width: 1080, height: 1920, transform: `translate(-50%, -50%) scale(${s})` }}>
        <Spotlight f={f} />
        <Ep1 t={f - EPS[0].start} />
      </div>
      {art > 0 && (
        <div style={{ position: "absolute", inset: 0, opacity: art }}>
          <ThumbArt i={0} />
        </div>
      )}
    </div>
  );
};

/* ================================================================== 5. La fin keynote */
const EndScene: React.FC<{ f: number }> = ({ f }) => {
  const t = f - T.end;
  const logo = ez(t, 0, 22, ENTER);
  const breathe = t > 60 ? 1 + 0.012 * wave(t - 60, 75) : 1;
  const shine = ez(t, 58, 80, CINE);
  return (
    <AbsoluteFill style={{ fontFamily: IT, color: "#fff" }}>
      {/* Rubans lumineux très discrets qui montent (couche ambiante, écho du générique) */}
      {Array.from({ length: 16 }, (_, k) => {
        const x = 60 + random(`ex${k}`) * 960;
        const speed = 2.2 + random(`ev${k}`) * 2.5;
        const len = 220 + random(`el${k}`) * 380;
        const y = 1920 + 200 - ((random(`ey${k}`) * 2400 + Math.max(0, t) * speed) % 2600);
        return <div key={k} style={{ position: "absolute", left: x, top: y, width: 3, height: len, borderRadius: 2, background: `linear-gradient(180deg, ${spectrumAt(x / 1080)}, rgba(0,0,0,0))`, opacity: 0.16 * logo }} />;
      })}
      <div style={{ position: "absolute", left: 540 - 420, top: 640 - 420, width: 840, height: 840, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(124,58,237,0.38), rgba(124,58,237,0))", opacity: logo }} />
      <div style={{ position: "absolute", left: 540 - 115, top: 640 - 115, opacity: logo, transform: `translateY(${(1 - logo) * 24}px) scale(${0.96 + 0.04 * logo})` }}>
        <UplinkMark size={230} sheen={ez(t, 22, 46, CINE)} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 800, display: "flex", justifyContent: "center", fontSize: 176, fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 1 }}>
        {"Uplink".split("").map((ch, i) => (
          <span key={i} style={{ display: "inline-block", ...appear(t, 8 + i * 2, DUR.m, 34, 10) }}>
            {ch}
          </span>
        ))}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1016, display: "flex", justifyContent: "center", gap: 20, fontSize: 60, fontWeight: 700, letterSpacing: "-0.03em", color: "rgba(255,255,255,0.9)", whiteSpace: "nowrap" }}>
        <span style={appear(t, 22, DUR.m, 24, 8)}>
          Publie partout<span style={gradText}>.</span>
        </span>
        <span style={appear(t, 26, DUR.m, 24, 8)}>
          Pilote tout<span style={gradText}>.</span>
        </span>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1140, display: "flex", justifyContent: "center", ...appear(t, 36, DUR.m, 24, 0) }}>
        <div style={{ position: "relative", overflow: "hidden", display: "flex", alignItems: "center", gap: 18, padding: "26px 50px 26px 42px", borderRadius: 999, background: "#fff", color: "#0A0A0C", fontSize: 50, fontWeight: 800, letterSpacing: "-0.02em", boxShadow: "0 24px 70px rgba(124,58,237,0.45)", transform: `scale(${breathe})` }}>
          <PlayGlyph size={44} color="#0A0A0C" />
          dsociety.fr/uplink
          {shine > 0 && shine < 1 && <div style={{ position: "absolute", top: 0, bottom: 0, left: `${-40 + shine * 160}%`, width: "35%", background: "linear-gradient(100deg, rgba(183,148,255,0) 0%, rgba(183,148,255,0.35) 50%, rgba(183,148,255,0) 100%)" }} />}
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1316, textAlign: "center", fontSize: 26, fontWeight: 600, letterSpacing: "0.34em", color: "rgba(255,255,255,0.55)", ...appear(t, 48, DUR.m, 16, 6) }}>UNE CRÉATION DSOCIETY</div>
    </AbsoluteFill>
  );
};

/* ================================================================== Montage */
/** Lumière de studio : douche douce en haut, lueur violette au sol (couche ambiante). */
const Spotlight: React.FC<{ f: number }> = ({ f }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(60% 38% at ${50 + wave(f, 420) * 3}% ${16 + wave(f, 300) * 2}%, rgba(255,255,255,0.075), rgba(255,255,255,0) 70%), radial-gradient(60% 28% at 50% 94%, rgba(124,58,237,${0.16 + 0.03 * wave(f, 240)}), rgba(124,58,237,0) 70%)`,
    }}
  />
);

export const Premiere: React.FC = () => {
  useFonts();
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: INK, overflow: "hidden" }}>
      <Audio src={staticFile("premiere/premiere.m4a")} />
      <Spotlight f={f} />
      {f < T.off + 8 && <WallScene f={f} />}
      {f >= T.off + 4 && f < T.zoom + 18 && <TitleScene f={f} />}
      {f >= T.list - 2 && f < T.expand + 16 && <ListScene f={f} />}
      {f >= T.expand && f < T.expand + 14 && <ExpandFromList f={f} />}
      {EPS.map(({ start, end }, k) => {
        const from = k === 0 ? T.expand + 14 : start - 6;
        const to = k === 3 ? T.end + 4 : end + 6;
        return f >= from && f < to ? <EpisodeSlot key={k} f={f} k={k} /> : null;
      })}
      {f >= T.end - 2 && <EndScene f={f} />}
      <Grain f={f} opacity={0.06} />
      <Vignette strength={0.5} />
    </AbsoluteFill>
  );
};
