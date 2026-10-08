import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
async function ensureMessagingSettings(userId: number) {
  await db.execute(sql`
    INSERT INTO messaging_settings (user_id) VALUES (${userId})
    ON CONFLICT (user_id) DO NOTHING
  `);
}
async function ensurePrivacySettings(userId: number) {
  await db.execute(sql`
    INSERT INTO privacy_settings (user_id) VALUES (${userId})
    ON CONFLICT (user_id) DO NOTHING
  `);
}
async function ensureNotificationSettings(userId: number) {
  await db.execute(sql`
    INSERT INTO notification_settings (user_id) VALUES (${userId})
    ON CONFLICT (user_id) DO NOTHING
  `);
}
async function ensureBackupSettings(userId: number) {
  await db.execute(sql`
    INSERT INTO chat_backups (user_id) VALUES (${userId})
    ON CONFLICT (user_id) DO NOTHING
  `);
}

/* ─────────────────────────────────────────────
   MESSAGING SETTINGS (hub)
───────────────────────────────────────────── */
router.get("/messaging/settings", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  await ensureMessagingSettings(userId);
  const result = await db.execute(sql`SELECT * FROM messaging_settings WHERE user_id = ${userId}`);
  const row = (result as any).rows?.[0] ?? (result as any)[0];
  res.json({
    onlineStatus:           row?.online_status            ?? true,
    notificationsEnabled:   row?.notifications_enabled     ?? true,
    readReceiptsEnabled:    row?.read_receipts_enabled     ?? true,
    whoCanMessage:          row?.who_can_message           ?? "everyone",
    autoDownloadPhotos:     row?.auto_download_photos      ?? "wifi_only",
    autoDownloadVideos:     row?.auto_download_videos      ?? "disabled",
    autoDownloadAudio:      row?.auto_download_audio       ?? "wifi_only",
    autoDownloadFiles:      row?.auto_download_files       ?? "disabled",
    mediaQuality:           row?.media_quality             ?? "standard",
    archiveEnabled:         row?.archive_enabled           ?? true,
  });
});

router.patch("/messaging/settings", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const {
    onlineStatus, notificationsEnabled, readReceiptsEnabled, whoCanMessage,
    autoDownloadPhotos, autoDownloadVideos, autoDownloadAudio, autoDownloadFiles,
    mediaQuality, archiveEnabled,
  } = req.body;

  await db.execute(sql`
    INSERT INTO messaging_settings (
      user_id, online_status, notifications_enabled, read_receipts_enabled, who_can_message,
      auto_download_photos, auto_download_videos, auto_download_audio, auto_download_files,
      media_quality, archive_enabled, updated_at
    ) VALUES (
      ${userId},
      ${onlineStatus          ?? true},
      ${notificationsEnabled   ?? true},
      ${readReceiptsEnabled    ?? true},
      ${whoCanMessage          ?? "everyone"},
      ${autoDownloadPhotos     ?? "wifi_only"},
      ${autoDownloadVideos     ?? "disabled"},
      ${autoDownloadAudio      ?? "wifi_only"},
      ${autoDownloadFiles      ?? "disabled"},
      ${mediaQuality           ?? "standard"},
      ${archiveEnabled         ?? true},
      now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      online_status          = COALESCE(EXCLUDED.online_status,          messaging_settings.online_status),
      notifications_enabled  = COALESCE(EXCLUDED.notifications_enabled,  messaging_settings.notifications_enabled),
      read_receipts_enabled  = COALESCE(EXCLUDED.read_receipts_enabled,  messaging_settings.read_receipts_enabled),
      who_can_message        = COALESCE(EXCLUDED.who_can_message,        messaging_settings.who_can_message),
      auto_download_photos   = COALESCE(EXCLUDED.auto_download_photos,   messaging_settings.auto_download_photos),
      auto_download_videos   = COALESCE(EXCLUDED.auto_download_videos,   messaging_settings.auto_download_videos),
      auto_download_audio    = COALESCE(EXCLUDED.auto_download_audio,    messaging_settings.auto_download_audio),
      auto_download_files    = COALESCE(EXCLUDED.auto_download_files,    messaging_settings.auto_download_files),
      media_quality          = COALESCE(EXCLUDED.media_quality,          messaging_settings.media_quality),
      archive_enabled        = COALESCE(EXCLUDED.archive_enabled,        messaging_settings.archive_enabled),
      updated_at             = now()
  `);
  res.json({ ok: true });
});

