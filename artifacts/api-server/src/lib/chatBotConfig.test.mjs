import test from "node:test";
import assert from "node:assert/strict";
import { botSettingsSchema, defaultBotSettings, prohibitedContent } from "./chatBotConfig.ts";

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
