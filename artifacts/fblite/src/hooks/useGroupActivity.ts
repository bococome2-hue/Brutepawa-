import { useEffect, useRef, useState } from "react";
import { getBpToken } from "../lib/api";

export interface GroupActivity {
  membersCount: number;
  onlineCount: number;
  typing: { userId: number; name: string }[];
}
// One lease per browser document, not one per user: closing one tab must not hide another.
const sessionId = crypto.randomUUID();
const base = import.meta.env.BASE_URL.replace(/\/$/, "");

let activityWrites = Promise.resolve();
function send(path: string, body: object, token = getBpToken()): Promise<void> {
  if (!token) return Promise.resolve();
  // Preserve ordering across visibility changes, typing stops and heartbeat requests.
  const request = async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    try {
      const response = await fetch(`${base}/api${path}`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sessionId, ...body }), keepalive: true, signal: controller.signal,
      });
      if (!response.ok) throw new Error("Impossible de transmettre l’activité");
    } finally { clearTimeout(timeout); }
  };
  activityWrites = activityWrites.catch(() => {}).then(request);
  return activityWrites;
}
export function usePresenceHeartbeat(authenticated: boolean) {
  useEffect(() => {
    if (!authenticated) return;
    const token = getBpToken();
    let stopped = false;
    let inFlight = false;
    const pulse = async () => {
      if (stopped || inFlight || document.visibilityState !== "visible" || !navigator.onLine) return;
      inFlight = true;
      try { await send("/presence/session", { online: true }, token); } catch { /* Lease expires without successful heartbeats. */ }
      finally { inFlight = false; }
    };
    const leave = () => { void send("/presence/session", { online: false }, token).catch(() => {}); };
    const visibility = () => { if (document.visibilityState === "visible") void pulse(); else leave(); };
    void pulse();
    const timer = setInterval(pulse, 10_000);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("online", pulse);
    window.addEventListener("offline", leave);
    window.addEventListener("pagehide", leave);
    return () => {
      stopped = true; clearInterval(timer); leave();
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("online", pulse);
      window.removeEventListener("offline", leave);
      window.removeEventListener("pagehide", leave);
    };
  }, [authenticated]);
}

export function useGroupActivity(groupId: number | null, text: string) {
  const [snapshot, setSnapshot] = useState<{ groupId: number; activity: GroupActivity } | null>(null);
  const lastTyping = useRef(0);
  const notify = (id: number, typing: boolean) => {
    void send(`/chat-groups/${id}/typing`, { typing }).catch(() => {});
  };
  useEffect(() => {
    if (!groupId) return;
    let disposed = false;
    let fetching = false;
    let activeRequest: AbortController | null = null;
    const poll = async () => {
      if (disposed || fetching || document.visibilityState !== "visible" || !navigator.onLine) return;
      fetching = true;
      const controller = new AbortController();
      activeRequest = controller;
      const timeout = setTimeout(() => controller.abort(), 8_000);
      try {
        const response = await fetch(`${base}/api/chat-groups/${groupId}/activity`, {
          headers: { Authorization: `Bearer ${getBpToken()}` },
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Activité indisponible");
        const activity: GroupActivity = await response.json();
        if (!disposed) setSnapshot({ groupId, activity });
      } catch { if (!disposed) setSnapshot(null); }
      finally { clearTimeout(timeout); activeRequest = null; fetching = false; }
    };
    const visibility = () => {
      if (document.visibilityState === "visible") void poll();
      else { setSnapshot(null); notify(groupId, false); }
    };
    const offline = () => {
      setSnapshot(null);
      activeRequest?.abort();
      notify(groupId, false);
    };
    lastTyping.current = 0;
    void poll();
    const timer = setInterval(poll, 1_000);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("online", poll);
    window.addEventListener("offline", offline);
    return () => {
      disposed = true; activeRequest?.abort(); clearInterval(timer); notify(groupId, false);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("online", poll);
      window.removeEventListener("offline", offline);
    };
  }, [groupId]);
  useEffect(() => {
    if (!groupId) return;
    if (!text.trim()) { notify(groupId, false); lastTyping.current = 0; return; }
    if (document.visibilityState !== "visible" || !navigator.onLine) return;
    if (Date.now() - lastTyping.current >= 900) {
      lastTyping.current = Date.now();
      notify(groupId, true);
    }
    const idle = setTimeout(() => { notify(groupId, false); lastTyping.current = 0; }, 3_000);
    return () => clearTimeout(idle);
  }, [groupId, text]);
  return snapshot?.groupId === groupId ? snapshot.activity : null;
}
