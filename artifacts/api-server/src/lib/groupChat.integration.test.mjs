// Temporary development fixtures; demonstration responses are isolated to one browser.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { db, usersTable, chatGroupsTable, chatGroupMembersTable, chatGroupMessagesTable, chatGroupViewsTable, chatBotSettingsTable, chatBotLogsTable, chatBotSanctionsTable, chatBotMetricsTable } from "@workspace/db";
import { eq, inArray, and } from "drizzle-orm";
import { signToken } from "./auth.ts";
const require = createRequire(process.cwd() + "/../fblite/package.json");
const { chromium } = require("playwright");
if (process.env.NODE_ENV !== "development" || process.env.DB_PROVIDER === "supabase") throw new Error("Development Replit fixtures only");
const marker = randomUUID();
const base = "http://127.0.0.1:80";
const users = [];
let group, browser;
try {
  for (let i = 0; i < 3; i++) {
    const [user] = await db.insert(usersTable).values({ firstName: i === 2 ? "Invitation" : i ? "Pire" : "Omat", lastName: i === 2 ? "Visuelle" : i ? "Pires" : "Visuel", email: `chat-${marker}-${i}@example.test`, phone: `000${Date.now().toString().slice(-10)}${i}`, passwordHash: "!disabled-test-login" }).returning();
    users.push(user);
  }
  const avatar = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><circle cx="24" cy="24" r="24" fill="#8b5cf6"/><text x="24" y="25" text-anchor="middle" dominant-baseline="middle" font-family="Arial" font-size="24" fill="white">O</text></svg>');
  [group] = await db.insert(chatGroupsTable).values({ name: "Oui", avatarUrl: avatar, createdById: users[0].id }).returning();
  await db.insert(chatGroupMembersTable).values(users.slice(0, 2).map((user, i) => ({ groupId: group.id, userId: user.id, role: i ? "member" : "owner" })));
  const token = signToken(users[0].id, "user");
  const api = (path, options = {}) => fetch(`${base}/api${path}`, { ...options, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...options.headers } });
  browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
  const context = await browser.newContext({ viewport: { width: 474, height: 858 }, timezoneId: "Africa/Porto-Novo", permissions: ["microphone"], reducedMotion: "reduce" });
  await context.addInitScript(({ token, user }) => { localStorage.setItem("bp_token", token); localStorage.setItem("fb_user", JSON.stringify(user)); }, { token, user: users[0] });
  const page = await context.newPage();
  const browserErrors = [];
  page.on("pageerror", error => browserErrors.push(error.message));
  const day = new Date().toISOString().slice(0, 10);
  const rows = [
    { id: 1, senderId: users[0].id, senderName: "Omat Visuel", type: "system", content: 'Groupe "Oui" créé', createdAt: `${day}T05:00:00Z` },
    ...[[2, 1, "Cc", "14:53"], [3, 0, "Oui c’est comment", "14:53"], [4, 1, "Ont dit quoi", "14:54"], [5, 0, "Cc", "15:55"], [6, 0, "Cc", "18:58"], [7, 0, "Arnaque", "05:33"]].map(([id, author, content, time]) => ({ id, senderId: users[author].id, senderName: author ? "Pire Pires" : "Omat Visuel", content, type: "text", createdAt: `${day}T${time}:00Z` })),
  ];
  // Initial reference comparison only: no production data or API implementation is replaced.
  const messagesPath = `**/api/chat-groups/${group.id}/messages`;
  const profilePath = `**/api/chat-groups/${group.id}/bot/profile`;
  await page.route(messagesPath, route => route.request().method() === "GET" ? route.fulfill({ json: rows }) : route.continue());
  await page.route(profilePath, route => route.fulfill({ json: { name: "BrutePawa Bot", handle: "@BrutePawaBot", official: true, enabled: true, description: "Profil de comparaison isolé", pendingVerification: false } }));
  await page.goto(base + "/messages");
  await page.getByText("Oui", { exact: true }).and(page.locator(":visible")).first().click({ timeout: 20000 });
  await page.locator("#grp-msg-7").waitFor();
  await page.getByText("BrutePawa Bot", { exact: true }).waitFor();
  await page.evaluate(async () => {
    const image = new Image();
    image.src = "/wallpapers/bp-chat-bg.jpg";
    await image.decode();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await mkdir("../../screenshots", { recursive: true });
  await page.screenshot({ path: "../../screenshots/group-chat-reference-verified.jpg" });
  console.log("GEOMETRY", JSON.stringify(await page.locator("textarea").evaluate(node => ({ composer: node.getBoundingClientRect().toJSON(), width: innerWidth, height: innerHeight }))));
  if (process.env.VISUAL_ONLY) {
    console.log("PASS actual-source reference screenshot");
  } else {
    await page.unroute(messagesPath);
    await page.unroute(profilePath);
    const profile = await (await api(`/chat-groups/${group.id}/bot/profile`)).json();
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await page.getByText(profile.enabled ? "Actif" : "Inactif", { exact: true }).waitFor();
    const input = page.getByPlaceholder("Écrire un message...", { exact: true });
    if (!process.env.SKIP_CORE) {
    await input.fill(`Envoi réel ${marker}`);
    const sent = page.waitForResponse(response => response.url().endsWith(`/chat-groups/${group.id}/messages`) && response.request().method() === "POST");
    await input.press("Enter");
    const sendResponse = await sent;
    assert.ok(sendResponse.status() >= 200 && sendResponse.status() < 300);
    assert.equal((await db.select().from(chatGroupMessagesTable).where(and(eq(chatGroupMessagesTable.groupId, group.id), eq(chatGroupMessagesTable.content, `Envoi réel ${marker}`)))).length, 1);
    await page.route(messagesPath, route => route.request().method() === "POST" ? route.fulfill({ status: 503, json: { error: "Envoi refusé pour vérification" } }) : route.continue());
    await input.fill(`Échec contrôlé ${marker}`);
    await input.press("Enter");
    await page.getByRole("alert").filter({ hasText: /envoyer|envoi|refus|erreur|échoué/i }).first().waitFor();
    assert.equal(await input.inputValue(), `Échec contrôlé ${marker}`, "A refused message retains its draft.");
    assert.equal((await db.select().from(chatGroupMessagesTable).where(and(eq(chatGroupMessagesTable.groupId, group.id), eq(chatGroupMessagesTable.content, `Échec contrôlé ${marker}`)))).length, 0);
    await page.unroute(messagesPath);
    console.log("PASS persisted group send and explicit failed send; real bot status");
    }
    const openGroup = async () => {
      await page.goto(base + "/messages");
      await page.getByText("Oui", { exact: true }).and(page.locator(":visible")).first().click({ timeout: 20000 });
      await page.getByText("BrutePawa Bot", { exact: true }).waitFor();
    };
    await openGroup();
    await page.getByRole("button", { name: "Ajouter des membres au groupe", exact: true }).click();
    await page.getByText("Membres", { exact: true }).and(page.locator(":visible")).first().waitFor();
    const invitation = page.waitForResponse(response => response.url().endsWith(`/chat-groups/${group.id}/members`) && response.request().method() === "POST");
    await page.getByText("Invitation Visuelle", { exact: true }).click();
    assert.ok((await invitation).ok());
    assert.equal((await db.select().from(chatGroupMembersTable).where(and(eq(chatGroupMembersTable.groupId, group.id), eq(chatGroupMembersTable.userId, users[2].id)))).length, 1);
    await openGroup();
    await page.getByRole("button", { name: "Paramètres", exact: true }).click();
    await page.getByText("Modifier", { exact: true }).and(page.locator(":visible")).first().waitFor();
    await openGroup();
    await page.getByRole("button", { name: "Bot de modération", exact: true }).click();
    await page.getByRole("dialog", { name: "Modération du groupe", exact: true }).waitFor();
    await openGroup();
    await page.getByRole("button", { name: "Statistiques", exact: true }).click();
    await page.getByRole("dialog", { name: "Statistiques de Oui", exact: true }).waitFor();
    console.log("PASS real member picker and all three bot-card destinations");
    await openGroup();
    await page.getByRole("button", { name: "Fermer la bannière d’ajout de membres", exact: true }).click();
    assert.equal(await page.getByRole("button", { name: "Ajouter des membres au groupe", exact: true }).count(), 0);
    const uploads = [];
    await page.route("**/api/upload", route => {
      const mime = route.request().headers()["content-type"];
      assert.ok(route.request().postDataBuffer()?.length);
      uploads.push(mime);
      return route.fulfill({ json: { url: `https://example.test/fixture-${marker}.${mime.startsWith("image") ? "png" : "webm"}` } });
    });
    await page.locator(".bp-group-composer input[type=file]").setInputFiles({
      name: "fixture.png", mimeType: "image/png",
      buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5v8AAAAASUVORK5CYII=", "base64"),
    });
    await page.getByRole("button", { name: "Joindre un fichier", exact: true }).waitFor({ state: "visible" });
    await page.waitForFunction(() => !document.querySelector('[aria-label="Joindre un fichier"]')?.disabled);
    await page.getByRole("button", { name: "Enregistrer un message vocal", exact: true }).click();
    const stop = page.getByRole("button", { name: /Arrêter l’enregistrement vocal/ });
    await stop.waitFor();
    await page.waitForTimeout(650);
    const audioSend = page.waitForResponse(response => response.url().endsWith(`/chat-groups/${group.id}/messages`) && response.request().method() === "POST");
    await stop.click();
    assert.ok((await audioSend).ok());
    const stored = await db.select().from(chatGroupMessagesTable).where(eq(chatGroupMessagesTable.groupId, group.id));
    assert.ok(stored.some(row => row.content.startsWith("__image__") && row.content.includes(marker)));
    assert.ok(stored.some(row => row.content.startsWith("__audio__") && row.content.includes(marker)));
    assert.ok(uploads.some(mime => mime.startsWith("image/")));
    assert.ok(uploads.some(mime => mime.startsWith("audio/")));
    console.log("PASS group image/audio upload contracts and persisted group-targeted messages (provider mocked, not certified)");
    for (const width of [393, 360, 1024]) {
      await page.setViewportSize({ width, height: 858 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
    await page.setViewportSize({ width: 474, height: 858 });
    await page.screenshot({ path: "../../screenshots/group-chat-live.jpg" });
    assert.deepEqual(browserErrors, []);
    console.log("PASS responsive group layout and no browser exceptions");
  }
} finally {
  await browser?.close();
  if (group) {
    for (const table of [chatBotLogsTable, chatBotSanctionsTable, chatBotMetricsTable, chatBotSettingsTable, chatGroupViewsTable, chatGroupMessagesTable, chatGroupMembersTable]) await db.delete(table).where(eq(table.groupId, group.id));
    await db.delete(chatGroupsTable).where(eq(chatGroupsTable.id, group.id));
  }
  if (users.length) await db.delete(usersTable).where(inArray(usersTable.id, users.map(user => user.id)));
  await db.$client.end();
  console.log("Removed only disposable chat fixtures.");
}
