/**
 * Version TikTok (15 s, 9:16) : accroche plein écran dès la première image, les 12 options d'Uplink en rafale
 * (0,8 s chacune, écrans accélérés), puis appel à l'action. Textes gardés hors des zones couvertes par
 * l'interface de TikTok (onglets en haut, boutons à droite, légende en bas).
 */
import React from "react";
import { AbsoluteFill, Easing, Freeze, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BrandLogo, type Brand } from "../brands";
import { ACCENT, INK, MUTED } from "../config";
import { FloatingCard } from "../FloatingCard";
import { useFonts } from "../fonts";
import { clamp01, mix } from "../motion";
import { PHONE_H, Phone, SCREEN_H, SCREEN_W } from "../Phone";
import { LIGHT, ThemeProvider, UserProvider } from "../theme";
import { LogoMark } from "../tour/Caption";
import { FONT } from "../tour/kit";
import { AccountsScreen, ComposerScreen, PhotosScreen, ScheduleScreen, SettingsScreen } from "../tour/screens1";
import { AdminScreen, AudienceScreen, DiscordScreen, InfluenceScreen, PublishScreen, RevenueScreen, StatsScreen } from "../tour/screens2";
import { DarkReveal, HomeBuilt, USER } from "../tour/Tour";

/* ------------------------------------------------------------------ Rythme */

interface Beat {
  kicker: string;
  /** Les mots entre astérisques passent en couleur d'accent. */
  title: string;
  sub: string;
  screen: React.FC;
  /** Plage du temps de l'écran parcourue pendant le temps fort (écran accéléré). */
  from: number;
  to: number;
}

const BEATS: Beat[] = [
  { kicker: "Comptes", title: "Tous tes *réseaux* connectés", sub: "TikTok · YouTube · Instagram · Twitch", screen: AccountsScreen, from: 6, to: 80 },
  { kicker: "Créer", title: "*1* vidéo → *3* plateformes", sub: "Titre, légende et hashtags déclinés", screen: ComposerScreen, from: 10, to: 112 },
  { kicker: "Réglages", title: "*Short*, *Reel* ou vidéo longue", sub: "Visibilité réglée par plateforme", screen: SettingsScreen, from: 50, to: 100 },
  { kicker: "Photos", title: "*Carrousels* et diaporamas", sub: "Jusqu'à 35 photos, dans ton ordre", screen: PhotosScreen, from: 8, to: 78 },
  { kicker: "Programmer", title: "Programmé pour *19:00*", sub: "Publié même appli fermée", screen: ScheduleScreen, from: 8, to: 58 },
  { kicker: "Publier", title: "Suivi *en* *direct*", sub: "Un échec ? Relance en 1 clic", screen: PublishScreen, from: 6, to: 124 },
  { kicker: "Discord", title: "Ta commu *prévenue*", sub: "Les liens partent sur ton Discord", screen: DiscordScreen, from: 10, to: 96 },
  { kicker: "Statistiques", title: "Toutes tes *stats*", sub: "Abonnés, vues, meilleures vidéos", screen: StatsScreen, from: 6, to: 60 },
  { kicker: "Influence", title: "Ton *taux* *d'influence*", sub: "Par vidéo et par plateforme", screen: InfluenceScreen, from: 6, to: 80 },
  { kicker: "Audience", title: "Qui te suit *vraiment*", sub: "Âge, genre et pays", screen: AudienceScreen, from: 6, to: 66 },
  { kicker: "Revenus", title: "Tous tes *revenus*", sub: "Partenariats, pubs et estimations", screen: RevenueScreen, from: 6, to: 70 },
  { kicker: "Accès", title: "Ton installation, tes *règles*", sub: "Accès sur invitation, un espace par créateur", screen: AdminScreen, from: 6, to: 86 },
];

const HOOK_END = 84; // fin de l'accroche (2,8 s)
const BEAT_LEN = 24; // 0,8 s par option
const CTA_START = HOOK_END + BEATS.length * BEAT_LEN; // 372
export const TIKTOK_DURATION = 450; // 15 s
const HOLD_FROM = TIKTOK_DURATION - 14; // fin immobile
const PUSH = 6;

/* Zones sûres TikTok (1080×1920) : rien d'important au-dessus de 230 px, à droite des 150 derniers px, sous 1450 px. */
const SAFE_L = 64;
const SAFE_R = 150;
const TEXT_TOP = 236;

