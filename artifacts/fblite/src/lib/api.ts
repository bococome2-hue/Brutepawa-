import { toast } from "sonner";

const BASE = "/api";

function notifyConnection(status: "lost" | "restored"): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(`bp:connection-${status}`));
  }
}

export function getBpToken(): string | null {
  return localStorage.getItem("bp_token");
}

export function setBpToken(token: string): void {
  localStorage.setItem("bp_token", token);
}

export function clearBpToken(): void {
  localStorage.removeItem("bp_token");
  localStorage.removeItem("fb_user");
}

export interface BpUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  role: string;
  status: string;
  createdAt: string;
  profileLocked?: boolean;
}

export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const token = getBpToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string> ?? {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...options, headers });
  } catch {
    notifyConnection("lost");
    throw new Error("Network error");
  }

  if (res.ok) {
    notifyConnection("restored");
  } else if (res.status >= 500) {
    notifyConnection("lost");
  }

  if (res.status === 401 && token) {
    clearBpToken();
    window.dispatchEvent(new CustomEvent("bp:session-expired"));
    return res;
  }

  if (!res.ok && res.status < 500 && res.status !== 401) {
    const body = await res.clone().json().catch(() => ({})) as { error?: string; message?: string };
    const msg = body.error ?? body.message ?? `Erreur ${res.status}`;
    toast.error(msg, { duration: 4000 });
  }

  return res;
}

export interface GiphyItem {
  id: string;
  title: string;
  previewUrl: string;
  url: string;
}

export async function apiGetGiphy(type: "gifs" | "stickers", q = ""): Promise<GiphyItem[]> {
  const params = new URLSearchParams({ type });
  if (q.trim()) params.set("q", q.trim());
  const res = await apiFetch(`/giphy?${params}`);
  if (!res.ok) throw new Error("GIPHY indisponible");
  const data = await res.json() as { items?: GiphyItem[] };
  return data.items ?? [];
}

export async function apiLogin(email: string, password: string): Promise<{ token: string; user: BpUser }> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? "Identifiants incorrects");
  }
  return res.json() as Promise<{ token: string; user: BpUser }>;
}

