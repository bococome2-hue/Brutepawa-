import { pgTable, text, serial, bigserial, timestamp, integer, boolean, pgEnum, uniqueIndex, index, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const postsTable = pgTable("posts", {
  id: serial("id").primaryKey(),
  authorId: integer("author_id").notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  thumbnailUrl: text("thumbnail_url"),
  musicTrackName: text("music_track_name"),
  musicArtist: text("music_artist"),
  musicUrl: text("music_url"),
  musicArtworkUrl: text("music_artwork_url"),
  musicDuration: text("music_duration"),
  musicLikesCount: integer("music_likes_count").notNull().default(0),
  likesCount: integer("likes_count").notNull().default(0),
  commentsCount: integer("comments_count").notNull().default(0),
  isPinned: boolean("is_pinned").notNull().default(false),
  isArchived: boolean("is_archived").notNull().default(false),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  commentsDisabled: boolean("comments_disabled").notNull().default(false),
  audience: text("audience").notNull().default("public"),
  location: text("location"),
  bgColor: text("bg_color"),
  mood: text("mood"),
  taggedUserIds: text("tagged_user_ids"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const postLikesTable = pgTable("post_likes", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull(),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const postReactionsTable = pgTable("post_reactions", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull(),
  userId: integer("user_id").notNull(),
  reactionType: text("reaction_type").notNull().default("like"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pollsTable = pgTable("polls", {
  id: serial("id").primaryKey(),
  creatorId: integer("creator_id").notNull(),
  question: text("question").notNull(),
  multipleChoice: boolean("multiple_choice").notNull().default(false),
  isPinned: boolean("is_pinned").notNull().default(false),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("polls_creator_idx").on(t.creatorId), index("polls_expires_idx").on(t.expiresAt),
  foreignKey({ columns: [t.creatorId], foreignColumns: [usersTable.id], name: "polls_creator_id_fk" }).onDelete("cascade"),
]);

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  fromUserId: integer("from_user_id").notNull(),
  toUserId: integer("to_user_id").notNull(),
  content: text("content").notNull(),
  messageType: text("message_type").notNull().default("text"),
  pollId: integer("poll_id"),
  isRead: boolean("is_read").notNull().default(false),
  isDelivered: boolean("is_delivered").notNull().default(false),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("messages_poll_idx").on(t.pollId),
  foreignKey({ columns: [t.pollId], foreignColumns: [pollsTable.id], name: "messages_poll_id_fk" }).onDelete("set null"),
]);

export const pollOptionsTable = pgTable("poll_options", {
  id: serial("id").primaryKey(),
  pollId: integer("poll_id").notNull(),
  label: text("label").notNull(),
  position: integer("position").notNull(),
}, (t) => [
  index("poll_options_poll_position_idx").on(t.pollId, t.position),
  foreignKey({ columns: [t.pollId], foreignColumns: [pollsTable.id], name: "poll_options_poll_id_fk" }).onDelete("cascade"),
]);

export const pollVotesTable = pgTable("poll_votes", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  pollId: integer("poll_id").notNull(),
  optionId: integer("option_id").notNull(),
  userId: integer("user_id").notNull(),
  votedAt: timestamp("voted_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("poll_votes_poll_option_user_unique").on(t.pollId, t.optionId, t.userId),
  index("poll_votes_poll_user_idx").on(t.pollId, t.userId),
  index("poll_votes_poll_option_idx").on(t.pollId, t.optionId),
  index("poll_votes_poll_voted_at_idx").on(t.pollId, t.votedAt, t.id),
  foreignKey({ columns: [t.pollId], foreignColumns: [pollsTable.id], name: "poll_votes_poll_id_fk" }).onDelete("cascade"),
  foreignKey({ columns: [t.optionId], foreignColumns: [pollOptionsTable.id], name: "poll_votes_option_id_fk" }).onDelete("cascade"),
  foreignKey({ columns: [t.userId], foreignColumns: [usersTable.id], name: "poll_votes_user_id_fk" }).onDelete("cascade"),
]);

export const pollFollowsTable = pgTable("poll_follows", {
  id: serial("id").primaryKey(),
  pollId: integer("poll_id").notNull(),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("poll_follows_poll_user_unique").on(t.pollId, t.userId),
  index("poll_follows_user_idx").on(t.userId),
  foreignKey({ columns: [t.pollId], foreignColumns: [pollsTable.id], name: "poll_follows_poll_id_fk" }).onDelete("cascade"),
  foreignKey({ columns: [t.userId], foreignColumns: [usersTable.id], name: "poll_follows_user_id_fk" }).onDelete("cascade"),
]);

export const pollViewsTable = pgTable("poll_views", {
  id: serial("id").primaryKey(),
  pollId: integer("poll_id").notNull(),
  userId: integer("user_id").notNull(),
  viewedAt: timestamp("viewed_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("poll_views_poll_user_unique").on(t.pollId, t.userId),
  index("poll_views_poll_idx").on(t.pollId),
  foreignKey({ columns: [t.pollId], foreignColumns: [pollsTable.id], name: "poll_views_poll_id_fk" }).onDelete("cascade"),
  foreignKey({ columns: [t.userId], foreignColumns: [usersTable.id], name: "poll_views_user_id_fk" }).onDelete("cascade"),
]);

export const liveStreamStatusEnum = pgEnum("live_stream_status", ["live", "ended"]);

export const liveMessagesTable = pgTable("live_messages", {
  id: serial("id").primaryKey(),
  streamId: integer("stream_id").notNull(),
  userId: text("user_id").notNull(),
  userName: text("user_name").notNull(),
  userFlag: text("user_flag").notNull().default(""),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("live_messages_stream_idx").on(t.streamId)]);

export const liveStreamsTable = pgTable("live_streams", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  userName: text("user_name").notNull(),
  userFlag: text("user_flag").notNull().default(""),
  liveInputId: text("live_input_id").notNull().unique(),
  webRtcUrl: text("webrtc_url").notNull(),
  playbackUrl: text("playback_url").notNull(),
  status: liveStreamStatusEnum("status").notNull().default("live"),
  viewerCount: integer("viewer_count").notNull().default(0),
  lastViewerAt: timestamp("last_viewer_at", { withTimezone: true }),
  maxDurationMinutes: integer("max_duration_minutes").notNull().default(60),
  recordingEnabled: boolean("recording_enabled").notNull().default(false),
  replayUrl: text("replay_url"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
}, (t) => [index("live_streams_status_idx").on(t.status)]);

export const commentsTable = pgTable("comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull(),
  authorId: integer("author_id").notNull(),
  parentId: integer("parent_id"),
  content: text("content").notNull().default(""),
  audioUrl: text("audio_url"),
  audioDuration: integer("audio_duration"),
  likesCount: integer("likes_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const commentLikesTable = pgTable("comment_likes", {
  id: serial("id").primaryKey(),
  commentId: integer("comment_id").notNull(),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("comment_likes_pair_idx").on(t.commentId, t.userId)]);

export const followsTable = pgTable("follows", {
  id: serial("id").primaryKey(),
  followerId: integer("follower_id").notNull(),
  followingId: integer("following_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("follows_pair_idx").on(t.followerId, t.followingId)]);

export const friendRequestsTable = pgTable("friend_requests", {
  id: serial("id").primaryKey(),
  fromUserId: integer("from_user_id").notNull(),
  toUserId: integer("to_user_id").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [uniqueIndex("friend_req_pair_idx").on(t.fromUserId, t.toUserId)]);

export const storiesTable = pgTable("stories", {
  id: serial("id").primaryKey(),
  authorId: integer("author_id").notNull(),
  mediaUrl: text("media_url"),
  thumbnailUrl: text("thumbnail_url"),
  content: text("content"),
  bgColor: text("bg_color").notNull().default("#1877F2"),
  emoji: text("emoji"),
  musicTrackName: text("music_track_name"),
  musicArtist: text("music_artist"),
  musicUrl: text("music_url"),
  musicArtworkUrl: text("music_artwork_url"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  viewsCount: integer("views_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userBlocksTable = pgTable("user_blocks", {
  id: serial("id").primaryKey(),
  blockerId: integer("blocker_id").notNull(),
  blockedId: integer("blocked_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("user_blocks_pair_idx").on(t.blockerId, t.blockedId)]);

export const userReportsTable = pgTable("user_reports", {
  id: serial("id").primaryKey(),
  reporterId: integer("reporter_id").notNull(),
  reportedId: integer("reported_id").notNull(),
  reason: text("reason").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("user_reports_status_idx").on(t.status)]);

export const userHiddenProfilesTable = pgTable("user_hidden_profiles", {
  id: serial("id").primaryKey(),
  hiderId: integer("hider_id").notNull(),
  hiddenId: integer("hidden_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("user_hidden_profiles_pair_idx").on(t.hiderId, t.hiddenId)]);

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(),
  actorId: integer("actor_id"),
  actorName: text("actor_name"),
  actorAvatarUrl: text("actor_avatar_url"),
  action: text("action").notNull(),
  detail: text("detail"),
  thumbnailUrl: text("thumbnail_url"),
  messageCount: integer("message_count"),
  link: text("link"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const eventsTable = pgTable("events", {
  id: serial("id").primaryKey(),
  organizerId: integer("organizer_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  location: text("location"),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }),
  coverUrl: text("cover_url"),
  isOnline: boolean("is_online").notNull().default(false),
  type: text("type").notNull().default("public"),
  goingCount: integer("going_count").notNull().default(0),
  interestedCount: integer("interested_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const eventRsvpsTable = pgTable("event_rsvps", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  userId: integer("user_id").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("event_rsvps_pair_idx").on(t.eventId, t.userId)]);

export const hiddenPostsTable = pgTable("hidden_posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  postId: integer("post_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("hidden_posts_pair_idx").on(t.userId, t.postId)]);

export const savedPostsTable = pgTable("saved_posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  postId: integer("post_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("saved_posts_pair_idx").on(t.userId, t.postId)]);

export const postReportsTable = pgTable("post_reports", {
  id: serial("id").primaryKey(),
  reporterId: integer("reporter_id").notNull(),
  postId: integer("post_id").notNull(),
  reason: text("reason").notNull().default("spam"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("post_reports_status_idx").on(t.status)]);

export const chatGroupTypeEnum = pgEnum("chat_group_type", ["group", "channel"]);
export const chatGroupMemberRoleEnum = pgEnum("chat_group_member_role", ["owner", "admin", "member"]);
export const chatGroupMsgTypeEnum = pgEnum("chat_group_msg_type", ["text", "system"]);

export const chatGroupsTable = pgTable("chat_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  type: chatGroupTypeEnum("type").notNull().default("group"),
  createdById: integer("created_by_id").notNull(),
  hideMembers: boolean("hide_members").notNull().default(false),
  antiSpam: boolean("anti_spam").notNull().default(false),
  topicsEnabled: boolean("topics_enabled").notNull().default(false),
  permSendMsgs: boolean("perm_send_msgs").notNull().default(true),
  permSendMedia: boolean("perm_send_media").notNull().default(true),
  permAddUsers: boolean("perm_add_users").notNull().default(true),
  permPinMsgs: boolean("perm_pin_msgs").notNull().default(true),
  permModTitles: boolean("perm_mod_titles").notNull().default(true),
  permModExchange: boolean("perm_mod_exchange").notNull().default(true),
  chargeTokens: boolean("charge_tokens").notNull().default(false),
  tokenPrice: integer("token_price").notNull().default(190),
  reactMode: text("react_mode").notNull().default("all"),
  reactEmojis: text("react_emojis").notNull().default("[]"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const chatGroupInviteLinksTable = pgTable("chat_group_invite_links", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  code: text("code").notNull(),
  label: text("label"),
  name: text("name"),
  type: text("type").notNull().default("unlimited"),
  maxUses: integer("max_uses"),
  usesCount: integer("uses_count").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  clicksCount: integer("clicks_count").notNull().default(0),
  createdById: integer("created_by_id").notNull(),
  revoked: boolean("revoked").notNull().default(false),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("chat_group_invite_links_code_unique").on(t.code), index("chat_group_invite_links_group_idx").on(t.groupId)]);
export const chatGroupMembersTable = pgTable("chat_group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  userId: integer("user_id").notNull(),
  role: chatGroupMemberRoleEnum("role").notNull().default("member"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("chat_group_members_unique").on(t.groupId, t.userId)]);

export const chatGroupMessagesTable = pgTable("chat_group_messages", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  senderId: integer("sender_id").notNull(),
  content: text("content").notNull(),
  type: chatGroupMsgTypeEnum("type").notNull().default("text"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("chat_group_messages_group_idx").on(t.groupId)]);

export const chatGroupAuditEventEnum = pgEnum("chat_group_audit_event", [
  "member_added",
  "member_left",
  "member_kicked",
  "role_changed",
  "group_updated",
]);

export const chatGroupAuditLogTable = pgTable("chat_group_audit_log", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  actorId: integer("actor_id").notNull(),
  targetId: integer("target_id"),
  event: chatGroupAuditEventEnum("event").notNull(),
  detail: text("detail"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("chat_group_audit_log_group_idx").on(t.groupId)]);

export const insertPostSchema = createInsertSchema(postsTable).omit({ id: true, createdAt: true, updatedAt: true, likesCount: true, commentsCount: true });
export const insertMessageSchema = createInsertSchema(messagesTable).omit({ id: true, createdAt: true });
export const insertCommentSchema = createInsertSchema(commentsTable).omit({ id: true, createdAt: true, updatedAt: true, likesCount: true });
export const insertNotificationSchema = createInsertSchema(notificationsTable).omit({ id: true, createdAt: true });
export const insertStorySchema = createInsertSchema(storiesTable).omit({ id: true, createdAt: true, viewsCount: true });
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof postsTable.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messagesTable.$inferSelect;
export type Poll = typeof pollsTable.$inferSelect;
export type PollOption = typeof pollOptionsTable.$inferSelect;
export type PollVote = typeof pollVotesTable.$inferSelect;
export type PollFollow = typeof pollFollowsTable.$inferSelect;
export type PollView = typeof pollViewsTable.$inferSelect;
export type LiveStream = typeof liveStreamsTable.$inferSelect;
export type LiveMessage = typeof liveMessagesTable.$inferSelect;
export type Comment = typeof commentsTable.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Follow = typeof followsTable.$inferSelect;
export type FriendRequest = typeof friendRequestsTable.$inferSelect;
export type Story = typeof storiesTable.$inferSelect;
export type InsertStory = z.infer<typeof insertStorySchema>;
export type Notification = typeof notificationsTable.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type UserBlock = typeof userBlocksTable.$inferSelect;
export type UserReport = typeof userReportsTable.$inferSelect;
