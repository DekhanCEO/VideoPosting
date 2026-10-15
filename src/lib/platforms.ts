import type { MediaAsset, PlatformId, PostKind, TiktokPrivacy, YoutubeFormat, YoutubePrivacy } from "./types";

export interface PlatformMeta {
  id: PlatformId;
  name: string;
  format: string;
  color: string;
  /** Classes Tailwind de l'accent (bordure / fond doux) */
  accentClass: string;
  softClass: string;
  textClass: string;
}

export const PLATFORMS: Record<PlatformId, PlatformMeta> = {
  tiktok: {
    id: "tiktok",
    name: "TikTok",
    format: "Vidéo ou photos",
    color: "#25F4EE",
    accentClass: "ring-cyan-400/60 border-cyan-400/60",
    softClass: "bg-cyan-400/10",
    textClass: "text-cyan-500",
  },
  youtube: {
    id: "youtube",
    name: "YouTube",
    format: "Vidéo ou Short",
    color: "#FF0033",
    accentClass: "ring-red-500/60 border-red-500/60",
    softClass: "bg-red-500/10",
    textClass: "text-red-500",
  },
  instagram: {
    id: "instagram",
    name: "Instagram",
    format: "Reel ou publication",
    color: "#E1306C",
    accentClass: "ring-pink-500/60 border-pink-500/60",
    softClass: "bg-pink-500/10",
    textClass: "text-pink-500",
  },
};

export const PLATFORM_ORDER: PlatformId[] = ["tiktok", "youtube", "instagram"];

export const LIMITS = {
  youtube: {
    titleMax: 100,
    descriptionMax: 5000,
    tagsMaxChars: 500,
    shortsMaxDuration: 180,
    maxDuration: 12 * 3600,
    maxSize: 256 * 1024 ** 3,
  },
  tiktok: {
    captionMax: 2200,
    minDuration: 3,
    defaultMaxDuration: 600,
    maxSize: 4 * 1024 ** 3,
    mimeTypes: ["video/mp4", "video/quicktime", "video/webm"],
  },
  instagram: {
    captionMax: 2200,
    maxHashtags: 30,
    maxMentions: 20,
    maxCollaborators: 3,
    minDuration: 3,
    maxDuration: 15 * 60,
    recommendedMaxSize: 300 * 1024 ** 2,
    mimeTypes: ["video/mp4", "video/quicktime"],
  },
} as const;

export const YOUTUBE_CATEGORIES: { id: string; label: string }[] = [
  { id: "1", label: "Film et animation" },
  { id: "2", label: "Auto et véhicules" },
  { id: "10", label: "Musique" },
  { id: "15", label: "Animaux" },
  { id: "17", label: "Sport" },
  { id: "19", label: "Voyages et événements" },
  { id: "20", label: "Jeux vidéo" },
  { id: "22", label: "Contenus personnels / Blogs" },
  { id: "23", label: "Humour" },
  { id: "24", label: "Divertissement" },
  { id: "25", label: "Actualités et politique" },
  { id: "26", label: "Vie pratique et style" },
  { id: "27", label: "Éducation" },
  { id: "28", label: "Science et technologie" },
  { id: "29", label: "Associations et activisme" },
];

export const YOUTUBE_PRIVACY_LABELS: Record<YoutubePrivacy, { label: string; hint: string }> = {
  public: { label: "Publique", hint: "Tout le monde peut la regarder" },
  unlisted: { label: "Non répertoriée", hint: "Seules les personnes ayant le lien" },
  private: { label: "Privée", hint: "Vous seul (et les personnes choisies)" },
};

export const YOUTUBE_LANGUAGES: { id: string; label: string }[] = [
  { id: "", label: "Non définie" },
  { id: "fr", label: "Français" },
  { id: "en", label: "Anglais" },
  { id: "es", label: "Espagnol" },
  { id: "de", label: "Allemand" },
  { id: "it", label: "Italien" },
  { id: "pt", label: "Portugais" },
  { id: "ar", label: "Arabe" },
  { id: "nl", label: "Néerlandais" },
];

export const TIKTOK_PRIVACY_LABELS: Record<TiktokPrivacy, string> = {
  PUBLIC_TO_EVERYONE: "Tout le monde",
  MUTUAL_FOLLOW_FRIENDS: "Amis (abonnements mutuels)",
  FOLLOWER_OF_CREATOR: "Abonnés",
  SELF_ONLY: "Moi uniquement",
};

/** Publications photo : nombre maximal de photos et formats acceptés par plateforme. */
export const PHOTO_LIMITS = {
  instagram: { max: 10, minRatio: 4 / 5, maxRatio: 1.91 },
  tiktok: { max: 35, titleMax: 90, descriptionMax: 4000 },
} as const;

/** YouTube n'accepte que des vidéos (les publications Communauté ne sont pas disponibles via l'API). */
export function supportsKind(platform: PlatformId, kind: PostKind): boolean {
  return kind === "video" || platform !== "youtube";
}

/** La vidéo sera-t-elle publiée comme Short ? (format choisi, sinon détection automatique) */
export function youtubeIsShort(format: YoutubeFormat | undefined, media?: Pick<MediaAsset, "duration" | "width" | "height">): boolean {
  if (format === "short") return true;
  if (format === "long") return false;
  return isYoutubeShort(media);
}

/** Libellé du type de contenu publié sur une plateforme (« Short », « Carrousel · 4 photos »…). */
export function contentLabel(
  platform: PlatformId,
  kind: PostKind,
  opts: { media?: Pick<MediaAsset, "duration" | "width" | "height"> | null; imageCount?: number; youtubeFormat?: YoutubeFormat },
): string {
  const n = opts.imageCount ?? 0;
  if (kind === "photo") {
    if (platform === "youtube") return "Vidéo uniquement";
    if (platform === "instagram") return n > 1 ? `Carrousel · ${n} photos` : "Publication photo";
    return n > 1 ? `Photos · ${n}` : "Photo";
  }
  if (platform === "youtube") {
    if (!opts.media && opts.youtubeFormat !== "short" && opts.youtubeFormat !== "long") return "Short ou vidéo longue";
    return youtubeIsShort(opts.youtubeFormat, opts.media ?? undefined) ? "Short" : "Vidéo longue";
  }
  return platform === "instagram" ? "Reel" : "Vidéo";
}

/** Une vidéo verticale (ou carrée) de 3 minutes max devient un Short sur YouTube. */
export function isYoutubeShort(media?: Pick<MediaAsset, "duration" | "width" | "height">): boolean {
  if (!media?.duration || !media.width || !media.height) return false;
  return media.duration <= LIMITS.youtube.shortsMaxDuration && media.height >= media.width;
}

export function aspectRatioLabel(width?: number, height?: number): string | null {
  if (!width || !height) return null;
  const r = width / height;
  const known: [number, string][] = [
    [9 / 16, "9:16"],
    [16 / 9, "16:9"],
    [1, "1:1"],
    [4 / 5, "4:5"],
    [4 / 3, "4:3"],
    [3 / 4, "3:4"],
  ];
  for (const [value, label] of known) {
    if (Math.abs(r - value) < 0.02) return label;
  }
  return r < 1 ? "Vertical" : "Horizontal";
}
