/**
 * Version TikTok (15 s, 9:16) : le scénario de la version « essentiel » (mêmes plans, mêmes cadrages, même rythme)
 * dans la direction artistique « keynote » : fond clair #EEEEEC, encre presque noire, Inter Tight, un seul point rouge
 * par image (né des trois logos, puis point final de chaque titre), ombres douces en couches, ressorts à ~10 % de
 * dépassement, flou de bougé proportionnel à la vitesse, transitions par mouvement (zoom, filé) — ni fondu ni flash —
 * et une seconde immobile à la fin. Les écrans du téléphone passent eux aussi en encre et Inter Tight.
 *
 *  0–2,8 s     « Arrête de publier 3 fois la même vidéo. » → « Publie-la 1 fois partout. » ; les logos fusionnent en
 *              point rouge, la caméra plonge dedans.
 *  2,8–5,4 s   « 1 clic. 3 plateformes. » : le téléphone arrive en tournoyant et se dédouble en trois.
 *  5,4–7,8 s   « Programme. Uplink publie à ta place. » : « 19:00 » géant au-dessus du calendrier.
 *  7,8–10,2 s  « Ta commu prévenue. » : le message Discord sort du téléphone.
 *  10,2–12,6 s « Tes stats. Tes revenus. » : trois chiffres.
 *  12,6–15 s   Uplink, « Publie partout. Pilote tout. », l'adresse ; l'application passe en sombre.
 */
import React from "react";
import { AbsoluteFill, Easing, Freeze, Sequence, interpolate, useCurrentFrame } from "remotion";
import { BrandLogo, type Brand } from "../brands";
import { useFonts } from "../fonts";
import { HomeScreen } from "../HomeScreen";
import { PlayGlyph } from "../icons";
import { mix } from "../motion";
import { SCREEN_W } from "../Phone";
import { KEYNOTE_DARK, KEYNOTE_LIGHT, ThemeProvider, UserProvider } from "../theme";
import { ComposerScreen, ScheduleScreen, SettingsScreen } from "../tour/screens1";
import { DiscordScreen } from "../tour/screens2";
import { USER } from "../tour/Tour";
import { Blur, GREY, GROUND, INK, IT, RED, Rise, blurOf, blurUrl, ease, shadow, sp } from "./motionKit";
import { FloorShadow, PhoneAt, type Pose, PushSwap, ShotFrame, Stage3D, Timed, type Trans, WHIP, mixPose, pose, tmap } from "./parts";

const SAFE_L = 64;
const SAFE_R = 150;
const TEXT_TOP = 236;

/* ------------------------------------------------------------- Outils */

/** Flou de bougé d'un téléphone 3D d'après sa pose à l'image précédente (rotation comprise). */
function poseBlur(p: Pose, q: Pose) {
  return blurOf(Math.abs(p.x - q.x) + Math.abs(p.rotY - q.rotY) * 3 + Math.abs(p.scale - q.scale) * 300, Math.abs(p.y - q.y) + Math.abs(p.rotX - q.rotX) * 3, 0.3, 10);
}

