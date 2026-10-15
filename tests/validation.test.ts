import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultOptions } from "../src/lib/captions";
import { isYoutubeShort } from "../src/lib/platforms";
import type { PostInput } from "../src/lib/types";
import { hasErrors, validatePost } from "../src/lib/validation";

const media = { duration: 30, width: 1080, height: 1920, size: 20 * 1024 ** 2, mimeType: "video/mp4", status: "ready" as const };
const all = { tiktok: true, youtube: true, instagram: true };

function input(patch: Partial<PostInput> = {}): PostInput {
  const options = defaultOptions();
  options.tiktok.privacyLevel = "PUBLIC_TO_EVERYONE";
  return {
    mediaId: "00000000-0000-4000-8000-000000000000",
    common: { title: "Un titre", description: "", hashtags: [] },
    platforms: ["tiktok", "youtube", "instagram"],
    options,
    ...patch,
  };
}

test("une publication complète ne contient aucune erreur", () => {
  const issues = validatePost({ input: input(), media, connected: all, mode: "publish" });
  assert.equal(hasErrors(issues), false, JSON.stringify(issues));
});

test("vidéo, plateforme et comptes sont obligatoires pour publier", () => {
  const issues = validatePost({ input: input({ mediaId: undefined, platforms: [] }), connected: {}, mode: "publish" });
  assert.ok(issues.some((i) => i.field === "media"));
  assert.ok(issues.some((i) => i.field === "platforms"));
  const noAccount = validatePost({ input: input(), media, connected: { tiktok: true }, mode: "publish" });
  assert.ok(noAccount.some((i) => i.platform === "youtube" && i.field === "account"));
});

test("un brouillon n'exige ni vidéo ni compte", () => {
  const issues = validatePost({ input: input({ mediaId: undefined }), connected: {}, mode: "draft" });
  assert.equal(hasErrors(issues), false);
});

test("YouTube : titre obligatoire, 100 caractères max, sans chevrons", () => {
  const empty = validatePost({ input: input({ common: { title: "", description: "", hashtags: [] } }), media, connected: all, mode: "publish" });
  assert.ok(empty.some((i) => i.platform === "youtube" && i.field === "title"));
  const long = validatePost({ input: input({ common: { title: "x".repeat(101), description: "", hashtags: [] } }), media, connected: all, mode: "publish" });
  assert.ok(long.some((i) => i.platform === "youtube" && i.message.includes("trop long")));
  const chevrons = validatePost({ input: input({ common: { title: "a <b>", description: "", hashtags: [] } }), media, connected: all, mode: "publish" });
  assert.ok(chevrons.some((i) => i.platform === "youtube" && i.message.includes("<")));
});

test("TikTok : confidentialité requise, contenu de marque jamais privé", () => {
  const i1 = input();
  i1.options.tiktok.privacyLevel = "";
  assert.ok(validatePost({ input: i1, media, connected: all, mode: "publish" }).some((i) => i.field === "privacyLevel"));
  const i2 = input();
  i2.options.tiktok = { ...i2.options.tiktok, privacyLevel: "SELF_ONLY", commercialContent: true, brandedContent: true };
  assert.ok(validatePost({ input: i2, media, connected: all, mode: "publish" }).some((i) => i.message.includes("contenu de marque")));
  const i3 = input();
  i3.options.tiktok = { ...i3.options.tiktok, commercialContent: true };
  assert.ok(validatePost({ input: i3, media, connected: all, mode: "publish" }).some((i) => i.field === "commercial"));
});

test("TikTok : durée max issue des infos créateur", () => {
  const creator = { privacyLevelOptions: ["PUBLIC_TO_EVERYONE" as const], commentDisabled: false, duetDisabled: false, stitchDisabled: false, maxVideoPostDurationSec: 20 };
  const issues = validatePost({ input: input(), media, connected: all, tiktokCreator: creator, mode: "publish" });
  assert.ok(issues.some((i) => i.platform === "tiktok" && i.field === "media" && i.level === "error"));
});