const CENTER_X = 540;
const CENTER_Y = 1110;
const FLOOR_Y = CENTER_Y + PHONE_H / 2 + 106;
const MERGE = { x: 540, y: 1216 }; // point de fusion des logos (et centre du volet)

const ACCENT_ON_DARK = "#A78BFA";
const STRIKE = "#FF3B5C";

/* --------------------------------------------------------------- Outils */

const ease = (frame: number, a: number, b: number, easing = Easing.bezier(0.33, 0, 0.2, 1)) =>
  interpolate(frame, [a, b], [0, 1], { easing, extrapolateLeft: "clamp", extrapolateRight: "clamp" });

/** Mot qui monte depuis un masque, puis repart vers le haut (version rapide). */
const Word: React.FC<{ children: React.ReactNode; enter: number; exit?: number; color?: string }> = ({ children, enter, exit, color }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - enter, fps, config: { damping: 26, stiffness: 420, mass: 0.5 } });
  const e = exit === undefined ? 0 : ease(frame, exit, exit + 4, Easing.in(Easing.cubic));
  return (
    <span style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", padding: "0.06em 0.03em 0.16em", margin: "-0.06em 0 -0.16em", color }}>
      <span style={{ display: "inline-block", transform: `translateY(${(1 - p) * 112 - e * 118}%)` }}>{children}</span>
    </span>
  );
};

/** Découpe un titre ; « *mot* » (ponctuation finale admise) passe en accent. */
function words(title: string) {
  return title.split(" ").map((w) => {
    const m = /^\*(.+)\*([,.!?]?)$/.exec(w);
    return m ? { text: m[1], tail: m[2], accent: true } : { text: w, tail: "", accent: false };
  });
}

/* ------------------------------------------------------------ Accroche */

const SLAMS = [-3, 10, 14, 18, 58];
function shake(frame: number) {
  let x = 0;
  let y = 0;
  for (const s of SLAMS) {
    const d = frame - s;
    if (d < 0 || d > 16) continue;
    const a = 12 * Math.exp(-d / 3.2);
    x += a * Math.sin(d * 2.3 + s);
    y += a * Math.cos(d * 2.9 + s) * 0.7;
  }
  return { x, y };
}

/** Remplace un texte par un autre : l'ancien sort par le haut, le nouveau (plus court) monte à sa place. */
const Swap: React.FC<{ a: React.ReactNode; b: React.ReactNode; at: number }> = ({ a, b, at }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const out = ease(frame, at, at + 6, Easing.in(Easing.cubic));
  const inn = spring({ frame: frame - at - 4, fps, config: { damping: 20, stiffness: 300, mass: 0.6 } });
  return (
    <span style={{ position: "relative", display: "inline-block", overflow: "hidden", verticalAlign: "top", whiteSpace: "nowrap", padding: "0.06em 0.04em 0.18em", margin: "-0.06em 0 -0.18em" }}>
      <span style={{ display: "inline-block", transform: `translateY(${-out * 125}%)` }}>{a}</span>
      <span style={{ position: "absolute", left: "50%", top: "0.06em", transform: `translate(-50%, ${(1 - inn) * 125}%)` }}>{b}</span>
    </span>
  );
};

