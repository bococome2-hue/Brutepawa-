import { z } from "zod";

export const botSettingsSchema = z.object({
  enabled: z.boolean(),
  antiSpam: z.boolean(),
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
  muteMinutes: z.number().int().min(1).max(1440),
  rules: z.string().max(2000),
  welcomeMessage: z.string().max(1000),
}).strict().refine(s => s.warnBeforeBan > s.warnBeforeMute, {
  message: "Le seuil de bannissement doit dépasser celui de mise en sourdine",
});

export type BotSettings = z.infer<typeof botSettingsSchema>;
export const defaultBotSettings: BotSettings = {
  enabled: false, antiSpam: true, maxMessages: 5, windowSeconds: 10,
  blockLinks: false, allowedDomains: [], words: [],
  warnBeforeMute: 2, warnBeforeBan: 4, muteMinutes: 10,
  rules: "Respectez les membres du groupe.", welcomeMessage: "",
};

export const botActionSchema = z.object({
  action: z.enum(["warn", "mute", "unmute", "ban", "unban", "reset", "delete"]),
  targetUserId: z.number().int().positive().optional(),
  messageId: z.number().int().positive().optional(),
  durationMinutes: z.number().int().min(1).max(1440).optional(),
  reason: z.string().trim().max(500).optional(),
}).strict().refine(v => v.action === "delete" ? !!v.messageId : !!v.targetUserId, {
  message: "Indiquez le membre ou le message concerné",
});
export type BotAction = z.infer<typeof botActionSchema>;

export function prohibitedContent(content: string, settings: BotSettings): string | null {
  const normalized = content.normalize("NFKC").toLocaleLowerCase("fr");
  for (const word of settings.words) {
    const escaped = word.normalize("NFKC").toLocaleLowerCase("fr").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`(?:^|[^\\p{L}\\p{N}_])${escaped}(?:$|[^\\p{L}\\p{N}_])`, "u").test(normalized)) {
      return "Mot ou expression interdite";
    }
  }
  if (settings.blockLinks) {
    const links = content.match(/(?:https?:\/\/|www\.)[^\s<>]+|\b(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<>]*)?/gi) ?? [];
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
