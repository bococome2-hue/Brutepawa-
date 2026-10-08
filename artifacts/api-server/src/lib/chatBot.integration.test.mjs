// Isolated, disposable development fixtures only. Never run against production/Supabase.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  db, usersTable, chatGroupsTable, chatGroupMembersTable, chatGroupMessagesTable,
  chatBotSanctionsTable, chatBotLogsTable,
} from "@workspace/db";
import { and, eq, inArray, sql } from "drizzle-orm";
import { signToken } from "./auth.ts";
import { defaultBotSettings } from "./chatBotConfig.ts";
import { moderatedChatMessage, addChatMember, performBotAction, readBotSettings } from "./chatBot.ts";

assert.equal(process.env.DB_PROVIDER, "replit", "Tests require managed development DB");
assert.equal(process.env.NODE_ENV, "development", "Tests cannot run in production");
const marker = `__bot_test__${randomUUID()}`;
const ids = [], groups = [];
const base = "http://127.0.0.1:8080/api";
let checks = 0;
async function api(user, path, method = "GET", body) {
  const res = await fetch(base + path, {
    method, signal: AbortSignal.timeout(8000), headers: { Authorization: `Bearer ${signToken(user.id, "user")}`, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}
function ok(name) { checks++; console.log(`PASS ${name}`); }
async function group(owner, admin, member, overrides = {}) {
  const [g] = await db.insert(chatGroupsTable).values({ name: marker, createdById: owner.id }).returning();
  groups.push(g.id);
  await db.insert(chatGroupMembersTable).values([
    { groupId: g.id, userId: owner.id, role: "owner" },
    { groupId: g.id, userId: admin.id, role: "admin" },
    { groupId: g.id, userId: member.id, role: "member" },
  ]);
  const settings = { ...defaultBotSettings, enabled: true, antiSpam: false, antiFlood: false, warnBeforeMute: 10, warnBeforeBan: 30, ...overrides };
  assert.equal((await api(owner, `/chat-groups/${g.id}/bot`, "PUT", settings)).status, 200);
  return { g, settings };
}
async function sanction(g, user) {
  return (await db.select().from(chatBotSanctionsTable).where(and(eq(chatBotSanctionsTable.groupId, g.id), eq(chatBotSanctionsTable.userId, user.id))))[0];
}
async function action(g, owner, input) {
  return db.transaction(async tx => performBotAction(tx, g.id, owner.id, input, await readBotSettings(tx, g.id)));
}
try {
  const people = [];
  for (let i = 0; i < 5; i++) {
    const [u] = await db.insert(usersTable).values({
      firstName: `BotTest${i}`, lastName: marker, email: `${marker}-${i}@invalid.example`,
      phone: "test-only", passwordHash: "unusable-isolated-test-password",
    }).returning();
    ids.push(u.id); people.push(u);
  }
  const [owner, admin, member, newcomer, outsider] = people;
  {
    const { g, settings } = await group(owner, admin, member);
    const path = `/chat-groups/${g.id}/bot`;
    assert.equal((await api(member, path)).status, 403);
    assert.equal((await api(outsider, path + "/profile")).status, 403);
    assert.equal((await api(member, path + "/actions", "POST", { action: "ban", targetUserId: admin.id })).status, 403);
    assert.equal((await api(admin, path, "PUT", { ...settings, permissions: { ...settings.permissions, ban: true } })).status, 403);
    assert.equal((await api(owner, path + "/actions", "POST", { action: "ban", targetUserId: member.id })).status, 403);
    assert.equal((await api(owner, path + "/actions", "POST", { action: "warn", targetUserId: admin.id })).status, 403);
    await assert.rejects(moderatedChatMessage(g.id, member.id, "/ban " + owner.id), /administrateurs/);
    assert.equal((await api(member, path + "/logs", "PUT", {})).status, 404);
    ok("member/outsider/admin/owner permissions, hierarchy, immutable logs and no self-granted ban");
    const requestId = randomUUID();
    const input = { action: "warn", targetUserId: member.id, requestId, reason: "Test" };
    assert.equal((await api(owner, path + "/actions", "POST", input)).status, 200);
    assert.equal((await api(owner, path + "/actions", "POST", input)).status, 200);
    assert.equal((await sanction(g, member)).warnings, 1);
    assert.equal((await api(owner, path + "/actions", "POST", { ...input, reason: "Different" })).status, 409);
    await Promise.all([action(g, owner, { action: "warn", targetUserId: member.id }), action(g, owner, { action: "warn", targetUserId: member.id })]);
    assert.equal((await sanction(g, member)).warnings, 3);
    ok("idempotent retry, UUID payload conflict, simultaneous warnings without lost increments");
  }
  {
    const { g } = await group(owner, admin, member, { antiSpam: true, duplicateThreshold: 3 });
    assert.equal((await moderatedChatMessage(g.id, member.id, "Bonjour")).blocked, false);
    assert.equal((await moderatedChatMessage(g.id, member.id, "Bonjour")).blocked, false);
    assert.equal((await moderatedChatMessage(g.id, member.id, "Bonjour")).blocked, true);
    const stats = await api(owner, `/chat-groups/${g.id}/bot/statistics?period=seven`);
    assert.equal(stats.status, 200);
    assert.equal(stats.body.analyzed, 3);
    assert.equal(stats.body.blocked, 1);
    assert.equal(stats.body.deleted, 0);
    assert.equal(stats.body.spam, 1);
    for (const period of ["today", "thirty", "total"]) assert.equal((await api(owner, `/chat-groups/${g.id}/bot/statistics?period=${period}`)).body.analyzed, 3);
    ok("repetition threshold avoids blocking second greeting; real 4-period counters distinguish blocked from deleted");
  }
  {
    const { g } = await group(owner, admin, member, { antiFlood: true, maxMessages: 2 });
    await moderatedChatMessage(g.id, member.id, "un");
    await moderatedChatMessage(g.id, member.id, "deux");
    assert.equal((await moderatedChatMessage(g.id, member.id, "trois")).blocked, true);
    ok("server-side flood threshold");
  }
  {
    const { g } = await group(owner, admin, member, { blockLinks: true, allowedDomains: ["example.com"], words: ["sale type"] });
    assert.equal((await moderatedChatMessage(g.id, member.id, "https://example.com/test")).blocked, false);
    assert.equal((await moderatedChatMessage(g.id, member.id, "www.evil.com")).blocked, true);
    assert.equal((await moderatedChatMessage(g.id, member.id, "evil.com/test")).blocked, true);
    assert.equal((await moderatedChatMessage(g.id, member.id, "https://evil.com")).blocked, true);
    assert.equal((await moderatedChatMessage(g.id, admin.id, "https://evil.com")).blocked, false);
    assert.equal((await moderatedChatMessage(g.id, member.id, "Sâle   tyyype")).blocked, true);
    assert.equal((await moderatedChatMessage(g.id, member.id, "conversation normale")).blocked, false);
    ok("URL/www/bare domain filtering, whitelist, admin exemption and robust word boundaries");
  }
  {
    const { g } = await group(owner, admin, member, { antiSpam: true, maxMedia: 1, maxMentions: 2 });
    assert.equal((await moderatedChatMessage(g.id, member.id, "__image__https://storage.test/one")).blocked, false);
    assert.equal((await moderatedChatMessage(g.id, member.id, "__image__https://storage.test/two")).blocked, true);
    assert.equal((await moderatedChatMessage(g.id, member.id, "@one @two @three")).blocked, true);
    ok("different media uploads and excessive mentions are detected");
  }
  {
    const perms = { ...defaultBotSettings.permissions, kick: true, ban: true, unban: true };
    const { g } = await group(owner, admin, member, { permissions: perms, warnBeforeMute: 2, warnBeforeBan: 3, finalSanction: "ban" });
    await action(g, owner, { action: "warn", targetUserId: member.id });
    await action(g, owner, { action: "warn", targetUserId: member.id });
    await assert.rejects(moderatedChatMessage(g.id, member.id, "muted"), /ne pouvez pas écrire/);
    await db.update(chatBotSanctionsTable).set({ mutedUntil: new Date(Date.now() - 1000) }).where(and(eq(chatBotSanctionsTable.groupId, g.id), eq(chatBotSanctionsTable.userId, member.id)));
    assert.equal((await moderatedChatMessage(g.id, member.id, "after expiration")).blocked, false);
    await action(g, owner, { action: "warn", targetUserId: member.id });
    assert.equal((await sanction(g, member)).banned, true);
    await assert.rejects(addChatMember(g.id, member.id), /banni/);
    assert.equal((await api(owner, `/contacts/${member.id}/add-to-group/${g.id}`, "POST")).status, 403);
    await action(g, owner, { action: "ban", targetUserId: member.id }); // no-op already banned
    await action(g, owner, { action: "unban", targetUserId: member.id });
    assert.equal(await addChatMember(g.id, member.id), true);
    await action(g, owner, { action: "reset", targetUserId: member.id });
    await action(g, owner, { action: "kick", targetUserId: member.id });
    assert.equal(await addChatMember(g.id, member.id), true);
    assert.equal((await sanction(g, member)).warnings, 0);
    ok("warning progression, automatic mute expiry, ban, contact bypass prevention, unban, reset and kick/rejoin");
    await Promise.allSettled([action(g, owner, { action: "ban", targetUserId: member.id }), addChatMember(g.id, member.id)]);
    assert.equal((await sanction(g, member)).banned, true);
    assert.equal((await db.select().from(chatGroupMembersTable).where(and(eq(chatGroupMembersTable.groupId, g.id), eq(chatGroupMembersTable.userId, member.id)))).length, 0);
    ok("concurrent ban and membership insertion cannot leave a banned member joined");
  }
  {
    const { g, settings } = await group(owner, admin, member, { newMemberProtection: true, verificationEnabled: true, welcomeMessage: "Bienvenue {username} dans {group_name}, {member_count} membres le {date}." });
    assert.equal(await addChatMember(g.id, newcomer.id), true);
    assert.equal(await addChatMember(g.id, newcomer.id), false);
    const profile = await api(newcomer, `/chat-groups/${g.id}/bot/profile`);
    assert.equal(profile.body.pendingVerification, true);
    assert.equal(profile.body.handle, "@BrutePawaBot");
    await assert.rejects(moderatedChatMessage(g.id, newcomer.id, "not verified"), /Confirmez/);
    const rules = await moderatedChatMessage(g.id, newcomer.id, "/rules");
    assert.equal(rules.bot, true);
    assert.equal((await api(newcomer, `/chat-groups/${g.id}/bot/verify`, "POST")).status, 204);
    assert.equal((await moderatedChatMessage(g.id, newcomer.id, "verified")).blocked, false);
    assert.equal((await moderatedChatMessage(g.id, newcomer.id, "https://evil.test")).blocked, true);
    const welcomes = await db.select().from(chatBotLogsTable).where(and(eq(chatBotLogsTable.groupId, g.id), eq(chatBotLogsTable.action, "welcome")));
    assert.equal(welcomes.length, 1);
    const stats = await api(owner, `/chat-groups/${g.id}/bot/statistics?period=total`);
    assert.equal(stats.body.protectedUsers, 1);
    assert.equal((await api(owner, `/chat-groups/${g.id}/bot`, "PUT", { ...settings, enabled: false })).status, 200);
    assert.equal((await moderatedChatMessage(g.id, newcomer.id, "https://evil.test")).blocked, false);
    ok("new-member welcome, one-time variables, own verification, new-member restrictions and disabled automation");
  }
  {
    const { g } = await group(owner, admin, member);
    const posted = await moderatedChatMessage(g.id, member.id, "Delete this test message");
    assert.equal((await api(owner, `/chat-groups/${g.id}/bot/actions`, "POST", { action: "delete", messageId: posted.message.id, requestId: randomUUID() })).status, 200);
    assert.equal((await api(owner, `/chat-groups/${g.id}/bot/statistics?period=total`)).body.deleted, 1);
    for (const command of ["/help", "/rules", "/settings", "/moderation", "/logs", "/stats"]) {
      const response = await moderatedChatMessage(g.id, owner.id, command);
      assert.equal(response.bot, true);
    }
    const logs = await moderatedChatMessage(g.id, owner.id, "/logs");
    assert.match(logs.message.content, /journal privé/);
    ok("actual message deletion audited, all information commands and no private log disclosure to members");
  }
  console.log(`All ${checks} isolated integration checks passed.`);
} finally {
  if (groups.length) {
    const rows = await db.select().from(chatGroupsTable).where(inArray(chatGroupsTable.id, groups));
    assert.equal(rows.every(g => g.name === marker), true, "Refuse cleanup outside test scope");
    await db.transaction(async tx => {
      await tx.delete(chatGroupMessagesTable).where(inArray(chatGroupMessagesTable.groupId, groups));
      await tx.delete(chatGroupMembersTable).where(inArray(chatGroupMembersTable.groupId, groups));
      await tx.delete(chatGroupsTable).where(inArray(chatGroupsTable.id, groups));
    });
  }
  if (ids.length) {
    const rows = await db.select().from(usersTable).where(inArray(usersTable.id, ids));
    assert.equal(rows.every(u => u.lastName === marker), true, "Refuse cleanup of real users");
    await db.delete(usersTable).where(inArray(usersTable.id, ids));
  }
  console.log("Disposable test groups, users, sanctions, logs and counters removed.");
  process.exitCode ??= 0;
  // The pg pool is intentionally shared in app code; finish the isolated test process.
  setTimeout(() => process.exit(process.exitCode), 50);
}
