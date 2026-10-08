import { chatGroupMessagesTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { botActionSchema, type BotSettings } from "./chatBotConfig";
import { assertBotPermission, BotError, botMessage, type BotTx } from "./chatBotServices";
import { performBotAction } from "./chatBotSanctions";

export const PUBLIC_BOT_COMMANDS = new Set(["/help", "/rules"]);
export const ADMIN_BOT_COMMANDS = new Set(["/settings", "/moderation", "/warn", "/mute", "/unmute", "/kick", "/ban", "/unban", "/reset", "/delete", "/logs", "/stats"]);

export async function executeBotCommand(tx: BotTx, groupId: number, userId: number, role: string, content: string, settings: BotSettings) {
  const [command, ...args] = content.split(/\s+/);
  if (!command || !PUBLIC_BOT_COMMANDS.has(command) && !ADMIN_BOT_COMMANDS.has(command)) return null;
  if (ADMIN_BOT_COMMANDS.has(command) && role === "member") throw new BotError(403, "Cette commande est réservée aux administrateurs");
  switch (command) {
    case "/help": return botMessage(tx, groupId, "Bot officiel @BrutePawaBot. /rules : règles du groupe. Administration : /settings, /moderation, /warn ID raison, /mute ID minutes raison, /kick ID raison, /ban ID raison, /unban ID, /unmute ID, /reset ID, /delete messageID, /logs, /stats.");
    case "/rules": return botMessage(tx, groupId, settings.rules || "Aucune règle définie.");
    case "/settings":
    case "/moderation":
      assertBotPermission(settings, "manageSettings");
      return botMessage(tx, groupId, "__botmenu__Protection · Avertissements · Sanctions · Logs · Statistiques · Paramètres");
    case "/logs":
      assertBotPermission(settings, "viewLogs");
      // Never copy privileged audit entries into the member-visible chat.
      return botMessage(tx, groupId, "__botmenu__Ouvrez le journal privé depuis le panneau d'administration du bot.");
    case "/stats":
      assertBotPermission(settings, "viewStats");
      return botMessage(tx, groupId, "__botmenu__Consultez les statistiques réelles dans le panneau d'administration du bot.");
    default: {
      const parsed = botActionSchema.safeParse({
        action: command.slice(1),
        ...(command === "/delete" ? { messageId: Number(args[0]) } : { targetUserId: Number(args[0]) }),
        ...(command === "/mute" ? { durationMinutes: Number(args[1] ?? settings.muteMinutes) } : {}),
        reason: args.slice(command === "/mute" ? 2 : 1).join(" ").slice(0, 500),
      });
      if (!parsed.success) throw new BotError(400, `Utilisation : ${command} ID${command === "/mute" ? " minutes" : ""} raison`);
      await performBotAction(tx, groupId, userId, parsed.data, settings);
      // Reuse the last system response; avoid a duplicate notification for the same action.
      const [message] = await tx.select().from(chatGroupMessagesTable).where(and(
        eq(chatGroupMessagesTable.groupId, groupId), eq(chatGroupMessagesTable.type, "system"),
      )).orderBy(desc(chatGroupMessagesTable.id)).limit(1);
      return command === "/delete" ? botMessage(tx, groupId, "Message supprimé par modération.") : message!;
    }
  }
}
