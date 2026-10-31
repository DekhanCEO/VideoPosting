/**
 * Version TikTok (15 s, 9:16), réduite à l'essentiel : une accroche, quatre messages courts (un par plan, assez
 * longtemps à l'écran pour être lus), la marque et l'adresse.
 * Les textes restent hors des zones couvertes par l'interface de TikTok (haut, droite, bas).
 */
import React from "react";
import { AbsoluteFill, Freeze, Sequence, useCurrentFrame } from "remotion";
import { useFonts } from "../fonts";
import { LIGHT, ThemeProvider, UserProvider } from "../theme";
import { USER } from "../tour/Tour";
import { HOOK_END, Hook, MERGE, MergeLogo, PORTAL_START } from "./Hook";
import { BACKDROPS, Backdrop, type BackdropKind, BigCaption, ShotFrame, type Trans, WHIP } from "./parts";
import { PRE_OPEN, ShotCta, ShotDiscord, ShotNumbers, ShotOneToThree, ShotSchedule } from "./shots";

interface ShotDef {
  id: string;
  len: number;
  inT: Trans;
  bg: BackdropKind;
  Comp: React.FC<{ len: number }>;
  /** Images jouées avant le début nominal (le volet d'ouverture). */
  pre?: number;
  /** Titre (« | » = retour à la ligne, *mot* = surligné) et phrase courte. */
  cap?: { title: string; sub?: string };
}

const SHOTS: ShotDef[] = [
  { id: "un-clic", len: 78, pre: PRE_OPEN, inT: "portal", bg: "violet", Comp: ShotOneToThree, cap: { title: "1 clic.|*3\u00a0plateformes*." } },
  { id: "programme", len: 72, inT: "whipR", bg: "light", Comp: ShotSchedule, cap: { title: "*Programme*.", sub: "Uplink publie à ta place." } },
  { id: "discord", len: 72, inT: "flash", bg: "blurple", Comp: ShotDiscord, cap: { title: "Ta commu|*prévenue*.", sub: "Les liens partent sur Discord." } },
  { id: "chiffres", len: 72, inT: "zoom", bg: "ink", Comp: ShotNumbers, cap: { title: "Tes *stats*.|Tes *revenus*." } },
  { id: "fin", len: 72, inT: "whipL", bg: "light", Comp: ShotCta },
];

const STARTS = SHOTS.reduce<number[]>((acc, s, i) => [...acc, i === 0 ? HOOK_END : acc[i - 1] + SHOTS[i - 1].len], []);
export const TIKTOK_DURATION = STARTS[STARTS.length - 1] + SHOTS[SHOTS.length - 1].len; // 450 = 15 s
const HOLD_FROM = TIKTOK_DURATION - 14; // fin immobile

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
                  <BigCaption {...s.cap} tone={BACKDROPS[s.bg].tone} enter={2} exit={out ? undefined : s.len - 6} />
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
