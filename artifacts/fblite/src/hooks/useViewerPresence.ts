import { useEffect, useRef } from "react";
import { getBpToken } from "../lib/api";

/**
 * Viewer presence lifecycle hook.
 *
 * Wires the complete viewer heartbeat protocol for a live stream:
 *   - POST /join on mount          → increments viewer_count, sets last_viewer_at
 *   - POST /heartbeat every 30 s   → refreshes last_viewer_at (presence signal)
 *   - DELETE /heartbeat on leave   → decrements viewer_count
 *
 * @param streamId   DB id of the live stream row (null/undefined → hook is dormant)
 * @param userName   Display name of the viewer (included in the join announcement)
 * @param userFlag   Flag emoji of the viewer (optional)
 */
export function useViewerPresence(
  streamId: number | null | undefined,
  userName?: string,
  userFlag?: string,
): void {
  const joinedRef = useRef(false);

  useEffect(() => {
    if (!streamId) return;

    const token = getBpToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const join = () =>
      fetch(`/api/stream/live/${streamId}/join`, {
        method: "POST",
        headers,
        body: JSON.stringify({ userName: userName || "Anonyme", userFlag: userFlag || "" }),
      }).catch(() => {});

    const heartbeat = () =>
      fetch(`/api/stream/live/${streamId}/heartbeat`, { method: "POST", headers }).catch(() => {});

    const leave = () => {
      if (!joinedRef.current) return;
      joinedRef.current = false;
      fetch(`/api/stream/live/${streamId}/heartbeat`, {
        method: "DELETE",
        headers,
        keepalive: true,
      }).catch(() => {});
    };

    join().then(() => { joinedRef.current = true; });
    const interval = setInterval(heartbeat, 30_000);

    window.addEventListener("beforeunload", leave);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", leave);
      leave();
    };
  }, [streamId]);
}
