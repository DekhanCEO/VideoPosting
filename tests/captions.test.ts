import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCaption, buildYoutubeDescription, countHashtags, countMentions, defaultOptions, normalizeHashtag, parseHashtags, resolveOptions } from "../src/lib/captions";

test("normalizeHashtag retire le # et la ponctuation, garde les accents", () => {
  assert.equal(normalizeHashtag("#Productivité!"), "Productivité");
  assert.equal(normalizeHashtag("  ##fyp "), "fyp");
  assert.equal(normalizeHashtag("café-crème"), "cafécrème");
});

test("parseHashtags découpe et déduplique sans tenir compte de la casse", () => {
  assert.deepEqual(parseHashtags("#Fyp, fyp  #pourtoi;viral"), ["Fyp", "pourtoi", "viral"]);
});

test("buildCaption assemble titre, description et hashtags", () => {
  const caption = buildCaption({ title: "Titre", description: "Description", hashtags: ["a", "b"] });
  assert.equal(caption, "Titre\n\nDescription\n\n#a #b");
  assert.equal(buildCaption({ title: "", description: "", hashtags: ["solo"] }), "#solo");
});

test("buildYoutubeDescription n'inclut pas le titre", () => {
  assert.equal(buildYoutubeDescription({ title: "T", description: "D", hashtags: ["x"] }), "D\n\n#x");
});

test("resolveOptions applique la synchronisation champ par champ", () => {
  const common = { title: "Commun", description: "Desc", hashtags: ["tag"] };
  const options = defaultOptions();
  options.tiktok = { ...options.tiktok, caption: "Perso TikTok", sync: { caption: false } };
  options.youtube = { ...options.youtube, title: "Perso YT", sync: { title: false, description: true, tags: true } };
  const r = resolveOptions(common, options);
  assert.equal(r.tiktok.caption, "Perso TikTok");
  assert.equal(r.instagram.caption, "Commun\n\nDesc\n\n#tag");
  assert.equal(r.youtube.title, "Perso YT");
  assert.equal(r.youtube.description, "Desc\n\n#tag");
  assert.deepEqual(r.youtube.tags, ["tag"]);
});

test("compteurs de hashtags et de mentions", () => {
  assert.equal(countHashtags("#a texte #b #c-d"), 3);
  assert.equal(countMentions("merci @lea.creations et @tom_99 !"), 2);
});

test("la confidentialité TikTok n'est jamais présélectionnée", () => {
  assert.equal(defaultOptions().tiktok.privacyLevel, "");
});
