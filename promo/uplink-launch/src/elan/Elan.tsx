/**
 * « Élan » — vidéo TikTok de 15 s (9:16) construite avec le skill motion-design de LottieFiles (voir ./kit.tsx pour
 * l'identité de mouvement). Récit en quatre actes, progression « montée en puissance » :
 *
 *  I    Anticipation → impact (0–2,1 s)   « 1 vidéo. » → « 3 réseaux. » → « 1 clic. » : le chiffre géant roule
 *       comme un odomètre, les trois logos jaillissent du « 3 », puis on tape sur le « 1 » : compression,
 *       éclat, et le « 1 » décolle vers le haut. Volet chevron.
 *  II   Action (2,1–9,8 s)   un seul téléphone, héros continu, qui change de pose à chaque idée :
 *       « Publie partout. » (bouton Publier, trois cartes « Publiée » avec le motif de succès),
 *       « Programme. » (« 19:00 » en odomètre), « Ta commu prévenue. » (le message Discord sort de l'écran).
 *  III  Réaction (9,8–11,3 s)  « Tes stats. Tes revenus. » : ondes, courbe qui se trace, barres qui montent.
 *  IV   Résolution (11,3–15 s)  volet chevron violet ; le chevron « ^ » pivote et devient le bouton lecture du
 *       logo (transformation), « Uplink », « Publie partout. Pilote tout. », l'adresse. Rythme premium, puis calme.
 */
import React from "react";
import { AbsoluteFill, Audio, Easing, Freeze, interpolateColors, staticFile, useCurrentFrame } from "remotion";
import { BrandLogo, type Brand } from "../brands";
import { useFonts } from "../fonts";
import { ArrowUp, Check, PlayGlyph } from "../icons";
import { PHONE_H, Phone, SCREEN_H, SCREEN_W } from "../Phone";
import { DARK, ThemeProvider, UserProvider } from "../theme";
import { ComposerScreen, ScheduleScreen } from "../tour/screens1";
import { DiscordScreen, StatsScreen } from "../tour/screens2";
import { FONT } from "../tour/kit";
import { USER } from "../tour/Tour";
import {
  Aurora,
  BACK,
  Blur,
  Burst,
  C,
  ChevronBands,
  D,
  DX,
  DotGrid,
  EXIT,
  EXPO_OUT,
  GENTLE,
  Grain,
  IT,
  MOVE,
  Motes,
  POP,
  RISE,
  Ring,
  SNAP,
  SWEEP,
  type SpringCfg,
  Up,
  Vignette,
  WIPE_END,
  belowChevron,
  blurOf,
  blurUrl,
  clamp01,
  ez,
  mix,
  sp,
  wave,
  wipeTrail,
} from "./kit";

export const ELAN_DURATION = 450;
const ACCEL = Easing.bezier(0.3, 0, 1, 1); // sortie qui accélère (décollage)

/* ================================================================== Temps forts (images) */
const T = {
  swap3: 24,
  swap1: 48,
  tap: 54,
  burst: 60,
  wipe1: 62,
  publish: 108,
  cards: 114,
  f1out: 146,
  f2in: 150,
  f2out: 214,
  f3in: 220,
  disc: 240,
  f3out: 284,
  f4in: 290,
  charts: 300,
  wipe2: 340,
};
const PLATS: { b: Brand; name: string }[] = [
  { b: "tiktok", name: "TikTok" },
  { b: "youtube", name: "YouTube" },
  { b: "instagram", name: "Instagram" },
];

/* ================================================================== Acte I : l'accroche */
const HOOK = [
  { n: "1", w: "vidéo", at: -6, wAt: -5 },
  { n: "3", w: "réseaux", at: T.swap3, wAt: T.swap3 + 3 },
  { n: "1", w: "clic", at: T.swap1, wAt: T.swap1 + 3 },
];
const NUM_Y = 740;
const NUM_SIZE = 640;
const NUM_BOX = 640;
const LABEL_Y = 1150;
const DIGIT: SpringCfg = { mass: 1, stiffness: 300, damping: 20 }; // ≈ 11 %
const NUM_GRAD = "linear-gradient(180deg, #FFFFFF 8%, #E4D8FF 40%, #9B6BFF 92%)";

/** Position verticale (en % de la case) d'un élément d'odomètre : monte par le bas, repart par le haut. */
function slot(f: number, at: number, next: number | undefined, cfg: SpringCfg) {
  if (f < at) return null;
  const out = next === undefined ? 0 : ez(f, next - 2, next + 2, EXIT);
  if (out >= 1) return null;
  return (1 - sp(f, at, cfg)) * 108 - out * 112;
}

const TILES = [
  { x: 176, y: 800, rot: -10 },
  { x: 540, y: 318, rot: 0 },
  { x: 904, y: 800, rot: 10 },
];
function tileState(f: number, i: number) {
  const start = T.swap3 + 3 + i * 2;
  const s = sp(f, start, POP);
  const t = TILES[i];
  const from = { x: 540, y: NUM_Y };
  // Arc : léger décalage perpendiculaire à mi-parcours.
  const dx = t.x - from.x;
  const dy = t.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const arc = Math.sin(Math.PI * clamp01(s)) * 22;
  const c = ez(f, 43, 48, EXIT); // aspirés dans le « 1 »
  const landed = clamp01((f - start - 10) / 10);
  let x = mix(from.x, t.x, s) + (-dy / len) * arc;
  let y = mix(from.y, t.y, s) + (dx / len) * arc + wave(f, 54, i / 3) * 6 * landed;
  x = mix(x, 540, c);
  y = mix(y, NUM_Y, c);
  return { x, y, scale: mix(0.2, 1, s) * (1 - 0.8 * c), rot: mix(t.rot + (i - 1) * 40 - 30, t.rot, s), visible: f >= start && c < 1 };
}

