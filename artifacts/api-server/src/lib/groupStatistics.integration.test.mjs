// Development-only fixtures. All created rows are deleted in finally.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db, usersTable, chatGroupsTable, chatGroupMembersTable, chatGroupMessagesTable, chatGroupViewsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { signToken } from "./auth.ts";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
const require = createRequire(process.cwd() + "/../fblite/package.json");
const { chromium } = require("playwright");
if (process.env.NODE_ENV !== "development" || process.env.DB_PROVIDER === "supabase") throw new Error("Development Replit database only.");
const marker = randomUUID();
const users = [];
let group, browser;
const base = "http://127.0.0.1:80";
try {
  for (let i = 0; i < 2; i++) {
    const [user] = await db.insert(usersTable).values({
      firstName: "Statistiques", lastName: `Test ${i}`, email: `stats-${marker}-${i}@example.test`,
      phone: `000${Date.now().toString().slice(-10)}${i}`,
      passwordHash: "!disabled-test-login",
    }).returning();
    users.push(user);
  }
  [group] = await db.insert(chatGroupsTable).values({ name: "Vérification statistiques", createdById: users[0].id, createdAt: new Date(Date.now() - 100 * 86400000) }).returning();
  await db.insert(chatGroupMembersTable).values({ groupId: group.id, userId: users[0].id, role: "owner", joinedAt: group.createdAt });
  const contents = ["Bonjour", "https://example.test", "__image__https://example.test/a.jpg", "__audio__https://example.test/a.ogg", "__doc__file.json"];
  const hours = [20, 25, 8 * 24, 31 * 24, 89 * 24];
  await db.insert(chatGroupMessagesTable).values(contents.map((content, i) => ({
    groupId: group.id, senderId: users[0].id, type: "text", content, createdAt: new Date(Date.now() - hours[i] * 3600000),
  })));
  await db.insert(chatGroupViewsTable).values({ groupId: group.id, userId: users[0].id, visitId: randomUUID(), createdAt: new Date(Date.now() - 20 * 3600000) });
  const token = signToken(users[0].id, "user");
  const request = (query, auth = token) => fetch(`${base}/api/chat-groups/${group.id}/statistics?${query}`, { headers: auth ? { Authorization: `Bearer ${auth}` } : {} });
  for (const [period, expected] of [["24h", 1], ["7d", 2], ["30d", 3], ["90d", 5]]) {
    const response = await request(`period=${period}&timezone=Africa%2FPorto-Novo`);
    assert.equal(response.status, 200, `API ${period}`);
    const stats = await response.json();
    assert.equal(stats.messagesInPeriod, expected);
    assert.equal(stats.messagesLast7Days, 2, "Legacy seven-day count is not repurposed.");
    assert.equal(stats.daily.reduce((n, day) => n + day.messages, 0), expected);
    const types = stats.messageTypes;
    assert.equal(types.total, expected);
    assert.equal(["text", "images", "videos", "voice", "files", "gif", "links", "other"].reduce((n, kind) => n + types[kind], 0), expected);
    assert.deepEqual(stats.growth, [{ day: stats.periodEnd, members: 1 }], "Unknown past days are omitted, not backfilled from today's roster.");
    assert.match(stats.growthDefinition, /observés/);
    assert.equal(stats.reactionsInPeriod, null);
    console.log(`PASS real persisted API ${period}: ${expected} messages`);
  }
  assert.equal((await request("period=7d", null)).status, 401);
  assert.equal((await request("period=7d", signToken(users[1].id, "user"))).status, 403);
  assert.equal((await request("start=2026-02-30&end=2026-03-01")).status, 400);
  assert.equal((await request("period=all")).status, 400);
  await db.insert(chatGroupMembersTable).values({ groupId: group.id, userId: users[1].id, role: "member" });
  const changedCount = await (await request("period=7d&timezone=Africa%2FPorto-Novo")).json();
  assert.equal(changedCount.growth.at(-1).members, 2);
  await db.delete(chatGroupMembersTable).where(eq(chatGroupMembersTable.id, (await db.select().from(chatGroupMembersTable).where(eq(chatGroupMembersTable.userId, users[1].id)))[0].id));
  assert.equal((await (await request("period=7d&timezone=Africa%2FPorto-Novo")).json()).growth.at(-1).members, 1);
  await db.update(chatGroupsTable).set({ createdAt: new Date() }).where(eq(chatGroupsTable.id, group.id));
  const bornToday = await (await request("period=7d&timezone=Africa%2FPorto-Novo")).json();
  assert.deepEqual(bornToday.growth.map(point => point.members), [0, 0, 0, 0, 0, 0, 1]);
  await db.update(chatGroupsTable).set({ createdAt: group.createdAt }).where(eq(chatGroupsTable.id, group.id));
  console.log("PASS actual count changes and zero only before group creation");
  console.log("PASS authentication, membership and range guards");
  if (!process.env.API_ONLY) {
  browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const context = await browser.newContext({ viewport: { width: 500, height: 1080 }, reducedMotion: "reduce" });
  await context.addInitScript(({ token, user }) => {
    localStorage.setItem("bp_token", token);
    localStorage.setItem("fb_user", JSON.stringify(user));
  }, { token, user: users[0] });
  const page = await context.newPage();
  await page.goto(base + "/messages");
  await page.getByText(group.name, { exact: true }).and(page.locator(":visible")).first().click({ timeout: 15000 });
  await page.getByText(group.name, { exact: true }).and(page.locator(":visible")).first().click({ timeout: 10000 });
  await page.getByText("Statistiques du groupe", { exact: true }).click({ timeout: 10000 });
  await page.getByRole("dialog", { name: `Statistiques de ${group.name}`, exact: true }).waitFor();
  await page.getByText("Types de messages", { exact: true }).waitFor();
  const changed = page.waitForResponse(r => r.url().includes("/statistics?") && r.url().includes("period=30d") && r.status() === 200);
  await page.getByRole("button", { name: "30j", exact: true }).click();
  await changed;
  await page.getByText("Types de messages", { exact: true }).waitFor();
  await mkdir("../../screenshots", { recursive: true });
  await page.screenshot({ path: "../../screenshots/brutepawa-statistics-live.jpg" });
  for (const width of [390, 360, 1280]) {
    await page.setViewportSize({ width, height: 1080 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  }
  await page.setViewportSize({ width: 393, height: 874 });
  await page.screenshot({ path: "../../screenshots/brutepawa-statistics-live-mobile.jpg" });
  await page.getByRole("button", { name: "À propos : Types de messages", exact: true }).click();
  await page.keyboard.press("Escape");
  assert.equal(await page.locator(".bp-detail-sheet").count(), 0);
  console.log("PASS real UI, period changes, responsive overflow and Escape");
  }
} finally {
  await browser?.close();
  if (group) {
    await db.delete(chatGroupViewsTable).where(eq(chatGroupViewsTable.groupId, group.id));
    await db.delete(chatGroupMessagesTable).where(eq(chatGroupMessagesTable.groupId, group.id));
    await db.delete(chatGroupMembersTable).where(eq(chatGroupMembersTable.groupId, group.id));
    await db.delete(chatGroupsTable).where(eq(chatGroupsTable.id, group.id));
  }
  if (users.length) await db.delete(usersTable).where(inArray(usersTable.id, users.map(user => user.id)));
  console.log("Removed disposable statistics fixtures.");
  await db.$client.end();
}
