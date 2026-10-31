/**
 * Visite guidée d'Uplink (≈ 64 s, 9:16) : 14 chapitres, un téléphone en 3D qui pivote d'un chapitre à l'autre,
 * l'interface réelle de l'application à l'écran, un titre par chapitre et une carte flottante par option.
 */
import React from "react";
import { AbsoluteFill, Easing, Freeze, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BrandLogo } from "../brands";
import { Callout, IconTile, type CalloutShape } from "../Callout";
import { ACCENT, INK, MUTED } from "../config";
import { FloatingCard, Ring } from "../FloatingCard";
import { useFonts } from "../fonts";
import { HomeScreen } from "../HomeScreen";
import { Chat, Check, Clock, Images, Moon, Shield } from "../icons";
import { mix } from "../motion";
import { Num } from "../Num";
import { PHONE_H, Phone, SCREEN_H, SCREEN_W } from "../Phone";
import { DARK, LIGHT, ThemeProvider, UserProvider, type AppUser } from "../theme";
import { Caption, ChapterBar, IntroLockup, OutroLockup } from "./Caption";
import { FONT, prog } from "./kit";
import { AccountsScreen, ComposerScreen, PhotosScreen, ScheduleScreen, SettingsScreen } from "./screens1";
import { AdminScreen, AudienceScreen, DiscordScreen, InfluenceScreen, PublishScreen, RevenueScreen, StatsScreen } from "./screens2";

export const USER: AppUser = { name: "Dekhan", initials: "DK", handle: "dekhan" };

const CENTER_X = 540;
const CENTER_Y = 1140;
const BASE_SCALE = 1.06;
/** Haut de l'ombre au sol, juste sous le téléphone. */
const FLOOR_Y = CENTER_Y + (PHONE_H * BASE_SCALE) / 2 + 106;

interface Pose {
  rotY: number;
  rotX: number;
  rotZ: number;
  x: number;
  y: number;
  scale: number;
}
const pose = (rotY: number, rotX = 8, rotZ = 0, x = 0, y = 0, scale = 1): Pose => ({ rotY, rotX, rotZ, x, y, scale });
const OFFSTAGE = pose(-72, 26, -13, 60, 1250, 0.92);

/** Emplacements des cartes flottantes : à droite au milieu, ou à gauche en bas. */
const RIGHT = { x: 770, y: 820, z: 170, rotY: -9, rotX: 3 };
const LEFT = { x: 300, y: 1560, z: 210, rotY: -6, rotX: 3 };

/** Contenu standard d'une carte flottante. */
const Body: React.FC<{ icon: React.ReactNode; title: string; sub: string; aside?: React.ReactNode }> = ({ icon, title, sub, aside }) => (
  <>
    {icon}
    <div style={{ flex: 1, minWidth: 0, fontFamily: FONT }}>
      <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: -0.5, color: INK, whiteSpace: "nowrap" }}>{title}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: MUTED, marginTop: 4, whiteSpace: "nowrap" }}>{sub}</div>
    </div>
    {aside}
  </>
);
const seedText = (s: string) => <span style={{ color: "#fff", fontSize: 19, fontWeight: 800, fontFamily: FONT, whiteSpace: "nowrap" }}>{s}</span>;
const tile = (node: React.ReactNode) => <IconTile>{node}</IconTile>;

interface CalloutDef {
  shape: CalloutShape;
  seed: React.ReactNode;
  at: number;
  place: typeof RIGHT;
  body: React.ReactNode;
}
interface Scene {
  id: string;
  duration: number;
  pose: Pose;
  screen?: React.FC;
  caption?: { kicker: string; title: string; sub: string };
  callout?: CalloutDef;
  /** Pas de glissement d'écran à l'entrée (le même écran reste affiché). */
  noPush?: boolean;
}

const InfluenceRing: React.FC = () => {
  const frame = useCurrentFrame();
  const p = prog(frame, 68, 86, Easing.out(Easing.cubic));
  return (
    <>
      <Ring progress={p * 0.64} />
      <div style={{ flex: 1, fontFamily: FONT }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: MUTED, whiteSpace: "nowrap" }}>Taux d'influence</div>
        <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: -1, color: INK, lineHeight: 1.1, marginTop: 2, display: "flex", alignItems: "baseline" }}>
          <Num value={Math.round(p * 128) / 10} decimals={1} />
          <span style={{ fontSize: 24, marginLeft: 4 }}>%</span>
        </div>
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: ACCENT, background: `${ACCENT}14`, borderRadius: 12, padding: "7px 10px", whiteSpace: "nowrap", fontFamily: FONT }}>+1,4 pt</div>
    </>
  );
};