export async function apiRegister(data: {
  firstName: string; lastName: string; email: string;
  phone: string; password: string; country: string;
}): Promise<{ token: string; user: BpUser }> {
  const res = await fetch(`${BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? "Erreur lors de l'inscription");
  }
  return res.json() as Promise<{ token: string; user: BpUser }>;
}

export async function apiGetMe(): Promise<BpUser> {
  const res = await apiFetch("/users/me");
  if (!res.ok) throw new Error("Non authentifié");
  return res.json() as Promise<BpUser>;
}

export async function apiUpdateMe(data: Partial<{
  firstName: string; lastName: string; phone: string;
  country: string; bio: string; avatarUrl: string; coverUrl: string;
}>): Promise<BpUser> {
  const res = await apiFetch("/users/me", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Mise à jour échouée");
  return res.json() as Promise<BpUser>;
}

export async function apiToggleProfileLock(locked: boolean): Promise<{ ok: boolean; profileLocked: boolean }> {
  const res = await apiFetch("/users/me/profile-lock", {
    method: "PATCH",
    body: JSON.stringify({ locked }),
  });
  if (!res.ok) throw new Error("Échec du verrouillage");
  return res.json() as Promise<{ ok: boolean; profileLocked: boolean }>;
}

export interface FeedPost {
  id: number;
  authorId: number;
  authorName: string;
  authorAvatarUrl: string | null;
  authorCountry: string;
  content: string;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  musicTrackName: string | null;
  musicArtist: string | null;
  musicUrl: string | null;
  musicArtworkUrl: string | null;
  musicDuration: string | null;
  musicLikesCount: number;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  liked: boolean;
  isOwner: boolean;
  isPinned?: boolean;
  commentsDisabled?: boolean;
  audience?: string;
  authorBadgeType?: string | null;
  location?: string | null;
  taggedUsers?: { id: number; name: string }[];
  bgColor?: string | null;
  mood?: string | null;
}

export interface PublicUser {
  id: number;
  firstName: string;
  lastName: string;
  country: string | null;
  avatarUrl: string | null;
  bio: string | null;
  role?: string;
  badgeType?: string | null;
  verified?: boolean;
  profileLocked?: boolean;
  createdAt?: string;
}

export type FriendshipStatus = "none" | "pending_sent" | "pending_received" | "friends";

export interface PublicUserWithStatus extends PublicUser {
  friendshipStatus: FriendshipStatus;
  requestId?: number;
}

export interface FriendRequest {
  id: number;
  createdAt: string;
  fromUser: PublicUser;
}

export async function apiGetUsers(): Promise<PublicUser[]> {
  const res = await apiFetch("/users");
  if (!res.ok) return [];
  return res.json() as Promise<PublicUser[]>;
}

export async function apiGetUsersWithStatus(): Promise<PublicUserWithStatus[]> {
  const res = await apiFetch("/users");
  if (!res.ok) return [];
  return res.json() as Promise<PublicUserWithStatus[]>;
}

export async function apiGetUserById(userId: number): Promise<PublicUser | null> {
  const res = await apiFetch(`/users/${userId}`);
  if (!res.ok) return null;
  return res.json() as Promise<PublicUser>;
}

export async function apiSearchUsers(q: string, options?: { country?: string }): Promise<PublicUserWithStatus[]> {
  if (!q.trim()) return [];
  const params = new URLSearchParams({ q: q.trim() });
  if (options?.country) params.set("country", options.country);
  const res = await apiFetch(`/users?${params.toString()}`);
  if (!res.ok) return [];
  return res.json() as Promise<PublicUserWithStatus[]>;
}

export async function apiGetFriends(): Promise<PublicUser[]> {
  const res = await apiFetch("/users/me/friends");
  if (!res.ok) return [];
  return res.json() as Promise<PublicUser[]>;
}

export async function apiGetFriendRequests(): Promise<FriendRequest[]> {
  const res = await apiFetch("/users/me/friend-requests");
  if (!res.ok) return [];
  return res.json() as Promise<FriendRequest[]>;
}

export async function apiSendFriendRequest(userId: number): Promise<{ id: number; status: string }> {
  const res = await apiFetch(`/users/${userId}/friend-request`, { method: "POST" });
  if (!res.ok) {
    const e = await res.json().catch(() => ({})) as { error?: string; requestId?: number; status?: string };
    if (res.status === 409) return { id: e.requestId ?? 0, status: e.status ?? "pending" };
    throw new Error(e.error ?? "Erreur");
  }
  return res.json() as Promise<{ id: number; status: string }>;
}

export async function apiAcceptFriendRequest(requestId: number): Promise<void> {
  const res = await apiFetch(`/friends/${requestId}/accept`, { method: "POST" });
  if (!res.ok) throw new Error("Erreur");
}

export async function apiRejectFriendRequest(requestId: number): Promise<void> {
  const res = await apiFetch(`/friends/${requestId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Erreur");
}

export async function apiBlockUser(userId: number): Promise<void> {
  const res = await apiFetch(`/users/${userId}/block`, { method: "POST" });
  if (!res.ok) throw new Error("Erreur lors du blocage");
}

export async function apiUnblockUser(userId: number): Promise<void> {
  const res = await apiFetch(`/users/${userId}/block`, { method: "DELETE" });
  if (!res.ok) throw new Error("Erreur lors du déblocage");
}

export interface BlockedUser {
  id: number;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

export async function apiGetBlockedUsers(): Promise<BlockedUser[]> {
  const res = await apiFetch("/users/me/blocks");
  if (!res.ok) throw new Error("Erreur lors du chargement des utilisateurs bloqués");
  return res.json() as Promise<BlockedUser[]>;
}

export async function apiCheckBlock(userId: number): Promise<boolean> {
  const res = await apiFetch(`/users/${userId}/block`);
  if (!res.ok) return false;
  const data = await res.json() as { blocked: boolean };
  return data.blocked;
}

export async function apiReportUser(userId: number, reason: string, description?: string): Promise<void> {
  const res = await apiFetch(`/users/${userId}/report`, {
    method: "POST",
    body: JSON.stringify({ reason, description }),
  });
  if (!res.ok) throw new Error("Erreur lors du signalement");
}

export async function apiGetMutualFriends(userId: number): Promise<PublicUser[]> {
  const res = await apiFetch(`/users/${userId}/mutual-friends`);
  if (!res.ok) return [];
  return res.json() as Promise<PublicUser[]>;
}

export async function apiGetMutualGroups(userId: number): Promise<{ id: number; name: string; avatarUrl: string | null; type: string }[]> {
  const res = await apiFetch(`/users/${userId}/mutual-groups`);
  if (!res.ok) return [];
  return res.json() as Promise<{ id: number; name: string; avatarUrl: string | null; type: string }[]>;
}

export async function apiHideUser(userId: number): Promise<void> {
  const res = await apiFetch(`/users/${userId}/hide`, { method: "POST" });
  if (!res.ok) throw new Error("Erreur");
}

export async function apiGetPosts(page = 1): Promise<FeedPost[]> {
  const res = await apiFetch(`/posts?page=${page}`);
  if (!res.ok) return [];
  return res.json() as Promise<FeedPost[]>;
}

export async function apiSearchPosts(search: string): Promise<FeedPost[]> {
  if (!search.trim()) return [];
  const res = await apiFetch(`/posts?search=${encodeURIComponent(search.trim())}`);
  if (!res.ok) return [];
  return res.json() as Promise<FeedPost[]>;
}

export interface ApiGroup {
  id: number;
  name: string;
  description: string | null;
  category: string;
  emoji: string;
  coverUrl: string | null;
  country: string | null;
  privacy: string;
  membersCount: number;
  createdAt: string;
  isMember?: boolean;
}

export interface ApiGroupDetail extends ApiGroup {
  isMember: boolean;
  memberRole: string | null;
  joinRequestStatus: string | null;
}

export interface ApiGroupMember {
  memberId: number;
  role: string;
  joinedAt: string;
  userId: number;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

export interface ApiGroupMembersResponse {
  members: ApiGroupMember[];
  myRole: string;
}

export interface ApiJoinRequest {
  requestId: number;
  status: string;
  createdAt: string;
  userId: number;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

export interface ApiGroupBot {
  id: number | null;
  groupId: number;
  botType: string;
  enabled: boolean;
  settings: Record<string, any>;
  updatedAt: string | null;
}

export interface ApiBotLog {
  id: number;
  groupId: number;
  botType: string;
  action: string;
  targetUserId: number | null;
  detail: string | null;
  createdAt: string;
}

export async function apiGetGroupBots(groupId: number): Promise<ApiGroupBot[]> {
  const res = await apiFetch(`/groups/${groupId}/bots`);
  if (!res.ok) throw new Error("Impossible de charger les bots");
  return res.json() as Promise<ApiGroupBot[]>;
}

export async function apiPatchGroupBot(
  groupId: number,
  botType: string,
  data: { enabled?: boolean; settings?: object },
): Promise<ApiGroupBot> {
  const res = await apiFetch(`/groups/${groupId}/bots/${botType}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? "Impossible de mettre à jour le bot");
  }
  return res.json() as Promise<ApiGroupBot>;
}

export async function apiGetBotLogs(groupId: number): Promise<ApiBotLog[]> {
  const res = await apiFetch(`/groups/${groupId}/bot-logs`);
  if (!res.ok) return [];
  return res.json() as Promise<ApiBotLog[]>;
}

export async function apiGetGroups(): Promise<ApiGroup[]> {
  const res = await apiFetch("/groups");
  if (!res.ok) return [];
  return res.json() as Promise<ApiGroup[]>;
}

export async function apiSearchGroups(search: string, options?: { country?: string; category?: string }): Promise<ApiGroup[]> {
  if (!search.trim()) return [];
  const params = new URLSearchParams({ search: search.trim() });
  if (options?.country) params.set("country", options.country);
  if (options?.category) params.set("category", options.category);
  const res = await apiFetch(`/groups?${params.toString()}`);
  if (!res.ok) return [];
  return res.json() as Promise<ApiGroup[]>;
}

export async function apiGetGroup(id: number): Promise<ApiGroupDetail> {
  const res = await apiFetch(`/groups/${id}`);
  if (!res.ok) throw new Error("Groupe introuvable");
  return res.json() as Promise<ApiGroupDetail>;
}

export async function apiUpdateGroup(id: number, data: {
  name?: string;
  description?: string;
  category?: string;
  coverUrl?: string | null;
  privacy?: string;
}): Promise<ApiGroupDetail> {
  const res = await apiFetch(`/groups/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? "Erreur lors de la mise à jour");
  }
  return res.json() as Promise<ApiGroupDetail>;
}

export async function apiJoinGroup(id: number): Promise<void> {
  const res = await apiFetch(`/groups/${id}/join`, { method: "POST" });
  if (!res.ok) throw new Error("Impossible de rejoindre le groupe");
}

export async function apiLeaveGroup(id: number): Promise<void> {
  const res = await apiFetch(`/groups/${id}/leave`, { method: "DELETE" });
  if (!res.ok) throw new Error("Impossible de quitter le groupe");
}

export interface ApiGroupPost {
  id: number;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  authorId: number;
  authorFirstName: string;
  authorLastName: string;
  authorAvatarUrl: string | null;
}

export async function apiGetGroupPosts(groupId: number): Promise<ApiGroupPost[]> {
  const res = await apiFetch(`/groups/${groupId}/posts`);
  if (!res.ok) return [];
  return res.json() as Promise<ApiGroupPost[]>;
}

export async function apiCreateGroupPost(groupId: number, content: string, imageUrl?: string): Promise<void> {
  const res = await apiFetch(`/groups/${groupId}/posts`, {
    method: "POST",
    body: JSON.stringify({ content, imageUrl: imageUrl ?? null }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? "Impossible de publier dans ce groupe");
  }
}

export async function apiGetGroupMembers(groupId: number): Promise<ApiGroupMembersResponse> {
  const res = await apiFetch(`/groups/${groupId}/members`);
  if (!res.ok) throw new Error("Impossible de charger les membres");
  return res.json() as Promise<ApiGroupMembersResponse>;
}

export async function apiRemoveGroupMember(groupId: number, targetUserId: number): Promise<void> {
  const res = await apiFetch(`/groups/${groupId}/members/${targetUserId}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? "Impossible de retirer ce membre");
  }
}

export async function apiSetGroupMemberRole(groupId: number, targetUserId: number, role: string): Promise<void> {
  const res = await apiFetch(`/groups/${groupId}/members/${targetUserId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? "Impossible de changer le rôle");
  }
}

export async function apiRequestToJoin(groupId: number): Promise<{ status: string; requestId: number }> {
  const res = await apiFetch(`/groups/${groupId}/join-requests`, { method: "POST" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? "Impossible d'envoyer la demande");
  }
  return res.json() as Promise<{ status: string; requestId: number }>;
}

export async function apiGetJoinRequests(groupId: number): Promise<ApiJoinRequest[]> {
  const res = await apiFetch(`/groups/${groupId}/join-requests`);
  if (!res.ok) return [];
  return res.json() as Promise<ApiJoinRequest[]>;
}

export async function apiHandleJoinRequest(groupId: number, requestId: number, action: "approve" | "reject"): Promise<void> {
  const res = await apiFetch(`/groups/${groupId}/join-requests/${requestId}`, {
    method: "PATCH",
    body: JSON.stringify({ action }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? "Impossible de traiter la demande");
  }
}

export async function apiCreatePost(
  content: string,
  imageUrl?: string,
  thumbnailUrl?: string,
  music?: { trackName: string; artist: string; url: string | null; artworkUrl: string | null; duration: string | null },
  location?: string,
  taggedUserIds?: number[],
  bgColor?: string,
  mood?: string,
): Promise<void> {
  const res = await apiFetch("/posts", {
    method: "POST",
    body: JSON.stringify({
      content,
      imageUrl: imageUrl ?? null,
      thumbnailUrl: thumbnailUrl ?? null,
      musicTrackName:  music?.trackName  ?? null,
      musicArtist:     music?.artist     ?? null,
      musicUrl:        music?.url        ?? null,
      musicArtworkUrl: music?.artworkUrl ?? null,
      musicDuration:   music?.duration   ?? null,
      location:        location ?? null,
      taggedUserIds:   taggedUserIds ?? [],
      bgColor:         bgColor ?? null,
      mood:            mood ?? null,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `Erreur ${res.status}`);
  }
}

export async function apiToggleMusicLike(postId: number): Promise<{ liked: boolean; musicLikesCount: number }> {
  const r = await apiFetch(`/posts/${postId}/music-like`, { method: "POST" });
  if (!r.ok) throw new Error("music-like failed");
  return r.json() as Promise<{ liked: boolean; musicLikesCount: number }>;
}

/* ── Location API ─────────────────────────────────────────────────────────── */

export interface LocationResult {
  id: number; name: string; city: string | null; region: string | null;
  country: string; countryCode: string; lat: number | null; lng: number | null;
  placeType: string; display: string; flag: string;
}
export interface SavedLocationResult extends LocationResult {
  savedId: number; label: string | null; icon: string;
}

export async function apiSearchLocations(q: string, limit = 15): Promise<LocationResult[]> {
  const r = await apiFetch(`/location/search?q=${encodeURIComponent(q)}&limit=${limit}`);
  return r.ok ? (r.json() as Promise<LocationResult[]>) : [];
}
export async function apiGetPopularLocations(countryCode = "BJ", limit = 10): Promise<LocationResult[]> {
  const r = await apiFetch(`/location/popular?country=${countryCode}&limit=${limit}`);
  return r.ok ? (r.json() as Promise<LocationResult[]>) : [];
}
export async function apiGetRecentLocations(): Promise<LocationResult[]> {
  const r = await apiFetch("/location/recent");
  return r.ok ? (r.json() as Promise<LocationResult[]>) : [];
}
export async function apiGetSavedLocations(): Promise<SavedLocationResult[]> {
  const r = await apiFetch("/location/saved");
  return r.ok ? (r.json() as Promise<SavedLocationResult[]>) : [];
}
export async function apiReverseGeocode(lat: number, lng: number): Promise<(LocationResult & { neighborhood: string }) | null> {
  const r = await apiFetch("/location/current", { method: "POST", body: JSON.stringify({ lat, lng }) });
  return r.ok ? (r.json() as Promise<LocationResult & { neighborhood: string }>) : null;
}
export async function apiSaveLocation(data: Partial<LocationResult> & { label?: string; icon?: string }): Promise<void> {
  await apiFetch("/location/save", { method: "POST", body: JSON.stringify(data) });
}
export async function apiDeleteSavedLocation(savedId: number): Promise<void> {
  await apiFetch(`/location/save/${savedId}`, { method: "DELETE" });
}

export async function apiLikePost(id: number, action: "like" | "unlike"): Promise<void> {
  await apiFetch(`/posts/${id}/like`, {
    method: "POST",
    body: JSON.stringify({ action }),
  });
}

export interface ReactionSummaryItem { type: string; count: number; }
export interface ReactPostResult {
  userReactionType: string | null;
  reactionSummary: ReactionSummaryItem[];
  likesCount: number;
}
export async function apiReactPost(id: number, reactionType: string | null): Promise<ReactPostResult> {
  const r = await apiFetch(`/posts/${id}/react`, {
    method: "POST",
    body: JSON.stringify({ reactionType }),
  });
  return r.json();
}

export async function apiDeletePost(id: number): Promise<void> {
  await apiFetch(`/posts/${id}`, { method: "DELETE" });
}

export async function apiArchivePost(id: number): Promise<void> {
  await apiFetch(`/posts/${id}/archive`, { method: "POST" });
}

export async function apiPinPost(id: number): Promise<void> {
  await apiFetch(`/posts/${id}/pin`, { method: "POST" });
}

export async function apiUnpinPost(id: number): Promise<void> {
  await apiFetch(`/posts/${id}/unpin`, { method: "POST" });
}

export async function apiHidePost(id: number): Promise<void> {
  await apiFetch(`/posts/${id}/hide`, { method: "POST" });
}

export async function apiTogglePostComments(id: number): Promise<void> {
  await apiFetch(`/posts/${id}/comments/toggle`, { method: "POST" });
}

export async function apiSetPostAudience(id: number, audience: string): Promise<void> {
  await apiFetch(`/posts/${id}/audience`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ audience }) });
}

export async function apiGetPostStats(id: number): Promise<{ views: number; likes: number; comments: number; shares: number; saves: number; engagement: string; reach: number }> {
  const res = await apiFetch(`/posts/${id}/statistics`);
  if (!res.ok) throw new Error("Erreur stats");
  return res.json() as Promise<{ views: number; likes: number; comments: number; shares: number; saves: number; engagement: string; reach: number }>;
}

export function saveFbUser(user: BpUser): void {
  const COUNTRY_FLAGS: Record<string, string> = {
    CI: "🇨🇮", SN: "🇸🇳", BJ: "🇧🇯", TG: "🇹🇬", BF: "🇧🇫", NE: "🇳🇪",
    ML: "🇲🇱", GN: "🇬🇳", CM: "🇨🇲", TD: "🇹🇩", GA: "🇬🇦", CG: "🇨🇬",
    CD: "🇨🇩", CF: "🇨🇫", GH: "🇬🇭",
  };
  localStorage.setItem("fb_user", JSON.stringify({
    id: user.id,
    name: `${user.firstName} ${user.lastName}`,
    email: user.email,
    phone: user.phone,
    country: user.country,
    countryCode: user.country,
    flag: COUNTRY_FLAGS[user.country] ?? "🌍",
    avatarUrl: user.avatarUrl ?? "",
    coverUrl: user.coverUrl ?? "",
    bio: user.bio ?? "",
  }));
}

// ── Stories ──────────────────────────────────────────────────────────────────

export interface StoryItem {
  id: number;
  mediaUrl: string | null;
  content: string | null;
  bgColor: string;
  emoji: string | null;
  musicTrackName: string | null;
  musicArtist: string | null;
  musicUrl: string | null;
  musicArtworkUrl: string | null;
  expiresAt: string;
  viewsCount: number;
  createdAt: string;
}

export interface StoryGroup {
  authorId: number;
  authorName: string;
  authorAvatarUrl: string | null;
  authorCountry: string;
  storiesCount: number;
  stories: StoryItem[];
  latestStoryAt: string | null;
}

export async function apiGetStories(): Promise<StoryGroup[]> {
  const res = await apiFetch("/stories");
  if (!res.ok) return [];
  return res.json() as Promise<StoryGroup[]>;
}

export async function apiCreateStory(data: {
  mediaUrl?: string;
  thumbnailUrl?: string;
  content?: string;
  bgColor?: string;
  emoji?: string;
  musicTrackName?: string | null;
  musicArtist?: string | null;
  musicUrl?: string | null;
  musicArtworkUrl?: string | null;
}): Promise<void> {
  const res = await apiFetch("/stories", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? "Erreur création story");
  }
}

export async function apiViewStory(id: number): Promise<void> {
  await apiFetch(`/stories/${id}/view`, { method: "POST" });
}

export async function apiDeleteStory(id: number): Promise<void> {
  await apiFetch(`/stories/${id}`, { method: "DELETE" });
}

// ── Wallet ───────────────────────────────────────────────────────────────────

export interface ApiWallet {
  id: number;
  userId: number;
  balance: number;
  currency: string;
}

export interface ApiTx {
  id: number;
  type: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  fromUserId: number | null;
  toUserId: number | null;
  createdAt: string;
}

export async function apiGetWallet(): Promise<ApiWallet> {
  const res = await apiFetch("/wallet");
  if (!res.ok) throw new Error("Wallet non disponible");
  return res.json() as Promise<ApiWallet>;
}

export async function apiGetTransactions(): Promise<ApiTx[]> {
  const res = await apiFetch("/wallet/transactions");
  if (!res.ok) return [];
  return res.json() as Promise<ApiTx[]>;
}

export async function apiDeposit(amount: number, operator: string, phone: string): Promise<ApiTx> {
  const res = await apiFetch("/wallet/deposit", {
    method: "POST",
    body: JSON.stringify({ amount, currency: "XOF", operator, phone }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})) as { error?: string }; throw new Error(e.error ?? "Dépôt échoué"); }
  return res.json() as Promise<ApiTx>;
}

export async function apiTransfer(toUserId: number, amount: number, description?: string): Promise<ApiTx> {
  const res = await apiFetch("/wallet/transfer", {
    method: "POST",
    body: JSON.stringify({ toUserId, amount, currency: "XOF", description }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})) as { error?: string }; throw new Error(e.error ?? "Transfert échoué"); }
  return res.json() as Promise<ApiTx>;
}

// ── Polls ────────────────────────────────────────────────────────────────────

export interface PollVoterPreview {
  userId: number;
  name: string;
  avatarUrl: string | null;
}

export interface PollOption {
  id: number;
  text: string;
  position: number;
  voteCount: number;
  percentage: number;
  votersPreview: PollVoterPreview[];
  remainingVoters: number;
}

export interface PollDetail {
  id: number;
  creator: { userId: number; name: string; avatarUrl: string | null };
  question: string;
  multipleChoice: boolean;
  expiresAt: string | null;
  createdAt: string;
  totalVotes: number;
  totalSelections: number;
  uniqueParticipants: number;
  viewsCount: number;
  followedByMe: boolean;
  myOptionIds: number[];
  options: PollOption[];
  popular: boolean;
  canManage: boolean;
  isClosed: boolean;
  isPinned: boolean;
}

export interface PollVoter {
  userId: number;
  name: string;
  avatarUrl: string | null;
  isOnline: boolean;
  votedAt: string;
  optionIds: number[];
  optionLabels: string[];
}

export async function apiCreatePoll(data: { recipientId: number; question: string; options: string[]; multipleChoice: boolean; expiresAt: string }): Promise<{ message: ApiChatMessage; poll: PollDetail }> {
  const res = await apiFetch("/polls", { method: "POST", body: JSON.stringify(data) });
  if (!res.ok) throw new Error("Failed to create poll");
  return res.json() as Promise<{ message: ApiChatMessage; poll: PollDetail }>;
}

export async function apiGetPoll(id: number): Promise<PollDetail> {
  const res = await apiFetch(`/polls/${id}`);
  if (!res.ok) throw new Error("Failed to get poll");
  return res.json() as Promise<PollDetail>;
}

export async function apiVotePoll(id: number, optionIds: number[]): Promise<PollDetail> {
  const res = await apiFetch(`/polls/${id}/votes`, { method: "POST", body: JSON.stringify({ optionIds }) });
  if (!res.ok) throw new Error("Failed to vote");
  return res.json() as Promise<PollDetail>;
}

export async function apiTogglePollFollow(id: number, following: boolean): Promise<{ followedByMe: boolean }> {
  const res = await apiFetch(`/polls/${id}/follow`, { method: "PUT", body: JSON.stringify({ following }) });
  if (!res.ok) throw new Error("Failed to follow poll");
  return res.json() as Promise<{ followedByMe: boolean }>;
}

export async function apiViewPoll(id: number): Promise<void> {
  await apiFetch(`/polls/${id}/view`, { method: "POST" });
}

export async function apiGetPollVoters(id: number, limit = 20, cursor?: string, optionId?: number, search?: string): Promise<{ voters: PollVoter[]; nextCursor?: string }> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  if (optionId) params.set("optionId", String(optionId));
  if (search) params.set("search", search);
  const res = await apiFetch(`/polls/${id}/voters?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to get voters");
  return res.json() as Promise<{ voters: PollVoter[]; nextCursor?: string }>;
}

export async function apiUpdatePoll(id: number, data: { question: string; options: string[] }): Promise<PollDetail> {
  const res = await apiFetch(`/polls/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  if (!res.ok) throw new Error("Impossible de modifier le sondage");
  return res.json() as Promise<PollDetail>;
}

export async function apiClosePoll(id: number): Promise<PollDetail> {
  const res = await apiFetch(`/polls/${id}/close`, { method: "POST" });
  if (!res.ok) throw new Error("Impossible de clôturer le sondage");
  return res.json() as Promise<PollDetail>;
}

export async function apiDeletePoll(id: number): Promise<void> {
  const res = await apiFetch(`/polls/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Impossible de supprimer le sondage");
}

export async function apiPinPoll(id: number, pinned: boolean): Promise<PollDetail> {
  const res = await apiFetch(`/polls/${id}/pin`, { method: "PUT", body: JSON.stringify({ pinned }) });
  if (!res.ok) throw new Error("Impossible d'épingler le sondage");
  return res.json() as Promise<PollDetail>;
}

// ── Tontines ─────────────────────────────────────────────────────────────────

export interface ApiTontine {
  id: number;
  name: string;
  description: string | null;
  contributionAmount: number;
  cycle: string;
  currency: string;
  status: string;
  nextContributionDate: string | null;
  createdById: number;
  membersCount: number;
  createdAt: string;
}

export async function apiGetTontines(): Promise<ApiTontine[]> {
  const res = await apiFetch("/tontines");
  if (!res.ok) return [];
  return res.json() as Promise<ApiTontine[]>;
}

export async function apiGetOpenTontines(): Promise<ApiTontine[]> {
  const res = await apiFetch("/tontines?scope=open");
  if (!res.ok) return [];
  return res.json() as Promise<ApiTontine[]>;
}

export async function apiCreateTontine(data: { name: string; contributionAmount: number; cycle: string }): Promise<ApiTontine> {
  const res = await apiFetch("/tontines", {
    method: "POST",
    body: JSON.stringify({ ...data, currency: "XOF" }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})) as { error?: string }; throw new Error(e.error ?? "Création échouée"); }
  return res.json() as Promise<ApiTontine>;
}

export async function apiJoinTontine(id: number): Promise<void> {
  await apiFetch(`/tontines/${id}/members`, { method: "POST", body: JSON.stringify({}) });
}

export async function apiContribute(tontineId: number, amount: number): Promise<void> {
  await apiFetch(`/tontines/${tontineId}/contribute`, {
    method: "POST",
    body: JSON.stringify({ amount, currency: "XOF" }),
  });
}

// ── Messages ─────────────────────────────────────────────────────────────────

export interface ApiConversation {
  userId: number;
  lastMessage: string;
  lastSenderId: number;
  lastMsgIsRead: boolean;
  lastMsgIsDelivered: boolean;
  unreadCount: number;
  updatedAt: string;
}

export interface ApiChatMessage {
  id: number;
  fromUserId: number;
  toUserId: number;
  content: string;
  isRead: boolean;
  isDelivered: boolean;
  createdAt: string;
  messageType?: "text" | "poll" | "image" | "audio" | "contact" | "location";
  pollId?: number;
}

export async function apiGetConversations(): Promise<ApiConversation[]> {
  const res = await apiFetch("/messages");
  if (!res.ok) return [];
  return res.json() as Promise<ApiConversation[]>;
}

export async function apiGetUserStats(userId: number): Promise<{ postsCount: number; followersCount: number; followingCount: number }> {
  const res = await apiFetch(`/users/${userId}/stats`);
  if (!res.ok) return { postsCount: 0, followersCount: 0, followingCount: 0 };
  return res.json() as Promise<{ postsCount: number; followersCount: number; followingCount: number }>;
}

export async function apiGetMessages(userId: number, before?: number, markRead = false): Promise<{ messages: ApiChatMessage[]; hasMore: boolean }> {
  const params = new URLSearchParams();
  if (before) params.set("before", String(before));
  if (markRead) params.set("mark_read", "1");
  const qs  = params.toString();
  const url = `/messages/${userId}${qs ? `?${qs}` : ""}`;
  const res = await apiFetch(url);
  if (!res.ok) return { messages: [], hasMore: false };
  return res.json() as Promise<{ messages: ApiChatMessage[]; hasMore: boolean }>;
}

export async function apiMarkMessagesRead(userId: number): Promise<void> {
  await apiFetch(`/messages/${userId}?mark_read=1`).catch(() => {});
}

export async function apiDeleteConversation(userId: number): Promise<void> {
  await apiFetch(`/messages/${userId}`, { method: "DELETE" });
}

export async function apiDeleteMessage(messageId: number): Promise<void> {
  await apiFetch(`/messages/msg/${messageId}`, { method: "DELETE" });
}

export async function apiSendMessage(toUserId: number, content: string): Promise<ApiChatMessage> {
  const res = await apiFetch("/messages", {
    method: "POST",
    body: JSON.stringify({ toUserId, content }),
  });
  if (!res.ok) throw new Error("Envoi échoué");
  return res.json() as Promise<ApiChatMessage>;
}

export async function apiSendTyping(toUserId: number, activity = "typing"): Promise<void> {
  await apiFetch("/messages/typing", { method: "POST", body: JSON.stringify({ toUserId, activity }) }).catch(() => {});
}

export async function apiGetTyping(userId: number): Promise<{ typing: boolean; activity: string }> {
  const r = await apiFetch(`/messages/typing/${userId}`).catch(() => null);
  if (!r || !r.ok) return { typing: false, activity: "typing" };
  const d = await r.json() as { typing: boolean; activity?: string };
  return { typing: d.typing ?? false, activity: d.activity ?? "typing" };
}

// ── Chat Groups ────────────────────────────────────────────────────────────────

export interface ApiChatGroup {
  id: number;
  name: string;
  avatarUrl: string | null;
  type: "group" | "channel";
  membersCount: number;
  lastMessage: string;
  lastMessageAt: string;
  unread: number;
  role: string;
  updatedAt: string;
}

export interface ApiChatGroupMessage {
  id: number;
  groupId: number;
  senderId: number;
  content: string;
  type: "text" | "system";
  createdAt: string;
  senderName: string;
}

export interface ApiChatGroupInfo {
  id: number;
  name: string;
  avatarUrl: string | null;
  type: "group" | "channel";
  role: string;
  members: Array<{ userId: number; firstName: string | null; lastName: string | null; avatarUrl: string | null; role: string }>;
}

export async function apiGetChatGroups(): Promise<ApiChatGroup[]> {
  const res = await apiFetch("/chat-groups");
  if (!res.ok) return [];
  return res.json() as Promise<ApiChatGroup[]>;
}

export async function apiCreateChatGroup(name: string, type: "group" | "channel", memberIds: number[]): Promise<ApiChatGroup & { createdAt: string }> {
  const res = await apiFetch("/chat-groups", {
    method: "POST",
    body: JSON.stringify({ name, type, memberIds }),
  });
  if (!res.ok) throw new Error("Création échouée");
  return res.json();
}

export async function apiGetChatGroupInfo(id: number): Promise<ApiChatGroupInfo> {
  const res = await apiFetch(`/chat-groups/${id}`);
  if (!res.ok) throw new Error("Groupe introuvable");
  return res.json() as Promise<ApiChatGroupInfo>;
}

export async function apiGetChatGroupMessages(id: number): Promise<ApiChatGroupMessage[]> {
  const res = await apiFetch(`/chat-groups/${id}/messages`);
  if (!res.ok) return [];
  return res.json() as Promise<ApiChatGroupMessage[]>;
}

export async function apiSendChatGroupMessage(id: number, content: string): Promise<ApiChatGroupMessage> {
  const res = await apiFetch(`/chat-groups/${id}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new Error(payload?.error || "Envoi échoué");
  }
  return res.json() as Promise<ApiChatGroupMessage>;
}

export async function apiLeaveChatGroup(id: number): Promise<void> {
  await apiFetch(`/chat-groups/${id}/leave`, { method: "DELETE" });
}

export async function apiUpdateChatGroup(id: number, data: { name?: string; avatarUrl?: string }): Promise<ApiChatGroup> {
  const res = await apiFetch(`/chat-groups/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? "Erreur lors de la mise à jour");
  }
  return res.json() as Promise<ApiChatGroup>;
}

export interface ApiGroupSettings {
  hideMembers: boolean;
  antiSpam: boolean;
  topicsEnabled: boolean;
  permissions: { sendMsgs: boolean; sendMedia: boolean; addUsers: boolean; pinMsgs: boolean; modTitles: boolean; modExchange: boolean };
  chargeTokens: boolean;
  tokenPrice: number;
  reactMode: "all" | "some" | "none";
  reactEmojis: string[];
}

export interface ApiChatGroupMemberEntry {
  userId: number;
  role: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  joinedAt: string | null;
}
export async function apiAddChatGroupMembers(id: number, userIds: number[]): Promise<void> {
  await apiFetch(`/chat-groups/${id}/members`, {
    method: "POST",
    body: JSON.stringify({ userIds }),
  });
}

export async function apiKickGroupMember(groupId: number, userId: number): Promise<void> {
  const res = await apiFetch(`/chat-groups/${groupId}/members/${userId}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? "Erreur lors de l'exclusion");
  }
}

export async function apiChangeGroupMemberRole(groupId: number, userId: number, role: "admin" | "member"): Promise<void> {
  const res = await apiFetch(`/chat-groups/${groupId}/members/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? "Erreur lors du changement de rôle");
  }
}

export interface GroupAuditEntry {
  id: number;
  groupId: number;
  actorId: number;
  targetId: number | null;
  event: "member_added" | "member_left" | "member_kicked" | "role_changed" | "group_updated";
  detail: string | null;
  createdAt: string;
  actorName: string;
  actorAvatar: string | null;
  targetName: string | null;
  targetAvatar: string | null;
}

export async function apiGetGroupAuditLog(groupId: number, event?: string): Promise<GroupAuditEntry[]> {
  const params = event ? `?event=${encodeURIComponent(event)}` : "";
  const res = await apiFetch(`/chat-groups/${groupId}/audit-log${params}`);
  if (!res.ok) return [];
  return res.json() as Promise<GroupAuditEntry[]>;
}

export async function apiGetUserPosts(userId: number): Promise<FeedPost[]> {
  const res = await apiFetch(`/posts?authorId=${userId}`);
  if (!res.ok) return [];
  return res.json() as Promise<FeedPost[]>;
}

// ── Jobs ──────────────────────────────────────────────────────────────────────

export interface ApiJob {
  id: number;
  title: string;
  company: string;
  description: string | null;
  location: string;
  type: string;
  salary: number | null;
  currency: string;
  status: string;
  skills: string | null;
  createdAt: string;
}

export async function apiGetJobs(params?: { type?: string; search?: string; country?: string }): Promise<ApiJob[]> {
  const q = new URLSearchParams();
  if (params?.type) q.set("type", params.type);
  if (params?.search) q.set("search", params.search);
  if (params?.country) q.set("country", params.country);
  const qs = q.toString();
  const res = await apiFetch(`/jobs${qs ? `?${qs}` : ""}`);
  if (!res.ok) return [];
  return res.json() as Promise<ApiJob[]>;
}

export async function apiGetJob(id: number): Promise<ApiJob | null> {
  const res = await apiFetch(`/jobs/${id}`);
  if (!res.ok) return null;
  return res.json() as Promise<ApiJob>;
}

export async function apiApplyToJob(id: number, data: { coverLetter?: string; cvUrl?: string }): Promise<void> {
  const res = await apiFetch(`/jobs/${id}/apply`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(e.error ?? "Candidature échouée");
  }
}

export async function apiCreateJob(data: {
  title: string; company: string; type: string; location: string;
  salary?: number; currency?: string; description?: string;
}): Promise<ApiJob> {
  const res = await apiFetch("/jobs", { method: "POST", body: JSON.stringify(data) });
  if (!res.ok) {
    const e = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(e.error ?? "Erreur lors de la création");
  }
  return res.json() as Promise<ApiJob>;
}

// ── Education ─────────────────────────────────────────────────────────────────

export interface ApiCourse {
  id: number;
  title: string;
  description: string | null;
  category: string;
  level: string;
  duration: number;
  isFree: boolean;
  price: number | null;
  currency: string | null;
  instructorId: number;
  enrollmentsCount: number;
  createdAt: string;
}

export interface ApiLesson {
  id: number;
  courseId: number;
  title: string;
  content: string | null;
  duration: number;
  order: number;
}

export interface ApiEnrollment {
  id: number;
  courseId: number;
  userId: number;
  progress: number;
  status: string;
  enrolledAt: string;
}

export async function apiGetCourses(params?: { category?: string; level?: string }): Promise<ApiCourse[]> {
  const q = new URLSearchParams();
  if (params?.category) q.set("category", params.category);
  if (params?.level) q.set("level", params.level);
  const qs = q.toString();
  const res = await apiFetch(`/courses${qs ? `?${qs}` : ""}`);
  if (!res.ok) return [];
  return res.json() as Promise<ApiCourse[]>;
}

export async function apiGetCourse(id: number): Promise<(ApiCourse & { lessons: ApiLesson[] }) | null> {
  const res = await apiFetch(`/courses/${id}`);
  if (!res.ok) return null;
  return res.json() as Promise<ApiCourse & { lessons: ApiLesson[] }>;
}

export async function apiGetEnrollments(): Promise<ApiEnrollment[]> {
  const res = await apiFetch("/enrollments");
  if (!res.ok) return [];
  return res.json() as Promise<ApiEnrollment[]>;
}

export async function apiEnrollCourse(id: number): Promise<ApiEnrollment> {
  const res = await apiFetch(`/courses/${id}/enroll`, { method: "POST", body: JSON.stringify({}) });
  if (!res.ok) {
    const e = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(e.error ?? "Inscription échouée");
  }
  return res.json() as Promise<ApiEnrollment>;
}

export async function apiUpdateEnrollmentProgress(courseId: number, progress: number): Promise<void> {
  await apiFetch(`/enrollments/${courseId}`, {
    method: "PATCH",
    body: JSON.stringify({ progress }),
  });
}

// ── Marketplace ───────────────────────────────────────────────────────────────

export interface ApiProduct {
  id: number;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  category: string;
  imageUrl: string | null;
  status: string;
  sellerId: number;
  location: string | null;
  viewsCount: number | null;
  condition: string | null;
  isVerified: boolean | null;
  discountPct: number | null;
  city: string | null;
  countryCode: string | null;
  createdAt: string;
}

export interface ApiMarketplaceService {
  id: number;
  userId: number;
  name: string;
  profession: string;
  description: string | null;
  price: number | null;
  currency: string;
  country: string | null;
  city: string | null;
  rating: number;
  reviewsCount: number;
  avatarUrl: string | null;
  coverColor: string;
  isVerified: boolean;
  status: string;
  createdAt: string;
}

export interface ApiServiceProvider {
  userId: number;
  name: string;
  profession: string;
  avatarUrl: string | null;
  isVerified: boolean;
  rating: number;
  reviewsCount: number;
  servicesCount: number;
  city: string | null;
  country: string | null;
  coverColor: string;
  createdAt: string;
}

export async function apiGetServiceProviders(): Promise<ApiServiceProvider[]> {
  const res = await apiFetch("/marketplace/services/providers");
  if (!res.ok) return [];
  return res.json() as Promise<ApiServiceProvider[]>;
}

export async function apiGetProducts(params?: { category?: string; search?: string; country?: string }): Promise<ApiProduct[]> {
  const q = new URLSearchParams();
  if (params?.category) q.set("category", params.category);
  if (params?.search) q.set("search", params.search);
  if (params?.country) q.set("country", params.country);
  const qs = q.toString();
  const res = await apiFetch(`/products${qs ? `?${qs}` : ""}`);
  if (!res.ok) return [];
  return res.json() as Promise<ApiProduct[]>;
}

export async function apiGetProduct(id: number): Promise<ApiProduct | null> {
  const res = await apiFetch(`/products/${id}`);
  if (!res.ok) return null;
  return res.json() as Promise<ApiProduct>;
}

export async function apiGetMarketplaceServices(search?: string): Promise<ApiMarketplaceService[]> {
  const q = search ? `?search=${encodeURIComponent(search)}` : "";
  const res = await apiFetch(`/marketplace/services${q}`);
  if (!res.ok) return [];
  return res.json() as Promise<ApiMarketplaceService[]>;
}

export async function apiCreateMarketplaceService(data: {
  name: string; profession: string; description?: string; price?: number;
  currency?: string; country?: string; city?: string; avatarUrl?: string; coverColor?: string;
}): Promise<ApiMarketplaceService> {
  const res = await apiFetch("/marketplace/services", { method: "POST", body: JSON.stringify(data) });
  if (!res.ok) {
    const e = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(e.error ?? "Erreur lors de la création");
  }
  return res.json() as Promise<ApiMarketplaceService>;
}

export async function apiToggleMarketplaceFavorite(itemType: string, itemId: number): Promise<{ favorited: boolean }> {
  const res = await apiFetch("/marketplace/favorites", { method: "POST", body: JSON.stringify({ itemType, itemId }) });
  if (!res.ok) return { favorited: false };
  return res.json() as Promise<{ favorited: boolean }>;
}

export async function apiGetMarketplaceFavorites(): Promise<{ itemType: string; itemId: number }[]> {
  const res = await apiFetch("/marketplace/favorites");
  if (!res.ok) return [];
  return res.json() as Promise<{ itemType: string; itemId: number }[]>;
}

export async function apiCreateProduct(data: {
  title: string; description?: string; price: number;
  currency?: string; category: string; imageUrl?: string; location?: string;
}): Promise<ApiProduct> {
  const res = await apiFetch("/products", { method: "POST", body: JSON.stringify(data) });
  if (!res.ok) {
    const e = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(e.error ?? "Erreur lors de la création");
  }
  return res.json() as Promise<ApiProduct>;
}

// ── Gifts & Tokens ────────────────────────────────────────────────────────────

export interface ApiGiftItem {
  id: number;
  name: string;
  iconEmoji: string;
  tokenCost: number;
  animationType: string;
}

export interface ApiGiftTransaction {
  id: number;
  senderId: number;
  senderName: string;
  receiverId: number;
  giftId: number;
  giftName: string;
  giftEmoji: string;
  tokenAmount: number;
  contextType: "video" | "live";
  contextId: number;
  createdAt: string;
}

export interface ApiTokenPurchase {
  purchaseId: number;
  paymentRef: string;
  status: string;
  instructions: {
    operator: string; phone: string; amount: string; reference: string; message: string;
  };
  tokens: number;
  amountXof: number;
}

export interface ApiCreatorWallet {
  tokenBalance: number;
  xofBalance: number;
  tokenToXof: number;
  minWithdrawTokens: number;
  revenueToday:  { tokens: number; xof: number };
  revenueMonth:  { tokens: number; xof: number };
}

export async function apiGetGiftCatalog(): Promise<ApiGiftItem[]> {
  const res = await fetch(`${BASE}/gifts/catalog`);
  if (!res.ok) return [];
  return res.json() as Promise<ApiGiftItem[]>;
}

export async function apiSendGift(data: {
  giftId: number; receiverId: number; contextType: "live" | "video";
  contextId: number; senderName: string;
}): Promise<ApiGiftTransaction> {
  const res = await apiFetch("/gifts/send", { method: "POST", body: JSON.stringify(data) });
  if (!res.ok) {
    const e = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(e.error ?? "Erreur lors de l'envoi");
  }
  return res.json() as Promise<ApiGiftTransaction>;
}

export async function apiGetTopDonors(contextType: "live" | "video", contextId: number) {
  const res = await fetch(`${BASE}/gifts/top-donors/${contextType}/${contextId}`);
  if (!res.ok) return [];
  return res.json() as Promise<{ senderId: number; senderName: string; totalTokens: number; giftsCount: number }[]>;
}

export async function apiGetReceivedGifts(limit = 20): Promise<ApiGiftTransaction[]> {
  const res = await apiFetch(`/gifts/received?limit=${limit}`);
  if (!res.ok) return [];
  return res.json() as Promise<ApiGiftTransaction[]>;
}

export interface ApiGiftHistoryItem extends ApiGiftTransaction {
  receiverName: string | null;
}

export async function apiGetGiftHistory(limit = 20, offset = 0): Promise<ApiGiftHistoryItem[]> {
  const res = await apiFetch(`/gifts/history?limit=${limit}&offset=${offset}`);
  if (!res.ok) return [];
  return res.json() as Promise<ApiGiftHistoryItem[]>;
}

export async function apiPurchaseTokens(data: {
  packId: "pack_100" | "pack_500" | "pack_2000";
  paymentMethod: "orange" | "mtn" | "wave";
  paymentPhone: string;
}): Promise<ApiTokenPurchase> {
  const res = await apiFetch("/tokens/purchase", { method: "POST", body: JSON.stringify(data) });
  if (!res.ok) {
    const e = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(e.error ?? "Achat échoué");
  }
  return res.json() as Promise<ApiTokenPurchase>;
}

export async function apiGetTokenPurchaseStatus(purchaseId: number): Promise<{ id: number; status: string; tokens: number; amountXof: number }> {
  const res = await apiFetch(`/tokens/purchases/${purchaseId}`);
  if (!res.ok) throw new Error("Achat introuvable");
  return res.json() as Promise<{ id: number; status: string; tokens: number; amountXof: number }>;
}

export async function apiGetCreatorWallet(): Promise<ApiCreatorWallet> {
  const res = await apiFetch("/creator/wallet");
  if (!res.ok) throw new Error("Wallet non disponible");
  return res.json() as Promise<ApiCreatorWallet>;
}

export async function apiRequestWithdrawal(data: {
  paymentMethod: "orange" | "mtn" | "wave";
  paymentPhone: string;
  tokensAmount: number;
}): Promise<{ id: number; status: string; xofAmount: number }> {
  const res = await apiFetch("/creator/withdraw", { method: "POST", body: JSON.stringify(data) });
  if (!res.ok) {
    const e = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(e.error ?? "Retrait échoué");
  }
  return res.json() as Promise<{ id: number; status: string; xofAmount: number }>;
}

export async function apiGetWithdrawals() {
  const res = await apiFetch("/creator/withdrawals");
  if (!res.ok) return [];
  return res.json() as Promise<{ id: number; tokensAmount: number; xofAmount: number; status: string; paymentMethod: string; paymentPhone: string; createdAt: string }[]>;
}

export interface AdminWithdrawal {
  id: number;
  creatorId: number;
  creatorName: string;
  tokensAmount: number;
  xofAmount: number;
  status: "pending" | "validated" | "paid" | "rejected";
  paymentMethod: string;
  paymentPhone: string;
  adminNote: string | null;
  createdAt: string;
}

export async function apiAdminGetWithdrawals(status?: string): Promise<AdminWithdrawal[]> {
  const qs = status && status !== "all" ? `?status=${status}` : "";
  const res = await apiFetch(`/admin/withdrawals${qs}`);
  if (!res.ok) return [];
  return res.json();
}

export interface AdminReportUser {
  id: number;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

export interface AdminReport {
  id: number;
  reason: string;
  status: "pending" | "reviewed" | "dismissed";
  createdAt: string;
  reporter: AdminReportUser;
  reported: AdminReportUser;
}

export interface AdminReportsResponse {
  reports: AdminReport[];
  total: number;
  page: number;
  totalPages: number;
}

export async function apiAdminGetReports(params?: {
  page?: number;
  sort?: "asc" | "desc";
  status?: string;
}): Promise<AdminReportsResponse> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.sort) qs.set("sort", params.sort);
  if (params?.status && params.status !== "all") qs.set("status", params.status);
  const query = qs.toString() ? `?${qs.toString()}` : "";
  const res = await apiFetch(`/admin/reports${query}`);
  if (!res.ok) return { reports: [], total: 0, page: 1, totalPages: 1 };
  return res.json();
}

// ── Notifications ─────────────────────────────────────────────────────────────

export interface ApiNotification {
  id: number;
  type: string;
  actorId: number | null;
  actorName: string | null;
  actorAvatarUrl: string | null;
  action: string;
  detail: string | null;
  thumbnailUrl: string | null;
  messageCount: number | null;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export async function apiGetNotifications(): Promise<ApiNotification[]> {
  const res = await apiFetch("/notifications");
  if (!res.ok) return [];
  return res.json() as Promise<ApiNotification[]>;
}

export async function apiGetUnreadNotifCount(): Promise<number> {
  const res = await apiFetch("/notifications/unread-count");
  if (!res.ok) return 0;
  const data = await res.json() as { count: number };
  return data.count ?? 0;
}

export async function apiMarkAllNotificationsRead(): Promise<void> {
  await apiFetch("/notifications/read-all", { method: "PATCH" });
}

export async function apiMarkNotificationRead(id: number): Promise<void> {
  await apiFetch(`/notifications/${id}/read`, { method: "PATCH" });
}

export async function apiAdminPatchReport(
  id: number,
  action: "reviewed" | "dismissed",
): Promise<{ id: number; status: string }> {
  const res = await apiFetch(`/admin/reports/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ action }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(e.error ?? "Action échouée");
  }
  return res.json();
}

