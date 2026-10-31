/**
 * Les plans de la version TikTok. Chaque plan reçoit son temps local (0 = début du plan) et sa durée `len`.
 * Un plan = un cadrage différent : rotation d'entrée, téléphone qui se démultiplie, gros plan, vue de dessus,
 * typographie géante, travelling avant, carte qui sort de l'écran, interface plein cadre, orbite…
 */
import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BrandLogo, type Brand } from "../brands";
import { Callout, IconTile } from "../Callout";
import { ACCENT, INK, MUTED } from "../config";
import { FloatingCard } from "../FloatingCard";
import { Check, Shield } from "../icons";
import { mix } from "../motion";
import { Num } from "../Num";
import { SCREEN_H, SCREEN_W } from "../Phone";
import { DARK, ThemeProvider } from "../theme";
import { LogoMark } from "../tour/Caption";
import { FONT } from "../tour/kit";
import { AccountsScreen, ComposerScreen, PhotosScreen, ScheduleScreen, SettingsScreen } from "../tour/screens1";
import { AdminScreen, AudienceScreen, DiscordScreen, PublishScreen, StatsScreen } from "../tour/screens2";
import { DarkReveal } from "../tour/Tour";
import { CENTER_Y, FloorShadow, PhoneAt, Pill, PlaneShadow, Pop3D, PushSwap, SAFE_L, SAFE_R, Stage3D, TEXT_TOP, Timed, TopScrim, Word, ease, macro, mixPose, pose, tmap, words } from "./parts";

type Shot = React.FC<{ len: number }>;

const BRAND_BG: Record<Brand, string> = {
  tiktok: "#000",
  youtube: "#FF0033",
  instagram: "linear-gradient(45deg, #FEDA75 0%, #FA7E1E 28%, #D62976 55%, #962FBF 78%, #4F5BD5 100%)",
  twitch: "#9146FF",
  discord: "#5865F2",
};