test("Instagram : 30 hashtags max et pas de WebM", () => {
  const tags = Array.from({ length: 31 }, (_, i) => `tag${i}`);
  const issues = validatePost({ input: input({ common: { title: "T", description: "", hashtags: tags } }), media, connected: all, mode: "publish" });
  assert.ok(issues.some((i) => i.platform === "instagram" && i.message.includes("30 hashtags")));
  const webm = validatePost({ input: input(), media: { ...media, mimeType: "video/webm" }, connected: all, mode: "publish" });
  assert.ok(webm.some((i) => i.platform === "instagram" && i.level === "error"));
  assert.ok(!webm.some((i) => i.platform === "tiktok" && i.level === "error"));
});

test("détection des Shorts YouTube", () => {
  assert.equal(isYoutubeShort({ duration: 59, width: 1080, height: 1920 }), true);
  assert.equal(isYoutubeShort({ duration: 180, width: 1080, height: 1080 }), true);
  assert.equal(isYoutubeShort({ duration: 181, width: 1080, height: 1920 }), false);
  assert.equal(isYoutubeShort({ duration: 30, width: 1920, height: 1080 }), false);
});

test("publication photo : YouTube refusé, limites et format Instagram", () => {
  const img = (width: number, height: number) => ({ width, height, status: "ready" as const, mimeType: "image/jpeg" });
  const photo = (patch: Partial<PostInput> = {}) => input({ kind: "photo", mediaId: undefined, imageIds: ["a", "b"], ...patch });
  const ok = validatePost({ input: photo({ platforms: ["tiktok", "instagram"] }), images: [img(1080, 1350), img(1080, 1080)], connected: all, mode: "publish" });
  assert.equal(hasErrors(ok), false, JSON.stringify(ok));
  const yt = validatePost({ input: photo(), images: [img(1080, 1350), img(1080, 1080)], connected: all, mode: "publish" });
  assert.ok(yt.some((i) => i.platform === "youtube" && i.level === "error"));
  const tall = validatePost({ input: photo({ platforms: ["instagram"] }), images: [img(1080, 1920), img(1080, 1080)], connected: all, mode: "publish" });
  assert.ok(tall.some((i) => i.platform === "instagram" && /Photo 1/.test(i.message)));
  const tiktokOnly = validatePost({ input: photo({ platforms: ["tiktok"] }), images: [img(1080, 1920)], connected: all, mode: "publish" });
  assert.equal(hasErrors(tiktokOnly), false, "TikTok accepte le 9:16");
  const many = validatePost({ input: photo({ platforms: ["instagram"], imageIds: Array.from({ length: 11 }, (_, i) => String(i)) }), images: [], connected: all, mode: "publish" });
  assert.ok(many.some((i) => /10 photos maximum/.test(i.message)));
  const empty = validatePost({ input: photo({ imageIds: [] }), connected: all, mode: "publish" });
  assert.ok(empty.some((i) => i.message === "Ajoutez au moins une photo."));
});

test("YouTube : Short ou vidéo longue au choix", () => {
  const horizontal = { ...media, width: 1920, height: 1080 };
  const withFormat = (format: "auto" | "short" | "long") => {
    const i = input({ platforms: ["youtube"] });
    i.options.youtube.format = format;
    return i;
  };
  const shortH = validatePost({ input: withFormat("short"), media: horizontal, connected: all, mode: "publish" });
  assert.ok(shortH.some((i) => i.field === "format" && i.level === "error"));
  const shortLong = validatePost({ input: withFormat("short"), media: { ...media, duration: 240 }, connected: all, mode: "publish" });
  assert.ok(shortLong.some((i) => i.field === "format" && i.level === "error"));
  const longVertical = validatePost({ input: withFormat("long"), media, connected: all, mode: "publish" });
  assert.ok(longVertical.some((i) => i.field === "format" && i.level === "warning"));
  assert.equal(hasErrors(longVertical), false);
  assert.equal(hasErrors(validatePost({ input: withFormat("long"), media: horizontal, connected: all, mode: "publish" })), false);
});