const BrandTile: React.FC<{ brand: Brand; size?: number }> = ({ brand, size = 150 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size * 0.3,
      background: "linear-gradient(160deg, #2C2742 0%, #15131F 100%)",
      border: "1.5px solid rgba(255,255,255,0.14)",
      boxShadow: "0 0 50px rgba(155,107,255,0.45), inset 0 1.5px 0 rgba(255,255,255,0.16), 0 24px 50px rgba(0,0,0,0.45)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <BrandLogo brand={brand} size={size * 0.48} color="#fff" />
  </div>
);

const Hook: React.FC<{ f: number }> = ({ f }) => {
  // Chiffre géant (héros) : odomètre, compression avant le clic, étirement et décollage.
  const ys = (k: number) => HOOK.map((h, i) => slot(k, h.at, HOOK[i + 1]?.at, DIGIT));
  const cur = ys(f);
  const prev = ys(f - 1);
  let vmax = 0;
  cur.forEach((y, i) => {
    const p = prev[i];
    if (y !== null && p !== null) vmax = Math.max(vmax, Math.abs(y - p) * (NUM_BOX / 100));
  });
  const squash = f < T.burst ? ez(f, T.tap, T.tap + D.s, EXPO_OUT) : 0;
  const stretch = ez(f, T.burst, T.burst + 2, EXPO_OUT);
  const lift = (k: number) => ez(k, T.burst, T.burst + 8, ACCEL) * 1750;
  const sy = f < T.burst ? 1 - 0.14 * squash : mix(0.86, 1.26, stretch);
  const sx = f < T.burst ? 1 + 0.08 * squash : mix(1.08, 0.86, stretch);
  const nb = blurOf(0, vmax + (lift(f) - lift(f - 1)), 0.22, 30);

  // Libellé (secondaire) : même mouvement, 3 images plus tard, ressort plus sec.
  const labels = HOOK.map((h, i) => slot(f, h.wAt, HOOK[i + 1]?.wAt, SNAP));
  const dip = ez(f, T.burst, T.burst + D.m, EXPO_OUT) * 40; // contre-mouvement à l'impact

  const flash = f >= T.burst ? 1 - ez(f, T.burst, T.burst + 12, EXPO_OUT) : 0;
  const finger = f < T.tap - 2 ? 0 : f < T.tap + 3 ? sp(f, T.tap - 2, SNAP) * (f >= T.tap ? 0.82 : 1) : 0.82 * (1 - ez(f, T.tap + 3, T.tap + 6, EXIT));

  return (
    <AbsoluteFill>
      {/* Halo qui respire derrière le chiffre (ambiant) */}
      <div
        style={{
          position: "absolute",
          left: 540 - 520,
          top: NUM_Y - 520,
          width: 1040,
          height: 1040,
          borderRadius: "50%",
          background: "radial-gradient(closest-side, rgba(124,58,237,0.42), rgba(124,58,237,0))",
          transform: `scale(${1 + 0.03 * wave(f, 90)})`,
          opacity: 1 - ez(f, T.burst, T.burst + 8, EXIT),
        }}
      />
      {flash > 0 && <AbsoluteFill style={{ background: `radial-gradient(60% 40% at 50% ${NUM_Y / 19.2}%, rgba(196,170,255,${0.75 * flash}) 0%, rgba(124,58,237,${0.35 * flash}) 45%, rgba(124,58,237,0) 100%)` }} />}

      {/* Logos des trois réseaux, jaillis du « 3 » */}
      {TILES.map((_, i) => {
        const s = tileState(f, i);
        if (!s.visible) return null;
        const q = tileState(f - 1, i);
        const b = blurOf(s.x - q.x, s.y - q.y, 0.3, 12);
        return (
          <React.Fragment key={i}>
            <Blur id={`tile${i}`} sx={b.sx} sy={b.sy} />
            <div style={{ position: "absolute", left: s.x, top: s.y, transform: `translate(-50%, -50%) rotate(${s.rot}deg) scale(${s.scale})`, filter: blurUrl(b, `tile${i}`) }}>
              <BrandTile brand={PLATS[i].b} />
            </div>
          </React.Fragment>
        );
      })}
      <Burst f={f} at={T.swap3 + 3} x={540} y={NUM_Y} n={16} speed={1150} life={0.6} seed="b3" size={10} />

      {/* Traînée du décollage (suivi) */}
      {f >= T.burst && f < T.burst + 12 && (
        <div
          style={{
            position: "absolute",
            left: 540 - 70 * (1 - stretch * 0.5),
            top: NUM_Y + 180 - lift(f),
            width: 140 * (1 - stretch * 0.5),
            height: Math.max(0, lift(f) + 60),
            borderRadius: 70,
            background: "linear-gradient(180deg, rgba(196,170,255,0.9), rgba(124,58,237,0))",
            opacity: 1 - ez(f, T.burst + 4, T.burst + 12, EXPO_OUT),
            filter: "blur(8px)",
          }}
        />
      )}

      {/* Chiffre */}
      <Blur id="num" sx={nb.sx} sy={nb.sy} region={20} />
      <div
        style={{
          position: "absolute",
          left: 540 - 320,
          top: NUM_Y - NUM_BOX / 2,
          width: 640,
          height: NUM_BOX,
          transform: `translateY(${-lift(f)}px) scale(${sx}, ${sy})`,
          transformOrigin: "50% 82%",
          filter: [blurUrl(nb, "num"), "drop-shadow(0 0 50px rgba(155,107,255,0.55))"].filter(Boolean).join(" "),
        }}
      >
        <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
          {HOOK.map((h, i) => {
            const y = cur[i];
            if (y === null) return null;
            return (
              <div key={i} style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", transform: `translateY(${y}%)` }}>
                <span
                  style={{
                    fontFamily: IT,
                    fontSize: NUM_SIZE,
                    fontWeight: 800,
                    lineHeight: 1,
                    letterSpacing: "-0.04em",
                    background: NUM_GRAD,
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                    marginTop: NUM_SIZE * 0.07,
                  }}
                >
                  {h.n}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Libellé */}
      <div style={{ position: "absolute", left: 0, right: 0, top: LABEL_Y - 120, height: 240, overflow: "hidden", transform: `translateY(${dip}px)` }}>
        {HOOK.map((h, i) => {
          const y = labels[i];
          if (y === null) return null;
          return (
            <div key={i} style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", transform: `translateY(${y}%)` }}>
              <span style={{ fontFamily: IT, fontSize: 172, fontWeight: 800, letterSpacing: "-0.05em", color: C.ink, lineHeight: 1 }}>
                {h.w}
                <span style={{ color: C.violet }}>.</span>
              </span>
            </div>
          );
        })}
      </div>

      {/* Le clic : doigt, onde, puis l'éclat */}
      {finger > 0.01 && <div style={{ position: "absolute", left: 540 - 40, top: NUM_Y + 60 - 40, width: 80, height: 80, borderRadius: 40, background: "rgba(255,255,255,0.55)", transform: `scale(${finger})`, boxShadow: "0 0 30px rgba(255,255,255,0.6)" }} />}
      <Ring f={f} at={T.tap} x={540} y={NUM_Y + 60} r0={40} r1={210} dur={12} w0={12} color="#fff" alpha={0.9} />
      <Ring f={f} at={T.burst} x={540} y={NUM_Y + 60} r1={820} dur={16} w0={56} color={C.violet} />
      <Ring f={f} at={T.burst + 1} x={540} y={NUM_Y + 60} r1={560} dur={13} w0={14} color="#fff" alpha={0.8} />
      <Burst f={f} at={T.burst} x={540} y={NUM_Y + 60} n={30} speed={2100} life={0.85} seed="b1" size={14} />
    </AbsoluteFill>
  );
};

/* ================================================================== Actes II–III : le téléphone, héros continu */
interface Pose {
  rotY: number;
  rotX: number;
  rotZ: number;
  x: number;
  y: number;
  scale: number;
}
const pose = (rotY: number, rotX: number, rotZ: number, x: number, y: number, scale: number): Pose => ({ rotY, rotX, rotZ, x, y, scale });
const mixPose = (a: Pose, b: Pose, t: number): Pose => ({
  rotY: mix(a.rotY, b.rotY, t),
  rotX: mix(a.rotX, b.rotX, t),
  rotZ: mix(a.rotZ, b.rotZ, t),
  x: mix(a.x, b.x, t),
  y: mix(a.y, b.y, t),
  scale: mix(a.scale, b.scale, t),
});
const CX = 540;
const CY = 1110;
const OFF = pose(-34, 40, -12, -80, 820, 0.6); // montée ≤ 1/3 de l'écran
const KEYS: { at: number; p: Pose; c: SpringCfg }[] = [
  { at: 63, p: pose(-14, 9, -2, 0, 180, 0.86), c: RISE },
  { at: T.f1out + 2, p: pose(20, 10, 4, 20, 340, 0.72), c: MOVE },
  { at: T.f3in - 2, p: pose(-24, -4, -2, 170, 220, 0.9), c: MOVE },
  { at: T.f4in - 2, p: pose(12, 8, 2, 0, 250, 0.84), c: MOVE },
];
/** Mise en scène : le téléphone recule et s'assombrit quand les cartes « Publiée » sont le héros. */
const staging = (f: number) => ez(f, T.publish + 4, T.publish + 14, EXPO_OUT) * (1 - ez(f, T.f1out - 2, T.f1out + 6, SWEEP));

function phonePose(f: number): Pose {
  let p = OFF;
  for (const k of KEYS) {
    if (f < k.at) break;
    p = mixPose(p, k.p, sp(f, k.at, k.c));
  }
  const rise = sp(f, KEYS[0].at, RISE);
  return {
    ...p,
    x: p.x - Math.sin(Math.PI * clamp01(rise)) * 60, // arc d'arrivée
    y: p.y + wave(f, 120) * 8, // flottement ambiant
    rotY: p.rotY + wave(f, 160, 0.3) * 1.5,
    scale: p.scale * (1 - 0.06 * staging(f)),
  };
}
const poseBlur = (p: Pose, q: Pose) =>
  blurOf(Math.abs(p.x - q.x) + Math.abs(p.rotY - q.rotY) * 3 + Math.abs(p.scale - q.scale) * 300, Math.abs(p.y - q.y) + Math.abs(p.rotX - q.rotX) * 3, 0.3, 12);

/** Écran figé à un instant donné de son animation (accéléré pour tenir dans le plan). */
const At: React.FC<{ screen: React.FC; time: number }> = ({ screen: S, time }) => (
  <Freeze frame={Math.max(0, time)}>
    <S />
  </Freeze>
);
const remap = (f: number, len: number, from: number, to: number) => from + (to - from) * (1 - Math.pow(1 - clamp01(f / len), 2.2));

/** Changement d'écran vers le haut (la direction de la marque). */
const LiftSwap: React.FC<{ f: number; at: number; a: React.ReactNode; b: React.ReactNode }> = ({ f, at, a, b }) => {
  const e = ez(f, at, at + 8, SWEEP);
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {e < 1 && (
        <AbsoluteFill style={{ transform: `translateY(${-e * 30}%)` }}>
          {a}
          <AbsoluteFill style={{ background: `rgba(5,5,10,${e * 0.6})` }} />
        </AbsoluteFill>
      )}
      {e > 0 && <AbsoluteFill style={{ transform: `translateY(${(1 - e) * 100}%)`, boxShadow: "0 -24px 48px rgba(0,0,0,0.45)" }}>{b}</AbsoluteFill>}
    </AbsoluteFill>
  );
};

/** Bouton « Publier partout » dans l'écran de création, pressé au temps fort. */
const PublishPill: React.FC<{ f: number }> = ({ f }) => {
  const start = T.publish - 12;
  if (f < start) return null;
  const inE = sp(f, start, SNAP);
  const press = f >= T.publish ? 1 - 0.07 * Math.sin(Math.PI * clamp01((f - T.publish) / 5)) : 1;
  const sent = ez(f, T.publish + 3, T.publish + 3 + D.m, EXPO_OUT);
  const ripple = ez(f, T.publish, T.publish + 12, EXPO_OUT);
  const fingerS = f < T.publish - 4 ? 0 : f < T.publish + 3 ? sp(f, T.publish - 4, SNAP) * (f >= T.publish ? 0.84 : 1) : 0.84 * (1 - ez(f, T.publish + 3, T.publish + 7, EXIT));
  const label = (icon: React.ReactNode, text: string, y: number) => (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, transform: `translateY(${y}%)` }}>
      {icon}
      {text}
    </div>
  );
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 22,
          right: 22,
          bottom: 118,
          height: 72,
          borderRadius: 24,
          background: "linear-gradient(135deg, #A884FF, #7C3AED)",
          transform: `translateY(${(1 - inE) * 220}px) scale(${press})`,
          color: "#fff",
          fontFamily: FONT,
          fontSize: 23,
          fontWeight: 800,
          boxShadow: `0 16px 34px rgba(124,58,237,${0.45 + sent * 0.35})`,
          overflow: "hidden",
        }}
      >
        {label(<ArrowUp size={26} color="#fff" stroke={3.2} />, "Publier partout", -sent * 110)}
        {label(<Check size={24} color="#fff" stroke={3.4} />, "Envoyé sur 3 réseaux", (1 - sent) * 110)}
        {ripple > 0 && ripple < 1 && <div style={{ position: "absolute", left: "50%", top: "50%", width: 600, height: 600, marginLeft: -300, marginTop: -300, borderRadius: "50%", background: "rgba(255,255,255,0.35)", transform: `scale(${ripple})`, opacity: 1 - ripple }} />}
      </div>
      {fingerS > 0.01 && <div style={{ position: "absolute", left: SCREEN_W / 2 - 30, top: SCREEN_H - 118 - 36 - 30, width: 60, height: 60, borderRadius: 30, background: "rgba(255,255,255,0.6)", transform: `scale(${fingerS})`, boxShadow: "0 0 24px rgba(255,255,255,0.6)" }} />}
    </>
  );
};

