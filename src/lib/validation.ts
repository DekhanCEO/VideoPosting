import { countHashtags, countMentions, resolveOptions, textLength } from "./captions";
import { LIMITS, PHOTO_LIMITS, PLATFORMS, isYoutubeShort, youtubeIsShort } from "./platforms";
import type { MediaAsset, PlatformId, PostInput, TiktokCreatorInfo } from "./types";

export interface Issue {
  platform: PlatformId | "general";
  level: "error" | "warning";
  field?: string;
  message: string;
}

export interface ValidationContext {
  input: PostInput;
  media?: Pick<MediaAsset, "duration" | "width" | "height" | "size" | "mimeType" | "status">;
  /** Photos d'une publication photo, dans l'ordre. */
  images?: (Pick<MediaAsset, "width" | "height" | "status" | "mimeType"> | undefined)[];
  /** Plateformes pour lesquelles un compte est connecté et utilisable. */
  connected: Partial<Record<PlatformId, boolean>>;
  tiktokCreator?: TiktokCreatorInfo | null;
  /** Pour un brouillon, on ne bloque que sur les incohérences, pas sur les champs manquants. */
  mode: "draft" | "publish";
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec} s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m} min ${s} s` : `${m} min`;
}

export function validatePost(ctx: ValidationContext): Issue[] {
  const { input, media, connected, mode } = ctx;
  const issues: Issue[] = [];
  const publish = mode === "publish";
  const add = (platform: Issue["platform"], level: Issue["level"], message: string, field?: string) =>
    issues.push({ platform, level, message, field });

  const photo = input.kind === "photo";
  const images = ctx.images ?? [];
  const imageCount = input.imageIds?.length ?? 0;

  if (publish) {
    if (photo) {
      if (!imageCount) add("general", "error", "Ajoutez au moins une photo.", "media");
      else if (images.some((i) => !i || i.status !== "ready")) add("general", "error", "Des photos sont encore en cours d'envoi.", "media");
    } else if (!input.mediaId) add("general", "error", "Ajoutez une vidéo à publier.", "media");
    else if (media && media.status !== "ready") add("general", "error", "La vidéo est encore en cours d'envoi.", "media");
    if (input.platforms.length === 0) add("general", "error", "Sélectionnez au moins une plateforme.", "platforms");
    if (input.scheduledAt && input.scheduledAt < Date.now() - 60_000)
      add("general", "error", "La date de programmation est déjà passée.", "schedule");
  }

  const opts = resolveOptions(input.common, input.options);
  // Les contrôles vidéo ne s'appliquent pas à une publication photo.
  const video = photo ? undefined : media;
  const duration = video?.duration ? Math.round(video.duration) : undefined;

  for (const platform of input.platforms) {
    const name = PLATFORMS[platform].name;
    if (publish && !connected[platform]) {
      add(platform, "error", `Connectez votre compte ${name} pour publier.`, "account");
    }

    if (platform === "youtube" && photo) {
      add(platform, "error", "YouTube n'accepte que des vidéos : retirez YouTube ou passez en mode Vidéo.", "media");
      continue;
    }

    if (platform === "youtube") {
      const o = opts.youtube;
      if (o.format === "short" && video?.duration && video.width && video.height) {
        if (video.width > video.height) add(platform, "error", "Un Short doit être vertical (ou carré) : choisissez « Vidéo longue » pour une vidéo horizontale.", "format");
        if (video.duration > LIMITS.youtube.shortsMaxDuration) add(platform, "error", "Un Short dure 3 minutes maximum : choisissez « Vidéo longue ».", "format");
      }
      if (o.format === "long" && isYoutubeShort(video)) {
        add(platform, "warning", "Vidéo verticale de moins de 3 min : YouTube l'affichera quand même comme un Short.", "format");
      }
      const titleLen = textLength(o.title);
      if (publish && !o.title.trim()) add(platform, "error", "Le titre YouTube est obligatoire.", "title");
      if (titleLen > LIMITS.youtube.titleMax)
        add(platform, "error", `Titre trop long (${titleLen}/${LIMITS.youtube.titleMax}).`, "title");
      if (/[<>]/.test(o.title)) add(platform, "error", "Le titre ne peut pas contenir < ou >.", "title");
      const descLen = new TextEncoder().encode(o.description).length;
      if (descLen > LIMITS.youtube.descriptionMax)
        add(platform, "error", `Description trop longue (${descLen}/${LIMITS.youtube.descriptionMax} octets).`, "description");
      if (/[<>]/.test(o.description)) add(platform, "error", "La description ne peut pas contenir < ou >.", "description");
      const tagsLen = o.tags.reduce((n, t) => n + t.length + (t.includes(" ") ? 2 : 0), 0) + Math.max(0, o.tags.length - 1);
      if (tagsLen > LIMITS.youtube.tagsMaxChars)
        add(platform, "error", `Tags trop longs (${tagsLen}/${LIMITS.youtube.tagsMaxChars} caractères).`, "tags");
      if (duration && duration > LIMITS.youtube.maxDuration)
        add(platform, "error", "YouTube limite les vidéos à 12 heures.", "media");
      if (publish && video && !youtubeIsShort(o.format, video) && duration && duration > 15 * 60)
        add(platform, "warning", "Les vidéos de plus de 15 min nécessitent une chaîne YouTube validée.", "media");
    }

    if (platform === "tiktok") {
      const o = opts.tiktok;
      const creator = ctx.tiktokCreator;
      if (o.caption.length > LIMITS.tiktok.captionMax)
        add(platform, "error", `Légende trop longue (${o.caption.length}/${LIMITS.tiktok.captionMax}).`, "caption");
      if (o.mode === "direct") {
        if (publish && !o.privacyLevel)
          add(platform, "error", photo ? "Choisissez qui peut voir les photos sur TikTok." : "Choisissez qui peut voir la vidéo TikTok.", "privacyLevel");
        if (o.privacyLevel && creator && !creator.privacyLevelOptions.includes(o.privacyLevel))
          add(platform, "error", "Ce niveau de confidentialité n'est pas disponible pour ce compte.", "privacyLevel");
        if (o.commercialContent && !o.yourBrand && !o.brandedContent)
          add(platform, "error", "Précisez s'il s'agit de votre marque ou d'un contenu de marque.", "commercial");
        if (o.commercialContent && o.brandedContent && o.privacyLevel === "SELF_ONLY")
          add(platform, "error", "Un contenu de marque ne peut pas être privé (« Moi uniquement »).", "privacyLevel");
      }
      if (photo) {
        if (imageCount > PHOTO_LIMITS.tiktok.max) add(platform, "error", `TikTok accepte ${PHOTO_LIMITS.tiktok.max} photos maximum (${imageCount}).`, "media");
        if (textLength(input.common.title) > PHOTO_LIMITS.tiktok.titleMax)
          add(platform, "warning", `Le titre d'une publication photo TikTok est limité à ${PHOTO_LIMITS.tiktok.titleMax} caractères : il sera raccourci.`, "title");
        continue;
      }
      const maxDuration = creator?.maxVideoPostDurationSec ?? LIMITS.tiktok.defaultMaxDuration;
      if (duration && duration > maxDuration)
        add(platform, "error", `Vidéo trop longue pour ce compte TikTok (max ${formatDuration(maxDuration)}).`, "media");
      if (duration !== undefined && duration < LIMITS.tiktok.minDuration)
        add(platform, "warning", "TikTok recommande des vidéos d'au moins 3 secondes.", "media");
      if (video && video.size > LIMITS.tiktok.maxSize) add(platform, "error", "TikTok limite les fichiers à 4 Go.", "media");
      if (video?.mimeType && !(LIMITS.tiktok.mimeTypes as readonly string[]).includes(video.mimeType))
        add(platform, "warning", "TikTok accepte les formats MP4, MOV et WebM.", "media");
    }

    if (platform === "instagram") {
      const o = opts.instagram;
      const len = textLength(o.caption);
      if (len > LIMITS.instagram.captionMax)
        add(platform, "error", `Légende trop longue (${len}/${LIMITS.instagram.captionMax}).`, "caption");
      const tags = countHashtags(o.caption);
      if (tags > LIMITS.instagram.maxHashtags)
        add(platform, "error", `Instagram limite à ${LIMITS.instagram.maxHashtags} hashtags (${tags}).`, "caption");
      const mentions = countMentions(o.caption);
      if (mentions > LIMITS.instagram.maxMentions)
        add(platform, "error", `Instagram limite à ${LIMITS.instagram.maxMentions} mentions (${mentions}).`, "caption");
      if (o.collaborators.length > LIMITS.instagram.maxCollaborators)
        add(platform, "error", "3 collaborateurs maximum.", "collaborators");
      if (photo) {
        if (imageCount > PHOTO_LIMITS.instagram.max) add(platform, "error", `Un carrousel Instagram contient ${PHOTO_LIMITS.instagram.max} photos maximum (${imageCount}).`, "media");
        images.forEach((img, i) => {
          if (!img?.width || !img.height) return;
          const r = img.width / img.height;
          if (r < PHOTO_LIMITS.instagram.minRatio - 0.01 || r > PHOTO_LIMITS.instagram.maxRatio + 0.01)
            add(platform, "error", `Photo ${i + 1} : format refusé par Instagram (entre 4:5 et 1,91:1). Utilisez « Recadrer pour Instagram ».`, "media");
        });
        continue;
      }
      if (duration && duration > LIMITS.instagram.maxDuration)
        add(platform, "error", "Les Reels publiés via l'API sont limités à 15 minutes.", "media");
      if (duration !== undefined && duration < LIMITS.instagram.minDuration)
        add(platform, "error", "Un Reel doit durer au moins 3 secondes.", "media");
      if (video && video.size > LIMITS.instagram.recommendedMaxSize)
        add(platform, "warning", "Instagram recommande des fichiers de moins de 300 Mo.", "media");
      if (video?.mimeType && !(LIMITS.instagram.mimeTypes as readonly string[]).includes(video.mimeType))
        add(platform, "error", "Instagram accepte uniquement les formats MP4 et MOV.", "media");
      if (video?.width && video.height && video.width > video.height)
        add(platform, "warning", "Les Reels s'affichent en 9:16 : une vidéo horizontale sera recadrée ou bordée.", "media");
    }
  }

  return issues;
}

export function hasErrors(issues: Issue[], platform?: Issue["platform"]): boolean {
  return issues.some((i) => i.level === "error" && (platform === undefined || i.platform === platform));
}