/** Écran d'accueil figé (construit) — avec bascule vers le thème sombre pour le chapitre « Confort ». */
export const HomeBuilt: React.FC = () => (
  <Freeze frame={130}>
    <HomeScreen />
  </Freeze>
);
export const DarkReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const r = interpolate(frame, [12, 44], [0, 1250], { easing: Easing.inOut(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <>
      <HomeBuilt />
      <div style={{ position: "absolute", inset: 0, clipPath: `circle(${r}px at ${SCREEN_W - 60}px 92px)` }}>
        <ThemeProvider theme={DARK}>
          <HomeBuilt />
        </ThemeProvider>
      </div>
    </>
  );
};
const DarkHome: React.FC = () => (
  <ThemeProvider theme={DARK}>
    <HomeBuilt />
  </ThemeProvider>
);

export const SCENES: Scene[] = [
  { id: "intro", duration: 90, pose: OFFSTAGE },
  {
    id: "accueil",
    duration: 120,
    pose: pose(-26, 8, 2, 0),
    screen: HomeScreen,
    caption: { kicker: "Accueil", title: "Bonsoir, Dekhan", sub: "Votre tableau de bord : audience, revenus et prochaines publications." },
    callout: {
      shape: "pill",
      seed: seedText("Twitch ✓"),
      at: 52,
      place: RIGHT,
      body: <Body icon={tile(<BrandLogo brand="twitch" size={34} color={ACCENT} />)} title="Connecté avec Twitch" sub="Votre espace privé, Dekhan" />,
    },
  },
  {
    id: "comptes",
    duration: 120,
    pose: pose(22, 7, -2, 10),
    screen: AccountsScreen,
    caption: { kicker: "Comptes", title: "Tous vos réseaux, connectés", sub: "TikTok, YouTube, Instagram et votre chaîne Twitch, en un clic." },
    callout: {
      shape: "chip",
      seed: <BrandLogo brand="tiktok" size={30} color={INK} />,
      at: 58,
      place: LEFT,
      body: <Body icon={tile(<Check size={34} color={ACCENT} />)} title="3 comptes connectés" sub="TikTok · YouTube · Instagram" />,
    },
  },
  {
    id: "creer",
    duration: 135,
    pose: pose(-18, 10, 1.5, -24),
    screen: ComposerScreen,
    caption: { kicker: "Créer", title: "Une vidéo, trois plateformes", sub: "Importez une seule fois : titre, légende et hashtags se déclinent partout." },
    callout: {
      shape: "disc",
      seed: seedText("1 → 3"),
      at: 70,
      place: RIGHT,
      body: <Body icon={tile(<Images size={34} color={ACCENT} />)} title="1 vidéo → 3 plateformes" sub="Formats vérifiés automatiquement" />,
    },
  },
  {
    id: "reglages",
    duration: 165,
    pose: pose(20, 7, -1.5, 18),
    screen: SettingsScreen,
    caption: { kicker: "Réglages", title: "Chaque plateforme, à sa façon", sub: "Visibilité TikTok, Short ou vidéo longue sur YouTube, Reel ou publication sur Instagram." },
    callout: {
      shape: "pill",
      seed: seedText("Short"),
      at: 70,
      place: LEFT,
      body: <Body icon={tile(<BrandLogo brand="youtube" size={34} color={ACCENT} />)} title="Short ou vidéo longue" sub="Détection automatique du format" />,
    },
  },
  {
    id: "photos",
    duration: 105,
    pose: pose(-24, 9, 2, -10),
    screen: PhotosScreen,
    caption: { kicker: "Photos", title: "Carrousels et diaporamas", sub: "Jusqu'à 10 photos sur Instagram et 35 sur TikTok, recadrées pour vous." },
    callout: {
      shape: "chip",
      seed: <Images size={30} color={ACCENT} />,
      at: 48,
      place: RIGHT,
      body: <Body icon={tile(<Images size={34} color={ACCENT} />)} title="Carrousel · 4 photos" sub="Glissez pour changer l'ordre" />,
    },
  },
  {
    id: "programmer",
    duration: 105,
    pose: pose(18, 6, -2, 8),
    screen: ScheduleScreen,
    caption: { kicker: "Programmer", title: "Publiez au bon moment", sub: "Choisissez l'heure : Uplink publie pour vous, même application fermée." },
    callout: {
      shape: "pill",
      seed: seedText("19:00"),
      at: 50,
      place: LEFT,
      body: <Body icon={tile(<Clock size={34} color={ACCENT} />)} title="Programmé ce soir, 19:00" sub="Publié à l'heure, automatiquement" />,
    },
  },
  {
    id: "publier",
    duration: 135,
    pose: pose(-20, 8, 1, -6),
    screen: PublishScreen,
    caption: { kicker: "Publier", title: "Suivi en direct", sub: "Chaque plateforme en temps réel. Un échec ? Relancez-la en un clic." },
    callout: {
      shape: "disc",
      seed: <Check size={34} color="#fff" />,
      at: 40,
      place: RIGHT,
      body: <Body icon={tile(<Check size={34} color={ACCENT} />)} title="Envoi en temps réel" sub="Étapes et journal par plateforme" />,
    },
  },
  {
    id: "discord",
    duration: 120,
    pose: pose(24, 7, -1.5, 14),
    screen: DiscordScreen,
    caption: { kicker: "Discord", title: "Votre communauté prévenue", sub: "Les liens partent dans vos salons Discord dès la mise en ligne." },
    callout: {
      shape: "chip",
      seed: <BrandLogo brand="discord" size={30} color={INK} />,
      at: 74,
      place: LEFT,
      body: <Body icon={tile(<Chat size={34} color={ACCENT} />)} title="Annonce envoyée" sub="#annonces · 3 liens" />,
    },
  },
  {
    id: "statistiques",
    duration: 120,
    pose: pose(-22, 9, 1.5, -8),
    screen: StatsScreen,
    caption: { kicker: "Statistiques", title: "Toute votre audience", sub: "Abonnés, vues, interactions et meilleures vidéos, synchronisés." },
    callout: {
      shape: "disc",
      seed: seedText("↑"),
      at: 56,
      place: RIGHT,
      body: <Body icon={tile(<span style={{ color: ACCENT, fontSize: 30, fontWeight: 800 }}>↑</span>)} title="+5 990 abonnés" sub="Sur 28 jours · toutes plateformes" />,
    },
  },
  {
    id: "influence",
    duration: 120,
    pose: pose(18, 7, -1.5, 10),
    screen: InfluenceScreen,
    caption: { kicker: "Influence", title: "Votre taux d'influence", sub: "Pour 100 vues, combien d'actions engagées : par vidéo et par plateforme." },
    callout: { shape: "disc", seed: seedText("%"), at: 56, place: LEFT, body: <InfluenceRing /> },
  },
  {
    id: "audience",
    duration: 105,
    pose: pose(-20, 8, 1.5, -6),
    screen: AudienceScreen,
    caption: { kicker: "Audience", title: "Qui vous suit", sub: "Genre, âge et pays, toutes plateformes ou plateforme par plateforme." },
    callout: {
      shape: "pill",
      seed: seedText("🇫🇷 63 %"),
      at: 50,
      place: RIGHT,
      body: <Body icon={tile(<span style={{ fontSize: 36 }}>🇫🇷</span>)} title="France · 63 %" sub="Âge moyen 28 ans · 57 % de femmes" />,
    },
  },
  {
    id: "revenus",
    duration: 135,
    pose: pose(22, 7, -2, 12),
    screen: RevenueScreen,
    caption: { kicker: "Revenus", title: "Tous vos revenus réunis", sub: "Partenariats, publicité YouTube, estimations TikTok, Instagram et Twitch." },
    callout: {
      shape: "pill",
      seed: seedText("+ €"),
      at: 62,
      place: LEFT,
      body: <Body icon={tile(<Check size={34} color={ACCENT} />)} title="Objectif atteint" sub="4 918,98 € ce mois-ci" />,
    },
  },
  {
    id: "acces",
    duration: 120,
    pose: pose(-18, 8, 1, -6),
    screen: AdminScreen,
    caption: { kicker: "Accès", title: "Votre installation, vos règles", sub: "Vous gérez les API et les invitations. Chaque créateur a son espace." },
    callout: {
      shape: "chip",
      seed: <Shield size={30} color={ACCENT} />,
      at: 50,
      place: RIGHT,
      body: <Body icon={tile(<Shield size={34} color={ACCENT} />)} title="Accès sur invitation" sub="Vous seul voyez les réglages" />,
    },
  },
  {
    id: "confort",
    duration: 75,
    pose: pose(14, 6, -1, 6),
    screen: DarkReveal,
    caption: { kicker: "Confort", title: "Clair ou sombre", sub: "Toute l'interface, de jour comme de nuit." },
    callout: {
      shape: "disc",
      seed: <Moon size={34} color="#fff" />,
      at: 30,
      place: LEFT,
      body: <Body icon={tile(<Moon size={34} color={ACCENT} />)} title="Thème sombre" sub="En un clic, partout" />,
    },
  },
  { id: "fin", duration: 150, pose: pose(-28, 9, 2, -4, 0, 1.03), screen: DarkHome, noPush: true },
];

const STARTS = SCENES.reduce<number[]>((acc, s, i) => [...acc, i === 0 ? 0 : acc[i - 1] + SCENES[i - 1].duration], []);
export const TOUR_DURATION = SCENES.reduce((n, s) => n + s.duration, 0);
const HOLD_FROM = TOUR_DURATION - 31; // dernière seconde : plan fixe
const CHAPTERS = SCENES.filter((s) => s.caption);
const PUSH = 15;

function sceneAt(frame: number) {
  let i = 0;
  while (i < SCENES.length - 1 && frame >= STARTS[i + 1]) i++;
  return i;
}

function phonePose(frame: number, fps: number) {
  const i = sceneAt(frame);
  const lf = frame - STARTS[i];
  const from = i === 0 ? OFFSTAGE : SCENES[i - 1].pose;
  const to = SCENES[i].pose;
  // Arrivée du téléphone : ressort lourd ; entre deux chapitres : pivot plus vif, léger dépassement.
  const config = i === 1 ? { mass: 1.5, damping: 13, stiffness: 55 } : { mass: 1.1, damping: 14, stiffness: 75 };
  const s = i === 0 ? 0 : spring({ frame: lf, fps, config });
  // Respiration lente pendant la visite, qui s'éteint à la fin.
  const outro = SCENES.length - 1;
  const calm = i === outro ? 1 - prog(lf, 30, 110) : 1;
  const sway = i === 0 ? 0 : calm;
  return {
    rotY: mix(from.rotY, to.rotY, s) + Math.sin(frame / 52) * 1.4 * sway,
    rotX: mix(from.rotX, to.rotX, s) + Math.sin(frame / 41) * 0.6 * sway,
    rotZ: mix(from.rotZ, to.rotZ, s),
    x: mix(from.x, to.x, s),
    y: mix(from.y, to.y, s) + Math.sin(frame / 38) * 7 * sway,
    scale: mix(from.scale, to.scale, s) * BASE_SCALE,
  };
}

const FloorShadow: React.FC<{ rotY: number; y: number; x: number }> = ({ rotY, y, x }) => {
  const width = 250 + 320 * Math.abs(Math.cos((rotY * Math.PI) / 180));
  const away = Math.min(1, Math.max(0, y / 500)); // téléphone encore hors champ
  const lift = Math.min(1, Math.abs(Math.min(0, y)) / 60);
  return (
    <>
      <div style={{ position: "absolute", left: CENTER_X - width / 2 + x * 0.6, top: FLOOR_Y, width, height: 80, borderRadius: "50%", background: "rgba(38,48,68,0.30)", filter: `blur(${mix(30, 44, lift)}px)`, opacity: 1 - away }} />
      <div style={{ position: "absolute", left: CENTER_X - (width * 0.6) / 2 + x * 0.6, top: FLOOR_Y + 14, width: width * 0.6, height: 28, borderRadius: "50%", background: "rgba(22,28,42,0.40)", filter: "blur(14px)", opacity: (1 - away) * (1 - lift * 0.5) }} />
    </>
  );
};

/** Écran d'un chapitre, avec son temps local (le chapitre précédent glisse vers la gauche). */
const ScreenSlot: React.FC<{ index: number; frame: number }> = ({ index, frame }) => {
  const scene = SCENES[index];
  const Screen = scene.screen!;
  const lf = frame - STARTS[index];
  const prev = index > 1 ? SCENES[index - 1] : null;
  const e = prev && !scene.noPush ? interpolate(lf, [0, PUSH], [0, 1], { easing: Easing.bezier(0.3, 0, 0.15, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  const Prev = prev?.screen;
  return (
    <div style={{ position: "absolute", inset: 0, width: SCREEN_W, height: SCREEN_H, overflow: "hidden" }}>
      {Prev && e < 1 && (
        <div style={{ position: "absolute", inset: 0, transform: `translateX(${-e * SCREEN_W * 0.3}px)`, filter: `brightness(${1 - e * 0.12})` }}>
          <Sequence from={STARTS[index - 1]} layout="none">
            <Prev />
          </Sequence>
        </div>
      )}
      <div style={{ position: "absolute", inset: 0, transform: `translateX(${(1 - e) * SCREEN_W}px)`, boxShadow: e < 1 ? "-20px 0 40px rgba(0,0,0,0.18)" : "none" }}>
        <Sequence from={STARTS[index]} layout="none">
          <Screen />
        </Sequence>
      </div>
    </div>
  );
};

const TourShot: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const i = sceneAt(frame);
  const p = phonePose(frame, fps);
  const chapterIndex = CHAPTERS.indexOf(SCENES[i]);
  const outro = i === SCENES.length - 1;
  const barVisible = i === 0 ? prog(frame, STARTS[1] - 12, STARTS[1]) : outro ? 1 - prog(frame, STARTS[i], STARTS[i] + 12) : 1;
  const progress = chapterIndex >= 0 ? (frame - STARTS[i]) / SCENES[i].duration : 0;

  return (
    <AbsoluteFill style={{ background: "#D3DBE4", overflow: "hidden" }}>
      <AbsoluteFill style={{ background: `radial-gradient(80% 50% at ${50 + Math.sin(frame / 90) * 2}% 42%, #F1F4F8 0%, #E1E7EE 42%, #CCD5DF 78%, #BEC8D4 100%)` }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0) 70%, rgba(255,255,255,0.2) 80%, rgba(150,164,184,0.16) 100%)" }} />

      <FloorShadow rotY={p.rotY} y={p.y} x={p.x} />

      <AbsoluteFill style={{ perspective: 2600, perspectiveOrigin: "50% 58%" }}>
        <Phone {...p} centerX={CENTER_X} centerY={CENTER_Y}>
          {i === 0 ? null : <ScreenSlot index={i} frame={frame} />}
        </Phone>
        {SCENES.map((s, k) =>
          s.callout ? (
            <Sequence key={s.id} from={STARTS[k]} durationInFrames={s.duration} layout="none">
              <Callout shape={s.callout.shape} seed={s.callout.seed} start={s.callout.at} end={s.duration - 2} {...s.callout.place}>
                {s.callout.body}
              </Callout>
            </Sequence>
          ) : null,
        )}
        <Sequence from={STARTS[SCENES.length - 1]} layout="none">
          <FloatingCard kind="pill" start={34} x={772} y={830} z={150} rotY={-9} rotX={3} drift={{ x: 0, y: 0, rot: 0 }} />
          <FloatingCard kind="chip" start={48} x={290} y={1300} z={230} rotY={-6} rotX={2} drift={{ x: 0, y: 0, rot: 0 }} />
          <FloatingCard kind="disc" start={62} x={770} y={1620} z={180} rotY={-10} rotX={4} drift={{ x: 0, y: 0, rot: 0 }} />
        </Sequence>
      </AbsoluteFill>

      {/* Titres */}
      <Sequence durationInFrames={SCENES[0].duration} layout="none">
        <IntroLockup user={USER.name} duration={SCENES[0].duration} />
      </Sequence>
      {SCENES.map((s, k) =>
        s.caption ? (
          <Sequence key={s.id} from={STARTS[k]} durationInFrames={s.duration} layout="none">
            <Caption n={CHAPTERS.indexOf(s) + 1} {...s.caption} duration={s.duration} />
          </Sequence>
        ) : null,
      )}
      <ChapterBar count={CHAPTERS.length} current={Math.max(0, chapterIndex)} progress={progress} visible={barVisible} />
      <Sequence from={STARTS[SCENES.length - 1]} layout="none">
        <OutroLockup />
      </Sequence>
    </AbsoluteFill>
  );
};

export const Tour: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  return (
    <UserProvider user={USER}>
      <ThemeProvider theme={LIGHT}>
        {frame >= HOLD_FROM ? (
          <Freeze frame={HOLD_FROM}>
            <TourShot />
          </Freeze>
        ) : (
          <TourShot />
        )}
      </ThemeProvider>
    </UserProvider>
  );
};
