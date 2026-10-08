import { z } from "zod";

export const statisticsQuerySchema = z.object({
  timezone: z.string().max(80).default("UTC"),
  period: z.enum(["24h", "7d", "30d", "90d"]).default("7d"),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const dayInZone = (date: Date, timeZone: string) =>
  new Intl.DateTimeFormat("sv-SE", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);

function validDay(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Calendar arithmetic uses UTC only to manipulate ISO dates, never to define the user's midnight. */
export function statisticsRange(input: unknown, now = new Date()) {
  const query = statisticsQuerySchema.parse(input);
  const today = dayInZone(now, query.timezone); // Also validates the IANA time zone.
  if (!!query.start !== !!query.end) throw new Error("Indiquez les deux dates.");
  if (query.start && query.end) {
    if (!validDay(query.start) || !validDay(query.end) || query.start > query.end || query.end > today)
      throw new Error("Période invalide.");
    if ((Date.parse(query.end) - Date.parse(query.start)) / 86_400_000 > 92)
      throw new Error("La période ne doit pas dépasser 93 jours.");
    return { ...query, startDay: query.start, endDay: query.end, rolling24h: false, custom: true };
  }
  const days = { "24h": 1, "7d": 7, "30d": 30, "90d": 90 }[query.period];
  const start = new Date(`${today}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return {
    ...query, startDay: query.period === "24h" ? dayInZone(new Date(now.getTime() - 86_400_000), query.timezone) : start.toISOString().slice(0, 10),
    endDay: today, rolling24h: query.period === "24h", custom: false,
  };
}
