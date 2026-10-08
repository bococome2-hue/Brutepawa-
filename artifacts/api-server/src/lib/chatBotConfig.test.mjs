import test from "node:test";
import assert from "node:assert/strict";
import { botSettingsSchema, defaultBotSettings, prohibitedContent, renderWelcome, botActionSchema } from "./chatBotConfig.ts";

test("safe defaults: disabled, no automatic link or vocabulary filtering", () => {
  assert.equal(defaultBotSettings.enabled, false);
  assert.equal(prohibitedContent("Bonjour https://example.com", defaultBotSettings), null);
});
test("literal words match boundaries, not innocent substrings", () => {
  const settings = { ...defaultBotSettings, words: ["con", "sale type", "a+b"] };
  assert.equal(prohibitedContent("La confiance", settings), null);
  assert.equal(prohibitedContent("CON !", settings), "Mot ou expression interdite");
  assert.equal(prohibitedContent("Un sale type.", settings), "Mot ou expression interdite");
  assert.equal(prohibitedContent("a+b", settings), "Mot ou expression interdite");
  assert.equal(prohibitedContent("aaab", settings), null);
});
test("domain allowances require an exact host or true subdomain", () => {
  const settings = { ...defaultBotSettings, blockLinks: true, allowedDomains: ["example.com"] };
  assert.equal(prohibitedContent("https://example.com/a", settings), null);
  assert.equal(prohibitedContent("www.sub.example.com", settings), null);
  assert.equal(prohibitedContent("https://example.com.evil.com", settings), "Lien non autorisé");
  assert.equal(prohibitedContent("https://example.com@evil.com", settings), "Lien non autorisé");
  assert.equal(prohibitedContent("https://evil.com/?example.com", settings), "Lien non autorisé");
  assert.equal(prohibitedContent("t.me/spam", settings), "Lien non autorisé");
});
test("settings reject invalid thresholds, durations and domains", () => {
  assert.equal(botSettingsSchema.safeParse(defaultBotSettings).success, true);
  assert.equal(botSettingsSchema.safeParse({ ...defaultBotSettings, warnBeforeBan: 2 }).success, false);
  assert.equal(botSettingsSchema.safeParse({ ...defaultBotSettings, muteMinutes: 0 }).success, false);
  assert.equal(botSettingsSchema.safeParse({ ...defaultBotSettings, allowedDomains: ["example.com/path"] }).success, false);
});

test("new settings stay backward compatible, with least privilege defaults", () => {
  const { permissions, antiFlood, ...old } = defaultBotSettings;
  const parsed = botSettingsSchema.parse(old);
  assert.equal(parsed.antiFlood, true);
  assert.equal(parsed.permissions.ban, false);
  assert.equal(parsed.permissions.kick, false);
  assert.equal(parsed.permissions.unban, false);
  assert.equal(botSettingsSchema.safeParse({ ...defaultBotSettings, invented: true }).success, false);
});
test("word filter normalizes accents, repeated letters, whitespace and invisible separators", () => {
  const s = { ...defaultBotSettings, words: ["sale type", "con"] };
  assert.equal(prohibitedContent("Sâle   tyyype", s), "Mot ou expression interdite");
  assert.equal(prohibitedContent("c\u200bon", s), "Mot ou expression interdite");
  assert.equal(prohibitedContent("c   o   n", s), "Mot ou expression interdite");
  assert.equal(prohibitedContent("conversation", s), null);
  assert.equal(prohibitedContent("con", { ...s, wordFilter: false }), null);
});
test("internal media URLs are not blocked as member-posted external links", () => {
  assert.equal(prohibitedContent("__image__https://storage.example.net/image", { ...defaultBotSettings, blockLinks: true }), null);
});
test("repeated-letter filter patterns stay bounded on long innocent words", () => {
  const s = { ...defaultBotSettings, words: ["a".repeat(50)] };
  assert.equal(prohibitedContent("a".repeat(4000) + "b", s), null);
  assert.equal(prohibitedContent("aaaa", s), "Mot ou expression interdite");
});
test("welcome variables are replaced once, including legacy group variable", () => {
  const rendered = renderWelcome("{username} {group_name} {date} {member_count} {group}", {
    username: "{group_name}", groupName: "Groupe réel", date: "08/10/2026", memberCount: 2,
  });
  assert.equal(rendered, "{group_name} Groupe réel 08/10/2026 2 Groupe réel");
});
test("actions validate long mutes, kick, target and idempotency key", () => {
  assert.equal(botActionSchema.safeParse({ action: "kick", targetUserId: 4 }).success, true);
  assert.equal(botActionSchema.safeParse({ action: "mute", targetUserId: 4, durationMinutes: 10080 }).success, true);
  assert.equal(botActionSchema.safeParse({ action: "kick" }).success, false);
  assert.equal(botActionSchema.safeParse({ action: "ban", targetUserId: 4, requestId: "invalid" }).success, false);
});