export async function apiAdminPatchWithdrawal(
  id: number,
  action: "validated" | "paid" | "rejected",
  adminNote?: string,
): Promise<AdminWithdrawal> {
  const res = await apiFetch(`/admin/withdrawals/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ action, adminNote }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(e.error ?? "Action échouée");
  }
  return res.json();
}

// ─── Comments ────────────────────────────────────────────────────────────────

export interface PostComment {
  id: number;
  postId: number;
  authorId: number;
  parentId: number | null;
  content: string;
  audioUrl: string | null;
  audioDuration: number | null;
  likesCount: number;
  likedByMe: boolean;
  createdAt: string;
  authorFirstName: string;
  authorLastName: string;
  authorAvatarUrl: string | null;
}

export async function apiGetComments(postId: number): Promise<PostComment[]> {
  const res = await apiFetch(`/posts/${postId}/comments`);
  if (!res.ok) return [];
  return res.json();
}

export async function apiPostComment(
  postId: number,
  content: string,
  parentId?: number,
): Promise<PostComment> {
  const res = await apiFetch(`/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({ content, parentId }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(e.error ?? "Erreur lors du commentaire");
  }
  return res.json();
}

export async function apiPostVoiceComment(
  postId: number,
  audioUrl: string,
  audioDuration: number,
  parentId?: number,
): Promise<PostComment> {
  const res = await apiFetch(`/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({ content: "", audioUrl, audioDuration, parentId }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(e.error ?? "Erreur lors du commentaire vocal");
  }
  return res.json();
}

export async function apiDeleteComment(postId: number, commentId: number): Promise<void> {
  const res = await apiFetch(`/posts/${postId}/comments/${commentId}`, { method: "DELETE" });
  if (!res.ok) {
    const e = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(e.error ?? "Suppression échouée");
  }
}

export async function apiUploadFile(file: File): Promise<{ url: string }> {
  const token = getBpToken();
  const headers: Record<string, string> = {
    "Content-Type": file.type || "application/octet-stream",
    "x-filename": file.name,
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}/upload`, { method: "POST", headers, body: file });
  if (!res.ok) {
    const e = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(e.error ?? "Upload échoué");
  }
  return res.json() as Promise<{ url: string }>;
}

export function apiUploadFileXHR(
  file: File,
  onProgress: (loaded: number, total: number) => void
): { promise: Promise<{ url: string }>; cancel: () => void } {
  let xhrRef: XMLHttpRequest | null = null;
  const promise = new Promise<{ url: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhrRef = xhr;
    const token = getBpToken();
    xhr.open("POST", `${BASE}/upload`);
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.setRequestHeader("x-filename", file.name);
    xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress(e.loaded, e.total); };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText)); }
        catch { reject(new Error("Upload échoué")); }
      } else {
        try {
          const e = JSON.parse(xhr.responseText);
          reject(new Error((e as { error?: string }).error ?? "Upload échoué"));
        } catch { reject(new Error("Upload échoué")); }
      }
    };
    xhr.onerror = () => reject(new Error("network"));
    xhr.onabort = () => reject(new Error("cancelled"));
    xhr.send(file);
  });
  return { promise, cancel: () => xhrRef?.abort() };
}