/* ─────────────────────────────────────────────
   ONLINE STATUS
───────────────────────────────────────────── */
router.get("/messaging/online-status", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  await ensureMessagingSettings(userId);
  const result = await db.execute(sql`SELECT online_status FROM messaging_settings WHERE user_id = ${userId}`);
  const row = (result as any).rows?.[0] ?? (result as any)[0];
  res.json({ online: row?.online_status ?? true });
});

router.patch("/messaging/online-status", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const { online } = req.body;
  await db.execute(sql`
    INSERT INTO messaging_settings (user_id, online_status, updated_at) VALUES (${userId}, ${online ?? true}, now())
    ON CONFLICT (user_id) DO UPDATE SET online_status = EXCLUDED.online_status, updated_at = now()
  `);
  await db.execute(sql`UPDATE users SET online = ${online ?? true}, last_seen = now() WHERE id = ${userId}`);
  res.json({ ok: true });
});

/* ─────────────────────────────────────────────
   PRIVACY SETTINGS
───────────────────────────────────────────── */
router.get("/messaging/privacy", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  await ensurePrivacySettings(userId);
  const result = await db.execute(sql`SELECT * FROM privacy_settings WHERE user_id = ${userId}`);
  const row = (result as any).rows?.[0] ?? (result as any)[0];
  const blockedResult = await db.execute(sql`SELECT COUNT(*) as count FROM blocked_users WHERE user_id = ${userId}`);
  const blockedRow = (blockedResult as any).rows?.[0] ?? (blockedResult as any)[0];
  res.json({
    profileVisibility:        row?.profile_visibility       ?? "friends",
    messagePermission:        row?.message_permission       ?? "friends",
    friendListVisibility:     row?.friend_list_visibility   ?? "friends_only",
    onlineStatusVisibility:   row?.online_status_visibility ?? "friends",
    readReceipts:             row?.read_receipts            ?? true,
    searchVisibility:         row?.search_visibility        ?? "everyone",
    mentionPermission:        row?.mention_permission       ?? "everyone",
    blockedCount:             Number(blockedRow?.count ?? 0),
  });
});

router.patch("/messaging/privacy", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const {
    profileVisibility, messagePermission, friendListVisibility,
    onlineStatusVisibility, readReceipts, searchVisibility, mentionPermission,
  } = req.body;
  await db.execute(sql`
    INSERT INTO privacy_settings (
      user_id, profile_visibility, message_permission, friend_list_visibility,
      online_status_visibility, read_receipts, search_visibility, mention_permission, updated_at
    ) VALUES (
      ${userId},
      ${profileVisibility       ?? "friends"},
      ${messagePermission       ?? "friends"},
      ${friendListVisibility    ?? "friends_only"},
      ${onlineStatusVisibility  ?? "friends"},
      ${readReceipts            ?? true},
      ${searchVisibility        ?? "everyone"},
      ${mentionPermission       ?? "everyone"},
      now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      profile_visibility       = COALESCE(EXCLUDED.profile_visibility,       privacy_settings.profile_visibility),
      message_permission       = COALESCE(EXCLUDED.message_permission,       privacy_settings.message_permission),
      friend_list_visibility   = COALESCE(EXCLUDED.friend_list_visibility,   privacy_settings.friend_list_visibility),
      online_status_visibility = COALESCE(EXCLUDED.online_status_visibility, privacy_settings.online_status_visibility),
      read_receipts            = COALESCE(EXCLUDED.read_receipts,            privacy_settings.read_receipts),
      search_visibility        = COALESCE(EXCLUDED.search_visibility,        privacy_settings.search_visibility),
      mention_permission       = COALESCE(EXCLUDED.mention_permission,       privacy_settings.mention_permission),
      updated_at               = now()
  `);
  res.json({ ok: true });
});