/** Vignette blanche avec logo et coche « connecté ». */
const BrandChip: React.FC<{ brand: Brand; size?: number }> = ({ brand, size = 104 }) => (
  <div style={{ position: "relative", width: size, height: size, borderRadius: size * 0.3, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 26px 46px -22px rgba(20,24,40,0.55), 0 6px 14px -8px rgba(20,24,40,0.3)" }}>
    <BrandLogo brand={brand} size={size * 0.5} color={INK} />
    <div style={{ position: "absolute", right: -10, top: -10, width: 38, height: 38, borderRadius: 19, background: ACCENT, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 4px #fff" }}>
      <Check size={22} color="#fff" stroke={3.2} />
    </div>
  </div>
);

/** Vignette pleine aux couleurs de la plateforme. */
const BrandTileColor: React.FC<{ brand: Brand; size?: number }> = ({ brand, size = 112 }) => (
  <div style={{ width: size, height: size, borderRadius: size * 0.28, background: BRAND_BG[brand], display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `${brand === "tiktok" ? "inset 0 0 0 2px rgba(255,255,255,0.2), " : ""}0 26px 46px -20px rgba(10,6,30,0.6)` }}>
    <BrandLogo brand={brand} size={size * 0.52} color="#fff" />
  </div>
);

/* 01 — Comptes : le téléphone sort du volet en tournoyant, les réseaux se connectent autour. */
export const PRE_ACCOUNTS = 14;
export const ShotAccounts: Shot = ({ len }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - PRE_ACCOUNTS;
  const s = spring({ frame, fps, config: { mass: 1.1, damping: 14, stiffness: 72 } });
  const p = mixPose(pose(-220, 30, -12, 0, 700, 0.55), pose(-16, 8, 1.5, 0, 0, 1), s);
  p.scale *= 1 + 0.05 * ease(f, 6, len, Easing.inOut(Easing.sin));
  p.y += Math.sin(frame / 30) * 6;
  const tiles: { brand: Brand; x: number; y: number; r: number }[] = [
    { brand: "tiktok", x: 220, y: 820, r: -16 },
    { brand: "youtube", x: 860, y: 740, r: 14 },
    { brand: "instagram", x: 205, y: 1330, r: 12 },
    { brand: "twitch", x: 866, y: 1262, r: -12 },
  ];
  return (
    <>
      <FloorShadow p={p} />
      <Stage3D>
        <PhoneAt p={p}>
          <Timed screen={AccountsScreen} time={tmap(frame - 4, len + PRE_ACCOUNTS - 4, 0, 80)} />
        </PhoneAt>
        {tiles.map((t, i) => (
          <Pop3D key={t.brand} start={PRE_ACCOUNTS + 5 + i * 3} x={t.x} y={t.y} z={160} rotZ={t.r} drift={Math.sin((frame + i * 20) / 11) * 8}>
            <BrandChip brand={t.brand} />
          </Pop3D>
        ))}
      </Stage3D>
    </>
  );
};

/* 02 — Créer : un téléphone se dédouble en trois, un par plateforme. */
export const ShotSplit: Shot = ({ len }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sp = spring({ frame: f - 9, fps, config: { damping: 14, stiffness: 120, mass: 0.8 } });
  const center = pose(mix(-6, 0, sp), mix(8, 6, sp), 0, 0, 30, mix(0.9, 0.84, sp));
  const side = (dir: 1 | -1) => pose(dir * -28 * sp, 6, dir * 2 * sp, dir * 330 * sp, 30 + 30 * sp, mix(0.86, 0.74, sp));
  const settings = (t: number) => <Timed screen={SettingsScreen} time={t} />;
  return (
    <>
      <FloorShadow p={side(-1)} />
      <FloorShadow p={side(1)} />
      <FloorShadow p={center} />
      <Stage3D>
        <PhoneAt p={side(-1)}>{settings(44)}</PhoneAt>
        <PhoneAt p={side(1)}>{settings(150)}</PhoneAt>
        <PhoneAt p={center}>
          <PushSwap a={<Timed screen={ComposerScreen} time={tmap(f, 14, 70, 112)} />} b={settings(100)} at={10} />
        </PhoneAt>
        {(["tiktok", "youtube", "instagram"] as Brand[]).map((b, i) => (
          <Pop3D key={b} start={13 + i * 2} x={540 + (i - 1) * 330} y={1395} z={200}>
            <BrandTileColor brand={b} />
          </Pop3D>
        ))}
      </Stage3D>
    </>
  );
};

/* 03 — Réglages : gros plan sur le choix du format YouTube (Auto → Short). */
export const ShotFormat: Shot = ({ len }) => {
  const f = useCurrentFrame();
  const e = ease(f, 0, len, Easing.inOut(Easing.sin));
  const p = macro(237, 262, mix(2.15, 2.45, e), { rotY: mix(-12, -5, e), rotX: 10, rotZ: 1.2 }, { x: 540, y: 1190 });
  return (
    <>
      <Stage3D>
        <PhoneAt p={p}>
          <Timed screen={SettingsScreen} time={tmap(f, len, 66, 102)} />
        </PhoneAt>
      </Stage3D>
      <TopScrim />
    </>
  );
};

/* 04 — Photos : vue de dessus, le téléphone posé à plat tourne doucement. */
export const ShotPhotos: Shot = ({ len }) => {
  const f = useCurrentFrame();
  const e = ease(f, 0, len, Easing.inOut(Easing.sin));
  const p = pose(0, 52, mix(-30, -14, e), 0, mix(110, 60, e), mix(1.12, 1.2, e));
  return (
    <Stage3D>
      <PlaneShadow p={p} />
      <PhoneAt p={p}>
        <Timed screen={PhotosScreen} time={tmap(f, len, 40, 80)} />
      </PhoneAt>
    </Stage3D>
  );
};

/** Chiffres géants qui montent un par un depuis un masque. */
const GiantText: React.FC<{ text: string; start: number; size: number; color: string; y: number }> = ({ text, start, size, color, y }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: y - size * 0.6, textAlign: "center", fontFamily: FONT, fontSize: size, fontWeight: 800, letterSpacing: -size * 0.05, lineHeight: 1.2, color }}>
      {Array.from(text).map((ch, i) => {
        const s = spring({ frame: f - start - i * 1.5, fps, config: { damping: 16, stiffness: 220, mass: 0.6 } });
        return (
          <span key={i} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top" }}>
            <span style={{ display: "inline-block", transform: `translateY(${(1 - s) * 105}%)` }}>{ch}</span>
          </span>
        );
      })}
    </div>
  );
};

/* 05 — Programmer : « 19:00 » géant, le téléphone incliné en dessous. */
export const ShotSchedule: Shot = ({ len }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - 2, fps, config: { damping: 15, stiffness: 100, mass: 0.8 } });
  const p = mixPose(pose(42, 10, -9, 300, 260, 0.74), pose(20, 8, -6, 30, 150, 0.8), s);
  p.rotY += ease(f, 8, len) * -6;
  return (
    <>
      <GiantText text="19:00" start={0} size={280} color={ACCENT} y={720} />
      <FloorShadow p={p} />
      <Stage3D>
        <PhoneAt p={p}>
          <Timed screen={ScheduleScreen} time={tmap(f, len, 14, 58)} />
        </PhoneAt>
      </Stage3D>
    </>
  );
};