const PhoneScreen: React.FC<{ f: number }> = ({ f }) => {
  const composer = (
    <>
      <At screen={ComposerScreen} time={remap(f - 64, 44, 30, 112)} />
      <PublishPill f={f} />
    </>
  );
  const schedule = <At screen={ScheduleScreen} time={remap(f - T.f2in, 40, 0, 44)} />;
  const discord = <At screen={DiscordScreen} time={remap(f - T.f3in, 46, 20, 96)} />;
  const stats = <At screen={StatsScreen} time={remap(f - T.f4in, 40, 0, 60)} />;
  const node =
    f < T.f2in ? composer : f < T.f3in ? <LiftSwap f={f} at={T.f2in} a={composer} b={schedule} /> : f < T.f4in ? <LiftSwap f={f} at={T.f3in} a={schedule} b={discord} /> : <LiftSwap f={f} at={T.f4in} a={discord} b={stats} />;
  const dim = staging(f);
  return (
    <ThemeProvider theme={DARK}>
      <UserProvider user={USER}>
        {node}
        {dim > 0.01 && <AbsoluteFill style={{ background: `rgba(6,6,12,${0.55 * dim})` }} />}
      </UserProvider>
    </ThemeProvider>
  );
};

/** Halo violet derrière le téléphone et reflet au sol (lumière d'ambiance). */
const PhoneGlow: React.FC<{ p: Pose }> = ({ p }) => {
  const cx = CX + p.x;
  const cy = CY + p.y;
  const r = 640 * p.scale;
  const floor = cy + (PHONE_H * p.scale) / 2 + 50;
  return (
    <>
      <div style={{ position: "absolute", left: cx - r, top: cy - r * 1.25, width: r * 2, height: r * 2.5, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(124,58,237,0.42), rgba(124,58,237,0))" }} />
      <div style={{ position: "absolute", left: cx - 330 * p.scale + p.x * 0.1, top: floor - 40, width: 660 * p.scale, height: 80, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(155,107,255,0.4), rgba(155,107,255,0))" }} />
    </>
  );
};

/* ------------------------------------------------------------------ Titres de plan */
const CAPS: { n: number; title: string; sub?: string; enter: number; exit?: number }[] = [
  { n: 1, title: "Publie|partout.", sub: "TikTok, YouTube, Instagram.", enter: 76, exit: T.f1out },
  { n: 2, title: "Programme.", sub: "Uplink publie à ta place.", enter: T.f2in + 4, exit: T.f2out },
  { n: 3, title: "Ta commu|prévenue.", sub: "Les liens partent sur Discord.", enter: T.f3in + 4, exit: T.f3out },
  { n: 4, title: "Tes stats.|Tes revenus.", enter: T.f4in + 4 },
];
const PROGRESS = (f: number) => clamp01((f - 66) / (T.wipe2 - 66)); // barre de progression : linéaire

const Caption: React.FC<{ f: number; n: number; title: string; sub?: string; enter: number; exit?: number }> = ({ f, n, title, sub, enter, exit }) => {
  if (f < enter) return null;
  if (exit !== undefined && f > exit + 14) return null;
  const lines = title.split("|");
  let k = 0;
  const words = lines.reduce((a, l) => a + l.split(" ").length, 0);
  const track = ez(f, enter + 3, enter + 3 + D.l, EXPO_OUT) * (exit === undefined ? 1 : 1 - ez(f, exit, exit + DX.l, EXIT));
  return (
    <div style={{ position: "absolute", top: 236, left: 64, right: 150, fontFamily: IT, color: C.ink }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, height: 44, marginBottom: 12, fontSize: 32, fontWeight: 700, letterSpacing: "0.04em" }}>
        <Up f={f} enter={enter + 3} exit={exit} dur={D.m}>
          <span style={{ color: C.violet }}>0{n}</span>
        </Up>
        <div style={{ width: 150 * track, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.16)", overflow: "hidden" }}>
          <div style={{ width: `${PROGRESS(f) * 100}%`, height: "100%", background: C.violet }} />
        </div>
        <Up f={f} enter={enter + 5} exit={exit} dur={D.m}>
          <span style={{ color: "rgba(255,255,255,0.4)" }}>04</span>
        </Up>
      </div>
      {lines.map((line, li) => (
        <div key={li} style={{ fontSize: 124, fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 1.0, whiteSpace: "nowrap" }}>
          {line.split(" ").map((w, wi, arr) => {
            const i = k++;
            const last = li === lines.length - 1 && wi === arr.length - 1 && w.endsWith(".");
            return (
              <React.Fragment key={wi}>
                <Up f={f} enter={enter + i * 2} exit={exit === undefined ? undefined : exit + Math.floor(i / 2)}>
                  {last ? (
                    <>
                      {w.slice(0, -1)}
                      <span style={{ color: C.violet }}>.</span>
                    </>
                  ) : (
                    w
                  )}
                </Up>
                {wi < arr.length - 1 ? " " : null}
              </React.Fragment>
            );
          })}
        </div>
      ))}
      {sub && (
        <div style={{ marginTop: 22, fontSize: 46, fontWeight: 600, color: C.muted, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>
          <Up f={f} enter={enter + words * 2 + 2} exit={exit}>
            {sub}
          </Up>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ 01 · Les cartes « Publiée » (motif de succès) */
const CARD_Y = [980, 1126, 1272];
function cardFly(k: number, i: number) {
  const s = T.cards + i * 3;
  const e = sp(k, s, POP);
  const x = ez(k, T.f1out + i * 2, T.f1out + i * 2 + DX.l, EXIT);
  return { x: CX + Math.sin(Math.PI * clamp01(e)) * (i - 1) * 34, y: mix(1330, CARD_Y[i], e) - x * 340, z: mix(-60, 140, e), s: mix(0.3, 1, e) * (1 - 0.04 * x), rx: mix(50, 0, e), o: 1 - x };
}

const CheckDot: React.FC<{ fill: number; draw: number; size?: number }> = ({ fill, draw, size = 66 }) => (
  <svg width={size} height={size} viewBox="0 0 66 66" style={{ overflow: "visible" }}>
    <circle cx={33} cy={33} r={30} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={3} />
    <circle cx={33} cy={33} r={31 * Math.max(0, fill)} fill={interpolateColors(clamp01(fill), [0, 1], ["#3A3550", C.deep])} />
    <path d="M20 34.5 L29 43 L46 24" fill="none" stroke="#fff" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
  </svg>
);

const SuccessCard: React.FC<{ f: number; i: number }> = ({ f, i }) => {
  const s = T.cards + i * 3;
  const fill = ez(f, s + 5, s + 10, BACK); // conteneur 0,9 → 1 et changement de couleur
  const draw = ez(f, s + 8, s + 13, EXPO_OUT); // coche tracée en 150 ms, 100 ms après
  const glow = ez(f, s + 8, s + 12, EXPO_OUT) * (1 - ez(f, s + 12, s + 26, GENTLE));
  const ok = clamp01(fill);
  return (
    <div
      style={{
        width: 700,
        height: 132,
        borderRadius: 36,
        background: "linear-gradient(180deg, rgba(40,35,58,0.97), rgba(22,20,31,0.97))",
        border: `1.5px solid ${interpolateColors(ok, [0, 1], ["rgba(255,255,255,0.10)", "rgba(155,107,255,0.55)"])}`,
        boxShadow: `0 30px 70px rgba(0,0,0,0.5), 0 0 ${40 * ok}px rgba(124,58,237,${0.35 * ok})`,
        display: "flex",
        alignItems: "center",
        gap: 22,
        padding: "0 26px 0 22px",
        fontFamily: IT,
        position: "relative",
      }}
    >
      <div style={{ width: 80, height: 80, borderRadius: 24, background: "#0E0D15", border: "1.5px solid rgba(255,255,255,0.10)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <BrandLogo brand={PLATS[i].b} size={42} color="#fff" />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 46, fontWeight: 800, color: C.ink, letterSpacing: "-0.03em", lineHeight: 1.05 }}>{PLATS[i].name}</div>
        <div style={{ fontSize: 30, fontWeight: 600, color: C.muted, height: 38 }}>
          <Up f={f} enter={s + 7} dur={D.m}>
            Publiée
          </Up>
        </div>
      </div>
      <div style={{ position: "relative", width: 66, height: 66, transform: `scale(${0.9 + 0.1 * fill})` }}>
        {glow > 0 && <div style={{ position: "absolute", left: -40, top: -40, width: 146, height: 146, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(155,107,255,0.8), rgba(155,107,255,0))", opacity: glow, transform: `scale(${0.6 + glow * 0.6})` }} />}
        <div style={{ position: "absolute", inset: 0 }}>
          <CheckDot fill={fill} draw={draw} />
        </div>
      </div>
      <Burst f={f} at={s + 9} x={700 - 26 - 33} y={66} n={7} speed={520} life={0.45} seed={`ok${i}`} size={7} gravity={150} />
    </div>
  );
};

const SuccessCards: React.FC<{ f: number }> = ({ f }) => {
  if (f < T.cards || f > T.f1out + 14) return null;
  return (
    <>
      {PLATS.map((_, i) => {
        if (f < T.cards + i * 3) return null;
        const c = cardFly(f, i);
        if (c.o <= 0) return null;
        const q = cardFly(f - 1, i);
        const b = blurOf(c.x - q.x, c.y - q.y + (c.s - q.s) * 260, 0.3, 12);
        return (
          <AbsoluteFill key={i} style={{ perspective: 2600, perspectiveOrigin: "50% 58%", filter: blurUrl(b, `card${i}`) }}>
            <Blur id={`card${i}`} sx={b.sx} sy={b.sy} region={10} />
            <div style={{ position: "absolute", left: c.x, top: c.y, opacity: c.o, transform: `translate(-50%, -50%) translate3d(0, 0, ${c.z}px) rotateX(${c.rx}deg) scale(${c.s})` }}>
              <SuccessCard f={f} i={i} />
            </div>
          </AbsoluteFill>
        );
      })}
    </>
  );
};

/* ------------------------------------------------------------------ 02 · « 19:00 » en odomètre */
const ODO: ({ seq: string[]; d: number } | { colon: true; d: number })[] = [
  { seq: ["", "5", "6", "7", "8", "9", "0", "1"], d: 0 },
  { seq: ["", "2", "3", "4", "5", "6", "7", "8", "9"], d: 2 },
  { colon: true, d: 4 },
  { seq: ["", "6", "7", "8", "9", "0"], d: 5 },
  { seq: ["", "3", "4", "5", "6", "7", "8", "9", "0"], d: 7 },
];
const ODO_START = T.f2in + 8;
const ODO_SIZE = 270;
const ODO_Y = 700;
const odoK = (k: number, seqLen: number, d: number) => ez(k, ODO_START + d, ODO_START + d + 16, EXPO_OUT) * (seqLen - 1) + ez(k, T.f2out + d / 2, T.f2out + d / 2 + DX.l, EXIT) * 1.3;

const Odometer: React.FC<{ f: number }> = ({ f }) => {
  if (f < ODO_START || f > T.f2out + 12) return null;
  const glow = ez(f, ODO_START + 3, ODO_START + 20, EXPO_OUT) * (1 - ez(f, T.f2out, T.f2out + 8, EXIT));
  return (
    <>
      <div style={{ position: "absolute", left: 540 - 420, top: ODO_Y - 160, width: 840, height: 320, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(124,58,237,0.45), rgba(124,58,237,0))", opacity: glow }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: ODO_Y - ODO_SIZE / 2, height: ODO_SIZE, display: "flex", justifyContent: "center", fontFamily: IT, fontSize: ODO_SIZE, fontWeight: 800, lineHeight: 1, color: C.ink, letterSpacing: "-0.02em" }}>
        {ODO.map((col, ci) => {
          if ("colon" in col) {
            const s = sp(f, ODO_START + col.d, POP);
            const out = ez(f, T.f2out + 2, T.f2out + 2 + DX.l, EXIT);
            const blink = f > ODO_START + 26 ? 0.6 + 0.4 * (0.5 + 0.5 * Math.cos(((f - ODO_START - 26) / 30) * Math.PI * 2)) : 1;
            return (
              <div key={ci} style={{ width: "0.34em", textAlign: "center", color: C.violet, transform: `translateY(${-out * 120}%) scale(${s})`, opacity: blink * (1 - out), marginTop: "-0.04em" }}>
                :
              </div>
            );
          }
          const kNow = odoK(f, col.seq.length, col.d);
          const kPrev = odoK(f - 1, col.seq.length, col.d);
          const b = blurOf(0, (kNow - kPrev) * ODO_SIZE, 0.22, 22);
          return (
            <div key={ci} style={{ width: "0.6em", height: "1em", overflow: "hidden", textAlign: "center", filter: blurUrl(b, `odo${ci}`) }}>
              <Blur id={`odo${ci}`} sx={0} sy={b.sy} region={10} />
              <div style={{ transform: `translateY(${-kNow}em)` }}>
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
    </>
  );
};

/* ------------------------------------------------------------------ 03 · Le message Discord sort de l'écran */
function discFly(k: number) {
  const e = sp(k, T.disc, { mass: 1, stiffness: 150, damping: 13 }); // ≈ 14 %
  const x = ez(k, T.f3out, T.f3out + DX.l, EXIT);
  return { x: mix(720, 450, e), y: mix(1300, 1070, e) - x * 380, z: mix(-20, 220, e), ry: mix(-28, -8, e), s: mix(0.32, 1, e) * (1 - 0.04 * x), o: 1 - x };
}
const DiscordCard: React.FC<{ f: number }> = ({ f }) => {
  const link = (s: string) => <span style={{ color: "#00A8FC" }}>{s}</span>;
  const b = (s: string) => <b style={{ color: "#fff", fontWeight: 700 }}>{s}</b>;
  const lines: React.ReactNode[] = [
    <>
      {b("Clutch 1v4 en ranked")} est en ligne !
    </>,
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
    <div
      style={{
        width: 700,
        padding: "26px 30px",
        borderRadius: 34,
        background: "linear-gradient(180deg, #2B2D31, #232428)",
        border: "1.5px solid rgba(255,255,255,0.08)",
        boxShadow: "0 40px 90px rgba(0,0,0,0.55), 0 0 70px rgba(88,101,242,0.28)",
        fontFamily: IT,
        color: "#B5BAC1",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 60, height: 60, borderRadius: 18, background: "linear-gradient(135deg, #8B5CF6, #7C3AED 55%, #5B21B6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <PlayGlyph size={26} color="#fff" />
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: "#fff" }}>Uplink</span>
          <span style={{ fontSize: 14, fontWeight: 800, background: "#5865F2", color: "#fff", borderRadius: 6, padding: "3px 7px" }}>APP</span>
          <span style={{ fontSize: 19, fontWeight: 500, color: "#949BA4" }}>Aujourd'hui à 19:00</span>
        </div>
        <BrandLogo brand="discord" size={38} color="#fff" />
      </div>
      <div style={{ marginTop: 12, fontSize: 23, fontWeight: 500, lineHeight: 1.55, whiteSpace: "nowrap" }}>
        {lines.map((l, i) => (
          <div key={i}>
            <Up f={f} enter={T.disc + 4 + i * 3} dur={D.m}>
              {l}
            </Up>
          </div>
        ))}
      </div>
    </div>
  );
};
const DiscordFly: React.FC<{ f: number }> = ({ f }) => {
  if (f < T.disc || f > T.f3out + 8) return null;
  const c = discFly(f);
  const q = discFly(f - 1);
  const b = blurOf(c.x - q.x + (c.s - q.s) * 300, c.y - q.y, 0.3, 12);
  return (
    <>
      <AbsoluteFill style={{ perspective: 2600, perspectiveOrigin: "50% 58%", filter: blurUrl(b, "disc") }}>
        <Blur id="disc" sx={b.sx} sy={b.sy} region={10} />
        <div style={{ position: "absolute", left: c.x, top: c.y, opacity: c.o, transform: `translate(-50%, -50%) translate3d(0, ${wave(f, 60) * 5}px, ${c.z}px) rotateY(${c.ry}deg) scale(${c.s})` }}>
          <DiscordCard f={f} />
        </div>
      </AbsoluteFill>
      {/* Notification : deux ondes (secondaire) */}
      <Ring f={f} at={T.disc + 10} x={772} y={968} r0={20} r1={120} dur={16} w0={6} color="#8B9BFF" alpha={0.9} />
      <Ring f={f} at={T.disc + 15} x={772} y={968} r0={20} r1={120} dur={16} w0={6} color="#8B9BFF" alpha={0.6} />
    </>
  );
};

/* ------------------------------------------------------------------ 04 · Courbe et barres */
const LINE: [number, number][] = [
  [0, 118],
  [48, 104],
  [96, 108],
  [144, 86],
  [192, 78],
  [240, 54],
  [288, 44],
  [336, 12],
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
const LINE_D = smoothPath(LINE);
const BARS = [38, 50, 44, 62, 56, 74, 68, 100];

const ChartShell: React.FC<{ label: string; glyph: string; width: number; children: React.ReactNode }> = ({ label, glyph, width, children }) => (
  <div style={{ width, padding: "24px 26px 26px", borderRadius: 36, background: "linear-gradient(180deg, rgba(42,37,62,0.95), rgba(23,21,31,0.95))", border: "1.5px solid rgba(255,255,255,0.10)", boxShadow: "0 40px 80px rgba(0,0,0,0.5)", fontFamily: IT }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <span style={{ fontSize: 34, fontWeight: 800, color: C.ink, letterSpacing: "-0.03em" }}>{label}</span>
      <span style={{ width: 48, height: 48, borderRadius: 15, background: "rgba(155,107,255,0.2)", color: C.violet, fontSize: 28, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{glyph}</span>
    </div>
    {children}
  </div>
);

const LineCard: React.FC<{ f: number; at: number }> = ({ f, at }) => {
  const draw = ez(f, at + 4, at + 20, EXPO_OUT);
  const dot = sp(f, at + 17, POP);
  const [lx, ly] = LINE[LINE.length - 1];
  return (
    <ChartShell label="Abonnés" glyph="↑" width={400}>
      <svg width={348} height={130} style={{ overflow: "visible", display: "block" }}>
        <defs>
          <linearGradient id="elan-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={C.violet} stopOpacity={0.5} />
            <stop offset="1" stopColor={C.violet} stopOpacity={0} />
          </linearGradient>
          <clipPath id="elan-reveal">
            <rect x={-10} y={-20} width={10 + 358 * draw} height={170} />
          </clipPath>
        </defs>
        <path d={`${LINE_D} L 336 130 L 0 130 Z`} fill="url(#elan-area)" clipPath="url(#elan-reveal)" />
        <path d={LINE_D} fill="none" stroke={C.violet} strokeWidth={7} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
        {dot > 0 && <circle cx={lx} cy={ly} r={10 * dot} fill="#fff" stroke={C.violet} strokeWidth={5} />}
      </svg>
      <Ring f={f} at={at + 18} x={26 + lx} y={24 + 64 + ly} r0={10} r1={60} dur={14} w0={5} color={C.violet} />
    </ChartShell>
  );
};

const BarCard: React.FC<{ f: number; at: number }> = ({ f, at }) => (
  <ChartShell label="Revenus" glyph="€" width={380}>
    <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 130 }}>
      {BARS.map((v, i) => {
        const last = i === BARS.length - 1;
        const g = ez(f, at + 4 + i * 1.5, at + 14 + i * 1.5, last ? BACK : EXPO_OUT); // seul le dernier dépasse
        return (
          <div
            key={i}
            style={{
              flex: 1,
              height: 130 * (v / 100) * g,
              borderRadius: 9,
              background: last ? "linear-gradient(180deg, #E4D8FF, #9B6BFF)" : "linear-gradient(180deg, rgba(155,107,255,0.95), rgba(124,58,237,0.55))",
              boxShadow: last ? "0 0 26px rgba(196,170,255,0.6)" : "none",
            }}
          />
        );
      })}
    </div>
  </ChartShell>
);

const CHARTS = [
  { x: 300, y: 1000, at: T.charts, C: LineCard },
  { x: 718, y: 1250, at: T.charts + 4, C: BarCard },
];
const chartFly = (k: number, at: number) => {
  const e = sp(k, at, POP);
  return { y: mix(240, 0, e), s: mix(0.7, 1, e), rx: mix(32, 0, e), o: Math.min(1, e * 3) };
};
const Charts: React.FC<{ f: number }> = ({ f }) => (
  <>
    {CHARTS.map(({ x, y, at, C: Card }, i) => {
      if (f < at) return null;
      const c = chartFly(f, at);
      const q = chartFly(f - 1, at);
      const b = blurOf(0, c.y - q.y, 0.3, 12);
      return (
        <AbsoluteFill key={i} style={{ perspective: 2600, perspectiveOrigin: "50% 58%", filter: blurUrl(b, `chart${i}`) }}>
          <Blur id={`chart${i}`} sx={0} sy={b.sy} region={10} />
          <div style={{ position: "absolute", left: x, top: y + c.y + wave(f, 70, i * 0.4) * 6, opacity: c.o, transform: `translate(-50%, -50%) translateZ(${170 + i * 40}px) rotateX(${c.rx}deg) scale(${c.s})` }}>
            <Card f={f} at={at} />
          </div>
        </AbsoluteFill>
      );
    })}
  </>
);

const Product: React.FC<{ f: number; p: Pose }> = ({ f, p }) => {
  const q = phonePose(f - 1);
  const pb = poseBlur(p, q);
  return (
    <AbsoluteFill>
      <PhoneGlow p={p} />
      {/* Réaction : ondes qui partent du téléphone quand arrivent les stats */}
      <Ring f={f} at={T.f4in} x={CX + p.x} y={CY + p.y} r0={260} r1={820} dur={24} w0={10} color={C.violet} alpha={0.45} />
      <Ring f={f} at={T.f4in + 6} x={CX + p.x} y={CY + p.y} r0={260} r1={820} dur={24} w0={6} color={C.lilac} alpha={0.3} />
      <Blur id="phone" sx={pb.sx} sy={pb.sy} region={8} />
      <AbsoluteFill style={{ filter: blurUrl(pb, "phone") }}>
        <AbsoluteFill style={{ perspective: 2600, perspectiveOrigin: "50% 58%" }}>
          <Phone {...p} centerX={CX} centerY={CY}>
            <PhoneScreen f={f} />
          </Phone>
        </AbsoluteFill>
      </AbsoluteFill>
      <Odometer f={f} />
      <SuccessCards f={f} />
      <DiscordFly f={f} />
      <Charts f={f} />
      {CAPS.map((c) => (
        <Caption key={c.n} f={f} {...c} />
      ))}
    </AbsoluteFill>
  );
};

/* ================================================================== Acte IV : résolution premium */
const END = { chevron: 354, rotate: 362, tile: 366, fill: 372, word: 378, tag: 390, cta: 402, shine: 420 };
const LOGO_Y = 720;

const LogoMorph: React.FC<{ f: number }> = ({ f }) => {
  const rise = ez(f, END.chevron, END.chevron + D.l, EXPO_OUT);
  const rot = ez(f, END.rotate, END.rotate + 12, GENTLE) * 90;
  const tile = ez(f, END.tile, END.tile + 14, GENTLE);
  const fill = ez(f, END.fill, END.fill + 10, GENTLE);
  const halo = ez(f, END.tile + 3, END.tile + 20, GENTLE);
  const stroke = interpolateColors(tile, [0, 1], ["#FFFFFF", C.deep]);
  const size = 300;
  return (
    <div style={{ position: "absolute", left: 540 - size / 2, top: LOGO_Y - size / 2 + (1 - rise) * 160, width: size, height: size }}>
      <div style={{ position: "absolute", left: -size * 0.6, top: -size * 0.6, width: size * 2.2, height: size * 2.2, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(255,255,255,0.5), rgba(255,255,255,0))", opacity: halo * 0.7, transform: `scale(${0.7 + 0.3 * halo + 0.02 * wave(f, 90)})` }} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: size * 0.3,
          background: "linear-gradient(160deg, #FFFFFF, #EFE8FF)",
          transform: `scale(${mix(0.6, 1, tile)})`,
          opacity: tile,
          boxShadow: `0 40px 90px rgba(36,8,90,${0.45 * tile}), inset 0 -6px 0 rgba(124,58,237,0.12)`,
        }}
      />
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <g transform={`rotate(${rot} 50 50)`} opacity={1 - fill}>
          <polyline points="30,62 50,41 70,62" fill="none" stroke={stroke} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <g transform={`translate(52 50) scale(${mix(0.8, 1, fill)}) translate(-52 -50)`} opacity={fill}>
          <path d="M41 31 L68 50 L41 69 Z" fill={C.deep} stroke={C.deep} strokeWidth={8} strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
};

const End: React.FC<{ f: number }> = ({ f }) => {
  const word = "Uplink";
  const cta = ez(f, END.cta, END.cta + 14, GENTLE);
  const breathe = f > END.shine ? 1 + 0.015 * wave(f - END.shine, 75) : 1;
  const shine = ez(f, END.shine, END.shine + 22, GENTLE);
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg, #8B5CF6 0%, #6D28D9 48%, #4C1D95 100%)" }}>
      <Aurora f={f} tone="violet" />
      <DotGrid ox={0} oy={-f * 0.35} color="rgba(255,255,255,0.07)" />
      <Motes f={f} color="#FFFFFF" />
      <LogoMorph f={f} />
      <Ring f={f} at={END.fill + 4} x={540} y={LOGO_Y} r0={170} r1={400} dur={26} w0={5} color="#fff" alpha={0.5} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 935, display: "flex", justifyContent: "center", fontFamily: IT, fontSize: 190, fontWeight: 800, letterSpacing: "-0.05em", color: "#fff", lineHeight: 1 }}>
        {word.split("").map((ch, i) => (
          <PremiumUp key={i} f={f} enter={END.word + i * 1.5}>
            {ch}
          </PremiumUp>
        ))}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1160, display: "flex", justifyContent: "center", gap: 20, fontFamily: IT, fontSize: 64, fontWeight: 700, letterSpacing: "-0.03em", color: "rgba(255,255,255,0.92)", whiteSpace: "nowrap" }}>
        <PremiumUp f={f} enter={END.tag}>
          Publie partout<span style={{ color: C.lilac }}>.</span>
        </PremiumUp>
        <PremiumUp f={f} enter={END.tag + 4}>
          Pilote tout<span style={{ color: C.lilac }}>.</span>
        </PremiumUp>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1290, display: "flex", justifyContent: "center" }}>
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "26px 48px",
            borderRadius: 999,
            background: "#fff",
            color: "#5B21B6",
            fontFamily: IT,
            fontSize: 52,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            boxShadow: "0 24px 60px rgba(36,8,90,0.45)",
            opacity: cta,
            transform: `translateY(${(1 - cta) * 30}px) scale(${(0.98 + 0.02 * cta) * breathe})`,
          }}
        >
          dsociety.fr/uplink
          <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="#5B21B6" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 17L17 7M9 7h8v8" />
          </svg>
          {shine > 0 && shine < 1 && <div style={{ position: "absolute", top: 0, bottom: 0, left: `${-40 + shine * 160}%`, width: "35%", background: "linear-gradient(100deg, rgba(196,170,255,0) 0%, rgba(196,170,255,0.3) 50%, rgba(196,170,255,0) 100%)" }} />}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Montée premium : même geste que la signature, mais courbe douce, sans dépassement et plus longue (400 ms). */
const PremiumUp: React.FC<{ f: number; enter: number; children: React.ReactNode }> = ({ f, enter, children }) => {
  if (f < enter) return null;
  const p = ez(f, enter, enter + 12, GENTLE);
  return (
    <span style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", padding: "0.1em 0.03em 0.22em", margin: "-0.1em 0 -0.22em" }}>
      <span style={{ display: "inline-block", transform: `translateY(${(1 - p) * 105}%)` }}>{children}</span>
    </span>
  );
};

/* ================================================================== Montage */
const W1 = [C.lilac, C.violet, C.deep];
const W2 = [C.night, C.lilac, "#6D28D9"];

export const Elan: React.FC = () => {
  useFonts();
  const f = useCurrentFrame();
  const p = phonePose(f);
  const k = f - T.burst;
  const shake = k >= 0 && k < 14 ? { x: 16 * Math.exp(-k / 3) * Math.sin(k * 2.3), y: 12 * Math.exp(-k / 3) * Math.cos(k * 2.9) } : { x: 0, y: 0 };
  const t1 = wipeTrail(f, T.wipe1, W1.length - 1);
  const t2 = wipeTrail(f, T.wipe2, W2.length - 1);
  const darkScenes = f < WIPE_END(T.wipe2, W2.length);
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      <Audio src={staticFile("elan/elan.m4a")} />
      {darkScenes && (
        <>
          <Aurora f={f} />
          <DotGrid ox={-0.25 * p.x} oy={-0.25 * (p.y - 200) - f * 0.35} />
          <Motes f={f} />
        </>
      )}
      <AbsoluteFill style={{ transform: `translate(${shake.x}px, ${shake.y}px)` }}>
        {f <= T.wipe1 + 9 && <Hook f={f} />}
        {f >= T.wipe1 && f < T.wipe2 + 10 && (
          <AbsoluteFill style={{ clipPath: f < WIPE_END(T.wipe1, W1.length) ? belowChevron(t1) : undefined }}>
            <Product f={f} p={p} />
          </AbsoluteFill>
        )}
        <ChevronBands f={f} s={T.wipe1} colors={W1} />
        <ChevronBands f={f} s={T.wipe2} colors={W2} />
        {f >= T.wipe2 + 4 && (
          <AbsoluteFill style={{ clipPath: f < WIPE_END(T.wipe2, W2.length) ? belowChevron(t2) : undefined }}>
            <End f={f} />
          </AbsoluteFill>
        )}
      </AbsoluteFill>
      <Grain f={f} />
      <Vignette strength={darkScenes ? 0.55 : 0.35} />
    </AbsoluteFill>
  );
};
