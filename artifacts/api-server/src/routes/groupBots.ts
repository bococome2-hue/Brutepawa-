import { Router } from "express";
import {
  db,
  groupBotsTable,
  botLogsTable,
  groupMembersTable,
  groupPostsTable,
  groupsTable,
  usersTable,
} from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import {
  assertCommunityGroupAdmin,
  assertCommunityGroupAdminOrModerator,
} from "../lib/groupAuth";

const router = Router();

const BOT_TYPES = ["welcome", "anti_insult", "anti_link", "translator", "scheduler"] as const;
type BotType = typeof BOT_TYPES[number];

const DEFAULT_SETTINGS: Record<BotType, object> = {
  welcome: { message: "🎉 Bienvenue {username} dans le groupe ! Nous sommes ravis de vous accueillir." },
  anti_insult: { words: [], warnCount: 3, autoBan: true },
  anti_link: { allowedDomains: [], blockAll: true },
  translator: { defaultLang: "fr" },
  scheduler: { announcements: [] },
};

export async function getBotConfig(groupId: number, botType: BotType) {
  const [row] = await db
    .select()
    .from(groupBotsTable)
    .where(and(eq(groupBotsTable.groupId, groupId), eq(groupBotsTable.botType, botType)))
    .limit(1);
  return row ?? null;
}

export async function logBotAction(
  groupId: number,
  botType: BotType,
  action: string,
  targetUserId?: number,
  detail?: string,
) {
  try {
    await db.insert(botLogsTable).values({
      groupId,
      botType,
      action,
      targetUserId: targetUserId ?? null,
      detail: detail ?? null,
    });
  } catch {
    // non-critical
  }
}

export async function runWelcomeBot(groupId: number, userId: number): Promise<void> {
  try {
    const bot = await getBotConfig(groupId, "welcome");
    if (!bot || !bot.enabled) return;
    const settings = JSON.parse(bot.settings) as { message?: string };
    const [user] = await db
      .select({ firstName: usersTable.firstName, lastName: usersTable.lastName })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    if (!user) return;
    const username = `${user.firstName} ${user.lastName}`;
    const message = (settings.message ?? "Bienvenue {username} !").replace("{username}", username);
    await db.insert(groupPostsTable).values({ groupId, userId, content: message });
    await logBotAction(groupId, "welcome", `Message de bienvenue envoyé`, userId, username);
  } catch {
    // non-critical
  }
}

export async function runContentBots(
  groupId: number,
  userId: number,
  postId: number,
  content: string,
): Promise<{ blocked: boolean; reason?: string }> {
  const lc = content.toLowerCase();

  // Anti-insult
  const insultBot = await getBotConfig(groupId, "anti_insult");
  if (insultBot?.enabled) {
    const settings = JSON.parse(insultBot.settings) as {
      words?: string[];
      warnCount?: number;
      autoBan?: boolean;
    };
    const words: string[] = settings.words ?? [];
    const found = words.find((w) => w.trim() && lc.includes(w.trim().toLowerCase()));
    if (found) {
      await db.delete(groupPostsTable).where(eq(groupPostsTable.id, postId));
      await logBotAction(
        groupId,
        "anti_insult",
        `Message supprimé — mot interdit détecté: "${found}"`,
        userId,
      );
      const warnCount = settings.warnCount ?? 3;
      if (settings.autoBan) {
        const pastViolations = await db
          .select({ id: botLogsTable.id })
          .from(botLogsTable)
          .where(
            and(
              eq(botLogsTable.groupId, groupId),
              eq(botLogsTable.botType, "anti_insult"),
              eq(botLogsTable.targetUserId as any, userId),
            ),
          );
        if (pastViolations.length >= warnCount - 1) {
          await db
            .delete(groupMembersTable)
            .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, userId)));
          await db
            .update(groupsTable)
            .set({ membersCount: sql`GREATEST(${groupsTable.membersCount} - 1, 0)` })
            .where(eq(groupsTable.id, groupId));
          await logBotAction(
            groupId,
            "anti_insult",
            `Utilisateur exclu automatiquement (${warnCount} avertissements)`,
            userId,
          );
        }
      }
      return { blocked: true, reason: "Votre message contient un mot interdit et a été supprimé." };
    }
  }

  // Anti-link
  const linkBot = await getBotConfig(groupId, "anti_link");
  if (linkBot?.enabled) {
    const urlPattern = /https?:\/\/[^\s]+|www\.[^\s]+/gi;
    const links = content.match(urlPattern);
    if (links) {
      const settings = JSON.parse(linkBot.settings) as {
        allowedDomains?: string[];
        blockAll?: boolean;
      };
      const allowedDomains: string[] = settings.allowedDomains ?? [];
      const blocked = settings.blockAll
        ? links
        : links.filter((l) => !allowedDomains.some((d) => l.toLowerCase().includes(d.toLowerCase())));
      if (blocked.length > 0) {
        await db.delete(groupPostsTable).where(eq(groupPostsTable.id, postId));
        await logBotAction(
          groupId,
          "anti_link",
          `Message supprimé — lien détecté: ${blocked[0]}`,
          userId,
        );
        return { blocked: true, reason: "Les liens ne sont pas autorisés dans ce groupe." };
      }
    }
  }

  return { blocked: false };
}

