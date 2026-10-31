/**
 * Les plans de la version TikTok : un message par plan, une image forte qui l'illustre.
 * Chaque plan reçoit son temps local (0 = début du plan) et sa durée `len`.
 */
import React from "react";
import { Easing, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BrandLogo, type Brand } from "../brands";
import { ACCENT, INK, MUTED } from "../config";
import { mix } from "../motion";
import { Num } from "../Num";
import { LogoMark } from "../tour/Caption";
import { FONT } from "../tour/kit";
import { ComposerScreen, ScheduleScreen, SettingsScreen } from "../tour/screens1";
import { DiscordScreen } from "../tour/screens2";
import { DarkReveal } from "../tour/Tour";
import { FloorShadow, PhoneAt, Pop3D, PushSwap, SAFE_L, SAFE_R, Stage3D, TEXT_TOP, Timed, Word, ease, mixPose, pose, tmap, words } from "./parts";

type Shot = React.FC<{ len: number }>;

const BRAND_BG: Partial<Record<Brand, string>> = {
  tiktok: "#000",
  youtube: "#FF0033",
  instagram: "linear-gradient(45deg, #FEDA75 0%, #FA7E1E 28%, #D62976 55%, #962FBF 78%, #4F5BD5 100%)",
};

/** Vignette pleine aux couleurs de la plateforme. */
const BrandTileColor: React.FC<{ brand: Brand; size?: number }> = ({ brand, size = 124 }) => (
  <div style={{ width: size, height: size, borderRadius: size * 0.28, background: BRAND_BG[brand], display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `${brand === "tiktok" ? "inset 0 0 0 2px rgba(255,255,255,0.2), " : ""}0 26px 46px -20px rgba(10,6,30,0.6)` }}>
    <BrandLogo brand={brand} size={size * 0.52} color="#fff" />
  </div>
);

/* 1 — « 1 clic. 3 plateformes. » : le téléphone sort du volet en tournoyant, puis se dédouble en trois. */
export const PRE_OPEN = 14;
export const ShotOneToThree: Shot = ({ len }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - PRE_OPEN;
  const s = spring({ frame, fps, config: { mass: 1.1, damping: 14, stiffness: 75 } });
  const sp = spring({ frame: f - 22, fps, config: { damping: 14, stiffness: 120, mass: 0.8 } });
  const drift = ease(f, 22, len, Easing.inOut(Easing.sin)) * -5;
  const center = mixPose(pose(-200, 28, -12, 0, 700, 0.6), pose(-6, 7, 0, 0, 40, 0.92), s);
  center.rotY = mix(center.rotY, 0, sp) + drift;
  center.scale = mix(center.scale, 0.84, sp);
  const side = (dir: 1 | -1) => pose(dir * -28 * sp + drift, 6, dir * 2 * sp, dir * 330 * sp, 40 + 30 * sp, mix(0.86, 0.74, sp));
  const settings = (t: number) => <Timed screen={SettingsScreen} time={t} />;
  const split = f >= 20;
  return (
    <>
      {split && <FloorShadow p={side(-1)} />}
      {split && <FloorShadow p={side(1)} />}
      <FloorShadow p={center} />
      <Stage3D>
        {split && <PhoneAt p={side(-1)}>{settings(44)}</PhoneAt>}
        {split && <PhoneAt p={side(1)}>{settings(150)}</PhoneAt>}
        <PhoneAt p={center}>
          <PushSwap a={<Timed screen={ComposerScreen} time={tmap(frame, 40, 10, 112)} />} b={settings(100)} at={PRE_OPEN + 24} />
        </PhoneAt>
        {(["tiktok", "youtube", "instagram"] as Brand[]).map((b, i) => (
          <Pop3D key={b} start={PRE_OPEN + 30 + i * 3} x={540 + (i - 1) * 330} y={1390} z={200}>
            <BrandTileColor brand={b} />
          </Pop3D>
        ))}
      </Stage3D>
    </>
  );
};