export async function apiUploadVoice(blob: Blob, durationSec: number): Promise<{ url: string }> {
  const token = getBpToken();
  const ext = blob.type.includes("ogg") ? ".ogg" : blob.type.includes("mp4") ? ".m4a" : ".webm";
  const filename = `voice_${Date.now()}${ext}`;
  const headers: Record<string, string> = {
    "Content-Type": blob.type || "audio/webm",
    "x-filename": filename,
    "x-duration": String(Math.round(durationSec)),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}/upload`, {
    method: "POST",
    headers,
    body: blob,
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(e.error ?? "Upload audio échoué");
  }
  const data = await res.json() as { url: string };
  return { url: data.url };
}

export async function apiToggleCommentLike(
  postId: number,
  commentId: number,
): Promise<{ liked: boolean; likesCount: number }> {
  const res = await apiFetch(`/posts/${postId}/comments/${commentId}/like`, { method: "POST" });
  if (!res.ok) {
    const e = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(e.error ?? "Erreur like commentaire");
  }
  return res.json();
}

export interface StorageStats {
  used:            number;
  quota:           number;
  remaining:       number;
  percent:         number;
  plan:            string;
  planDisplayName: string;
}

export async function apiGetStorageStats(): Promise<StorageStats> {
  const res = await apiFetch("/storage/stats");
  if (!res.ok) throw new Error("Erreur lors de la récupération du stockage");
  return res.json() as Promise<StorageStats>;
}

export async function apiGetUserPresence(userId: number): Promise<{ online: boolean; lastSeenAt: string | null }> {
  const res = await apiFetch(`/users/${userId}/presence`);
  if (!res.ok) return { online: false, lastSeenAt: null };
  return res.json();
}

export async function apiFollow(userId: number, action: "follow" | "unfollow"): Promise<void> {
  await apiFetch(`/users/${userId}/follow`, { method: "POST", body: JSON.stringify({ action }) });
}

export async function apiCheckFollowing(userIds: number[]): Promise<number[]> {
  if (userIds.length === 0) return [];
  const res = await apiFetch("/users/follows/check", { method: "POST", body: JSON.stringify({ ids: userIds }) });
  if (!res.ok) return [];
  const data = await res.json() as { following: number[] };
  return data.following;
}

export interface ApiEvent {
  id: number;
  organizerId: number;
  organizerName: string;
  organizerAvatarUrl: string | null;
  title: string;
  description: string;
  location: string;
  startAt: string;
  endAt: string | null;
  coverUrl: string | null;
  isOnline: boolean;
  type: string;
  goingCount: number;
  interestedCount: number;
  createdAt: string;
  myRsvp: "going" | "interested" | "not_going" | null;
}

export async function apiGetEvents(): Promise<ApiEvent[]> {
  const res = await apiFetch("/events");
  if (!res.ok) return [];
  return res.json();
}

export async function apiCreateEvent(data: {
  title: string; description?: string; location?: string;
  startAt: string; endAt?: string; isOnline?: boolean; type?: string;
}): Promise<ApiEvent> {
  const res = await apiFetch("/events", { method: "POST", body: JSON.stringify(data) });
  if (!res.ok) throw new Error("Erreur lors de la création");
  return res.json();
}

export async function apiRsvpEvent(eventId: number, status: "going" | "interested" | "not_going"): Promise<{ myRsvp: string | null }> {
  const res = await apiFetch(`/events/${eventId}/rsvp`, { method: "POST", body: JSON.stringify({ status }) });
  if (!res.ok) throw new Error("Erreur RSVP");
  return res.json();
}

export interface SavedPost {
  id: number;
  postId: number;
  savedAt: string;
  content: string;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  authorName: string;
  authorAvatarUrl: string | null;
  authorCountry: string | null;
}

export async function apiGetSaved(): Promise<SavedPost[]> {
  const res = await apiFetch("/saved");
  if (!res.ok) return [];
  return res.json();
}

export async function apiToggleSaved(postId: number): Promise<{ saved: boolean }> {
  const res = await apiFetch(`/saved/${postId}`, { method: "POST" });
  if (!res.ok) throw new Error("Erreur enregistrement");
  return res.json();
}

export async function apiRemoveSaved(postId: number): Promise<void> {
  await apiFetch(`/saved/${postId}`, { method: "DELETE" });
}

export async function apiCheckSaved(postIds: number[]): Promise<number[]> {
  if (postIds.length === 0) return [];
  const res = await apiFetch(`/saved/check?ids=${postIds.join(",")}`);
  if (!res.ok) return [];
  const data = await res.json() as { saved: number[] };
  return data.saved;
}

export interface MemoryPost {
  id: number;
  content: string;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  yearsAgo: number;
}

export async function apiGetMemories(): Promise<MemoryPost[]> {
  const res = await apiFetch("/memories");
  if (!res.ok) return [];
  return res.json();
}

export async function apiReportPost(postId: number, reason: string = "spam"): Promise<void> {
  await apiFetch(`/posts/${postId}/report`, { method: "POST", body: JSON.stringify({ reason }) });
}

export interface MessagingSettings {
  onlineStatus: boolean;
  notificationsEnabled: boolean;
  readReceiptsEnabled: boolean;
  whoCanMessage: string;
}

export async function apiGetMessagingSettings(): Promise<MessagingSettings> {
  const res = await apiFetch("/messaging/settings");
  if (!res.ok) return { onlineStatus: true, notificationsEnabled: true, readReceiptsEnabled: true, whoCanMessage: "everyone" };
  return res.json() as Promise<MessagingSettings>;
}

export async function apiUpdateMessagingSettings(data: Partial<MessagingSettings>): Promise<void> {
  await apiFetch("/messaging/settings", { method: "PATCH", body: JSON.stringify(data) });
}

export interface MessageRequest {
  id: number;
  senderId: number;
  senderName: string;
  senderAvatarUrl: string | null;
  messagePreview: string;
  status: string;
  createdAt: string;
}

export async function apiGetMessageRequests(tab: "known" | "spam"): Promise<MessageRequest[]> {
  const status = tab === "spam" ? "spam" : "pending";
  const res = await apiFetch(`/messaging/requests?status=${status}`);
  if (!res.ok) return [];
  return res.json() as Promise<MessageRequest[]>;
}

export async function apiUpdateMessageRequest(id: number, status: "accepted" | "rejected" | "spam"): Promise<void> {
  await apiFetch(`/messaging/requests/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
}

