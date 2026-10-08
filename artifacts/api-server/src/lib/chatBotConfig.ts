import { z } from "zod";

export const defaultBotPermissions = {
  deleteMessages: true, deleteMedia: true, deleteLinks: true,
  warn: true, mute: true, kick: false, ban: false, unban: false,
  viewLogs: true, viewStats: true, manageSettings: true,
};
export const botPermissionsSchema = z.object({
  deleteMessages: z.boolean().default(true), deleteMedia: z.boolean().default(true),
  deleteLinks: z.boolean().default(true), warn: z.boolean().default(true),
  mute: z.boolean().default(true), kick: z.boolean().default(false),
  ban: z.boolean().default(false), unban: z.boolean().default(false),
  viewLogs: z.boolean().default(true), viewStats: z.boolean().default(true),
  manageSettings: z.boolean().default(true),
}).strict();
export const botSettingsSchema = z.object({
  enabled: z.boolean(),
  antiSpam: z.boolean(),
  antiFlood: z.boolean().default(true),
  duplicateThreshold: z.number().int().min(2).max(10).default(3),
  maxMedia: z.number().int().min(1).max(30).default(3),
  maxMentions: z.number().int().min(2).max(100).default(8),
  wordFilter: z.boolean().default(true),
  newMemberProtection: z.boolean().default(false),
  protectionMinutes: z.number().int().min(1).max(1440).default(10),
  verificationEnabled: z.boolean().default(false),
  verificationMinutes: z.number().int().min(1).max(60).default(10),
  welcomeEnabled: z.boolean().default(true),
  violationAction: z.enum(["delete", "warn", "mute", "kick", "ban"]).default("warn"),
  finalSanction: z.enum(["mute", "kick", "ban"]).default("mute"),
  permissions: botPermissionsSchema.default(defaultBotPermissions),
  maxMessages: z.number().int().min(2).max(30),
  windowSeconds: z.number().int().min(3).max(120),
  blockLinks: z.boolean(),
  allowedDomains: z.array(z.string().trim().toLowerCase().min(1).max(253).refine(value => {
    try { return new URL(`https://${value}`).hostname === value && !value.includes(":") && !value.includes("/"); }
    catch { return false; }
  }, "Indiquez un nom de domaine sans protocole ni chemin")).max(100),
  words: z.array(z.string().trim().min(1).max(80)).max(100),
  warnBeforeMute: z.number().int().min(1).max(10),
  warnBeforeBan: z.number().int().min(2).max(30),
  muteMinutes: z.number().int().min(1).max(43200),
  rules: z.string().max(2000),
  welcomeMessage: z.string().max(1000),
}).strict().refine(s => s.warnBeforeBan > s.warnBeforeMute, {
  message: "Le seuil de bannissement doit dépasser celui de mise en sourdine",
});

export type BotSettings = z.infer<typeof botSettingsSchema>;
export const defaultBotSettings: BotSettings = {
  enabled: false, antiSpam: true, maxMessages: 5, windowSeconds: 10,
  antiFlood: true, duplicateThreshold: 3, maxMedia: 3, maxMentions: 8,
  wordFilter: true, newMemberProtection: false, protectionMinutes: 10,
  verificationEnabled: false, verificationMinutes: 10, welcomeEnabled: true,
  violationAction: "warn", finalSanction: "mute", permissions: { ...defaultBotPermissions },
  blockLinks: false, allowedDomains: [], words: [],
  warnBeforeMute: 2, warnBeforeBan: 4, muteMinutes: 10,
  rules: "Respectez les membres du groupe.", welcomeMessage: "",
};

export const botActionSchema = z.object({
  action: z.enum(["warn", "mute", "unmute", "kick", "ban", "unban", "reset", "delete", "verify"]),
  targetUserId: z.number().int().positive().optional(),
  messageId: z.number().int().positive().optional(),
  durationMinutes: z.number().int().min(1).max(43200).optional(),
  reason: z.string().trim().max(500).optional(),
  requestId: z.string().uuid().optional(),
}).strict().refine(v => v.action === "delete" ? !!v.messageId : !!v.targetUserId, {
  message: "Indiquez le membre ou le message concerné",
});
export type BotAction = z.infer<typeof botActionSchema>;

export const isMediaMessage = (content: string) => /^__(audio|video|sticker|image|doc|location)__/.test(content);
export const normalizeModerationText = (content: string) =>
  content.normalize("NFKD").replace(/\p{M}/gu, "").replace(/[\u200B-\u200D\uFEFF]/g, "").toLocaleLowerCase("fr");

export function prohibitedContent(content: string, settings: BotSettings): string | null {
  // A media payload contains internal storage URLs, not a posted external link.
  if (isMediaMessage(content)) return null;
  const normalized = normalizeModerationText(content);
  for (const word of settings.wordFilter ? settings.words : []) {
    // Collapse repeated letters before adding repetition quantifiers. Otherwise
    // a configured "aaaa" becomes a+a+a+a+ and permits costly backtracking.
    const literal = normalizeModerationText(word).replace(/(\p{L})\1+/gu, "$1").replace(/\s+/g, " ");
    const escaped = literal.split("").map((char, index) => {
      if (/\s/.test(char)) return "\\s+";
      const safe = char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return /\p{L}/u.test(char) ? `${safe}+${/\p{L}/u.test(literal[index + 1] ?? "") ? "\\s*" : ""}` : safe;
    }).join("");
    if (new RegExp(`(?:^|[^\\p{L}\\p{N}_])${escaped}(?:$|[^\\p{L}\\p{N}_])`, "u").test(normalized)) {
      return "Mot ou expression interdite";
    }
  }
  if (settings.blockLinks) {
    const links = normalized.match(/(?:https?:\/\/|www\.)[^\s<>]+|\b(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<>]*)?/gi) ?? [];
    for (const link of links) {
      try {
        const host = new URL(/^https?:\/\//i.test(link) ? link : `https://${link}`).hostname.toLowerCase();
        if (!settings.allowedDomains.some(domain => host === domain || host.endsWith(`.${domain}`))) {
          return "Lien non autorisé";
        }
      } catch { return "Lien non autorisé"; }
    }
  }
  return null;
}

export function renderWelcome(template: string, values: { username: string; groupName: string; date: string; memberCount: number }) {
  // Single replacement pass: user-provided names cannot inject template variables.
  const replacements: Record<string, string> = {
    username: values.username, group: values.groupName, group_name: values.groupName,
    date: values.date, member_count: String(values.memberCount),
  };
  return template.replace(/\{(username|group|group_name|date|member_count)\}/g, (_, key: string) => replacements[key]!);
}