/** Texte géant qui monte caractère par caractère depuis un masque. */
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

/* 2 — « Programme. » : 19:00 géant, le téléphone incliné en dessous. */
export const ShotSchedule: Shot = ({ len }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - 2, fps, config: { damping: 15, stiffness: 100, mass: 0.8 } });
  const p = mixPose(pose(42, 10, -9, 300, 270, 0.72), pose(20, 8, -6, 30, 170, 0.78), s);
  p.rotY += ease(f, 8, len, Easing.inOut(Easing.sin)) * -8;
  return (
    <>
      <GiantText text="19:00" start={8} size={300} color={ACCENT} y={650} />
      <FloorShadow p={p} />
      <Stage3D>
        <PhoneAt p={p}>
          <Timed screen={ScheduleScreen} time={tmap(f, 40, 14, 58)} />
        </PhoneAt>
      </Stage3D>
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
    <div style={{ width: 680, padding: "26px 28px", borderRadius: 28, background: "#313338", fontFamily: FONT, display: "flex", gap: 18, boxShadow: "0 50px 90px -30px rgba(10,10,40,0.75), inset 0 0 0 1px rgba(255,255,255,0.06)" }}>
      <LogoMark size={66} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 26, fontWeight: 800, color: "#fff" }}>
          Uplink
          <span style={{ fontSize: 15, fontWeight: 800, background: "#5865F2", color: "#fff", borderRadius: 6, padding: "2px 7px" }}>APP</span>
          <span style={{ fontSize: 18, fontWeight: 600, color: "#949BA4" }}>Aujourd'hui à 19:00</span>
        </div>
        <div style={{ marginTop: 8, fontSize: 23, fontWeight: 600, color: "#DBDEE1", lineHeight: 1.45, whiteSpace: "nowrap" }}>
          {lines.map((l, i) => (
            <div key={i}>
              <Word enter={start + 4 + i * 3}>{l}</Word>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* 3 — « Ta commu prévenue. » : contre-plongée, le message sort de l'écran et vient vers nous. */
export const ShotDiscord: Shot = ({ len }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f, fps, config: { damping: 15, stiffness: 90, mass: 0.9 } });
  const p = mixPose(pose(-40, -4, 3, 430, 60, 0.88), pose(-24, -5, 2, 180, 60, 0.9), s);
  p.rotY += ease(f, 10, len, Easing.inOut(Easing.sin)) * 6;
  const e = spring({ frame: f - 10, fps, config: { damping: 13, stiffness: 120, mass: 0.8 } });
  return (
    <>
      <FloorShadow p={p} />
      <Stage3D>
        <PhoneAt p={p}>
          <Timed screen={DiscordScreen} time={tmap(f, 40, 30, 96)} />
        </PhoneAt>
        {f >= 10 && (
          <div style={{ position: "absolute", left: mix(720, 440, e), top: mix(1180, 1070, e), transform: `translate(-50%, -50%) translate3d(0, ${Math.sin(f / 10) * 5}px, ${mix(0, 230, e)}px) rotateY(${mix(-24, -8, e)}deg) scale(${mix(0.35, 1, e)})` }}>
            <DiscordEmbed start={10} />
          </div>
        )}
      </Stage3D>
    </>
  );
};

/** Grande carte chiffrée : icône, nombre qui compte, libellé court. */
const StatCard: React.FC<{ start: number; icon: string; value: number; decimals?: number; prefix?: string; suffix: string; label: string }> = ({ start, icon, value, decimals = 0, prefix = "", suffix, label }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (f < start) return <div style={{ height: 196 }} />;
  const k = spring({ frame: f - start, fps, config: { damping: 12, stiffness: 200, mass: 0.6 } });
  const c = ease(f, start + 2, start + 18, Easing.bezier(0.16, 1, 0.3, 1));
  const n = Math.round(value * c * 10 ** decimals) / 10 ** decimals;
  return (
    <div style={{ height: 196, display: "flex", alignItems: "center", gap: 28, padding: "0 34px", borderRadius: 38, background: "#fff", fontFamily: FONT, color: INK, transform: `translateX(${(1 - k) * -140}px) scale(${mix(0.6, 1, k)}) rotate(${(1 - k) * -6}deg)`, transformOrigin: "0 50%", boxShadow: "0 40px 70px -34px rgba(124,58,237,0.75)" }}>
      <div style={{ width: 124, height: 124, borderRadius: 36, background: "#F1EDFD", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 64, flexShrink: 0 }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", fontSize: 86, fontWeight: 800, letterSpacing: -3, lineHeight: 1, color: ACCENT }}>
          {prefix}
          <Num value={n} decimals={decimals} />
          <span style={{ marginLeft: 12 }}>{suffix}</span>
        </div>
        <div style={{ marginTop: 8, fontSize: 34, fontWeight: 700, color: MUTED, whiteSpace: "nowrap" }}>{label}</div>
      </div>
    </div>
  );
};

/* 4 — « Tes stats. Tes revenus. » : trois chiffres, rien d'autre. */
export const ShotNumbers: Shot = () => (
  <div style={{ position: "absolute", top: 610, left: SAFE_L, right: SAFE_R, display: "flex", flexDirection: "column", gap: 26 }}>
    <StatCard start={10} icon="👥" prefix="+" value={5990} suffix="" label="abonnés en 28 jours" />
    <StatCard start={18} icon="🔥" value={12.8} decimals={1} suffix="%" label="taux d'influence" />
    <StatCard start={26} icon="💶" value={4918.98} decimals={2} suffix="€" label="de revenus ce mois" />
  </div>
);

/** Fin : marque, promesse et adresse. */
const CtaLockup: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mark = spring({ frame: frame - 2, fps, config: { damping: 12, stiffness: 170, mass: 0.7 } });
  const url = spring({ frame: frame - 22, fps, config: { damping: 12, stiffness: 220, mass: 0.6 } });
  return (
    <div style={{ position: "absolute", top: TEXT_TOP, left: SAFE_L, right: SAFE_R, fontFamily: FONT, color: INK }}>
      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        <div style={{ transform: `scale(${mark}) rotate(${(1 - mark) * -14}deg)` }}>
          <LogoMark size={100} />
        </div>
        <div style={{ fontSize: 112, fontWeight: 800, letterSpacing: -4.5, lineHeight: 1 }}>
          {Array.from("Uplink").map((l, i) => (
            <Word key={i} enter={3 + i}>
              {l}
            </Word>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 24, fontSize: 80, fontWeight: 800, letterSpacing: -2.8, lineHeight: 1.04 }}>
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
      <div style={{ marginTop: 26, transform: `scale(${url})`, transformOrigin: "0 50%" }}>
        <span style={{ display: "inline-flex", alignItems: "center", padding: "14px 24px", borderRadius: 34, background: INK, color: "#fff", fontSize: 36, fontWeight: 800 }}>www.dsociety.fr/uplink</span>
      </div>
    </div>
  );
};

/* Fin — le cadre recule, l'application passe en sombre. */
export const ShotCta: Shot = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f, fps, config: { mass: 1.1, damping: 14, stiffness: 70 } });
  const p = mixPose(pose(-8, 6, 0, 0, 40, 1.3), pose(-24, 9, 2, 0, 150, 0.84), s);
  const sway = 1 - ease(f, 20, 50);
  p.rotY += Math.sin(f / 40) * 1.2 * sway;
  p.y += Math.sin(f / 31) * 6 * sway;
  return (
    <>
      <FloorShadow p={p} />
      <Stage3D>
        <PhoneAt p={p}>
          <Timed screen={DarkReveal} time={f * 1.1} />
        </PhoneAt>
      </Stage3D>
      <CtaLockup />
    </>
  );
};