export interface LinkPreview {
  title: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
  siteName: string | null;
  url: string;
}
export async function apiGetLinkPreview(url: string): Promise<LinkPreview | null> {
  try {
    const r = await fetch(`${BASE}/link-preview?url=${encodeURIComponent(url)}`);
    if (!r.ok) return null;
    return r.json();
  } catch { return null; }
}

/* ══════════════════════════════════════════════════════════════
   PAGES
══════════════════════════════════════════════════════════════ */
export interface ApiPage {
  id: number;
  name: string;
  username: string | null;
  category: string;
  description: string | null;
  emoji: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  coverVideoUrl: string | null;
  country: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  timezone: string | null;
  actionButton: string | null;
  verified: boolean;
  isPublic: boolean;
  followersCount: number;
  createdById: number;
  createdAt: string;
  updatedAt: string;
  isFollowed?: boolean;
  isOwner?: boolean;
  myRole?: string | null;
}

export interface ApiPageRole {
  userId: number;
  role: string;
  addedAt: string;
  name: string;
  avatarUrl: string | null;
}

export interface ApiPageStats {
  followersCount: number;
  viewsTotal: number;
  newFollowers: number;
  interactions: number;
  clicks: number;
  viewsGrowth: number;
  followersGrowth: number;
  interactionsGrowth: number;
  clicksGrowth: number;
  chart: { day: string; views: number }[];
}