/* ─────────────────────────────────────────────
   BLOCKED USERS
───────────────────────────────────────────── */
router.get("/messaging/blocked", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const result = await db.execute(sql`
    SELECT bu.id, bu.blocked_user_id, bu.created_at,
           u.first_name, u.last_name, u.avatar_url
    FROM blocked_users bu
    JOIN users u ON u.id = bu.blocked_user_id
    WHERE bu.user_id = ${userId}
    ORDER BY bu.created_at DESC
  `);
  const rows = (result as any).rows ?? result;
  res.json(rows.map((r: any) => ({
    id: r.id,
    blockedUserId: r.blocked_user_id,
    name: `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim(),
    avatarUrl: r.avatar_url ?? null,
    createdAt: r.created_at,
  })));
});

router.post("/messaging/blocked", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const { targetUserId } = req.body;
  if (!targetUserId) { res.status(400).json({ error: "targetUserId required" }); return; }
  await db.execute(sql`
    INSERT INTO blocked_users (user_id, blocked_user_id) VALUES (${userId}, ${targetUserId})
    ON CONFLICT DO NOTHING
  `);
  res.json({ ok: true });
});

router.delete("/messaging/blocked/:targetId", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const targetId = Number(req.params.targetId);
  await db.execute(sql`DELETE FROM blocked_users WHERE user_id = ${userId} AND blocked_user_id = ${targetId}`);
  res.json({ ok: true });
});

/* ─────────────────────────────────────────────
   NOTIFICATION SETTINGS
───────────────────────────────────────────── */
router.get("/messaging/notifications", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  await ensureNotificationSettings(userId);
  const result = await db.execute(sql`SELECT * FROM notification_settings WHERE user_id = ${userId}`);
  const row = (result as any).rows?.[0] ?? (result as any)[0];
  res.json({
    messages:       row?.messages        ?? true,
    groups:         row?.groups          ?? true,
    calls:          row?.calls           ?? true,
    mentions:       row?.mentions        ?? true,
    reactions:      row?.reactions       ?? true,
    friendRequests: row?.friend_requests ?? true,
    comments:       row?.comments        ?? true,
    likes:          row?.likes           ?? true,
    liveStreams:    row?.live_streams     ?? true,
    marketing:      row?.marketing       ?? false,
    invitations:    row?.invitations     ?? true,
    archiveNotifs:  row?.archive_notifs  ?? true,
    pinnedNotifs:   row?.pinned_notifs   ?? true,
    downloadNotifs: row?.download_notifs ?? true,
    qualityNotifs:  row?.quality_notifs  ?? false,
    backupNotifs:   row?.backup_notifs   ?? false,
    pins:           row?.pins            ?? true,
    sound:          row?.sound           ?? "default",
    vibration:      row?.vibration       ?? "default",
    showPreview:    row?.show_preview    ?? true,
  });
});

router.patch("/messaging/notifications", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const b = req.body;
  await db.execute(sql`
    INSERT INTO notification_settings (
      user_id, messages, groups, calls, mentions, reactions, friend_requests,
      comments, likes, live_streams, marketing, invitations, archive_notifs,
      pinned_notifs, download_notifs, quality_notifs, backup_notifs, pins,
      sound, vibration, show_preview, updated_at
    ) VALUES (
      ${userId},
      ${b.messages        ?? true}, ${b.groups      ?? true},  ${b.calls     ?? true},
      ${b.mentions        ?? true}, ${b.reactions   ?? true},  ${b.friendRequests ?? true},
      ${b.comments        ?? true}, ${b.likes       ?? true},  ${b.liveStreams ?? true},
      ${b.marketing       ?? false},${b.invitations ?? true},  ${b.archiveNotifs ?? true},
      ${b.pinnedNotifs    ?? true}, ${b.downloadNotifs ?? true},${b.qualityNotifs ?? false},
      ${b.backupNotifs    ?? false},${b.pins         ?? true},
      ${b.sound      ?? "default"},${b.vibration ?? "default"},${b.showPreview ?? true},
      now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      messages        = COALESCE(EXCLUDED.messages,         notification_settings.messages),
      groups          = COALESCE(EXCLUDED.groups,           notification_settings.groups),
      calls           = COALESCE(EXCLUDED.calls,            notification_settings.calls),
      mentions        = COALESCE(EXCLUDED.mentions,         notification_settings.mentions),
      reactions       = COALESCE(EXCLUDED.reactions,        notification_settings.reactions),
      friend_requests = COALESCE(EXCLUDED.friend_requests,  notification_settings.friend_requests),
      comments        = COALESCE(EXCLUDED.comments,         notification_settings.comments),
      likes           = COALESCE(EXCLUDED.likes,            notification_settings.likes),
      live_streams    = COALESCE(EXCLUDED.live_streams,     notification_settings.live_streams),
      marketing       = COALESCE(EXCLUDED.marketing,        notification_settings.marketing),
      invitations     = COALESCE(EXCLUDED.invitations,      notification_settings.invitations),
      archive_notifs  = COALESCE(EXCLUDED.archive_notifs,   notification_settings.archive_notifs),
      pinned_notifs   = COALESCE(EXCLUDED.pinned_notifs,    notification_settings.pinned_notifs),
      download_notifs = COALESCE(EXCLUDED.download_notifs,  notification_settings.download_notifs),
      quality_notifs  = COALESCE(EXCLUDED.quality_notifs,   notification_settings.quality_notifs),
      backup_notifs   = COALESCE(EXCLUDED.backup_notifs,    notification_settings.backup_notifs),
      pins            = COALESCE(EXCLUDED.pins,             notification_settings.pins),
      sound           = COALESCE(EXCLUDED.sound,            notification_settings.sound),
      vibration       = COALESCE(EXCLUDED.vibration,        notification_settings.vibration),
      show_preview    = COALESCE(EXCLUDED.show_preview,     notification_settings.show_preview),
      updated_at      = now()
  `);
  res.json({ ok: true });
});

/* ─────────────────────────────────────────────
   ARCHIVED CHATS
───────────────────────────────────────────── */
router.get("/messaging/archive", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const result = await db.execute(sql`
    SELECT ac.id, ac.conversation_id, ac.archived_at
    FROM archived_chats ac
    WHERE ac.user_id = ${userId}
    ORDER BY ac.archived_at DESC
    LIMIT 50
  `);
  const rows = (result as any).rows ?? result;
  res.json(rows);
});

router.post("/messaging/archive", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const { conversationId } = req.body;
  if (!conversationId) { res.status(400).json({ error: "conversationId required" }); return; }
  await db.execute(sql`
    INSERT INTO archived_chats (user_id, conversation_id) VALUES (${userId}, ${conversationId})
    ON CONFLICT (user_id, conversation_id) DO NOTHING
  `);
  res.json({ ok: true });
});

router.delete("/messaging/archive/:conversationId", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const conversationId = Number(req.params.conversationId);
  await db.execute(sql`DELETE FROM archived_chats WHERE user_id = ${userId} AND conversation_id = ${conversationId}`);
  res.json({ ok: true });
});

/* ─────────────────────────────────────────────
   PINNED CHATS
───────────────────────────────────────────── */
router.get("/messaging/pinned", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const result = await db.execute(sql`
    SELECT id, conversation_id, position, created_at
    FROM pinned_chats WHERE user_id = ${userId}
    ORDER BY position ASC, created_at DESC
    LIMIT 20
  `);
  const rows = (result as any).rows ?? result;
  res.json(rows);
});

router.post("/messaging/pinned", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const { conversationId, position } = req.body;
  if (!conversationId) { res.status(400).json({ error: "conversationId required" }); return; }
  await db.execute(sql`
    INSERT INTO pinned_chats (user_id, conversation_id, position)
    VALUES (${userId}, ${conversationId}, ${position ?? 0})
    ON CONFLICT (user_id, conversation_id) DO UPDATE SET position = EXCLUDED.position
  `);
  res.json({ ok: true });
});

router.delete("/messaging/pinned/:conversationId", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const conversationId = Number(req.params.conversationId);
  await db.execute(sql`DELETE FROM pinned_chats WHERE user_id = ${userId} AND conversation_id = ${conversationId}`);
  res.json({ ok: true });
});

/* ─────────────────────────────────────────────
   MESSAGE REQUESTS
───────────────────────────────────────────── */
router.get("/messaging/requests", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const status = req.query.status === "spam" ? "spam" : "pending";
  const result = await db.execute(sql`
    SELECT
      mr.id, mr.sender_id, mr.message_preview, mr.status, mr.created_at,
      u.first_name, u.last_name, u.avatar_url
    FROM message_requests mr
    JOIN users u ON u.id = mr.sender_id
    WHERE mr.receiver_id = ${userId} AND mr.status = ${status}
    ORDER BY mr.created_at DESC
    LIMIT 50
  `);
  const rows = (result as any).rows ?? result;
  res.json(rows.map((r: any) => ({
    id: r.id,
    senderId: r.sender_id,
    senderName: `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim(),
    senderAvatarUrl: r.avatar_url ?? null,
    messagePreview: r.message_preview ?? "",
    status: r.status,
    createdAt: r.created_at,
  })));
});