/** Gerbe de particules (dans l'écran du téléphone). */
const Burst: React.FC<{ x: number; y: number; start: number }> = ({ x, y, start }) => {
  const f = useCurrentFrame();
  if (f < start) return null;
  const p = ease(f, start, start + 11, Easing.out(Easing.cubic));
  return (
    <>
      {Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2 + 0.3;
        const d = 16 + p * (i % 2 ? 70 : 95);
        const size = (i % 3 === 0 ? 11 : 8) * (1 - p * 0.6);
        return <div key={i} style={{ position: "absolute", left: x + Math.cos(a) * d - size / 2, top: y + Math.sin(a) * d - size / 2, width: size, height: size, borderRadius: size / 2, background: i % 2 ? "#C4B5FD" : ACCENT, opacity: 1 - p }} />;
      })}
    </>
  );
};

/* 06 — Publier : travelling avant jusqu'au suivi en direct (échec Instagram, relance, réussite). */
export const ShotPublish: Shot = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const z = spring({ frame: f - 1, fps, config: { damping: 16, stiffness: 90, mass: 0.9 } });
  const p = mixPose(pose(-10, 7, 1, 0, 0, 1), macro(237, 322, 2.1, { rotY: -4, rotX: 6, rotZ: 0.6 }, { x: 540, y: 1190 }), z);
  const t = interpolate(f, [0, 10, 16, 26], [40, 70, 92, 124], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <>
      <Stage3D>
        <PhoneAt p={p}>
          <Timed screen={PublishScreen} time={t} />
          <div style={{ position: "absolute", inset: 0, width: SCREEN_W, height: SCREEN_H }}>
            <Burst x={398} y={389} start={24} />
          </div>
        </PhoneAt>
      </Stage3D>
      <TopScrim />
    </>
  );
};