export interface ApiPageInvitation {
  id: number;
  pageId: number;
  invitedBy: number;
  status: string;
  invitedAt: string;
  pageName: string | null;
  pageAvatar: string | null;
  pageCategory: string | null;
  pageFollowers: number | null;
  inviterName: string | null;
}

export async function apiGetPages(filter: "all" | "mine" | "invitations" = "all", search?: string): Promise<(ApiPage | ApiPageInvitation)[]> {
  const qs = new URLSearchParams({ filter });
  if (search) qs.set("search", search);
  const res = await apiFetch(`/pages?${qs}`);
  if (!res.ok) return [];
  return res.json();
}

export async function apiCreatePage(data: {
  name: string; category: string; description?: string; emoji?: string;
  username?: string; website?: string; email?: string; phone?: string;
  address?: string; timezone?: string; actionButton?: string;
  avatarUrl?: string; coverUrl?: string; coverVideoUrl?: string; isPublic?: boolean;
}): Promise<ApiPage> {
  const res = await apiFetch("/pages", { method: "POST", body: JSON.stringify(data) });
  if (!res.ok) throw new Error("Erreur création page");
  return res.json();
}

export async function apiGetPage(id: number): Promise<ApiPage> {
  const res = await apiFetch(`/pages/${id}`);
  if (!res.ok) throw new Error("Page introuvable");
  return res.json();
}

