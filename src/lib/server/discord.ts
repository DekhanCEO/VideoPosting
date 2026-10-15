import "server-only";
import crypto from "node:crypto";
import { z } from "zod";
import { buildDiscordPayload, discordUrlHint, isDiscordWebhookUrl, type DiscordLink, type DiscordWebhook, type PublicDiscordWebhook } from "../discord";
import { PLATFORM_IDS, type PlatformId, type Post } from "../types";
import { isPubliclyReachable } from "./config";
import { signedMediaUrl } from "./media";
import { db, getMedia, getPost } from "./store";
import { APP_NAME } from "../brand";

const ACTIVE = ["pending", "uploading", "processing"];

export const webhookInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  url: z.string().trim().max(300).optional(),
  platforms: z.array(z.enum(PLATFORM_IDS)).min(1).max(3),
  timing: z.enum(["each", "grouped"]),
  style: z.enum(["links", "card"]),
  message: z.string().max(1500),
  mention: z.enum(["none", "everyone", "here", "role"]),
  roleId: z
    .string()
    .regex(/^\d{5,25}$/)
    .optional()
    .or(z.literal("")),
  username: z.string().trim().max(80).optional(),
  enabled: z.boolean(),
});

export type WebhookInput = z.infer<typeof webhookInputSchema>;

function hooks(): DiscordWebhook[] {
  return db().read((d) => d.settings.discord?.webhooks ?? []);
}

export function toPublicWebhook(h: DiscordWebhook): PublicDiscordWebhook {
  const { url, ...rest } = h;
  return { ...rest, urlHint: discordUrlHint(url) };
}

export function listWebhooks(): PublicDiscordWebhook[] {
  return hooks().map(toPublicWebhook);
}

function clean(input: WebhookInput) {
  if (input.mention === "role" && !input.roleId) throw new Error("Identifiant de rôle Discord invalide (chiffres uniquement).");
  return {
    name: input.name,
    platforms: [...new Set(input.platforms)],
    timing: input.timing,
    style: input.style,
    message: input.message,
    mention: input.mention,
    roleId: input.mention === "role" && input.roleId ? input.roleId : undefined,
    username: input.username || undefined,
    enabled: input.enabled,
  };
}

export function createWebhook(input: WebhookInput): PublicDiscordWebhook {
  if (!input.url || !isDiscordWebhookUrl(input.url)) throw new Error("Adresse de webhook Discord invalide (Paramètres du salon → Intégrations → Webhooks → Copier l'URL).");
  if (hooks().length >= 20) throw new Error("20 webhooks maximum.");
  const hook: DiscordWebhook = { id: crypto.randomUUID(), url: input.url.trim(), createdAt: Date.now(), ...clean(input) };
  db().update((d) => {
    d.settings.discord = { webhooks: [...(d.settings.discord?.webhooks ?? []), hook] };
  });
  return toPublicWebhook(hook);
}

export function updateWebhook(id: string, input: WebhookInput): PublicDiscordWebhook {
  if (input.url && !isDiscordWebhookUrl(input.url)) throw new Error("Adresse de webhook Discord invalide.");
  const updated = db().update((d) => {
    const h = d.settings.discord?.webhooks.find((x) => x.id === id);
    if (!h) return null;
    Object.assign(h, clean(input), input.url ? { url: input.url.trim() } : {});
    if (!h.roleId) delete h.roleId;
    if (!h.username) delete h.username;
    return { ...h };
  });
  if (!updated) throw new Error("Webhook introuvable.");
  return toPublicWebhook(updated);
}

export function deleteWebhook(id: string) {
  db().update((d) => {
    if (d.settings.discord) d.settings.discord.webhooks = d.settings.discord.webhooks.filter((h) => h.id !== id);
  });
}