/** Message Discord tel qu'il arrive dans le salon. */
const DiscordEmbed: React.FC<{ start: number }> = ({ start }) => {
  const lines = [
    <>
      🎬 <b style={{ color: "#fff" }}>Clutch 1v4 en ranked</b> est en ligne !
    </>,
    <>
      🎵 TikTok : <span style={{ color: "#00A8FC" }}>tiktok.com/@dekhan/video/7425…</span>
    </>,
    <>
      ▶️ YouTube : <span style={{ color: "#00A8FC" }}>youtube.com/shorts/Vq3dX8…</span>
    </>,
    <>
      📸 Instagram : <span style={{ color: "#00A8FC" }}>instagram.com/reel/DBk2pQ…</span>
    </>,
  ];
  return (
    <div style={{ width: 660, padding: "24px 26px", borderRadius: 26, background: "#313338", fontFamily: FONT, display: "flex", gap: 18, boxShadow: "0 50px 90px -30px rgba(10,10,40,0.75), inset 0 0 0 1px rgba(255,255,255,0.06)" }}>
      <LogoMark size={64} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 25, fontWeight: 800, color: "#fff" }}>
          Uplink
          <span style={{ fontSize: 15, fontWeight: 800, background: "#5865F2", color: "#fff", borderRadius: 6, padding: "2px 7px" }}>APP</span>
          <span style={{ fontSize: 17, fontWeight: 600, color: "#949BA4" }}>Aujourd'hui à 19:00</span>
        </div>
        <div style={{ marginTop: 8, fontSize: 22, fontWeight: 600, color: "#DBDEE1", lineHeight: 1.45, whiteSpace: "nowrap" }}>
          {lines.map((l, i) => (
            <div key={i}>
              <Word enter={start + 4 + i * 2}>{l}</Word>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* 07 — Discord : contre-plongée, le message sort de l'écran et vient vers nous. */
export const ShotDiscord: Shot = ({ len }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f, fps, config: { damping: 15, stiffness: 90, mass: 0.9 } });
  const p = mixPose(pose(-40, -4, 3, 430, 40, 0.9), pose(-24, -5, 2, 170, 40, 0.92), s);
  const e = spring({ frame: f - 5, fps, config: { damping: 13, stiffness: 120, mass: 0.8 } });
  return (
    <>
      <FloorShadow p={p} />
      <Stage3D>
        <PhoneAt p={p}>
          <Timed screen={DiscordScreen} time={tmap(f, len, 30, 96)} />
        </PhoneAt>
        {f >= 5 && (
          <div style={{ position: "absolute", left: mix(700, 430, e), top: mix(1130, 1010, e), transform: `translate(-50%, -50%) translate3d(0, ${Math.sin(f / 8) * 5}px, ${mix(0, 230, e)}px) rotateY(${mix(-24, -8, e)}deg) scale(${mix(0.35, 1, e)})` }}>
            <DiscordEmbed start={5} />
          </div>
        )}
      </Stage3D>
    </>
  );
};

/* 08 — Statistiques : l'interface plein cadre (thème sombre), comme si l'on entrait dans l'écran. */
export const ShotStats: Shot = ({ len }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f, fps, config: { damping: 16, stiffness: 110, mass: 0.8 } });
  const e = ease(f, 0, len, Easing.inOut(Easing.sin));
  return (
    <AbsoluteFill style={{ perspective: 1800, perspectiveOrigin: "50% 60%" }}>
      <div
        style={{
          position: "absolute",
          left: 540 - SCREEN_W / 2,
          top: 1560 - SCREEN_H / 2,
          width: SCREEN_W,
          height: SCREEN_H,
          borderRadius: 64,
          overflow: "hidden",
          transformOrigin: "50% 22%",
          transform: `translateY(${mix(160, 0, s)}px) rotateX(${mix(20, 7, e)}deg) rotateY(${mix(-14, 7, e)}deg) scale(${mix(1.72, 1.86, e)})`,
          boxShadow: "0 60px 120px -30px rgba(124,58,237,0.6), 0 0 0 1px rgba(255,255,255,0.1)",
        }}
      >
        <ThemeProvider theme={DARK}>
          <Timed screen={StatsScreen} time={tmap(f, len, 6, 60)} />
        </ThemeProvider>
      </div>
    </AbsoluteFill>
  );
};