export async function apiUpdatePage(id: number, data: Partial<Omit<ApiPage, "id" | "createdById" | "createdAt" | "updatedAt">>): Promise<ApiPage> {
  const res = await apiFetch(`/pages/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  if (!res.ok) throw new Error("Erreur mise à jour");
  return res.json();
}

export async function apiDeletePage(id: number): Promise<void> {
  await apiFetch(`/pages/${id}`, { method: "DELETE" });
}

export async function apiFollowPage(id: number): Promise<void> {
  await apiFetch(`/pages/${id}/follow`, { method: "POST" });
}

export async function apiUnfollowPage(id: number): Promise<void> {
  await apiFetch(`/pages/${id}/follow`, { method: "DELETE" });
}

export async function apiGetPageRoles(id: number): Promise<ApiPageRole[]> {
  const res = await apiFetch(`/pages/${id}/roles`);
  if (!res.ok) return [];
  return res.json();
}

export async function apiAddPageRole(id: number, targetUserId: number, role: string): Promise<void> {
  await apiFetch(`/pages/${id}/roles`, { method: "POST", body: JSON.stringify({ targetUserId, role }) });
}

export async function apiRemovePageRole(id: number, targetUserId: number): Promise<void> {
  await apiFetch(`/pages/${id}/roles/${targetUserId}`, { method: "DELETE" });
}

export async function apiInviteFriendsToPage(id: number, targetUserIds: number[]): Promise<void> {
  await apiFetch(`/pages/${id}/invite`, { method: "POST", body: JSON.stringify({ targetUserIds }) });
}

export async function apiGetPageStats(id: number): Promise<ApiPageStats> {
  const res = await apiFetch(`/pages/${id}/stats`);
  if (!res.ok) throw new Error("Erreur stats");
  return res.json();
}

export async function apiGetPageFriendSuggestions(id: number): Promise<{ id: number; name: string; avatarUrl: string | null; country: string | null }[]> {
  const res = await apiFetch(`/pages/${id}/suggest-friends`);
  if (!res.ok) return [];
  return res.json();
}

export async function apiAcceptPageInvitation(invId: number): Promise<void> {
  await apiFetch(`/pages/invitations/${invId}/accept`, { method: "POST" });
}

export async function apiDeclinePageInvitation(invId: number): Promise<void> {
  await apiFetch(`/pages/invitations/${invId}/decline`, { method: "POST" });
}

// ── Contact Management ────────────────────────────────────────────────────────
export interface ContactInfo {
  id: number;
  firstName: string;
  lastName: string;
  bio: string | null;
  country: string | null;
  avatarUrl: string | null;
  verified: boolean;
  friendsCount: number;
  followersCount: number;
  postsCount: number;
  createdAt: string;
  presence: { online: boolean; lastSeen: string | null };
  isMuted: boolean;
  muteExpiresAt: string | null;
  isPinned: boolean;
  isFavorite: boolean;
  isBlocked: boolean;
  friendStatus: "pending" | "accepted" | "rejected" | null;
  friendDirection: "sent" | "received" | null;
}

export async function apiGetContactInfo(userId: number): Promise<ContactInfo | null> {
  const res = await apiFetch(`/contacts/${userId}`);
  if (!res.ok) return null;
  return res.json() as Promise<ContactInfo>;
}

export async function apiMuteContact(userId: number, duration: "8h" | "1w" | "always"): Promise<void> {
  await apiFetch(`/contacts/${userId}/mute`, { method: "POST", body: JSON.stringify({ duration }) });
}

export async function apiUnmuteContact(userId: number): Promise<void> {
  await apiFetch(`/contacts/${userId}/mute`, { method: "DELETE" });
}

export async function apiPinContact(userId: number): Promise<void> {
  await apiFetch(`/contacts/${userId}/pin`, { method: "POST" });
}

export async function apiUnpinContact(userId: number): Promise<void> {
  await apiFetch(`/contacts/${userId}/pin`, { method: "DELETE" });
}

export async function apiFavoriteContact(userId: number): Promise<void> {
  await apiFetch(`/contacts/${userId}/favorite`, { method: "POST" });
}

export async function apiUnfavoriteContact(userId: number): Promise<void> {
  await apiFetch(`/contacts/${userId}/favorite`, { method: "DELETE" });
}

export async function apiSearchInConversation(
  userId: number,
  q: string,
): Promise<{ id: number; text: string; createdAt: string; fromMe: boolean }[]> {
  const res = await apiFetch(`/contacts/${userId}/conversation/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) return [];
  return res.json() as Promise<{ id: number; text: string; createdAt: string; fromMe: boolean }[]>;
}

