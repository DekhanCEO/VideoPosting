import type {
  CommonContent,
  InstagramOptions,
  PlatformOptionsMap,
  Settings,
  TiktokOptions,
  YoutubeOptions,
} from "./types";

/** Nettoie un hashtag saisi : retire le #, les espaces et la ponctuation. */
export function normalizeHashtag(raw: string): string {
  return raw
    .trim()
    .replace(/^#+/, "")
    .replace(/[^\p{L}\p{N}_]/gu, "");
}

/** Découpe une saisie libre ("#a, b #c") en hashtags propres et uniques. */
export function parseHashtags(raw: string): string[] {
  const out: string[] = [];
  for (const part of raw.split(/[\s,;]+/)) {
    const tag = normalizeHashtag(part);
    if (tag && !out.some((t) => t.toLowerCase() === tag.toLowerCase())) out.push(tag);
  }
  return out;
}

export function formatHashtags(tags: string[]): string {
  return tags.map((t) => `#${t}`).join(" ");
}

function joinBlocks(blocks: string[]): string {
  return blocks
    .map((b) => b.trim())
    .filter(Boolean)
    .join("\n\n");
}

/** Légende générée pour TikTok et Instagram : titre, description puis hashtags. */
export function buildCaption(common: CommonContent): string {
  return joinBlocks([common.title, common.description, formatHashtags(common.hashtags)]);
}

export function buildYoutubeDescription(common: CommonContent): string {
  return joinBlocks([common.description, formatHashtags(common.hashtags)]);
}

/** Retourne les options effectives : les champs synchronisés sont recalculés depuis le contenu commun. */
export function resolveYoutube(common: CommonContent, o: YoutubeOptions): YoutubeOptions {
  return {
    ...o,
    title: o.sync.title ? common.title : o.title,
    description: o.sync.description ? buildYoutubeDescription(common) : o.description,
    tags: o.sync.tags ? [...common.hashtags] : o.tags,
  };
}

export function resolveTiktok(common: CommonContent, o: TiktokOptions): TiktokOptions {
  return { ...o, caption: o.sync.caption ? buildCaption(common) : o.caption };
}

export function resolveInstagram(common: CommonContent, o: InstagramOptions): InstagramOptions {
  return { ...o, caption: o.sync.caption ? buildCaption(common) : o.caption };
}

export function resolveOptions(common: CommonContent, options: PlatformOptionsMap): PlatformOptionsMap {
  return {
    youtube: resolveYoutube(common, options.youtube),
    tiktok: resolveTiktok(common, options.tiktok),
    instagram: resolveInstagram(common, options.instagram),
  };
}

export const DEFAULT_SETTINGS_DEFAULTS: Settings["defaults"] = {
  youtubeCategoryId: "22",
  youtubePrivacy: "public",
  youtubeLanguage: "fr",
  tiktokAllowComments: true,
  tiktokAllowDuet: true,
  tiktokAllowStitch: true,
  instagramShareToFeed: true,
};

export function defaultOptions(d: Settings["defaults"] = DEFAULT_SETTINGS_DEFAULTS): PlatformOptionsMap {
  return {
    youtube: {
      title: "",
      description: "",
      tags: [],
      sync: { title: true, description: true, tags: true },
      categoryId: d.youtubeCategoryId,
      privacy: d.youtubePrivacy,
      madeForKids: false,
      notifySubscribers: true,
      embeddable: true,
      license: "youtube",
      containsSyntheticMedia: false,
      defaultLanguage: d.youtubeLanguage,
    },
    tiktok: {
      caption: "",
      sync: { caption: true },
      mode: "direct",
      // TikTok impose de ne pas présélectionner la confidentialité.
      privacyLevel: "",
      allowComments: d.tiktokAllowComments,
      allowDuet: d.tiktokAllowDuet,
      allowStitch: d.tiktokAllowStitch,
      coverTimestampMs: 0,
      commercialContent: false,
      yourBrand: false,
      brandedContent: false,
      isAigc: false,
    },
    instagram: {
      caption: "",
      sync: { caption: true },
      shareToFeed: d.instagramShareToFeed,
      thumbOffsetMs: 0,
      collaborators: [],
      audioName: "",
      locationId: "",
    },
  };
}

export function countHashtags(text: string): number {
  return (text.match(/(^|\s)#[\p{L}\p{N}_]+/gu) ?? []).length;
}

export function countMentions(text: string): number {
  return (text.match(/(^|\s)@[\w.]+/gu) ?? []).length;
}

/** Longueur telle que comptée par les plateformes (points de code, pas unités UTF-16). */
export function textLength(text: string): number {
  return Array.from(text).length;
}
