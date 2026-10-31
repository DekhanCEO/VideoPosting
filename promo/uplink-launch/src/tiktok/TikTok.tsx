/**
 * Version TikTok (15 s, 9:16) : accroche plein écran dès la première image, puis 12 plans très différents
 * (un par option d'Uplink : rotation, dédoublement, gros plan, vue de dessus, typographie géante, interface plein
 * cadre, orbite…) enchaînés par des filés, des zooms et des flashs, et appel à l'action.
 * Les textes restent hors des zones couvertes par l'interface de TikTok (haut, droite, bas).
 */
import React from "react";
import { AbsoluteFill, Freeze, Sequence, useCurrentFrame } from "remotion";
import { useFonts } from "../fonts";
import { LIGHT, ThemeProvider, UserProvider } from "../theme";
import { USER } from "../tour/Tour";
import { HOOK_END, Hook, MERGE, MergeLogo, PORTAL_START } from "./Hook";
import { BACKDROPS, Backdrop, type BackdropKind, ShotCaption, ShotFrame, type Trans, WHIP } from "./parts";
import { PRE_ACCOUNTS, ShotAccounts, ShotAdmin, ShotAudience, ShotCta, ShotDiscord, ShotFormat, ShotInfluence, ShotPhotos, ShotPublish, ShotRevenue, ShotSchedule, ShotSplit, ShotStats } from "./shots";

interface ShotDef {
  id: string;
  len: number;
  inT: Trans;
  bg: BackdropKind;
  Comp: React.FC<{ len: number }>;
  /** Images jouées avant le début nominal (le volet d'ouverture). */
  pre?: number;
  /** Légende ; les mots entre astérisques sont surlignés. */
  cap?: { kicker: string; title: string; sub: string };
}

const SHOTS: ShotDef[] = [
  { id: "comptes", len: 30, pre: PRE_ACCOUNTS, inT: "portal", bg: "light", Comp: ShotAccounts, cap: { kicker: "Comptes", title: "Tous tes *réseaux* connectés", sub: "TikTok · YouTube · Instagram · Twitch" } },
  { id: "creer", len: 30, inT: "whipR", bg: "violet", Comp: ShotSplit, cap: { kicker: "Créer", title: "*1* vidéo → *3* plateformes", sub: "Titre, légende et hashtags déclinés" } },
  { id: "reglages", len: 24, inT: "zoom", bg: "light", Comp: ShotFormat, cap: { kicker: "Réglages", title: "*Short*, *Reel* ou vidéo longue", sub: "Visibilité réglée par plateforme" } },
  { id: "photos", len: 24, inT: "whipL", bg: "lilac", Comp: ShotPhotos, cap: { kicker: "Photos", title: "*Carrousels* et diaporamas", sub: "Jusqu'à 35 photos, dans ton ordre" } },
  { id: "programmer", len: 24, inT: "cut", bg: "light", Comp: ShotSchedule, cap: { kicker: "Programmer", title: "Publie au *bon* *moment*", sub: "Uplink publie pour toi, même appli fermée" } },
  { id: "publier", len: 30, inT: "whipR", bg: "light", Comp: ShotPublish, cap: { kicker: "Publier", title: "Suivi *en* *direct*", sub: "Un échec ? Relance en 1 clic" } },
  { id: "discord", len: 24, inT: "flash", bg: "blurple", Comp: ShotDiscord, cap: { kicker: "Discord", title: "Ta commu *prévenue*", sub: "Les liens partent sur ton Discord" } },
  { id: "stats", len: 24, inT: "zoom", bg: "ink", Comp: ShotStats, cap: { kicker: "Statistiques", title: "Toutes tes *stats*", sub: "Abonnés, vues, meilleures vidéos" } },
  { id: "influence", len: 24, inT: "cut", bg: "ink", Comp: ShotInfluence, cap: { kicker: "Influence", title: "Ton *taux* *d'influence*", sub: "Par vidéo et par plateforme" } },
  { id: "audience", len: 24, inT: "whipL", bg: "light", Comp: ShotAudience, cap: { kicker: "Audience", title: "Qui te suit *vraiment*", sub: "Âge, genre et pays" } },
  { id: "revenus", len: 24, inT: "flash", bg: "violet", Comp: ShotRevenue, cap: { kicker: "Revenus", title: "Tous tes *revenus*", sub: "Partenariats, pubs et estimations" } },
  { id: "acces", len: 24, inT: "whipR", bg: "light", Comp: ShotAdmin, cap: { kicker: "Accès", title: "Ton installation, tes *règles*", sub: "Accès sur invitation, un espace par créateur" } },
  { id: "fin", len: 66, inT: "zoom", bg: "light", Comp: ShotCta },
];

const STARTS = SHOTS.reduce<number[]>((acc, s, i) => [...acc, i === 0 ? HOOK_END : acc[i - 1] + SHOTS[i - 1].len], []);
export const TIKTOK_DURATION = STARTS[STARTS.length - 1] + SHOTS[SHOTS.length - 1].len; // 450 = 15 s
const HOLD_FROM = TIKTOK_DURATION - 14; // fin immobile
const OPTIONS = SHOTS.filter((s) => s.cap).length;

if (STARTS[0] - (SHOTS[0].pre ?? 0) !== PORTAL_START) {
  throw new Error("Le volet d'ouverture doit commencer avec le premier plan.");
}

const whipDir = (t: Trans | undefined): 1 | -1 | undefined => (t === "whipR" ? 1 : t === "whipL" ? -1 : undefined);

/** Flash blanc aux coupes « flash » (fort) et « zoom » (léger). */
const Flashes: React.FC = () => {
  const frame = useCurrentFrame();
  let o = 0;
  SHOTS.forEach((s, i) => {
    if (s.inT !== "flash" && s.inT !== "zoom") return;
    const rel = frame - STARTS[i];
    const v = rel < 0 ? (rel + 2) / 2 : 1 - rel / 3;
    o = Math.max(o, Math.min(1, Math.max(0, v)) * (s.inT === "flash" ? 1 : 0.4));
  });
  return o > 0 ? <AbsoluteFill style={{ background: "#fff", opacity: o }} /> : null;
};

const TikTokShot: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#0B0B12" }}>
      {frame < HOOK_END && <Hook />}
      {SHOTS.map((s, i) => {
        const pre = s.pre ?? 0;
        const out = whipDir(SHOTS[i + 1]?.inT);
        return (
          <Sequence key={s.id} from={STARTS[i] - pre} durationInFrames={pre + s.len + (out ? WHIP : 0)} layout="none">
            <ShotFrame len={s.len} inT={s.inT} outWhip={out} pre={pre} portalAt={s.inT === "portal" ? MERGE : undefined}>
              <Backdrop kind={s.bg} />
              <s.Comp len={s.len} />
              {s.cap && (
                <Sequence from={pre} layout="none">
                  <ShotCaption n={i + 1} total={OPTIONS} {...s.cap} tone={BACKDROPS[s.bg].tone} exit={out ? undefined : s.len - 4} />
                </Sequence>
              )}
            </ShotFrame>
          </Sequence>
        );
      })}
      <Flashes />
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