export async function apiDeleteConversationContact(userId: number): Promise<void> {
  await apiFetch(`/contacts/${userId}/conversation`, { method: "DELETE" });
}

export async function apiGetMyGroups(): Promise<{ id: number; name: string; avatarUrl: string | null }[]> {
  const res = await apiFetch("/contacts/me/groups");
  if (!res.ok) return [];
  return res.json() as Promise<{ id: number; name: string; avatarUrl: string | null }[]>;
}

export async function apiAddContactToGroup(userId: number, groupId: number): Promise<void> {
  await apiFetch(`/contacts/${userId}/add-to-group/${groupId}`, { method: "POST" });
}

// ── Unified Search ──────────────────────────────────────────────────────────

export interface SearchUserDTO {
  id: number;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  country: string | null;
  bio: string | null;
  verified: boolean;
  followersCount: number;
  friendshipStatus: "none" | "friends" | "pending_sent" | "pending_received";
}
export interface SearchGroupDTO {
  id: number;
  name: string;
  emoji: string;
  description: string | null;
  membersCount: number;
  privacy: string;
  country: string | null;
  coverUrl: string | null;
  isMember: boolean;
}
export interface SearchPostDTO {
  id: number;
  authorId: number;
  authorName: string;
  authorAvatarUrl: string | null;
  content: string;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
}
export interface SearchArticleDTO {
  id: number;
  title: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  currency: string;
  category: string | null;
  location: string | null;
}
export interface SearchStatsDTO {
  users: number;
  posts: number;
  groups: number;
  articles: number;
}
export interface SearchResponseDTO {
  query: string;
  stats: SearchStatsDTO;
  users: SearchUserDTO[];
  groups: SearchGroupDTO[];
  posts: SearchPostDTO[];
  articles: SearchArticleDTO[];
  pagination: { page: number; limit: number; hasMore: boolean };
  durationMs: number;
}

export async function apiSearch(
  q: string,
  options?: {
    country?: string;
    region?: "all" | "afrique" | "amerique" | "europe" | "asie" | "oceanie";
    type?: "all" | "users" | "groups" | "posts" | "articles";
    page?: number;
    limit?: number;
  },
): Promise<SearchResponseDTO> {
  const params = new URLSearchParams({ q });
  if (options?.country) params.set("country", options.country);
  if (options?.region)  params.set("region",  options.region);
  if (options?.type)    params.set("type",    options.type);
  if (options?.page)    params.set("page",    String(options.page));
  if (options?.limit)   params.set("limit",   String(options.limit));
  const res = await apiFetch(`/search?${params.toString()}`);
  if (!res.ok) return {
    query: q, stats: { users: 0, posts: 0, groups: 0, articles: 0 },
    users: [], groups: [], posts: [], articles: [],
    pagination: { page: 1, limit: 20, hasMore: false }, durationMs: 0,
  };
  return res.json() as Promise<SearchResponseDTO>;
}

export async function apiPatchGroupReactions(id: number, data: { mode?: "all" | "some" | "none"; emojis?: string[] }): Promise<void> {
  const res = await apiFetch(`/chat-groups/${id}/reactions`, { method: "PATCH", body: JSON.stringify(data) });
  if (!res.ok) throw new Error("Erreur mise à jour réactions");
}

export async function apiSetChatGroupMemberRole(id: number, userId: number, role: "admin" | "member"): Promise<void> {
  const res = await apiFetch(`/chat-groups/${id}/members/${userId}`, { method: "PATCH", body: JSON.stringify({ role }) });
  if (!res.ok) throw new Error("Erreur changement de rôle");
}

export async function apiPatchGroupSettings(id: number, data: { hideMembers?: boolean; antiSpam?: boolean; topicsEnabled?: boolean }): Promise<ApiGroupSettings> {
  const res = await apiFetch(`/chat-groups/${id}/settings`, { method: "PATCH", body: JSON.stringify(data) });
  if (!res.ok) throw new Error("Erreur mise à jour paramètres");
  return res.json() as Promise<ApiGroupSettings>;
}

export async function apiRemoveChatGroupMember(id: number, userId: number): Promise<void> {
  const res = await apiFetch(`/chat-groups/${id}/members/${userId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Erreur éjection du membre");
}

export interface ApiGroupInviteLink {
  id: number;
  code: string;
  url: string;
  label: string | null;
  name: string | null;
  type: "unlimited" | "uses" | "duration" | "both";
  maxUses: number | null;
  usesCount: number;
  expiresAt: string | null;
  clicksCount: number;
  createdById: number;
  createdByName: string | null;
  revoked: boolean;
  revokedAt: string | null;
  createdAt: string;
  status: "active" | "expired" | "revoked" | "limit_reached";
}

export interface ApiGroupInviteLinkStats {
  clicks: number;
  uses: number;
  conversionRate: number;
  activity: { userName: string; action: string; time: string; initials: string; color: string; avatarUrl?: string | null }[];
}

export async function apiGetGroupSettings(id: number): Promise<ApiGroupSettings> {
  const res = await apiFetch(`/chat-groups/${id}/settings`);
  if (!res.ok) throw new Error("Erreur chargement paramètres");
  return res.json() as Promise<ApiGroupSettings>;
}

export async function apiPatchGroupPermissions(id: number, data: { permissions?: Partial<ApiGroupSettings["permissions"]>; chargeTokens?: boolean; tokenPrice?: number }): Promise<void> {
  const res = await apiFetch(`/chat-groups/${id}/permissions`, { method: "PATCH", body: JSON.stringify(data) });
  if (!res.ok) throw new Error("Erreur mise à jour permissions");
}

export async function apiGetGroupInviteLinks(id: number): Promise<ApiGroupInviteLink[]> {
  const res = await apiFetch(`/chat-groups/${id}/invite-links`);
  if (!res.ok) throw new Error("Erreur chargement liens");
  return res.json() as Promise<ApiGroupInviteLink[]>;
}

export async function apiCreateGroupInviteLink(id: number, label?: string, opts?: { type?: string; maxUses?: number; expiresAt?: string }): Promise<ApiGroupInviteLink> {
  const res = await apiFetch(`/chat-groups/${id}/invite-links`, { method: "POST", body: JSON.stringify({ label, ...opts }) });
  if (!res.ok) throw new Error("Erreur création lien");
  return res.json() as Promise<ApiGroupInviteLink>;
}

export async function apiRevokeGroupInviteLink(id: number, linkId: number): Promise<void> {
  const res = await apiFetch(`/chat-groups/${id}/invite-links/${linkId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Erreur révocation lien");
}

export async function apiUpdateGroupInviteLink(groupId: number, linkId: number, data: { name?: string; type?: string; maxUses?: number | null; expiresAt?: string | null }): Promise<ApiGroupInviteLink> {
  const res = await apiFetch(`/chat-groups/${groupId}/invite-links/${linkId}`, { method: "PATCH", body: JSON.stringify(data) });
  if (!res.ok) throw new Error("Erreur mise à jour lien");
  return res.json() as Promise<ApiGroupInviteLink>;
}

export async function apiGetGroupInviteLinkStats(groupId: number, linkId: number): Promise<ApiGroupInviteLinkStats> {
  const res = await apiFetch(`/chat-groups/${groupId}/invite-links/${linkId}/stats`);
  if (!res.ok) throw new Error("Erreur chargement statistiques");
  return res.json() as Promise<ApiGroupInviteLinkStats>;
}

export async function apiTrackInviteLinkClick(code: string): Promise<void> {
  await apiFetch(`/invite/${code}/click`, { method: "POST" }).catch(() => {});
}

export async function apiJoinViaInviteLink(code: string): Promise<{ groupId: number; groupName: string }> {
  const res = await apiFetch(`/invite/${code}/join`, { method: "POST" });
  if (!res.ok) throw new Error("Impossible de rejoindre le groupe");
  return res.json() as Promise<{ groupId: number; groupName: string }>;
}

export interface ApiChatGroupMembersGrouped {
  admins: ApiChatGroupMemberEntry[];
  bots: ApiChatGroupMemberEntry[];
  others: ApiChatGroupMemberEntry[];
  total: number;
  myRole: string;
}

export async function apiGetChatGroupMembersGrouped(id: number): Promise<ApiChatGroupMembersGrouped> {
  const res = await apiFetch(`/chat-groups/${id}/members`);
  if (!res.ok) throw new Error("Impossible de charger les membres");
  return res.json() as Promise<ApiChatGroupMembersGrouped>;
}