/** Élément qui surgit (ressort à 10 %, jamais en fondu). */
const Pop: React.FC<{ f: number; start: number; x: number; y: number; z?: number; children: React.ReactNode }> = ({ f, start, x, y, z = 160, children }) => {
  if (f < start) return null;
  const s = sp(f, start);
  return <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) translate3d(0, ${Math.sin((f - start) / 12) * 5}px, ${z}px) scale(${s})` }}>{children}</div>;
};

/** Vignette d'encre avec le logo en blanc. */
const InkTile: React.FC<{ brand: Brand; size?: number }> = ({ brand, size = 124 }) => (
  <div style={{ width: size, height: size, borderRadius: size * 0.29, background: INK, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: shadow(0.9) }}>
    <BrandLogo brand={brand} size={size * 0.5} color="#fff" />
  </div>
);

/** Logo Uplink à l'encre. */
const InkMark: React.FC<{ size: number }> = ({ size }) => (
  <div style={{ width: size, height: size, borderRadius: size * 0.3, background: INK, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: shadow(0.8), flexShrink: 0 }}>
    <PlayGlyph size={size * 0.44} color="#fff" />
  </div>
);

/** Titre de plan : mots qui montent depuis un masque ; le point final du titre est le point rouge. */
const Caption: React.FC<{ f: number; title: string; sub?: string; enter: number; exit?: number }> = ({ f, title, sub, enter, exit }) => {
  const lines = title.split("|");
  let k = 0;
  return (
    <div style={{ position: "absolute", top: TEXT_TOP, left: SAFE_L, right: SAFE_R, fontFamily: IT, color: INK }}>
      {lines.map((line, li) => {
        const ws = line.split(" ");
        return (
          <div key={li} style={{ fontSize: 116, fontWeight: 700, letterSpacing: "-0.045em", lineHeight: 1.04, whiteSpace: "nowrap" }}>
            {ws.map((w, wi) => {
              const at = enter + k++ * 2;
              const last = li === lines.length - 1 && wi === ws.length - 1 && w.endsWith(".");
              return (
                <React.Fragment key={wi}>
                  <Rise k={f} enter={at} exit={exit}>
                    {last ? (
                      <>
                        {w.slice(0, -1)}
                        <span style={{ color: RED }}>.</span>
                      </>
                    ) : (
                      w
                    )}
                  </Rise>{" "}
                </React.Fragment>
              );
            })}
          </div>
        );
      })}
      {sub && (
        <div style={{ marginTop: 18, fontSize: 44, fontWeight: 600, letterSpacing: "-0.02em", color: GREY, whiteSpace: "nowrap" }}>
          <Rise k={f} enter={enter + k * 2 + 2} exit={exit}>
            {sub}
          </Rise>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------ Accroche */

const HOOK_END = 84;
const MERGE = { x: 540, y: 1216 };
const BRANDS: Brand[] = ["tiktok", "youtube", "instagram"];

/** Remplace un texte par un autre : l'ancien sort par le haut, le nouveau monte à sa place. */
const Swap: React.FC<{ f: number; a: React.ReactNode; b: React.ReactNode; at: number }> = ({ f, a, b, at }) => {
  const out = ease(f, at, at + 6, Easing.in(Easing.cubic));
  const inn = sp(f, at + 4);
  return (
    <span style={{ position: "relative", display: "inline-block", overflow: "hidden", verticalAlign: "top", whiteSpace: "nowrap", padding: "0.08em 0.04em 0.2em", margin: "-0.08em 0 -0.2em" }}>
      <span style={{ display: "inline-block", transform: `translateY(${-out * 125}%)` }}>{a}</span>
      <span style={{ position: "absolute", left: "50%", top: "0.08em", transform: `translate(-50%, ${(1 - inn) * 125}%)` }}>{b}</span>
    </span>
  );
};

const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const slam = sp(f, -3);
  const strike = ease(f, 30, 36, Easing.out(Easing.cubic)) * (1 - ease(f, 40, 45, Easing.in(Easing.cubic)));
  const roll = sp(f, 42);
  const merge = ease(f, 50, 62, Easing.in(Easing.cubic));
  const dot = sp(f, 58);
  // la caméra plonge dans le point rouge (raccord avec le zoom du plan suivant)
  const dive = ease(f, 74, HOOK_END, Easing.in(Easing.cubic));
  const big: React.CSSProperties = { fontSize: 96, fontWeight: 700, letterSpacing: "-0.045em", lineHeight: 1.05 };
  const mergeP = ease(f - 1, 50, 62, Easing.in(Easing.cubic));
  const mb = blurOf((merge - mergeP) * 180, 0, 0.35, 10);
  return (
    <AbsoluteFill style={{ background: GROUND, overflow: "hidden" }}>
      <Blur id="h-merge" sx={mb.sx} sy={mb.sy} />
      <Blur id="h-dive" sx={dive * 16} sy={dive * 16} />
      <AbsoluteFill style={{ transformOrigin: `${MERGE.x}px ${MERGE.y}px`, transform: `scale(${1 + dive * 2.4})`, filter: blurUrl(dive * 16, dive * 16, "h-dive") }}>
        <div style={{ position: "absolute", top: 450, left: 40, right: 40, textAlign: "center", fontFamily: IT, color: INK }}>
          <div style={big}>
            <Swap f={f} a="Arrête de publier" b="Publie-la" at={40} />
          </div>
          <div style={{ position: "relative", display: "inline-block", marginTop: 4, transform: `scale(${mix(1.9, 1, slam)})` }}>
            <span style={{ display: "inline-flex", alignItems: "baseline", fontSize: 270, fontWeight: 800, letterSpacing: "-0.06em", lineHeight: 1.15 }}>
              <span style={{ display: "inline-block", width: "0.6em", height: "1.15em", overflow: "hidden", textAlign: "center" }}>
                <span style={{ display: "block", transform: `translateY(${-roll * 1.15}em)` }}>
                  <span style={{ display: "block", height: "1.15em" }}>3</span>
                  <span style={{ display: "block", height: "1.15em" }}>1</span>
                </span>
              </span>
              <span>&nbsp;fois</span>
            </span>
            <div style={{ position: "absolute", left: -16, right: -16, top: "54%", height: 18, marginTop: -9, borderRadius: 9, background: INK, transform: `rotate(-5deg) scaleX(${strike})`, transformOrigin: f < 40 ? "0 50%" : "100% 50%" }} />
          </div>
          <div style={{ ...big, marginTop: 2 }}>
            <Swap f={f} a={<Rise k={f} enter={6}>la même vidéo.</Rise>} b="partout." at={44} />
          </div>
        </div>
        {f < 62 && (
          <div style={{ position: "absolute", inset: 0, filter: blurUrl(mb.sx, mb.sy, "h-merge") }}>
            {BRANDS.map((b, i) => {
              const s = sp(f, 10 + i * 4);
              const x = mix(MERGE.x + (i - 1) * 180, MERGE.x, merge);
              return (
                <div key={b} style={{ position: "absolute", left: x - 68, top: MERGE.y - 68, transform: `scale(${s * mix(1, 0.2, merge)}) rotate(${(1 - s) * -20 + merge * (i - 1) * 60}deg)` }}>
                  <InkTile brand={b} size={136} />
                </div>
              );
            })}
          </div>
        )}
        {f >= 58 && <div style={{ position: "absolute", left: MERGE.x - 26, top: MERGE.y - 26, width: 52, height: 52, borderRadius: 26, background: RED, transform: `scale(${dot})`, boxShadow: "0 8px 22px rgba(255,59,48,0.32)" }} />}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- Plans */

type ShotC = React.FC<{ len: number }>;

/* 1 — « 1 clic. 3 plateformes. » : arrivée en tournoyant, puis le téléphone se dédouble en trois. */
const SPIN = { mass: 1.1, damping: 13.8, stiffness: 110 }; // ζ ≈ 0,63
function centerPose(f: number, len: number): Pose {
  const s = sp(f, 0, SPIN);
  const k = sp(f, 22);
  const drift = ease(f, 22, len, Easing.inOut(Easing.sin)) * -5;
  const c = mixPose(pose(-200, 28, -12, 0, 700, 0.6), pose(-6, 7, 0, 0, 40, 0.92), s);
  c.rotY = mix(c.rotY, 0, k) + drift;
  c.scale = mix(c.scale, 0.84, k);
  return c;
}
const sidePose = (f: number, len: number, dir: 1 | -1) => {
  const k = sp(f, 22);
  const drift = ease(f, 22, len, Easing.inOut(Easing.sin)) * -5;
  return pose(dir * -28 * k + drift, 6, dir * 2 * k, dir * 330 * k, 40 + 30 * k, mix(0.86, 0.74, k));
};
const ShotOneToThree: ShotC = ({ len }) => {
  const f = useCurrentFrame();
  const c = centerPose(f, len);
  const pb = poseBlur(c, centerPose(f - 1, len));
  const settings = (t: number) => <Timed screen={SettingsScreen} time={t} />;
  const split = f >= 20;
  return (
    <>
      {split && <FloorShadow p={sidePose(f, len, -1)} />}
      {split && <FloorShadow p={sidePose(f, len, 1)} />}
      <FloorShadow p={c} />
      <Blur id="s1" sx={pb.sx} sy={pb.sy} />
      <AbsoluteFill style={{ filter: blurUrl(pb.sx, pb.sy, "s1") }}>
        <Stage3D>
          {split && <PhoneAt p={sidePose(f, len, -1)}>{settings(44)}</PhoneAt>}
          {split && <PhoneAt p={sidePose(f, len, 1)}>{settings(150)}</PhoneAt>}
          <PhoneAt p={c}>
            <PushSwap a={<Timed screen={ComposerScreen} time={tmap(f, 26, 10, 112)} />} b={settings(100)} at={24} />
          </PhoneAt>
          {BRANDS.map((b, i) => (
            <Pop key={b} f={f} start={30 + i * 3} x={540 + (i - 1) * 330} y={1390} z={200}>
              <InkTile brand={b} />
            </Pop>
          ))}
        </Stage3D>
      </AbsoluteFill>
    </>
  );
};

/** Texte géant qui monte caractère par caractère depuis un masque. */
const GiantText: React.FC<{ f: number; text: string; start: number; size: number; y: number }> = ({ f, text, start, size, y }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: y - size * 0.6, textAlign: "center", fontFamily: IT, fontSize: size, fontWeight: 700, letterSpacing: "-0.055em", lineHeight: 1.2, color: INK, fontFeatureSettings: '"tnum"' }}>
    {Array.from(text).map((ch, i) => {
      const s = sp(f, start + i * 1.5);
      return (
        <span key={i} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top" }}>
          <span style={{ display: "inline-block", transform: `translateY(${(1 - s) * 105}%)` }}>{ch}</span>
        </span>
      );
    })}
  </div>
);

/* 2 — « Programme. » : 19:00 géant, le téléphone incliné en dessous. */
function schedulePose(f: number, len: number): Pose {
  const s = sp(f, 2, { mass: 1, stiffness: 100, damping: 11.8 });
  const p = mixPose(pose(42, 10, -9, 300, 270, 0.72), pose(20, 8, -6, 30, 170, 0.78), s);
  p.rotY += ease(f, 8, len, Easing.inOut(Easing.sin)) * -8;
  return p;
}
const ShotSchedule: ShotC = ({ len }) => {
  const f = useCurrentFrame();
  const p = schedulePose(f, len);
  const pb = poseBlur(p, schedulePose(f - 1, len));
  return (
    <>
      <GiantText f={f} text="19:00" start={8} size={300} y={650} />
      <FloorShadow p={p} />
      <Blur id="s2" sx={pb.sx} sy={pb.sy} />
      <AbsoluteFill style={{ filter: blurUrl(pb.sx, pb.sy, "s2") }}>
        <Stage3D>
          <PhoneAt p={p}>
            <Timed screen={ScheduleScreen} time={tmap(f, 40, 14, 58)} />
          </PhoneAt>
        </Stage3D>
      </AbsoluteFill>
    </>
  );
};

/** Le message Discord, version carte blanche (naturel 700 de large). */
const DiscordCard: React.FC<{ f: number; start: number }> = ({ f, start }) => {
  const lines: React.ReactNode[] = [
    <b key="t" style={{ fontWeight: 700, color: INK }}>Clutch 1v4 en ranked est en ligne !</b>,
    <>
      <b style={{ fontWeight: 700, color: INK }}>TikTok</b> · tiktok.com/@dekhan/video/7425…
    </>,
    <>
      <b style={{ fontWeight: 700, color: INK }}>YouTube</b> · youtube.com/shorts/Vq3dX8…
    </>,
    <>
      <b style={{ fontWeight: 700, color: INK }}>Instagram</b> · instagram.com/reel/DBk2pQ…
    </>,
  ];
  return (
    <div style={{ width: 700, padding: "26px 30px", borderRadius: 34, background: "#fff", fontFamily: IT, color: INK, boxShadow: shadow(1) }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <InkMark size={58} />
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 27, fontWeight: 700 }}>Uplink</span>
          <span style={{ fontSize: 14, fontWeight: 700, background: INK, color: "#fff", borderRadius: 6, padding: "3px 7px" }}>APP</span>
          <span style={{ fontSize: 19, fontWeight: 500, color: GREY }}>Aujourd'hui à 19:00</span>
        </div>
        <BrandLogo brand="discord" size={36} color={INK} />
      </div>
      <div style={{ marginTop: 12, fontSize: 23, fontWeight: 500, color: GREY, lineHeight: 1.5, whiteSpace: "nowrap" }}>
        {lines.map((l, i) => (
          <div key={i}>
            <Rise k={f} enter={start + 4 + i * 3}>
              {l}
            </Rise>
          </div>
        ))}
      </div>
    </div>
  );
};

/* 3 — « Ta commu prévenue. » : contre-plongée, le message sort de l'écran et vient vers nous. */
function discordPose(f: number, len: number): Pose {
  const s = sp(f, 0, { mass: 1, stiffness: 90, damping: 11.2 });
  const p = mixPose(pose(-40, -4, 3, 430, 60, 0.88), pose(-24, -5, 2, 180, 60, 0.9), s);
  p.rotY += ease(f, 10, len, Easing.inOut(Easing.sin)) * 6;
  return p;
}
function cardFly(f: number) {
  const e = sp(f, 10, { mass: 1, stiffness: 120, damping: 12.9 });
  return { x: mix(720, 440, e), y: mix(1180, 1070, e), z: mix(0, 230, e), rot: mix(-24, -8, e), s: mix(0.35, 1, e) };
}
const ShotDiscord: ShotC = ({ len }) => {
  const f = useCurrentFrame();
  const p = discordPose(f, len);
  const pb = poseBlur(p, discordPose(f - 1, len));
  const c = cardFly(f);
  const cp = cardFly(f - 1);
  const cb = blurOf(c.x - cp.x + (c.s - cp.s) * 300, c.y - cp.y, 0.3, 12);
  return (
    <>
      <FloorShadow p={p} />
      <Blur id="s3" sx={pb.sx} sy={pb.sy} />
      <Blur id="s3c" sx={cb.sx} sy={cb.sy} />
      <AbsoluteFill style={{ filter: blurUrl(pb.sx, pb.sy, "s3") }}>
        <Stage3D>
          <PhoneAt p={p}>
            <Timed screen={DiscordScreen} time={tmap(f, 40, 30, 96)} />
          </PhoneAt>
        </Stage3D>
      </AbsoluteFill>
      {f >= 10 && (
        <AbsoluteFill style={{ perspective: 2600, perspectiveOrigin: "50% 58%", filter: blurUrl(cb.sx, cb.sy, "s3c") }}>
          <div style={{ position: "absolute", left: c.x, top: c.y, transform: `translate(-50%, -50%) translate3d(0, ${Math.sin(f / 10) * 5}px, ${c.z}px) rotateY(${c.rot}deg) scale(${c.s})` }}>
            <DiscordCard f={f} start={10} />
          </div>
        </AbsoluteFill>
      )}
    </>
  );
};

/** Grande carte chiffrée : symbole, nombre qui compte (sans jamais revenir en arrière), libellé court. */
const STATS = [
  { sym: "↑", v: 5990, d: 0, pre: "+", suf: "", label: "abonnés en 28 jours", at: 10 },
  { sym: "%", v: 12.8, d: 1, pre: "", suf: " %", label: "taux d'influence", at: 18 },
  { sym: "€", v: 4918.98, d: 2, pre: "", suf: " €", label: "de revenus ce mois", at: 26 },
];
const fmt = (n: number, d: number) => new Intl.NumberFormat("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }).format(n).replace(/[  ]/g, " ");
const statT = (f: number, at: number) => (f < at ? 0 : sp(f, at));
const StatCard: React.FC<{ f: number; i: number }> = ({ f, i }) => {
  const s = STATS[i];
  if (f < s.at) return <div style={{ height: 196 }} />;
  const k = statT(f, s.at);
  const kp = statT(f - 1, s.at);
  const c = ease(f, s.at + 2, s.at + 18, Easing.bezier(0.16, 1, 0.3, 1));
  const b = blurOf((k - kp) * 140, 0, 0.3, 10);
  return (
    <>
      <Blur id={`st${i}`} sx={b.sx} sy={b.sy} />
      <div style={{ height: 196, display: "flex", alignItems: "center", gap: 28, padding: "0 34px", borderRadius: 38, background: "#fff", fontFamily: IT, color: INK, transform: `translateX(${(1 - k) * -140}px) scale(${mix(0.6, 1, k)}) rotate(${(1 - k) * -6}deg)`, transformOrigin: "0 50%", boxShadow: shadow(1), filter: blurUrl(b.sx, b.sy, `st${i}`) }}>
        <div style={{ width: 124, height: 124, borderRadius: 36, background: GROUND, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 58, fontWeight: 700, flexShrink: 0 }}>{s.sym}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 86, fontWeight: 800, letterSpacing: "-0.045em", lineHeight: 1, fontFeatureSettings: '"tnum"' }}>
            {s.pre}
            {fmt(s.v * c, s.d)}
            {s.suf}
          </div>
          <div style={{ marginTop: 8, fontSize: 34, fontWeight: 600, color: GREY, whiteSpace: "nowrap" }}>{s.label}</div>
        </div>
      </div>
    </>
  );
};

/* 4 — « Tes stats. Tes revenus. » : trois chiffres, rien d'autre. */
const ShotNumbers: ShotC = () => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", top: 610, left: SAFE_L, right: SAFE_R, display: "flex", flexDirection: "column", gap: 26 }}>
      {[0, 1, 2].map((i) => (
        <StatCard key={i} f={f} i={i} />
      ))}
    </div>
  );
};

/** Écran d'accueil construit, qui passe en thème sombre par un cercle (depuis le coin supérieur droit). */
const HomeBuilt: React.FC = () => (
  <Freeze frame={130}>
    <HomeScreen />
  </Freeze>
);
const DarkSwitch: React.FC = () => {
  const f = useCurrentFrame();
  const r = interpolate(f, [12, 44], [0, 1250], { easing: Easing.inOut(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <>
      <HomeBuilt />
      <div style={{ position: "absolute", inset: 0, clipPath: `circle(${r}px at ${SCREEN_W - 60}px 92px)` }}>
        <ThemeProvider theme={KEYNOTE_DARK}>
          <HomeBuilt />
        </ThemeProvider>
      </div>
    </>
  );
};

/** Fin : marque, promesse (point final rouge) et adresse. */
const CtaLockup: React.FC<{ f: number }> = ({ f }) => {
  const mark = sp(f, 2);
  const url = sp(f, 22);
  return (
    <div style={{ position: "absolute", top: TEXT_TOP, left: SAFE_L, right: SAFE_R, fontFamily: IT, color: INK }}>
      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        <div style={{ transform: `scale(${mark}) rotate(${(1 - mark) * -14}deg)` }}>
          <InkMark size={100} />
        </div>
        <div style={{ fontSize: 112, fontWeight: 700, letterSpacing: "-0.05em", lineHeight: 1 }}>
          {Array.from("Uplink").map((l, i) => (
            <Rise key={i} k={f} enter={3 + i}>
              {l}
            </Rise>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 24, fontSize: 80, fontWeight: 700, letterSpacing: "-0.045em", lineHeight: 1.04 }}>
        <div>
          <Rise k={f} enter={8}>
            Publie
          </Rise>{" "}
          <Rise k={f} enter={10}>
            partout.
          </Rise>
        </div>
        <div>
          <Rise k={f} enter={12}>
            Pilote
          </Rise>{" "}
          <Rise k={f} enter={14}>
            <>
              tout<span style={{ color: RED }}>.</span>
            </>
          </Rise>
        </div>
      </div>
      <div style={{ marginTop: 26, transform: `scale(${url})`, transformOrigin: "0 50%" }}>
        <span style={{ display: "inline-flex", alignItems: "center", padding: "14px 24px", borderRadius: 34, background: INK, color: "#fff", fontSize: 36, fontWeight: 700, boxShadow: shadow(0.6) }}>www.dsociety.fr/uplink</span>
      </div>
    </div>
  );
};

/* Fin — le cadre recule, l'application passe en sombre. */
function ctaPose(f: number): Pose {
  const s = sp(f, 0, { mass: 1.1, damping: 11.8, stiffness: 80 });
  const p = mixPose(pose(-8, 6, 0, 0, 40, 1.3), pose(-24, 9, 2, 0, 150, 0.84), s);
  const sway = 1 - ease(f, 20, 50);
  p.rotY += Math.sin(f / 40) * 1.2 * sway;
  p.y += Math.sin(f / 31) * 6 * sway;
  return p;
}
const ShotCta: ShotC = () => {
  const f = useCurrentFrame();
  const p = ctaPose(f);
  const pb = poseBlur(p, ctaPose(f - 1));
  return (
    <>
      <FloorShadow p={p} />
      <Blur id="s5" sx={pb.sx} sy={pb.sy} />
      <AbsoluteFill style={{ filter: blurUrl(pb.sx, pb.sy, "s5") }}>
        <Stage3D>
          <PhoneAt p={p}>
            <Timed screen={DarkSwitch} time={f * 1.1} />
          </PhoneAt>
        </Stage3D>
      </AbsoluteFill>
      <CtaLockup f={f} />
    </>
  );
};

/* -------------------------------------------------------------- Montage */

interface ShotDef {
  id: string;
  len: number;
  inT: Trans;
  Comp: ShotC;
  cap?: { title: string; sub?: string };
}

const SHOTS: ShotDef[] = [
  { id: "un-clic", len: 78, inT: "zoom", Comp: ShotOneToThree, cap: { title: "1 clic.|3 plateformes." } },
  { id: "programme", len: 72, inT: "whipR", Comp: ShotSchedule, cap: { title: "Programme.", sub: "Uplink publie à ta place." } },
  { id: "discord", len: 72, inT: "whipL", Comp: ShotDiscord, cap: { title: "Ta commu|prévenue.", sub: "Les liens partent sur Discord." } },
  { id: "chiffres", len: 72, inT: "zoom", Comp: ShotNumbers, cap: { title: "Tes stats.|Tes revenus." } },
  { id: "fin", len: 72, inT: "whipL", Comp: ShotCta },
];
const STARTS = SHOTS.reduce<number[]>((acc, s, i) => [...acc, i === 0 ? HOOK_END : acc[i - 1] + SHOTS[i - 1].len], []);
export const NOUVELLE_DA_DURATION = STARTS[STARTS.length - 1] + SHOTS[SHOTS.length - 1].len; // 450 = 15 s
const HOLD_FROM = NOUVELLE_DA_DURATION - 30; // une seconde immobile
const whipDir = (t: Trans | undefined): 1 | -1 | undefined => (t === "whipR" ? 1 : t === "whipL" ? -1 : undefined);

const Film: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: GROUND }}>
      {frame < HOOK_END && <Hook />}
      {SHOTS.map((s, i) => {
        const out = whipDir(SHOTS[i + 1]?.inT);
        return (
          <Sequence key={s.id} from={STARTS[i]} durationInFrames={s.len + (out ? WHIP : 0)} layout="none">
            <ShotFrame len={s.len} inT={s.inT} outWhip={out}>
              <AbsoluteFill style={{ background: GROUND }} />
              <s.Comp len={s.len} />
              {s.cap && <CaptionAt cap={s.cap} exit={out ? undefined : s.len - 6} />}
            </ShotFrame>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
const CaptionAt: React.FC<{ cap: { title: string; sub?: string }; exit?: number }> = ({ cap, exit }) => {
  const f = useCurrentFrame();
  return <Caption f={f} title={cap.title} sub={cap.sub} enter={2} exit={exit} />;
};

export const TikTokNouvelleDA: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  return (
    <UserProvider user={USER}>
      <ThemeProvider theme={KEYNOTE_LIGHT}>
        {frame >= HOLD_FROM ? (
          <Freeze frame={HOLD_FROM}>
            <Film />
          </Freeze>
        ) : (
          <Film />
        )}
      </ThemeProvider>
    </UserProvider>
  );
};

