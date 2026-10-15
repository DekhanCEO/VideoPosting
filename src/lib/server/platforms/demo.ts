import "server-only";
import crypto from "node:crypto";
import { PLATFORMS } from "../../platforms";
import type { PlatformId, TiktokCreatorInfo } from "../../types";
import { PlatformError, sleep } from "../http";
import type { AccountData, PublishContext, PublishResult } from "./types";

/** Comptes fictifs utilisés en mode démo. */
export function demoAccount(platform: PlatformId): AccountData {
  const names: Record<PlatformId, { name: string; username: string }> = {
    tiktok: { name: "Léa Créations", username: "lea.creations" },
    youtube: { name: "Léa Créations", username: "@leacreations" },
    instagram: { name: "Léa Créations", username: "lea.creations" },
  };
  const n = names[platform];
  return {
    platform,
    externalId: `demo-${platform}`,
    name: n.name,
    username: n.username,
    avatarUrl: undefined,
    accessToken: "demo",
    expiresAt: Date.now() + 365 * 86400_000,
    demo: true,
  };
}

export const DEMO_TIKTOK_CREATOR: TiktokCreatorInfo = {
  creatorNickname: "Léa Créations",
  creatorUsername: "lea.creations",
  privacyLevelOptions: ["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS", "FOLLOWER_OF_CREATOR", "SELF_ONLY"],
  commentDisabled: false,
  duetDisabled: false,
  stitchDisabled: false,
  maxVideoPostDurationSec: 600,
};

const STEPS: Record<PlatformId, { upload: string; processing: string }> = {
  tiktok: { upload: "Envoi vers TikTok", processing: "TikTok traite la vidéo" },
  youtube: { upload: "Envoi de la vidéo vers YouTube", processing: "YouTube finalise la vidéo" },
  instagram: { upload: "Envoi de la vidéo vers Instagram", processing: "Instagram traite la vidéo" },
};

/**
 * Simule une publication réaliste (envoi, traitement, mise en ligne).
 * Astuce : ajoutez « #echec » dans la légende pour simuler une erreur et tester la relance.
 */
export async function demoPublish(platform: PlatformId, ctx: PublishContext): Promise<PublishResult> {
  const steps = STEPS[platform];
  const sizeFactor = Math.min(3, Math.max(1, ctx.media.size / (60 * 1024 ** 2)));
  const uploadMs = (3500 + Math.random() * 3000) * sizeFactor;
  const ticks = 14;

  ctx.progress(2, `Connexion à ${PLATFORMS[platform].name}`);
  await sleep(600 + Math.random() * 600, ctx.signal);
  ctx.log("Mode démo : aucune donnée n'est réellement envoyée.");

  for (let i = 1; i <= ticks; i++) {
    await sleep(uploadMs / ticks, ctx.signal);
    ctx.progress(5 + Math.round((i / ticks) * 80), steps.upload);
  }

  const text = JSON.stringify(ctx.options);
  if (/#echec\b/i.test(text)) {
    await sleep(800, ctx.signal);
    throw new PlatformError(`Erreur simulée (#echec présent dans le texte ${PLATFORMS[platform].name}).`);
  }

  for (let p = 86; p <= 98; p += 4) {
    ctx.progress(p, steps.processing);
    await sleep(500 + Math.random() * 500, ctx.signal);
  }

  return { externalId: `demo_${crypto.randomBytes(5).toString("hex")}` };
}
