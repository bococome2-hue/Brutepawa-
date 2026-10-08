import { Router, type Request, type Response, type NextFunction } from "express";
import { verifyToken } from "../lib/auth";
import { pushToUserDevice } from "./push";
import { db, messagesTable } from "@workspace/db";
import { sql, eq, and } from "drizzle-orm";

const router = Router();

const listeners = new Map<number, Response>();

export function pushToUser(userId: number, eventName: string, data: unknown): boolean {
  const target = listeners.get(Number(userId));
  if (!target) return false;
  try {
    target.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
    return true;
  } catch {
    listeners.delete(Number(userId));
    return false;
  }
}

function sseAuth(req: Request, res: Response, next: NextFunction): void {
  let token = (req.headers.authorization ?? "").replace("Bearer ", "").trim();
  if (!token) token = (req.query.token as string) ?? "";
  if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
  const payload = verifyToken(token);
  if (!payload) { res.status(401).json({ error: "Invalid token" }); return; }
  req.userId = payload.userId;
  next();
}

router.get("/signaling/listen", sseAuth, (req, res) => {
  const userId = req.userId!;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const existing = listeners.get(userId);
  if (existing) {
    try { existing.end(); } catch { /* ignore */ }
    listeners.delete(userId);
  }
  listeners.set(userId, res);

  res.write(`event: connected\ndata: ${JSON.stringify({ userId })}\n\n`);

  // Mark all undelivered messages to this user as delivered, then notify each sender
  db.update(messagesTable)
    .set({ isDelivered: true, deliveredAt: new Date() })
    .where(and(eq(messagesTable.toUserId, userId), eq(messagesTable.isDelivered, false)))
    .returning({ id: messagesTable.id, fromUserId: messagesTable.fromUserId })
    .then(delivered => {
      if (!delivered.length) return;
      const senderMap = new Map<number, number[]>();
      for (const m of delivered) {
        const arr = senderMap.get(m.fromUserId) ?? [];
        arr.push(m.id);
        senderMap.set(m.fromUserId, arr);
      }
      for (const [senderId, msgIds] of senderMap) {
        pushToUser(senderId, "message:delivered", { messageIds: msgIds });
      }
    })
    .catch(() => {});

  const keepalive = setInterval(() => {
    try { res.write(": ping\n\n"); } catch { clearInterval(keepalive); }
  }, 25_000);

  req.on("close", () => {
    clearInterval(keepalive);
    if (listeners.get(userId) === res) listeners.delete(userId);
  });
});

router.post("/signaling/send", sseAuth, async (req, res) => {
  const from = req.userId!;
  const { to, type, payload } = req.body as { to: number; type: string; payload: unknown };

  if (!to || !type) {
    res.status(400).json({ error: "'to' and 'type' are required" });
    return;
  }

  const delivered = pushToUser(Number(to), "signal", { type, from, payload: payload ?? {} });

  // Always send high-urgency push for call invites so the device wakes up
  // immediately — regardless of whether SSE delivered it (belt + suspenders).
  if (type === "call:invite") {
    try {
      const rows = await db.execute(sql`
        SELECT first_name, last_name FROM users WHERE id = ${from} LIMIT 1
      `);
      const caller = (rows.rows?.[0] ?? {}) as { first_name?: string; last_name?: string };
      const callerName = [caller.first_name, caller.last_name].filter(Boolean).join(" ") || `Utilisateur #${from}`;
      const callType   = (payload as { callType?: string })?.callType ?? "audio";

      await pushToUserDevice(Number(to), {
        title: callType === "video" ? "📹 Appel vidéo entrant" : "📞 Appel audio entrant",
        body:  `${callerName} vous appelle`,
        tag:   "incoming-call",
        requireInteraction: true,
        vibrate: [500, 200, 500, 200, 500, 200, 500],
        silent: false,
        actions: [
          { action: "accept", title: "✅ Accepter" },
          { action: "reject", title: "❌ Refuser" },
        ],
        data: {
          url:        `/messages?userId=${from}`,
          fromUserId: from,
          callType,
          callerName,
          rejectUrl:  "/api/signaling/send",
        },
      }, { urgency: "high" });
    } catch { /* non-fatal */ }
  }

  res.json({ delivered });
});

// ── Cloudflare TURN credentials ──────────────────────────────────────────────
// Returns ICE servers. Uses Cloudflare Calls TURN if CF_TURN_KEY_ID +
// CF_TURN_API_TOKEN are set; otherwise returns empty (client falls back to
// hardcoded STUN + open-relay TURN).
router.get("/turn-credentials", async (_req, res) => {
  const keyId    = process.env.CF_TURN_KEY_ID;
  const apiToken = process.env.CF_STREAM_TOKEN ?? process.env.CF_TURN_API_TOKEN;

  if (!keyId || !apiToken) {
    res.json({ iceServers: [] });
    return;
  }

  try {
    const cfRes = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate`,
      {
        method:  "POST",
        headers: {
          "Authorization": `Bearer ${apiToken}`,
          "Content-Type":  "application/json",
        },
        body: JSON.stringify({ ttl: 86400 }),
      },
    );
    if (!cfRes.ok) throw new Error(`CF TURN ${cfRes.status}`);
    const data = await cfRes.json() as { iceServers?: unknown };
    res.json(data);
  } catch {
    res.json({ iceServers: [] });
  }
});

export default router;