// GET /groups/:id/bots
router.get("/groups/:id/bots", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const groupId = parseInt(req.params.id, 10);
  if (isNaN(groupId)) {
    res.status(400).json({ error: "Invalid group id" });
    return;
  }

  const membership = await assertCommunityGroupAdmin(res, groupId, userId);
  if (!membership) return;

  const bots = await db
    .select()
    .from(groupBotsTable)
    .where(eq(groupBotsTable.groupId, groupId));

  const botsMap = Object.fromEntries(bots.map((b) => [b.botType, b]));

  const result = BOT_TYPES.map((type) => {
    const existing = botsMap[type];
    return {
      id: existing?.id ?? null,
      groupId,
      botType: type,
      enabled: existing?.enabled ?? false,
      settings: existing ? JSON.parse(existing.settings) : DEFAULT_SETTINGS[type],
      updatedAt: existing?.updatedAt ?? null,
    };
  });

  res.json(result);
});

// PATCH /groups/:id/bots/:type
router.patch("/groups/:id/bots/:type", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const groupId = parseInt(req.params.id, 10);
  const botType = req.params.type;

  if (isNaN(groupId)) {
    res.status(400).json({ error: "Invalid group id" });
    return;
  }
  if (!BOT_TYPES.includes(botType as BotType)) {
    res.status(400).json({ error: "Type de bot invalide" });
    return;
  }

  const membership = await assertCommunityGroupAdmin(res, groupId, userId);
  if (!membership) return;

  const { enabled, settings } = req.body as { enabled?: boolean; settings?: object };

  const [existing] = await db
    .select()
    .from(groupBotsTable)
    .where(and(eq(groupBotsTable.groupId, groupId), eq(groupBotsTable.botType, botType)))
    .limit(1);

  if (existing) {
    const updates: { enabled?: boolean; settings?: string } = {};
    if (enabled !== undefined) updates.enabled = enabled;
    if (settings !== undefined) updates.settings = JSON.stringify(settings);
    const [updated] = await db
      .update(groupBotsTable)
      .set(updates)
      .where(eq(groupBotsTable.id, existing.id))
      .returning();
    res.json({ ...updated, settings: JSON.parse(updated.settings) });
  } else {
    const [created] = await db
      .insert(groupBotsTable)
      .values({
        groupId,
        botType,
        enabled: enabled ?? false,
        settings: settings ? JSON.stringify(settings) : JSON.stringify(DEFAULT_SETTINGS[botType as BotType]),
      })
      .returning();
    res.json({ ...created, settings: JSON.parse(created.settings) });
  }
});

// GET /groups/:id/bot-logs
router.get("/groups/:id/bot-logs", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const groupId = parseInt(req.params.id, 10);
  if (isNaN(groupId)) {
    res.status(400).json({ error: "Invalid group id" });
    return;
  }

  const membership = await assertCommunityGroupAdminOrModerator(res, groupId, userId);
  if (!membership) return;

  const logs = await db
    .select()
    .from(botLogsTable)
    .where(eq(botLogsTable.groupId, groupId))
    .orderBy(desc(botLogsTable.createdAt))
    .limit(100);

  res.json(logs);
});

export default router;
