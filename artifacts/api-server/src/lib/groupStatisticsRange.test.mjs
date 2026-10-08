import test from "node:test";
import assert from "node:assert/strict";
import { statisticsRange } from "./groupStatisticsRange.ts";

const now = new Date("2026-10-08T15:30:00Z");
test("seven local calendar days including today", () => {
  const range = statisticsRange({ timezone: "Africa/Porto-Novo" }, now);
  assert.equal(range.startDay, "2026-10-02");
  assert.equal(range.endDay, "2026-10-08");
  assert.equal(range.rolling24h, false);
});
test("24h is rolling, and calendar dates use the viewer's time zone", () => {
  const range = statisticsRange({ timezone: "America/Los_Angeles", period: "24h" }, new Date("2026-10-08T03:00:00Z"));
  assert.equal(range.endDay, "2026-10-07");
  assert.equal(range.startDay, "2026-10-06");
  assert.equal(range.rolling24h, true);
});
test("30 and 90 day presets span the correct number of local dates", () => {
  for (const [period, days] of [["30d", 30], ["90d", 90]]) {
    const range = statisticsRange({ period }, now);
    assert.equal((Date.parse(range.endDay) - Date.parse(range.startDay)) / 86400000 + 1, days);
  }
});
test("a valid custom range is accepted without altering the legacy preset", () => {
  const range = statisticsRange({ start: "2026-09-01", end: "2026-09-30" }, now);
  assert.equal(range.startDay, "2026-09-01");
  assert.equal(range.endDay, "2026-09-30");
  assert.equal(range.custom, true);
});
test("invalid time zones, periods, malformed and incomplete ranges are rejected", () => {
  for (const query of [
    { timezone: "bad/zone" }, { period: "all" }, { start: "2026-10-01" },
    { start: "2026-02-30", end: "2026-03-02" },
    { start: "2026-10-09", end: "2026-10-10" },
    { start: "2026-10-02", end: "2026-10-01" },
    { start: "2026-01-01", end: "2026-10-01" },
    { start: "2026-09-01'; DROP TABLE users", end: "2026-10-01" },
    { period: ["7d", "90d"] },
  ]) assert.throws(() => statisticsRange(query, now));
});