router.patch("/messaging/requests/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const id = Number(req.params.id);
  const { status } = req.body;
  if (!["accepted", "rejected", "spam"].includes(status)) {
    res.status(400).json({ error: "Invalid status" }); return;
  }
  await db.execute(sql`
    UPDATE message_requests SET status = ${status}
    WHERE id = ${id} AND receiver_id = ${userId}
  `);
  res.json({ ok: true });
});

/* ─────────────────────────────────────────────
   BACKUP
───────────────────────────────────────────── */
router.get("/messaging/backup", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  await ensureBackupSettings(userId);
  const result = await db.execute(sql`SELECT * FROM chat_backups WHERE user_id = ${userId}`);
  const row = (result as any).rows?.[0] ?? (result as any)[0];
  res.json({
    backupSize:   row?.backup_size    ?? 134217728,
    lastBackup:   row?.last_backup    ?? new Date().toISOString(),
    autoBackup:   row?.auto_backup    ?? true,
    includeVideos:row?.include_videos ?? false,
    includeFiles: row?.include_files  ?? false,
    account:      "pat***@brutepawa.com",
  });
});

router.patch("/messaging/backup", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const { autoBackup, includeVideos, includeFiles } = req.body;
  await db.execute(sql`
    INSERT INTO chat_backups (user_id, auto_backup, include_videos, include_files)
    VALUES (${userId}, ${autoBackup ?? true}, ${includeVideos ?? false}, ${includeFiles ?? false})
    ON CONFLICT (user_id) DO UPDATE SET
      auto_backup    = COALESCE(EXCLUDED.auto_backup,    chat_backups.auto_backup),
      include_videos = COALESCE(EXCLUDED.include_videos, chat_backups.include_videos),
      include_files  = COALESCE(EXCLUDED.include_files,  chat_backups.include_files)
  `);
  res.json({ ok: true });
});