const BRAND_TILES: { brand: Brand; bg: string; ring?: string }[] = [
  { brand: "tiktok", bg: "#000", ring: "inset 0 0 0 2px rgba(255,255,255,0.22)" },
  { brand: "youtube", bg: "#FF0033" },
  { brand: "instagram", bg: "linear-gradient(45deg, #FEDA75 0%, #FA7E1E 28%, #D62976 55%, #962FBF 78%, #4F5BD5 100%)" },
];

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sh = shake(frame);
  // « 3 fois » claque dès la première image (déjà en mouvement à l'image 0).
  const slam = spring({ frame: frame + 3, fps, config: { damping: 15, stiffness: 240, mass: 0.7 } });
  const strike = ease(frame, 30, 37, Easing.out(Easing.cubic)) * (1 - ease(frame, 40, 45, Easing.in(Easing.cubic)));
  const roll = spring({ frame: frame - 42, fps, config: { damping: 14, stiffness: 260, mass: 0.6 } });
  const merge = ease(frame, 48, 60, Easing.in(Easing.cubic));
  const glow = 0.28 + 0.22 * Math.exp(-Math.max(0, frame - 58) / 8) * (frame >= 58 ? 1 : 0);
  const big: React.CSSProperties = { fontSize: 88, fontWeight: 800, letterSpacing: -3, lineHeight: 1.05, color: "#fff" };

  return (
    <AbsoluteFill style={{ background: "#0B0B12", overflow: "hidden" }}>
      <AbsoluteFill style={{ background: `radial-gradient(70% 42% at 50% 44%, rgba(124,58,237,${glow}) 0%, rgba(124,58,237,0) 70%)` }} />
      <AbsoluteFill style={{ transform: `translate(${sh.x}px, ${sh.y}px)`, fontFamily: FONT }}>
        <div style={{ position: "absolute", top: 470, left: 40, right: 40, textAlign: "center" }}>
          <div style={big}>
            <Swap a="Arrête de publier" b="Publie-la" at={40} />
          </div>
          <div style={{ position: "relative", display: "inline-block", marginTop: 6, transform: `scale(${mix(2.1, 1, slam)})` }}>
            <span style={{ display: "inline-flex", alignItems: "baseline", fontSize: 250, fontWeight: 800, letterSpacing: -10, lineHeight: 1.2, color: ACCENT_ON_DARK }}>
              <span style={{ display: "inline-block", width: "0.56em", height: "1.2em", overflow: "hidden", textAlign: "center" }}>
                <span style={{ display: "block", transform: `translateY(${-roll * 1.2}em)` }}>
                  <span style={{ display: "block", height: "1.2em" }}>3</span>
                  <span style={{ display: "block", height: "1.2em" }}>1</span>
                </span>
              </span>
              <span>&nbsp;fois</span>
            </span>
            <div style={{ position: "absolute", left: -18, right: -18, top: "52%", height: 20, marginTop: -10, borderRadius: 10, background: STRIKE, transform: `rotate(-5deg) scaleX(${strike})`, transformOrigin: frame < 40 ? "0 50%" : "100% 50%" }} />
          </div>
          <div style={{ ...big, marginTop: 4 }}>
            <Swap a={<Word enter={6}>la même vidéo.</Word>} b="partout." at={44} />
          </div>
        </div>

        {/* Les trois plateformes claquent, puis fusionnent en une seule application. */}
        {frame < 62 &&
          BRAND_TILES.map((b, i) => {
            const s = spring({ frame: frame - (10 + i * 4), fps, config: { damping: 10, stiffness: 230, mass: 0.6 } });
            const cx = MERGE.x + (i - 1) * 180;
            const x = mix(cx, MERGE.x, merge);
            const scale = s * mix(1, 0.3, merge);
            return (
              <div
                key={b.brand}
                style={{
                  position: "absolute",
                  left: x - 68,
                  top: MERGE.y - 68,
                  width: 136,
                  height: 136,
                  borderRadius: 38,
                  background: b.bg,
                  boxShadow: `${b.ring ? b.ring + ", " : ""}0 26px 50px -18px rgba(0,0,0,0.6)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: `scale(${scale}) rotate(${(1 - s) * -28 + merge * (i - 1) * 70}deg)`,
                }}
              >
                <BrandLogo brand={b.brand} size={68} color="#fff" />
              </div>
            );
          })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Logo Uplink né de la fusion ; il se referme pendant que le volet ouvre la suite. */
const MergeLogo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < 54 || frame >= HOOK_END) return null;
  const pop = spring({ frame: frame - 56, fps, config: { damping: 9, stiffness: 220, mass: 0.6 } });
  const close = ease(frame, 72, 82, Easing.in(Easing.back(1.7)));
  const wave = ease(frame, 58, 76, Easing.out(Easing.cubic));
  return (
    <>
      <div style={{ position: "absolute", left: MERGE.x - 90 - wave * 330, top: MERGE.y - 90 - wave * 330, width: 180 + wave * 660, height: 180 + wave * 660, borderRadius: "50%", border: `6px solid ${ACCENT_ON_DARK}`, opacity: (1 - wave) * (frame >= 58 ? 0.9 : 0) }} />
      <div style={{ position: "absolute", left: MERGE.x - 88, top: MERGE.y - 88, transform: `scale(${pop * (1 - close)}) rotate(${(1 - pop) * -20}deg)` }}>
        <LogoMark size={176} />
      </div>
    </>
  );
};

/* ------------------------------------------------------- Plan principal */

const OFFSTAGE = { rotY: -62, rotX: 28, rotZ: -10, x: 40, y: 1300, scale: 0.9 };
const CTA_POSE = { rotY: -26, rotX: 9, rotZ: 2, x: -6, y: 6, scale: 1 };

function phonePose(frame: number, fps: number) {
  const entry = spring({ frame: frame - 68, fps, config: { mass: 1.2, damping: 15, stiffness: 85 } });
  const pan = ease(frame, HOOK_END, CTA_START, Easing.inOut(Easing.sin));
  const tour = { rotY: mix(-20, 18, pan), rotX: 8, rotZ: mix(1.5, -1.5, pan), x: mix(-14, 14, pan), y: 0, scale: 1 };
  const cta = spring({ frame: frame - CTA_START, fps, config: { mass: 1.1, damping: 13, stiffness: 70 } });
  // Petit coup de « basse » à chaque changement d'option.
  const lb = frame - HOOK_END;
  const punch = lb >= 0 && frame < CTA_START ? Math.sin(clamp01((lb % BEAT_LEN) / 10) * Math.PI) : 0;
  const sway = (frame < HOOK_END ? 0 : 1) * (1 - ease(frame, CTA_START + 20, CTA_START + 60));
  const k = (key: keyof typeof OFFSTAGE) => mix(mix(OFFSTAGE[key], tour[key], entry), CTA_POSE[key], cta);
  return {
    rotY: k("rotY") + Math.sin(frame / 40) * 1.2 * sway,
    rotX: k("rotX"),
    rotZ: k("rotZ"),
    x: k("x"),
    y: k("y") - punch * 10 + Math.sin(frame / 31) * 6 * sway,
    scale: k("scale") * (1 + punch * 0.03),
  };
}

const FloorShadow: React.FC<{ rotY: number; y: number; x: number }> = ({ rotY, y, x }) => {
  const width = 250 + 320 * Math.abs(Math.cos((rotY * Math.PI) / 180));
  const away = clamp01(y / 500);
  return (
    <>
      <div style={{ position: "absolute", left: CENTER_X - width / 2 + x * 0.6, top: FLOOR_Y, width, height: 80, borderRadius: "50%", background: "rgba(38,48,68,0.30)", filter: "blur(32px)", opacity: 1 - away }} />
      <div style={{ position: "absolute", left: CENTER_X - (width * 0.6) / 2 + x * 0.6, top: FLOOR_Y + 14, width: width * 0.6, height: 28, borderRadius: "50%", background: "rgba(22,28,42,0.40)", filter: "blur(14px)", opacity: 1 - away }} />
    </>
  );
};

/** Temps de l'écran d'une option : rapide au début, il se pose sur l'état final avant la coupe. */
const beatTime = (b: Beat, lf: number) => b.from + (b.to - b.from) * (1 - Math.pow(1 - clamp01(lf / (BEAT_LEN - 3)), 2.2));

const Timed: React.FC<{ screen: React.FC; time: number }> = ({ screen: S, time }) => (
  <Freeze frame={time}>
    <S />
  </Freeze>
);

/** Écran du téléphone : accueil pendant l'arrivée, une option par temps fort, accueil sombre à la fin. */
const PhoneScreen: React.FC<{ frame: number }> = ({ frame }) => {
  let current: React.ReactNode;
  let previous: React.ReactNode = null;
  let lf = 0;
  if (frame < HOOK_END) {
    current = <HomeBuilt />;
  } else if (frame < CTA_START) {
    const i = Math.floor((frame - HOOK_END) / BEAT_LEN);
    lf = frame - HOOK_END - i * BEAT_LEN;
    current = <Timed screen={BEATS[i].screen} time={beatTime(BEATS[i], lf)} />;
    previous = i === 0 ? <HomeBuilt /> : <Timed screen={BEATS[i - 1].screen} time={BEATS[i - 1].to} />;
  } else {
    lf = frame - CTA_START;
    current = <Timed screen={DarkReveal} time={lf * 1.1} />;
    const last = BEATS[BEATS.length - 1];
    previous = <Timed screen={last.screen} time={last.to} />;
  }
  const e = previous ? interpolate(lf, [0, PUSH], [0, 1], { easing: Easing.bezier(0.3, 0, 0.15, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  return (
    <div style={{ position: "absolute", inset: 0, width: SCREEN_W, height: SCREEN_H, overflow: "hidden" }}>
      {previous && e < 1 && <div style={{ position: "absolute", inset: 0, transform: `translateX(${-e * SCREEN_W * 0.3}px)`, filter: `brightness(${1 - e * 0.12})` }}>{previous}</div>}
      <div style={{ position: "absolute", inset: 0, transform: `translateX(${(1 - e) * SCREEN_W}px)`, boxShadow: e < 1 ? "-20px 0 40px rgba(0,0,0,0.18)" : "none" }}>{current}</div>
    </div>
  );
};

const BeatCaption: React.FC<{ n: number; beat: Beat }> = ({ n, beat }) => {
  const exit = BEAT_LEN - 4;
  return (
    <div style={{ position: "absolute", top: TEXT_TOP, left: SAFE_L, right: SAFE_R, fontFamily: FONT, color: INK }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 25, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: ACCENT }}>
        <Word enter={0} exit={exit}>
          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: 38, borderRadius: 12, background: ACCENT, color: "#fff", fontSize: 20, letterSpacing: 0.5, padding: "0 11px" }}>
            {String(n).padStart(2, "0")}/{BEATS.length}
          </span>
        </Word>
        <Word enter={1} exit={exit}>
          {beat.kicker}
        </Word>
      </div>
      <div style={{ marginTop: 16, fontSize: 88, fontWeight: 800, letterSpacing: -3, lineHeight: 1.02 }}>
        {words(beat.title).map((w, i) => (
          <React.Fragment key={i}>
            <Word enter={1 + i} exit={exit} color={w.accent ? ACCENT : undefined}>
              {w.text}
              {w.tail && <span style={{ color: INK }}>{w.tail}</span>}
            </Word>{" "}
          </React.Fragment>
        ))}
      </div>
      <div style={{ marginTop: 16, fontSize: 34, fontWeight: 600, lineHeight: 1.3, color: MUTED, whiteSpace: "nowrap" }}>
        {beat.sub.split(" ").map((w, i) => (
          <React.Fragment key={i}>
            <Word enter={5 + i * 0.5} exit={exit}>
              {w}
            </Word>{" "}
          </React.Fragment>
        ))}
      </div>
    </div>
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

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = phonePose(frame, fps);
  return (
    <AbsoluteFill style={{ background: "#D3DBE4", overflow: "hidden" }}>
      <AbsoluteFill style={{ background: `radial-gradient(80% 50% at ${50 + Math.sin(frame / 60) * 2}% 42%, #F1F4F8 0%, #E1E7EE 42%, #CCD5DF 78%, #BEC8D4 100%)` }} />
      <FloorShadow rotY={p.rotY} y={p.y} x={p.x} />
      <AbsoluteFill style={{ perspective: 2600, perspectiveOrigin: "50% 58%" }}>
        <Phone {...p} centerX={CENTER_X} centerY={CENTER_Y}>
          <PhoneScreen frame={frame} />
        </Phone>
        <Sequence from={CTA_START} layout="none">
          <FloatingCard kind="pill" start={16} x={700} y={800} z={150} rotY={-9} rotX={3} drift={{ x: 0, y: 0, rot: 0 }} />
          <FloatingCard kind="chip" start={24} x={330} y={1070} z={220} rotY={-6} rotX={2} drift={{ x: 0, y: 0, rot: 0 }} />
          <FloatingCard kind="disc" start={32} x={700} y={1340} z={180} rotY={-10} rotX={4} drift={{ x: 0, y: 0, rot: 0 }} />
        </Sequence>
      </AbsoluteFill>
      {BEATS.map((b, i) => (
        <Sequence key={b.kicker} from={HOOK_END + i * BEAT_LEN} durationInFrames={BEAT_LEN} layout="none">
          <BeatCaption n={i + 1} beat={b} />
        </Sequence>
      ))}
      <Sequence from={CTA_START} layout="none">
        <CtaLockup />
      </Sequence>
    </AbsoluteFill>
  );
};

const TikTokShot: React.FC = () => {
  const frame = useCurrentFrame();
  // Volet circulaire qui part du logo et ouvre sur le téléphone.
  const r = interpolate(frame, [70, HOOK_END], [0, 2300], { easing: Easing.bezier(0.6, 0, 0.4, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      {frame < HOOK_END && <Hook />}
      {frame >= 70 && (
        <AbsoluteFill style={{ clipPath: frame < HOOK_END ? `circle(${r}px at ${MERGE.x}px ${MERGE.y}px)` : undefined }}>
          <Stage />
        </AbsoluteFill>
      )}
      <MergeLogo />
    </AbsoluteFill>
  );
};

export const TikTok: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  return (
    <UserProvider user={USER}>
      <ThemeProvider theme={LIGHT}>
        {frame >= HOLD_FROM ? (
          <Freeze frame={HOLD_FROM}>
            <TikTokShot />
          </Freeze>
        ) : (
          <TikTokShot />
        )}
      </ThemeProvider>
    </UserProvider>
  );
};