/** Envoie un message au webhook (une nouvelle tentative si Discord demande de patienter). */
export async function sendDiscord(url: string, payload: unknown): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(`${url.replace(/\/$/, "")}?wait=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) return;
    const body = (await res.json().catch(() => ({}))) as { message?: string; retry_after?: number };
    if (res.status === 429 && attempt === 0) {
      await new Promise((r) => setTimeout(r, Math.min(5, body.retry_after ?? 1) * 1000));
      continue;
    }
    if (res.status === 401 || res.status === 404) throw new Error("Webhook Discord invalide ou supprimé.");
    throw new Error(`Discord a refusé le message (${res.status}${body.message ? ` : ${body.message}` : ""}).`);
  }
}

function setResult(id: string, ok: boolean, error?: string) {
  db().update((d) => {
    const h = d.settings.discord?.webhooks.find((x) => x.id === id);
    if (h) h.lastResult = { at: Date.now(), ok, error };
  });
}

/** Message de test : liens d'exemple vers les plateformes choisies. */
export async function testWebhook(id: string) {
  const hook = hooks().find((h) => h.id === id);
  if (!hook) throw new Error("Webhook introuvable.");
  const examples: Record<PlatformId, string> = { tiktok: "https://www.tiktok.com/", youtube: "https://www.youtube.com/", instagram: "https://www.instagram.com/" };
  const payload = buildDiscordPayload(hook, {
    title: `Message de test ${APP_NAME}`,
    description: "Si vous lisez ceci, les annonces de vos publications arriveront dans ce salon.",
    kind: "video",
    links: hook.platforms.map((p) => ({ platform: p, url: examples[p] })),
    timestamp: new Date().toISOString(),
  });
  try {
    await sendDiscord(hook.url, payload);
    setResult(id, true);
  } catch (err) {
    setResult(id, false, (err as Error).message);
    throw err;
  }
}

function logOn(postId: string, platforms: PlatformId[], level: "info" | "warn", message: string) {
  db().update((d) => {
    const post = d.posts.find((p) => p.id === postId);
    for (const p of platforms) post?.publications[p]?.logs.push({ at: Date.now(), level, message });
  });
}

function thumbnailFor(post: Post): string | undefined {
  const yt = post.publications.youtube;
  if (yt?.status === "published" && yt.externalId && !yt.demo) return `https://i.ytimg.com/vi/${yt.externalId}/hqdefault.jpg`;
  const id = post.kind === "photo" ? post.imageIds?.[0] : post.mediaId ? getMedia(post.mediaId)?.posterId : undefined;
  if (!id) return undefined;
  const url = signedMediaUrl(id, 30 * 86400);
  return isPubliclyReachable(url) ? url : undefined;
}

/**
 * Après chaque fin de publication sur une plateforme : annonce les liens en ligne aux webhooks concernés.
 * « each » : la plateforme qui vient d'être publiée · « grouped » : tous les liens, une fois la publication terminée.
 */
export async function notifyDiscord(postId: string, platform: PlatformId | null) {
  const post = getPost(postId);
  if (!post) return;
  const selected = post.discordWebhookIds;
  const targets = hooks().filter((h) => h.enabled && (selected == null || selected.includes(h.id)));
  if (!targets.length) return;
  const finished = !post.platforms.some((p) => ACTIVE.includes(post.publications[p]?.status ?? ""));

  for (const hook of targets) {
    // Sélection et réservation atomiques : deux fins de publication simultanées n'envoient pas deux fois.
    const toSend = db().update((d) => {
      const p = d.posts.find((x) => x.id === postId);
      if (!p) return [] as PlatformId[];
      const sent = p.discord?.sent?.[hook.id] ?? [];
      const ready = p.platforms.filter((pl) => {
        const pub = p.publications[pl];
        return hook.platforms.includes(pl) && pub?.status === "published" && !!pub.url && !pub.demo && !sent.includes(pl);
      });
      const list = hook.timing === "each" ? ready.filter((pl) => pl === platform) : finished ? ready : [];
      if (list.length) p.discord = { sent: { ...(p.discord?.sent ?? {}), [hook.id]: [...sent, ...list] } };
      return list;
    });
    if (!toSend.length) continue;

    const fresh = getPost(postId)!;
    const links: DiscordLink[] = toSend.map((p) => ({ platform: p, url: fresh.publications[p]!.url! }));
    const payload = buildDiscordPayload(hook, {
      title: fresh.common.title || fresh.options.youtube.title,
      description: fresh.common.description,
      kind: fresh.kind ?? "video",
      links,
      thumbnailUrl: hook.style === "card" ? thumbnailFor(fresh) : undefined,
      timestamp: new Date().toISOString(),
    });
    try {
      await sendDiscord(hook.url, payload);
      setResult(hook.id, true);
      logOn(postId, toSend, "info", `Annonce Discord envoyée dans « ${hook.name} »`);
    } catch (err) {
      const message = (err as Error).message;
      setResult(hook.id, false, message);
      logOn(postId, toSend, "warn", `Discord (« ${hook.name} ») : ${message}`);
      // Échec : la plateforme pourra être annoncée lors d'une prochaine tentative.
      db().update((d) => {
        const p = d.posts.find((x) => x.id === postId);
        const sent = p?.discord?.sent?.[hook.id];
        if (p?.discord && sent) p.discord.sent[hook.id] = sent.filter((pl) => !toSend.includes(pl));
      });
    }
  }
}