/* 09 — Influence : anneau géant qui se remplit, formule autour. */
export const ShotInfluence: Shot = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = ease(f, 1, 17, Easing.out(Easing.cubic));
  const enter = spring({ frame: f, fps, config: { damping: 14, stiffness: 140, mass: 0.7 } });
  const size = 540;
  const r = 228;
  const c = 2 * Math.PI * r;
  const chips: { t: string; x: number; y: number; r: number }[] = [
    { t: "J'aime ×1", x: 290, y: 760, r: -8 },
    { t: "Commentaires ×2", x: 730, y: 800, r: 7 },
    { t: "Partages ×3", x: 270, y: 1370, r: 6 },
    { t: "Enregistrements ×2", x: 700, y: 1335, r: -6 },
  ];
  return (
    <>
      <div style={{ position: "absolute", left: 540 - size / 2, top: 1060 - size / 2, width: size, height: size, transform: `scale(${mix(0.6, 1, enter)}) rotate(${(1 - enter) * -40}deg)` }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <defs>
            <linearGradient id="infl" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#C4B5FD" />
              <stop offset="100%" stopColor={ACCENT} />
            </linearGradient>
          </defs>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={46} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#infl)" strokeWidth={46} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p * 0.64)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: FONT, color: "#fff" }}>
          <div style={{ display: "flex", alignItems: "baseline", fontSize: 150, fontWeight: 800, letterSpacing: -6, lineHeight: 1 }}>
            <Num value={Math.round(p * 128) / 10} decimals={1} />
            <span style={{ fontSize: 76, marginLeft: 6 }}>%</span>
          </div>
          <div style={{ marginTop: 10, fontSize: 28, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>pour 100 vues</div>
        </div>
      </div>
      {chips.map((ch, i) => (
        <Pop3D key={ch.t} start={5 + i * 2} x={ch.x} y={ch.y} rotZ={ch.r}>
          <Pill size={27}>{ch.t}</Pill>
        </Pop3D>
      ))}
    </>
  );
};

/* 10 — Audience : orbite autour du téléphone, les pays sortent de l'écran. */
export const ShotAudience: Shot = ({ len }) => {
  const f = useCurrentFrame();
  const o = ease(f, 0, len + 4, Easing.inOut(Easing.sin));
  const p = pose(mix(34, -22, o), 8, mix(-1.5, 1.5, o), mix(30, -30, o), 0, 0.98);
  const flags: { t: string; x: number; y: number; z: number }[] = [
    { t: "🇫🇷 France · 63 %", x: 300, y: 790, z: 220 },
    { t: "🇧🇪 Belgique · 8 %", x: 740, y: 890, z: 160 },
    { t: "🇨🇦 Canada · 6 %", x: 280, y: 1250, z: 200 },
    { t: "🇨🇭 Suisse · 5 %", x: 740, y: 1350, z: 240 },
  ];
  return (
    <>
      <FloorShadow p={p} />
      <Stage3D>
        <PhoneAt p={p}>
          <Timed screen={AudienceScreen} time={tmap(f, len, 20, 66)} />
        </PhoneAt>
        {flags.map((fl, i) => (
          <Pop3D key={fl.t} start={5 + i * 3} x={fl.x} y={fl.y} z={fl.z} drift={(0.5 - o) * fl.z * 0.5}>
            <Pill size={27}>{fl.t}</Pill>
          </Pop3D>
        ))}
      </Stage3D>
    </>
  );
};

/* 11 — Revenus : le total compte en géant, les sources arrivent une à une. */
export const ShotRevenue: Shot = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = ease(f, 0, 15, Easing.bezier(0.16, 1, 0.3, 1));
  const goal = spring({ frame: f - 12, fps, config: { damping: 11, stiffness: 240, mass: 0.5 } });
  const sources: { icon: React.ReactNode; l: string; tag: string; v: string }[] = [
    { icon: <span style={{ fontSize: 28 }}>★</span>, l: "Partenariat · Sephora", tag: "Reçu", v: "+2 930,00 €" },
    { icon: <BrandLogo brand="twitch" size={28} color={INK} />, l: "Abonnements et bits", tag: "Estimé", v: "+772,69 €" },
    { icon: <BrandLogo brand="youtube" size={28} color={INK} />, l: "Pub YouTube", tag: "Importé", v: "+684,79 €" },
    { icon: <BrandLogo brand="tiktok" size={28} color={INK} />, l: "Programme créateurs", tag: "Estimé", v: "+531,50 €" },
  ];
  return (
    <div style={{ position: "absolute", top: 590, left: SAFE_L, right: SAFE_R, fontFamily: FONT, color: "#fff" }}>
      <div style={{ fontSize: 30, fontWeight: 700, color: "rgba(255,255,255,0.78)" }}>
        <Word enter={0}>Revenus du mois</Word>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", fontSize: 146, fontWeight: 800, letterSpacing: -6, lineHeight: 1.05 }}>
        <Num value={Math.round(491898 * c) / 100} decimals={2} />
        <span style={{ marginLeft: 16, fontSize: 110 }}>€</span>
      </div>
      <div style={{ position: "relative", marginTop: 14, height: 18, borderRadius: 9, background: "rgba(255,255,255,0.22)" }}>
        <div style={{ width: `${c * 100}%`, height: "100%", borderRadius: 9, background: "#fff" }} />
        <div style={{ position: "absolute", right: 0, top: -64, transform: `scale(${goal})`, transformOrigin: "100% 100%" }}>
          <Pill size={22}>
            <Check size={22} color={ACCENT} stroke={3.2} /> Objectif atteint
          </Pill>
        </div>
      </div>
      <div style={{ marginTop: 34, display: "flex", flexDirection: "column", gap: 14 }}>
        {sources.map((s, i) => {
          const k = spring({ frame: f - 4 - i * 2, fps, config: { damping: 15, stiffness: 200, mass: 0.6 } });
          return (
            <div key={s.l} style={{ display: "flex", alignItems: "center", gap: 18, padding: "16px 22px", borderRadius: 26, background: "#fff", color: INK, transform: `translateX(${(1 - k) * 900}px) rotate(${(1 - k) * 4}deg)`, boxShadow: "0 24px 40px -24px rgba(20,8,60,0.6)" }}>
              <div style={{ width: 58, height: 58, borderRadius: 18, background: "#F1EDFD", display: "flex", alignItems: "center", justifyContent: "center", color: ACCENT, flexShrink: 0 }}>{s.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 27, fontWeight: 800, letterSpacing: -0.5, whiteSpace: "nowrap" }}>{s.l}</div>
                <div style={{ fontSize: 19, fontWeight: 700, color: MUTED, marginTop: 2 }}>{s.tag}</div>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: ACCENT, whiteSpace: "nowrap" }}>{s.v}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* 12 — Accès : le téléphone pivote d'un tour et se pose sur l'administration. */
export const ShotAdmin: Shot = ({ len }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f, fps, config: { damping: 15, stiffness: 110, mass: 0.8 } });
  const p = mixPose(pose(200, 10, -6, 0, 40, 0.8), pose(-18, 8, 1.5, 0, 0, 0.98), s);
  return (
    <>
      <FloorShadow p={p} />
      <Stage3D>
        <PhoneAt p={p}>
          <Timed screen={AdminScreen} time={tmap(f, len, 14, 86)} />
        </PhoneAt>
        <Callout shape="chip" seed={<Shield size={30} color={ACCENT} />} start={10} x={690} y={800} z={170} rotY={-9} rotX={3}>
          <IconTile>
            <Shield size={34} color={ACCENT} />
          </IconTile>
          <div style={{ flex: 1, minWidth: 0, fontFamily: FONT }}>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, color: INK, whiteSpace: "nowrap" }}>Accès sur invitation</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: MUTED, marginTop: 4, whiteSpace: "nowrap" }}>Toi seul vois les réglages</div>
          </div>
        </Callout>
      </Stage3D>
    </>
  );
};

