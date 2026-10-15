import assert from "node:assert/strict";
import { test } from "node:test";
import { buildDiscordPayload, discordUrlHint, isDiscordWebhookUrl, joinNames, renderTemplate, type DiscordWebhookSettings } from "../src/lib/discord";

const URL_OK = "https://discord.com/api/webhooks/123456789012345678/AbCdEfGhIjKlMnOpQrStUvWxYz_0123456789-abcdefgh";
const hook: DiscordWebhookSettings = {
  name: "#annonces",
  platforms: ["tiktok", "youtube", "instagram"],
  timing: "grouped",
  style: "links",
  message: "🎬 **{titre}** est en ligne sur {plateformes} !\n{liens}",
  mention: "none",
  enabled: true,
};
const ctx = {
  title: "Ma routine",
  description: "Description",
  kind: "video" as const,
  links: [
    { platform: "tiktok" as const, url: "https://www.tiktok.com/@moi/video/1" },
    { platform: "youtube" as const, url: "https://www.youtube.com/shorts/abc" },
  ],
};

test("seules les adresses de webhook Discord sont acceptées", () => {
  assert.ok(isDiscordWebhookUrl(URL_OK));
  assert.ok(isDiscordWebhookUrl(URL_OK.replace("discord.com", "ptb.discord.com")));
  assert.ok(isDiscordWebhookUrl(URL_OK.replace("discord.com", "discordapp.com")));
  assert.ok(!isDiscordWebhookUrl("https://evil.example/api/webhooks/123456789012345678/AbCdEfGhIjKlMnOpQrStUvWxYz"));
  assert.ok(!isDiscordWebhookUrl("http://discord.com/api/webhooks/123456789012345678/AbCdEfGhIjKlMnOpQrStUvWxYz"));
  assert.ok(!isDiscordWebhookUrl("https://discord.com.evil.io/api/webhooks/123456789012345678/AbCdEfGhIjKlMnOpQrStUvWxYz"));
  assert.equal(discordUrlHint(URL_OK), "discord.com/api/webhooks/1234…5678/••••••");
});

test("message : variables, liens bruts pour les aperçus Discord, mentions maîtrisées", () => {
  assert.equal(joinNames(["TikTok", "YouTube", "Instagram"]), "TikTok, YouTube et Instagram");
  const p = buildDiscordPayload(hook, ctx);
  assert.equal(p.content, "🎬 **Ma routine** est en ligne sur TikTok et YouTube !\n🎵 TikTok : https://www.tiktok.com/@moi/video/1\n▶️ YouTube : https://www.youtube.com/shorts/abc");
  assert.deepEqual(p.allowed_mentions, { parse: [] });
  assert.equal(p.embeds, undefined);
  assert.equal(p.username, "Uplink");
  const everyone = buildDiscordPayload({ ...hook, mention: "everyone" }, ctx);
  assert.ok(String(everyone.content).startsWith("@everyone "));
  assert.deepEqual(everyone.allowed_mentions, { parse: ["everyone"] });
  const role = buildDiscordPayload({ ...hook, mention: "role", roleId: "987654321" }, ctx);
  assert.ok(String(role.content).startsWith("<@&987654321> "));
  assert.deepEqual(role.allowed_mentions, { parse: [], roles: ["987654321"] });
});

test("carte : boutons par plateforme, liens du texte sans aperçu en double", () => {
  const p = buildDiscordPayload({ ...hook, style: "card", username: "Malabop" }, { ...ctx, kind: "photo", thumbnailUrl: "https://i.ytimg.com/vi/abc/hqdefault.jpg" });
  const embed = (p.embeds as Record<string, unknown>[])[0];
  assert.equal(embed.title, "Ma routine");
  assert.equal(embed.url, "https://www.tiktok.com/@moi/video/1");
  assert.deepEqual((embed.fields as { value: string }[]).map((f) => f.value), ["[Voir les photos](https://www.tiktok.com/@moi/video/1)", "[Voir les photos](https://www.youtube.com/shorts/abc)"]);
  assert.match(String(p.content), /<https:\/\/www\.tiktok\.com\/@moi\/video\/1>/);
  assert.equal(p.username, "Malabop");
  assert.equal(renderTemplate("{type} · {lien}", { ...ctx, kind: "photo" }, "links"), "photos · https://www.tiktok.com/@moi/video/1");
});
