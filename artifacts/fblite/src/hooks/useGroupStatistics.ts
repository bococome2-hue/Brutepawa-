import { useCallback, useEffect, useRef, useState } from "react";
import { getBpToken } from "../lib/api";

export interface GroupStatistics {
  groupId: number;
  timeZone: string;
  periodStart: string;
  periodEnd: string;
  membersTotal: number;
  messagesToday: number;
  messagesLast7Days: number;
  writersLast7Days: number;
  viewsLast7Days: number;
  readersLast7Days: number;
  reactionsLast7Days: null;
  lastMessageAt: string | null;
  daily: { day: string; messages: number; views: number }[];
  recentActivity: { id: number; name: string; type: "text" | "system"; createdAt: string }[];
  viewDefinition: string;
  period?: GroupStatisticsPeriod;
  customRange?: boolean;
  messagesInPeriod?: number;
  writersInPeriod?: number;
  viewsInPeriod?: number;
  readersInPeriod?: number;
  messageTypes?: { total: number; text: number; images: number; videos: number; voice: number; files: number; gif: number; links: number; other?: number };
  growth?: null | { day: string; members: number }[];
  joinedInPeriod?: number | null;
  leftInPeriod?: number | null;
  reactionsInPeriod?: number | null;
  repliesInPeriod?: number | null;
  sharesInPeriod?: number | null;
  trends?: Record<string, number | null> | null;
}

export type GroupStatisticsPeriod = "24h" | "7d" | "30d" | "90d";
export interface GroupStatisticsRange { start: string; end: string }
const base = import.meta.env.BASE_URL.replace(/\/$/, "");

export function useGroupStatistics(groupId: number | null, enabled: boolean, period: GroupStatisticsPeriod = "7d", range: GroupStatisticsRange | null = null) {
  const key = `${groupId}:${period}:${range?.start ?? ""}:${range?.end ?? ""}`;
  const [state, setState] = useState<{ key: string; data: GroupStatistics | null; loading: boolean; error: string | null } | null>(null);
  const reloadRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!groupId || !enabled) { setState(null); reloadRef.current = () => {}; return; }
    let disposed = false;
    let fetching = false;
    let controller: AbortController | null = null;
    const zone = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; } })();
    setState({ key, data: null, loading: true, error: null });
    const fail = (error: string) => { if (!disposed) setState({ key, data: null, loading: false, error }); };
    const poll = async () => {
      if (disposed || fetching) return;
      if (!navigator.onLine) { fail("Hors ligne : statistiques indisponibles."); return; }
      fetching = true;
      const c = new AbortController();
      controller = c;
      const timeout = setTimeout(() => c.abort(), 8_000);
      try {
        const query = new URLSearchParams({ timezone: zone, period });
        if (range) { query.set("start", range.start); query.set("end", range.end); }
        const res = await fetch(`${base}/api/chat-groups/${groupId}/statistics?${query}`, {
          headers: { Authorization: `Bearer ${getBpToken()}` }, cache: "no-store", signal: c.signal,
        });
        if (!res.ok) throw new Error("http");
        const data = (await res.json()) as GroupStatistics;
        if (!disposed && data.groupId === groupId) setState({ key, data, loading: false, error: null });
      } catch { fail("Impossible de charger les statistiques."); }
      finally { clearTimeout(timeout); controller = null; fetching = false; }
    };
    reloadRef.current = () => {
      setState(s => (s && s.key === key ? { ...s, loading: true, error: null } : s));
      void poll();
    };
    const offline = () => { controller?.abort(); fail("Hors ligne : statistiques indisponibles."); };
    const online = () => { void poll(); };
    void poll();
    const timer = setInterval(() => { if (document.visibilityState === "visible") void poll(); }, 5_000);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      disposed = true; controller?.abort(); clearInterval(timer);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, [groupId, enabled, key]);

  const reload = useCallback(() => reloadRef.current(), []);
  const cur = state && state.key === key ? state : null;
  return {
    data: cur?.data ?? null,
    loading: enabled && !!groupId ? (cur ? cur.loading : true) : false,
    error: cur?.error ?? null,
    reload,
  };
}