/** Fin : marque, promesse et adresse. */
const CtaLockup: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mark = spring({ frame: frame - 2, fps, config: { damping: 12, stiffness: 170, mass: 0.7 } });
  const url = spring({ frame: frame - 20, fps, config: { damping: 12, stiffness: 220, mass: 0.6 } });
  return (
    <div style={{ position: "absolute", top: TEXT_TOP, left: SAFE_L, right: SAFE_R, fontFamily: FONT, color: INK }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ transform: `scale(${mark}) rotate(${(1 - mark) * -14}deg)` }}>
          <LogoMark size={92} />
        </div>
        <div style={{ fontSize: 100, fontWeight: 800, letterSpacing: -4, lineHeight: 1 }}>
          {Array.from("Uplink").map((l, i) => (
            <Word key={i} enter={3 + i}>
              {l}
            </Word>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 22, fontSize: 72, fontWeight: 800, letterSpacing: -2.4, lineHeight: 1.04 }}>
        {["Publie *partout.*", "Pilote *tout.*"].map((line, l) => (
          <div key={l}>
            {words(line).map((w, i) => (
              <React.Fragment key={i}>
                <Word enter={8 + l * 4 + i * 2} color={w.accent ? ACCENT : undefined}>
                  {w.text}
                </Word>{" "}
              </React.Fragment>
            ))}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 22, transform: `scale(${url})`, transformOrigin: "0 50%" }}>
        <span style={{ display: "inline-flex", alignItems: "center", padding: "13px 22px", borderRadius: 32, background: INK, color: "#fff", fontSize: 32, fontWeight: 800 }}>www.dsociety.fr/uplink</span>
      </div>
    </div>
  );
};

/* Fin — le cadre recule, l'application passe en sombre, les cartes résument tout. */
export const ShotCta: Shot = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f, fps, config: { mass: 1.1, damping: 14, stiffness: 70 } });
  const p = mixPose(pose(-8, 6, 0, 0, -60, 1.34), pose(-26, 9, 2, -6, 6, 1), s);
  const sway = 1 - ease(f, 20, 50);
  p.rotY += Math.sin(f / 40) * 1.2 * sway;
  p.y += Math.sin(f / 31) * 6 * sway;
  return (
    <>
      <FloorShadow p={p} cy={CENTER_Y} />
      <Stage3D>
        <PhoneAt p={p}>
          <Timed screen={DarkReveal} time={f * 1.1} />
        </PhoneAt>
        <FloatingCard kind="pill" start={16} x={700} y={800} z={150} rotY={-9} rotX={3} drift={{ x: 0, y: 0, rot: 0 }} />
        <FloatingCard kind="chip" start={24} x={330} y={1070} z={220} rotY={-6} rotX={2} drift={{ x: 0, y: 0, rot: 0 }} />
        <FloatingCard kind="disc" start={32} x={700} y={1340} z={180} rotY={-10} rotX={4} drift={{ x: 0, y: 0, rot: 0 }} />
      </Stage3D>
      <CtaLockup />
    </>
  );
};
