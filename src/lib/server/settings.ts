import "server-only";
import crypto from "node:crypto";
import { z } from "zod";
import { PLATFORM_IDS, type PublicSettings } from "../types";
import { getCredentials, getPublicUrl, isPubliclyReachable, redirectUri } from "./config";
import { db, getSettings } from "./store";

export function toPublicSettings(req?: Request): PublicSettings {
  const s = getSettings();
  const yt = getCredentials("youtube");
  const tt = getCredentials("tiktok");
  const ig = getCredentials("instagram");
  const publicUrl = getPublicUrl(req);
  return {
    demoMode: s.demoMode,
    publicUrl,
    publicUrlIsReachable: isPubliclyReachable(publicUrl),
    credentials: {
      youtube: { clientId: yt.clientId, hasSecret: !!yt.clientSecret, fromEnv: yt.fromEnv, configured: yt.configured },
      tiktok: { clientKey: tt.clientId, hasSecret: !!tt.clientSecret, fromEnv: tt.fromEnv, configured: tt.configured },
      instagram: {
        appId: ig.clientId,
        hasSecret: !!ig.clientSecret,
        fromEnv: ig.fromEnv,
        configured: ig.configured,
        loginType: ig.loginType,
        graphVersion: ig.graphVersion,
      },
    },
    redirectUris: Object.fromEntries(PLATFORM_IDS.map((p) => [p, redirectUri(p, req)])) as PublicSettings["redirectUris"],
    hashtagGroups: s.hashtagGroups,
    currency: s.currency,
    monthlyRevenueGoal: s.monthlyRevenueGoal,
    defaults: s.defaults,
    passwordProtected: !!process.env.APP_PASSWORD,
  };
}

const secret = z.string().max(500).optional();

export const settingsPatchSchema = z.object({
  demoMode: z.boolean().optional(),
  credentials: z
    .object({
      youtube: z.object({ clientId: z.string().max(300).optional(), clientSecret: secret }).optional(),
      tiktok: z.object({ clientKey: z.string().max(300).optional(), clientSecret: secret }).optional(),
      instagram: z
        .object({
          appId: z.string().max(300).optional(),
          appSecret: secret,
          loginType: z.enum(["instagram", "facebook"]).optional(),
          graphVersion: z.string().regex(/^v\d+\.\d+$/).optional(),
        })
        .optional(),
    })
    .optional(),
  hashtagGroups: z
    .array(
      z.object({
        id: z.string().max(100).optional(),
        name: z.string().trim().min(1).max(60),
        tags: z.array(z.string().trim().min(1).max(100)).max(60),
      }),
    )
    .max(50)
    .optional(),
  currency: z.enum(["EUR", "USD", "GBP", "CHF", "CAD", "MAD", "XOF"]).optional(),
  monthlyRevenueGoal: z.number().min(0).max(10_000_000).optional(),
  defaults: z
    .object({
      youtubeCategoryId: z.string().max(4),
      youtubePrivacy: z.enum(["public", "unlisted", "private"]),
      youtubeLanguage: z.string().max(10),
      tiktokAllowComments: z.boolean(),
      tiktokAllowDuet: z.boolean(),
      tiktokAllowStitch: z.boolean(),
      instagramShareToFeed: z.boolean(),
    })
    .partial()
    .optional(),
});

export function applySettingsPatch(patch: z.infer<typeof settingsPatchSchema>) {
  db().update((d) => {
    const s = d.settings;
    if (patch.demoMode !== undefined) s.demoMode = patch.demoMode;
    const c = patch.credentials;
    if (c?.youtube) {
      if (c.youtube.clientId !== undefined) s.credentials.youtube.clientId = c.youtube.clientId.trim();
      // Un secret vide signifie « inchangé » : il n'est jamais renvoyé au navigateur.
      if (c.youtube.clientSecret) s.credentials.youtube.clientSecret = c.youtube.clientSecret.trim();
    }
    if (c?.tiktok) {
      if (c.tiktok.clientKey !== undefined) s.credentials.tiktok.clientKey = c.tiktok.clientKey.trim();
      if (c.tiktok.clientSecret) s.credentials.tiktok.clientSecret = c.tiktok.clientSecret.trim();
    }
    if (c?.instagram) {
      if (c.instagram.appId !== undefined) s.credentials.instagram.appId = c.instagram.appId.trim();
      if (c.instagram.appSecret) s.credentials.instagram.appSecret = c.instagram.appSecret.trim();
      if (c.instagram.loginType) s.credentials.instagram.loginType = c.instagram.loginType;
      if (c.instagram.graphVersion) s.credentials.instagram.graphVersion = c.instagram.graphVersion;
    }
    if (patch.hashtagGroups) {
      s.hashtagGroups = patch.hashtagGroups.map((g) => ({ id: g.id || crypto.randomUUID(), name: g.name, tags: g.tags }));
    }
    if (patch.currency) s.currency = patch.currency;
    if (patch.monthlyRevenueGoal !== undefined) s.monthlyRevenueGoal = patch.monthlyRevenueGoal;
    if (patch.defaults) s.defaults = { ...s.defaults, ...patch.defaults };
  });
}

/** Efface un secret enregistré (bouton « Supprimer » dans les paramètres). */
export function clearCredentials(platform: (typeof PLATFORM_IDS)[number]) {
  db().update((d) => {
    const c = d.settings.credentials;
    if (platform === "youtube") c.youtube = { clientId: "", clientSecret: "" };
    if (platform === "tiktok") c.tiktok = { clientKey: "", clientSecret: "" };
    if (platform === "instagram") c.instagram = { ...c.instagram, appId: "", appSecret: "" };
  });
}