router.post("/messaging/backup/now", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  await ensureBackupSettings(userId);
  await db.execute(sql`
    UPDATE chat_backups SET last_backup = now(), backup_size = 134217728 WHERE user_id = ${userId}
  `);
  res.json({ ok: true, lastBackup: new Date().toISOString(), backupSize: 134217728 });
});

/* ─────────────────────────────────────────────
   SECURITY SESSIONS
───────────────────────────────────────────── */
router.get("/messaging/security/sessions", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const result = await db.execute(sql`
    SELECT id, device_name, device_type, ip_address, country, last_activity, active
    FROM security_sessions
    WHERE user_id = ${userId} AND active = true
    ORDER BY last_activity DESC
    LIMIT 20
  `);
  const rows = (result as any).rows ?? result;
  res.json(rows);
});

router.delete("/messaging/security/sessions/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const id = Number(req.params.id);
  await db.execute(sql`
    UPDATE security_sessions SET active = false WHERE id = ${id} AND user_id = ${userId}
  `);
  res.json({ ok: true });
});

/* ─────────────────────────────────────────────
   MEDIA QUALITY
───────────────────────────────────────────── */
router.get("/messaging/media-quality", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  await ensureMessagingSettings(userId);
  const result = await db.execute(sql`SELECT media_quality FROM messaging_settings WHERE user_id = ${userId}`);
  const row = (result as any).rows?.[0] ?? (result as any)[0];
  res.json({ quality: row?.media_quality ?? "standard" });
});

router.patch("/messaging/media-quality", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const { quality } = req.body;
  if (!["standard", "haute"].includes(quality)) {
    res.status(400).json({ error: "quality must be standard or haute" }); return;
  }
  await db.execute(sql`
    INSERT INTO messaging_settings (user_id, media_quality, updated_at)
    VALUES (${userId}, ${quality}, now())
    ON CONFLICT (user_id) DO UPDATE SET media_quality = ${quality}, updated_at = now()
  `);
  res.json({ ok: true });
});

export default router;
