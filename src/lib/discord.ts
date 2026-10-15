/**
 * Annonces Discord : quand une publication est en ligne, ses liens sont envoyés dans un salon via un webhook.
 * Construction du message partagée par l'interface (aperçu) et le serveur (envoi).
 */
import { PLATFORMS } from "./platforms";
import type { PlatformId, PostKind } from "./types";
import { APP_NAME } from "./brand";

/** each : un message dès qu'une plateforme est en ligne · grouped : un récapitulatif quand tout est publié. */
export type DiscordTiming = "each" | "grouped";
/** links : liens bruts (Discord affiche ses propres aperçus) · card : carte avec un bouton par plateforme. */
export type DiscordStyle = "links" | "card";
export type DiscordMention = "none" | "everyone" | "here" | "role";

export interface DiscordWebhookSettings {
  name: string;
  platforms: PlatformId[];
  timing: DiscordTiming;
  style: DiscordStyle;
  message: string;
  mention: DiscordMention;
  roleId?: string;
  username?: string;
  enabled: boolean;
}

export interface DiscordWebhook extends DiscordWebhookSettings {
  id: string;
  /** Adresse complète : jamais renvoyée au navigateur. */
  url: string;
  createdAt: number;
  lastResult?: { at: number; ok: boolean; error?: string };
}

/** Version envoyée au navigateur : l'adresse est masquée (elle permet de publier dans le salon). */
export interface PublicDiscordWebhook extends Omit<DiscordWebhook, "url"> {
  urlHint: string;
}

export interface DiscordLink {
  platform: PlatformId;
  url: string;
}

export const DEFAULT_DISCORD_MESSAGE = "🎬 **{titre}** est en ligne !\n{liens}";

export const DISCORD_TEMPLATE_VARIABLES: { key: string; label: string }[] = [
  { key: "{titre}", label: "Titre de la publication" },
  { key: "{liens}", label: "Un lien par plateforme" },
  { key: "{plateformes}", label: "« TikTok, YouTube et Instagram »" },
  { key: "{lien}", label: "Premier lien" },
  { key: "{description}", label: "Description" },
  { key: "{type}", label: "« vidéo » ou « photos »" },
];

const WEBHOOK_RE = /^https:\/\/(?:(?:ptb|canary)\.)?discord(?:app)?\.com\/api(?:\/v\d+)?\/webhooks\/(\d{5,25})\/([\w-]{20,120})\/?$/;

/** Seules les adresses de webhook Discord sont acceptées (aucune requête vers un autre serveur). */
export function isDiscordWebhookUrl(url: string): boolean {
  return WEBHOOK_RE.test(url.trim());
}

export function discordUrlHint(url: string): string {
  const m = url.trim().match(WEBHOOK_RE);
  return m ? `discord.com/api/webhooks/${m[1].slice(0, 4)}…${m[1].slice(-4)}/••••••` : "Adresse invalide";
}

export const PLATFORM_EMOJI: Record<PlatformId, string> = { tiktok: "🎵", youtube: "▶️", instagram: "📸" };

/** « TikTok, YouTube et Instagram ». */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} et ${names[names.length - 1]}`;
}

function truncate(text: string, max: number): string {
  const chars = Array.from(text);
  return chars.length <= max ? text : `${chars.slice(0, max - 1).join("")}…`;
}

export interface DiscordContext {
  title: string;
  description: string;
  links: DiscordLink[];
  kind: PostKind;
  thumbnailUrl?: string;
  /** Horodatage de l'annonce (ISO). */
  timestamp?: string;
}

export function renderTemplate(template: string, ctx: DiscordContext, style: DiscordStyle): string {
  // En style « carte », les liens du texte sont entre chevrons : Discord n'ajoute pas d'aperçu en double.
  const wrap = (url: string) => (style === "card" ? `<${url}>` : url);
  const lines = ctx.links.map((l) => `${PLATFORM_EMOJI[l.platform]} ${PLATFORMS[l.platform].name} : ${wrap(l.url)}`);
  const vars: Record<string, string> = {
    "{titre}": ctx.title || "Nouvelle publication",
    "{description}": ctx.description,
    "{liens}": lines.join("\n"),
    "{plateformes}": joinNames(ctx.links.map((l) => PLATFORMS[l.platform].name)),
    "{lien}": ctx.links[0] ? wrap(ctx.links[0].url) : "",
    "{type}": ctx.kind === "photo" ? "photos" : "vidéo",
  };
  return template.replace(/\{(titre|description|liens|plateformes|lien|type)\}/g, (k) => vars[k] ?? k).trim();
}

/** Corps de la requête envoyée au webhook Discord. */
export function buildDiscordPayload(hook: DiscordWebhookSettings, ctx: DiscordContext) {
  const mention =
    hook.mention === "everyone" ? "@everyone " : hook.mention === "here" ? "@here " : hook.mention === "role" && hook.roleId ? `<@&${hook.roleId}> ` : "";
  const content = truncate(`${mention}${renderTemplate(hook.message || DEFAULT_DISCORD_MESSAGE, ctx, hook.style)}`, 2000);
  const allowed =
    hook.mention === "everyone" || hook.mention === "here"
      ? { parse: ["everyone"] as string[] }
      : hook.mention === "role" && hook.roleId
        ? { parse: [] as string[], roles: [hook.roleId] }
        : { parse: [] as string[] };
  const payload: Record<string, unknown> = { username: hook.username?.trim() || APP_NAME, content, allowed_mentions: allowed };
  if (hook.style === "card" && ctx.links.length) {
    const single = ctx.links.length === 1 ? ctx.links[0].platform : null;
    payload.embeds = [
      {
        title: truncate(ctx.title || "Nouvelle publication", 256),
        url: ctx.links[0].url,
        description: ctx.description ? truncate(ctx.description, 350) : undefined,
        color: single ? parseInt(SINGLE_COLORS[single].slice(1), 16) : 0x7c3aed,
        fields: ctx.links.map((l) => ({
          name: `${PLATFORM_EMOJI[l.platform]} ${PLATFORMS[l.platform].name}`,
          value: `[${ctx.kind === "photo" ? "Voir les photos" : "Regarder"}](${l.url})`,
          inline: true,
        })),
        thumbnail: ctx.thumbnailUrl ? { url: ctx.thumbnailUrl } : undefined,
        footer: { text: `Publié avec ${APP_NAME}` },
        timestamp: ctx.timestamp,
      },
    ];
  }
  return payload;
}

const SINGLE_COLORS: Record<PlatformId, string> = { tiktok: "#25F4EE", youtube: "#FF0033", instagram: "#E1306C" };
