import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "../router";
import { openImageViewer } from "../components/ImageViewer";
import ImageViewer from "../components/ImageViewer";
import { useCurrentUser } from "../hooks/useCurrentUser";
import {
  apiGetUserById, apiGetUsersWithStatus, apiGetFriendRequests, apiGetUserPosts,
  apiSendFriendRequest, apiAcceptFriendRequest, apiRejectFriendRequest,
  apiBlockUser, apiUnblockUser, apiCheckBlock, apiReportUser, apiGetUserStats,
  apiGetMutualFriends, apiGetMutualGroups, apiHideUser,
  apiToggleSaved, apiHidePost, apiReportPost, apiGetUserPresence, apiLikePost,
  type PublicUser, type PublicUserWithStatus, type FriendRequest, type FeedPost,
} from "../lib/api";

const AVATAR_COLORS = ["var(--bp-primary)","#E91E63","#9C27B0","#FF9800","var(--bp-primary)","#0EA5E9","#EF4444","#6366F1"];
function avatarColor(id: number) { return AVATAR_COLORS[id % AVATAR_COLORS.length]; }
function fullName(u: { firstName: string; lastName: string }) { return `${u.firstName} ${u.lastName}`.trim(); }
function initials(u: { firstName: string; lastName: string }) {
  return ((u.firstName?.[0] ?? "") + (u.lastName?.[0] ?? "")).toUpperCase() || "??";
}
function relTime(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (d < 60) return "À l'instant";
  if (d < 3600) return `Il y a ${Math.floor(d / 60)} min`;
  if (d < 86400) return `Il y a ${Math.floor(d / 3600)} h`;
  return `Il y a ${Math.floor(d / 86400)} j`;
}
function fmtCount(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

const COUNTRY_FLAGS: Record<string, string> = {
  CI:"🇨🇮",SN:"🇸🇳",BJ:"🇧🇯",TG:"🇹🇬",BF:"🇧🇫",NE:"🇳🇪",
  ML:"🇲🇱",GN:"🇬🇳",CM:"🇨🇲",TD:"🇹🇩",GA:"🇬🇦",CG:"🇨🇬",
  CD:"🇨🇩",CF:"🇨🇫",GH:"🇬🇭",
};

type ProfileTab = "posts" | "about" | "photos";
type MenuPanel = null | "menu" | "report" | "block" | "share" | "public_info" | "mutual_friends" | "mutual_groups";

/* ── SVG ICONS ─────────────────────────────────────────── */
const IcoBack = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 5l-7 7 7 7"/>
  </svg>
);
const IcoChevron = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6"/>
  </svg>
);
const IcoDots = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#64748B">
    <circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/>
  </svg>
);
const IcoShare = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/>
    <polyline points="16 6 12 2 8 6"/>
    <line x1="12" y1="2" x2="12" y2="15"/>
  </svg>
);
const IcoLink = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
  </svg>
);
const IcoEye = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);
const IcoEyeOff = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);
const IcoSlash = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
  </svg>
);
const IcoBlock = ({ color = "#EF4444" }: { color?: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2"/>
    <path d="M6.34 17.66L17.66 6.34" stroke={color} strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const IcoFlag = ({ color = "#EF4444" }: { color?: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" fill={color}/>
    <line x1="4" y1="22" x2="4" y2="15" stroke={color} strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const IcoUserX = ({ color = "#EF4444" }: { color?: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <line x1="17" y1="8" x2="23" y2="14"/>
    <line x1="23" y1="8" x2="17" y2="14"/>
  </svg>
);
const IcoUserCheck = ({ color = "#EF4444" }: { color?: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <polyline points="16 11 18 13 22 9"/>
  </svg>
);
const IcoInfo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);
const IcoPeople = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87"/>
    <path d="M16 3.13a4 4 0 010 7.75"/>
  </svg>
);
const IcoGroup = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
  </svg>
);
const IcoUnlock = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" fill="#DCFCE7" stroke="var(--bp-primary)"/>
    <path d="M7 11V7a5 5 0 019.9-1"/>
  </svg>
);
const IcoGlobe = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
  </svg>
);
const IcoLike = ({ active }: { active?: boolean }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill={active ? "var(--bp-primary)" : "none"} stroke={active ? "var(--bp-primary)" : "#94A3B8"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3z"/>
    <path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/>
  </svg>
);
const IcoComment = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
  </svg>
);
const IcoShareFeed = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/>
    <polyline points="16 6 12 2 8 6"/>
    <line x1="12" y1="2" x2="12" y2="15"/>
  </svg>
);
const IcoBriefcase = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
    <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
  </svg>
);
const IcoMapPin = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="#94A3B8">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
  </svg>
);
const IcoCheck = ({ size = 15, color = "#fff" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IcoClock = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IcoSend = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);
const IcoCopy = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
  </svg>
);

/* ── ILLUSTRATIONS ─────────────────────────────────────── */
const EmptyPostsIllustration = () => (
  <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
    <rect x="18" y="22" width="84" height="76" rx="10" fill="#DCFCE7"/>
    <rect x="26" y="34" width="68" height="42" rx="7" fill="#F0FDF4" stroke="var(--bp-primary)" strokeWidth="1.5"/>
    <circle cx="38" cy="47" r="6" fill="#BBF7D0"/>
    <path d="M26 76l16-14 10 10 14-18 22 22H26z" fill="#BBF7D0" opacity="0.7"/>
    <rect x="32" y="84" width="56" height="6" rx="3" fill="#DCFCE7"/>
    <rect x="42" y="94" width="36" height="4" rx="2" fill="#DCFCE7"/>
    <circle cx="88" cy="84" r="14" fill="var(--bp-primary)"/>
    <path d="M82 84h12M88 78v12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);
const EmptyPhotosIllustration = () => (
  <svg width="110" height="110" viewBox="0 0 110 110" fill="none">
    <rect x="10" y="20" width="90" height="70" rx="10" fill="#DCFCE7"/>
    <rect x="18" y="28" width="74" height="54" rx="7" fill="#F0FDF4" stroke="var(--bp-primary)" strokeWidth="1.5"/>
    <circle cx="36" cy="42" r="7" fill="#BBF7D0"/>
    <path d="M18 72l20-18 14 12 18-22 28 28H18z" fill="#BBF7D0" opacity="0.6"/>
  </svg>
);
const EmptyMutualIllustration = () => (
  <svg width="90" height="90" viewBox="0 0 90 90" fill="none">
    <circle cx="45" cy="45" r="38" fill="#F0FDF4"/>
    <circle cx="35" cy="38" r="10" fill="#BBF7D0"/>
    <circle cx="55" cy="38" r="10" fill="#BBF7D0"/>
    <path d="M20 65c0-8 7-14 15-14s15 6 15 14" fill="#DCFCE7"/>
    <path d="M40 65c0-8 7-14 15-14s15 6 15 14" fill="#DCFCE7"/>
  </svg>
);

export default function UserProfilePage({ userId }: { userId: number }) {
  const navigate = useNavigate();
  const meId = useCurrentUser().id;

  const coverImgRef = useRef<HTMLImageElement>(null);

  /* ── Cover parallax on scroll ── */
  useEffect(() => {
    const handleScroll = () => {
      if (!coverImgRef.current) return;
      const y = window.scrollY;
      coverImgRef.current.style.transform = `translateY(${y * 0.3}px)`;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const [user, setUser] = useState<PublicUserWithStatus | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<FriendRequest | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");
  const [isBlocked, setIsBlocked] = useState(false);
  const [stats, setStats] = useState<{ postsCount: number; followersCount: number; followingCount: number } | null>(null);

  const [postMenu, setPostMenu] = useState<number | null>(null);
  const [savedPostIds, setSavedPostIds] = useState<Set<number>>(new Set());
  const [likedPostIds, setLikedPostIds] = useState<Set<number>>(new Set());
  const [postReportSheet, setPostReportSheet] = useState<number | null>(null);
  const [postReportReason, setPostReportReason] = useState("");

  const [menuPanel, setMenuPanel] = useState<MenuPanel>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [copyDone, setCopyDone] = useState(false);
  const [mutualFriends, setMutualFriends] = useState<PublicUser[]>([]);
  const [mutualFriendsLoading, setMutualFriendsLoading] = useState(false);
  const [mutualGroups, setMutualGroups] = useState<{ id: number; name: string; avatarUrl: string | null; type: string }[]>([]);
  const [mutualGroupsLoading, setMutualGroupsLoading] = useState(false);
  const [hideToast, setHideToast] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiGetUserPresence(userId).then(p => setIsOnline(p.online)).catch(() => {});
    Promise.all([
      apiGetUserById(userId),
      apiGetUserPosts(userId),
      apiGetFriendRequests(),
      apiCheckBlock(userId),
      apiGetUserStats(userId),
      apiGetUsersWithStatus(),
    ]).then(([directUser, userPosts, requests, blocked, userStats, allUsers]) => {
      const fromList = (allUsers as PublicUserWithStatus[]).find(u => u.id === userId);
      const base = directUser ?? fromList ?? null;
      if (base) {
        const withStatus: PublicUserWithStatus = {
          ...base,
          friendshipStatus: fromList?.friendshipStatus ?? "none",
          requestId: fromList?.requestId,
        };
        setUser(withStatus);
      } else {
        setUser(null);
      }
      const fp = userPosts as FeedPost[];
      setPosts(fp);
      setLikedPostIds(new Set(fp.filter(p => p.likedByMe).map(p => p.id)));
      const req = (requests as FriendRequest[]).find(r => r.fromUser.id === userId);
      setPendingRequest(req ?? null);
      setIsBlocked(blocked as boolean);
      setStats(userStats as { postsCount: number; followersCount: number; followingCount: number });
    }).catch(() => {}).finally(() => setLoading(false));
  }, [userId]);

  /* ── HANDLERS ──────────────────────────────────────── */
  const handleLike = async (postId: number) => {
    const isLiked = likedPostIds.has(postId);
    setLikedPostIds(prev => { const s = new Set(prev); isLiked ? s.delete(postId) : s.add(postId); return s; });
    setPosts(ps => ps.map(p => p.id === postId ? { ...p, likesCount: p.likesCount + (isLiked ? -1 : 1) } : p));
    try { await apiLikePost(postId, isLiked ? "unlike" : "like"); } catch {
      setLikedPostIds(prev => { const s = new Set(prev); isLiked ? s.add(postId) : s.delete(postId); return s; });
      setPosts(ps => ps.map(p => p.id === postId ? { ...p, likesCount: p.likesCount + (isLiked ? 1 : -1) } : p));
    }
  };

  const handleShare = (postId: number) => {
    const url = `${window.location.origin}${import.meta.env.BASE_URL ?? ""}post/${postId}`;
    if (navigator.share) navigator.share({ url }).catch(() => {});
    else navigator.clipboard?.writeText(url).catch(() => {});
  };

  const openMenu = () => setMenuPanel("menu");
  const closeAll = () => setMenuPanel(null);

  const handleSendRequest = async () => {
    if (!user) return;
    setActionLoading(true);
    try { await apiSendFriendRequest(user.id); setUser(u => u ? { ...u, friendshipStatus: "pending_sent" } : u); }
    catch { }
    setActionLoading(false);
  };
  const handleCancel = async () => {
    if (!user?.requestId) return;
    setActionLoading(true);
    try { await apiRejectFriendRequest(user.requestId); setUser(u => u ? { ...u, friendshipStatus: "none", requestId: undefined } : u); closeAll(); }
    catch { }
    setActionLoading(false);
  };
  const handleAccept = async () => {
    if (!pendingRequest) return;
    setActionLoading(true);
    try { await apiAcceptFriendRequest(pendingRequest.id); setUser(u => u ? { ...u, friendshipStatus: "friends" } : u); setPendingRequest(null); }
    catch { }
    setActionLoading(false);
  };
  const handleReject = async () => {
    if (!pendingRequest) return;
    setActionLoading(true);
    try { await apiRejectFriendRequest(pendingRequest.id); setUser(u => u ? { ...u, friendshipStatus: "none", requestId: undefined } : u); setPendingRequest(null); }
    catch { }
    setActionLoading(false);
  };
  const handleRemoveFriend = async () => {
    if (!user?.requestId) return;
    setActionLoading(true);
    try { await apiRejectFriendRequest(user.requestId); setUser(u => u ? { ...u, friendshipStatus: "none", requestId: undefined } : u); closeAll(); }
    catch { }
    setActionLoading(false);
  };
  const handleBlockConfirm = async () => {
    setBlockLoading(true);
    try { await apiBlockUser(userId); setIsBlocked(true); closeAll(); }
    catch { }
    setBlockLoading(false);
  };
  const handleUnblock = async () => {
    setBlockLoading(true);
    try { await apiUnblockUser(userId); setIsBlocked(false); closeAll(); }
    catch { }
    setBlockLoading(false);
  };
  const handleReport = async () => {
    if (!reportReason.trim()) return;
    setReportLoading(true);
    try { await apiReportUser(userId, reportReason, reportDescription); setReportSent(true); setReportReason(""); setReportDescription(""); }
    catch { }
    setReportLoading(false);
  };
  const handleCopyLink = async () => {
    const url = `${window.location.origin}/profile?id=${userId}`;
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopyDone(true);
    setTimeout(() => setCopyDone(false), 2500);
  };
  const handleHide = async (label: string) => {
    try { await apiHideUser(userId); } catch { }
    closeAll();
    setHideToast(label);
    setTimeout(() => setHideToast(null), 3000);
  };
  const loadMutualFriends = async () => {
    setMenuPanel("mutual_friends");
    if (mutualFriends.length > 0) return;
    setMutualFriendsLoading(true);
    try { const data = await apiGetMutualFriends(userId); setMutualFriends(data); }
    catch { }
    setMutualFriendsLoading(false);
  };
  const loadMutualGroups = async () => {
    setMenuPanel("mutual_groups");
    if (mutualGroups.length > 0) return;
    setMutualGroupsLoading(true);
    try { const data = await apiGetMutualGroups(userId); setMutualGroups(data); }
    catch { }
    setMutualGroupsLoading(false);
  };

  /* ── LOADING ── */
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#f0fdf4 0%,#fff 60%,#f0fdf4 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 48, height: 48, border: "4px solid #DCFCE7", borderTop: "4px solid var(--bp-primary)", borderRadius: "50%", margin: "0 auto 16px", animation: "spin 0.8s linear infinite" }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <div style={{ color: "#64748B", fontSize: 14, fontWeight: 600 }}>Chargement du profil…</div>
        </div>
      </div>
    );
  }

  /* ── NOT FOUND ── */
  if (!user) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#f0fdf4 0%,#fff 60%,#f0fdf4 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: 32 }}>
        <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="40" fill="#DCFCE7"/>
          <circle cx="38" cy="42" r="5" fill="var(--bp-primary)"/><circle cx="62" cy="42" r="5" fill="var(--bp-primary)"/>
          <path d="M35 62c4-6 26-6 30 0" stroke="var(--bp-primary)" strokeWidth="3" strokeLinecap="round" fill="none"/>
          <path d="M20 20l60 60M80 20L20 80" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" opacity="0.25"/>
        </svg>
        <div style={{ fontWeight: 900, fontSize: 20, color: "var(--theme-text)" }}>Profil introuvable</div>
        <div style={{ fontSize: 14, color: "#94A3B8", textAlign: "center" }}>Ce profil n'existe pas ou a été supprimé.</div>
        <button onClick={() => window.history.back()} style={{ background: "linear-gradient(135deg, var(--bp-primary), var(--bp-primary-dark))", color: "#fff", border: "none", borderRadius: 14, padding: "13px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: "0 4px 16px rgba(34,197,94,0.35)" }}>
          Retour
        </button>
      </div>
    );
  }

  const flag = user.country ? (COUNTRY_FLAGS[user.country] ?? "🌍") : null;
  const name = fullName(user);
  const color = avatarColor(user.id);
  const photoCount = posts.filter(p => p.imageUrl).length + (user.avatarUrl ? 1 : 0);
  const isOwner = meId === user.id;
  const joinYear = user.createdAt ? new Date(user.createdAt).getFullYear() : new Date().getFullYear();

  /* ── HEADER (shared) ─────────────────────────────── */
  const StickyHeader = ({ locked = false }: { locked?: boolean }) => (
    <div style={{ position: "sticky", top: 0, zIndex: 50, background: "var(--theme-surface)", boxShadow: "0 1px 0 #E5E7EB", padding: "0 14px", height: 58, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <button onClick={() => window.history.back()} style={{ background: "none", border: "none", width: 40, height: 40, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.15s" }}
        onPointerDown={e => (e.currentTarget.style.background = "#F1F5F9")}
        onPointerUp={e => (e.currentTarget.style.background = "none")}
        onPointerLeave={e => (e.currentTarget.style.background = "none")}
      >
        <IcoBack />
      </button>
      {/* BrutePawa logo centered */}
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,var(--bp-primary),var(--bp-primary-dark))", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(34,197,94,0.35)" }}>
          <span style={{ color: "#fff", fontWeight: 900, fontSize: 17, lineHeight: 1, fontFamily: "Arial Black,Arial,sans-serif" }}>b</span>
        </div>
        <span style={{ fontWeight: 800, fontSize: 18, color: "var(--theme-text)", letterSpacing: -0.3 }}>BrutePawa</span>
      </div>
      {!isOwner ? (
        <button onClick={openMenu} style={{ background: "none", border: "none", width: 40, height: 40, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.15s" }}
          onPointerDown={e => (e.currentTarget.style.background = "#F1F5F9")}
          onPointerUp={e => (e.currentTarget.style.background = "none")}
          onPointerLeave={e => (e.currentTarget.style.background = "none")}
        >
          <IcoDots />
        </button>
      ) : <div style={{ width: 40 }} />}
    </div>
  );

  /* ── LOCKED PROFILE VIEW ─────────────────────────── */
  if (user.profileLocked && user.friendshipStatus !== "friends" && !isOwner) {
    return (
      <div style={{ minHeight: "100vh", background: "#F8FAFC", maxWidth: 480, margin: "0 auto", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
        <StickyHeader locked />

        <div style={{ height: 190, position: "relative", background: "#052e16" }}>
          <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
            {user.coverUrl
              ? <img ref={coverImgRef} src={user.coverUrl} alt="cover" loading="lazy" style={{ width: "100%", height: "115%", objectFit: "cover", display: "block", transformOrigin: "top center", willChange: "transform" }} />
              : <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#052e16 0%,#052e16 40%,rgba(var(--bp-primary-rgb),0.27) 80%,#052e16 100%)" }}>
                  <svg viewBox="0 0 480 190" width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
                    <defs><radialGradient id="glw" cx="60%" cy="40%" r="60%"><stop offset="0%" stopColor="var(--bp-primary)" stopOpacity="0.35"/><stop offset="100%" stopColor="var(--bp-primary)" stopOpacity="0"/></radialGradient></defs>
                    <rect width="480" height="190" fill="#052e16"/>
                    <ellipse cx="290" cy="80" rx="200" ry="130" fill="url(#glw)"/>
                  </svg>
                </div>
            }
          </div>
          <div style={{ position: "absolute", bottom: -46, left: 16, zIndex: 5 }}>
            <div style={{ position: "relative", display: "inline-block" }}>
              {user.avatarUrl
                ? <img src={user.avatarUrl} alt={name} style={{ width: 94, height: 94, borderRadius: "50%", border: "4px solid #fff", objectFit: "cover", boxShadow: "0 3px 16px rgba(0,0,0,0.25)", display: "block" }} />
                : <div style={{ width: 94, height: 94, borderRadius: "50%", background: color, border: "4px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 30, boxShadow: "0 3px 16px rgba(0,0,0,0.25)" }}>{initials(user)}</div>
              }
              <div style={{ position: "absolute", bottom: -3, right: -3, width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,var(--bp-primary),var(--bp-primary-dark))", border: "3px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(34,197,94,0.6)", zIndex: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="4" y="11" width="16" height="10" rx="2.5" fill="#fff"/><path d="M8 11V7a4 4 0 018 0v4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/><circle cx="12" cy="16" r="2" fill="var(--bp-primary)"/></svg>
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: "var(--theme-surface)", paddingTop: 58, paddingBottom: 18, paddingLeft: 12, paddingRight: 12, borderBottom: "1px solid #F1F5F9" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 5 }}>
            <span style={{ fontWeight: 900, fontSize: 22, color: "var(--theme-text)", letterSpacing: -0.3 }}>{name}</span>
            {[13, 26, 40].includes(userId) && <img src="/badge-verified.jpg" alt="Vérifié" style={{ width: 20, height: 20, objectFit: "cover", borderRadius: "50%", flexShrink: 0 }} />}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 18 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span style={{ fontSize: 13, color: "#64748B", fontWeight: 500 }}>Membre BrutePawa depuis {joinYear}</span>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
            {(user.friendshipStatus === "none" && !pendingRequest) ? (
              <button disabled={actionLoading} onClick={handleSendRequest} style={{ flex: "1 1 0", minWidth: 0, padding: "11px 5px", background: "var(--bp-primary)", color: "#fff", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 12.5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, boxShadow: "0 3px 12px rgba(34,197,94,0.4)", whiteSpace: "nowrap", overflow: "hidden" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                {actionLoading ? "…" : "Ajouter comme ami"}
              </button>
            ) : (user.friendshipStatus === "pending_sent") ? (
              <button disabled={actionLoading} onClick={handleCancel} style={{ flex: "1 1 0", minWidth: 0, padding: "11px 5px", background: "#F1F5F9", color: "#64748B", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 12.5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, whiteSpace: "nowrap", overflow: "hidden" }}>
                <IcoClock />{actionLoading ? "…" : "Demande envoyée"}
              </button>
            ) : (user.friendshipStatus === "pending_received" || pendingRequest) ? (
              <button disabled={actionLoading} onClick={handleAccept} style={{ flex: "1 1 0", minWidth: 0, padding: "11px 5px", background: "var(--bp-primary)", color: "#fff", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 12.5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, boxShadow: "0 3px 12px rgba(34,197,94,0.4)", whiteSpace: "nowrap", overflow: "hidden" }}>
                <IcoCheck />{actionLoading ? "…" : "Confirmer"}
              </button>
            ) : null}
            <button onClick={() => navigate(`/messages?userId=${user.id}`)} style={{ flex: "1 1 0", minWidth: 0, padding: "11px 5px", background: "#F8FAFC", color: "#64748B", border: "1.5px solid #E5E7EB", borderRadius: 12, fontWeight: 600, fontSize: 12.5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, whiteSpace: "nowrap", overflow: "hidden" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>
              Envoyer un message
            </button>
          </div>
        </div>

        <div style={{ margin: "12px 12px 10px", background: "var(--theme-surface)", borderRadius: 18, boxShadow: "0 2px 10px rgba(0,0,0,0.07)", display: "flex", alignItems: "center", padding: "16px 16px 16px 0", minHeight: 110 }}>
          <div style={{ width: 110, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="76" height="86" viewBox="0 0 90 100" fill="none">
              <path d="M45 8L12 20v24c0 22 14.4 40.6 33 47 18.6-6.4 33-25 33-47V20L45 8z" fill="var(--bp-primary-dark)" opacity="0.45"/>
              <path d="M45 4L10 17v25c0 23 15.3 42.2 35 48.5C64.7 84.2 80 65 80 42V17L45 4z" fill="url(#shG2)"/>
              <defs><linearGradient id="shG2" x1="10" y1="4" x2="80" y2="95" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="var(--bp-primary)"/><stop offset="50%" stopColor="var(--bp-primary)"/><stop offset="100%" stopColor="var(--bp-primary-dark)"/></linearGradient></defs>
              <path d="M45 10L16 21v23c0 5 1.2 10 3.2 14.5L45 10z" fill="rgba(255,255,255,0.15)"/>
              <rect x="31" y="47" width="28" height="22" rx="5" fill="#fff"/>
              <path d="M35.5 47V40a9.5 9.5 0 0119 0v7" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
              <circle cx="45" cy="56" r="4" fill="var(--bp-primary)"/>
              <rect x="43.5" y="56" width="3" height="7" rx="1.5" fill="var(--bp-primary)"/>
            </svg>
          </div>
          <div style={{ flex: 1, paddingRight: 16, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2.5" fill="var(--bp-primary)"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="var(--bp-primary)" strokeWidth="2.2" strokeLinecap="round"/></svg>
              <span style={{ fontWeight: 800, fontSize: 16, color: "var(--theme-text)" }}>Profil verrouillé</span>
            </div>
            <div style={{ fontSize: 13, color: "#64748B", lineHeight: 1.65 }}>Ce profil est protégé. Seuls ses amis peuvent voir ses publications, photos et informations.</div>
          </div>
        </div>

        <div style={{ margin: "0 12px 80px", background: "var(--theme-surface)", borderRadius: 18, boxShadow: "0 2px 10px rgba(0,0,0,0.07)", padding: "16px 18px", display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: "#F0FDF4", border: "1.5px solid #BBF7D0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--bp-primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14.5, color: "var(--theme-text)", marginBottom: 7 }}>Pourquoi ce profil est-il verrouillé ?</div>
            <div style={{ fontSize: 13, color: "#64748B", lineHeight: 1.7 }}>Le propriétaire a choisi de restreindre l'accès à son contenu. Ajoutez-le comme ami pour voir ses publications et interagir avec lui sur BrutePawa.</div>
          </div>
        </div>

        {/* Overlays for locked view too */}
        <MenuOverlays />
      </div>
    );
  }

  /* ── NORMAL PROFILE VIEW ─────────────────────────── */

  /* Menu overlays component (shared between locked and normal views) */
  function MenuOverlays() {
    if (menuPanel === null) return null;
    return (
      <>
        <style>{`
          @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>

        {/* ── MENU BOTTOM SHEET ── */}
        {menuPanel === "menu" && (
          <div style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", flexDirection: "column", justifyContent: "flex-end" }} onClick={closeAll}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", animation: "fadeIn 0.2s ease" }} />
            <div style={{ position: "relative", background: "var(--theme-surface)", borderRadius: "24px 24px 0 0", maxHeight: "85vh", overflowY: "auto", animation: "slideUp 0.28s ease-out", maxWidth: 600, width: "100%", margin: "0 auto", boxShadow: "0 -8px 48px rgba(0,0,0,0.22)" }}
              onClick={e => e.stopPropagation()}>
              {/* Drag handle */}
              <div style={{ padding: "14px 0 6px", display: "flex", justifyContent: "center" }}>
                <div style={{ width: 40, height: 4, background: "#E5E7EB", borderRadius: 2 }} />
              </div>
              {/* Profile mini */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px 14px", borderBottom: "1px solid #F1F5F9" }}>
                {user.avatarUrl
                  ? <img src={user.avatarUrl} alt="" style={{ width: 46, height: 46, borderRadius: "50%", objectFit: "cover", border: "2px solid #DCFCE7" }} />
                  : <div style={{ width: 46, height: 46, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 16, border: "2px solid #DCFCE7", flexShrink: 0 }}>{initials(user)}</div>
                }
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: "var(--theme-text)" }}>{name}</div>
                  <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>@{name.toLowerCase().replace(/\s+/g, "_")}</div>
                </div>
              </div>

              {/* Section: Profil */}
              <MenuSection label="Profil">
                <MenuItem icon={<IcoShare />} label="Partager le profil" onClick={() => setMenuPanel("share")} arrow />
                <MenuItem icon={<IcoLink />} label="Copier le lien du profil" sublabel={copyDone ? "Lien copié !" : undefined} sublabelGreen={copyDone} onClick={() => { handleCopyLink(); }} />
              </MenuSection>

              {/* Section: Gestion */}
              <MenuSection label="Gestion">
                <MenuItem icon={<IcoEyeOff />} label="Masquer ce profil" sublabel="Cacher de votre fil d'actualité" onClick={() => handleHide("Profil masqué")} />
                <MenuItem icon={<IcoSlash />} label="Ne plus suggérer" sublabel="Ne plus apparaître dans les suggestions" onClick={() => handleHide("Ce profil ne sera plus suggéré")} />
              </MenuSection>

              {/* Section: Sécurité */}
              <MenuSection label="Sécurité">
                {isBlocked
                  ? <MenuItem icon={<IcoUnlock />} label="Débloquer cet utilisateur" sublabel="Vous reverrez ce profil" labelColor="var(--bp-primary-dark)" onClick={handleUnblock} />
                  : <MenuItem icon={<IcoBlock />} label="Bloquer cet utilisateur" sublabel="Vous ne verrez plus ce profil" labelColor="#EF4444" onClick={() => setMenuPanel("block")} arrow />
                }
                <MenuItem icon={<IcoFlag />} label="Signaler ce profil" sublabel="Signaler un comportement" labelColor="#EF4444" onClick={() => { setMenuPanel("report"); setReportSent(false); setReportReason(""); setReportDescription(""); }} arrow />
              </MenuSection>

              {/* Section: Relation (conditional) */}
              {(user.friendshipStatus === "pending_sent" || user.friendshipStatus === "friends") && (
                <MenuSection label="Relation">
                  {user.friendshipStatus === "pending_sent" && (
                    <MenuItem icon={<IcoClock />} label="Annuler la demande d'ami" labelColor="#EF4444" onClick={handleCancel} loading={actionLoading} />
                  )}
                  {user.friendshipStatus === "friends" && (
                    <MenuItem icon={<IcoUserX />} label="Retirer de mes amis" labelColor="#EF4444" onClick={handleRemoveFriend} loading={actionLoading} />
                  )}
                </MenuSection>
              )}

              {/* Section: Informations */}
              <MenuSection label="Informations" last>
                <MenuItem icon={<IcoInfo />} label="Voir les informations publiques" onClick={() => setMenuPanel("public_info")} arrow />
                <MenuItem icon={<IcoPeople />} label="Amis en commun" onClick={loadMutualFriends} arrow />
                <MenuItem icon={<IcoGroup />} label="Groupes en commun" onClick={loadMutualGroups} arrow />
              </MenuSection>

              <div style={{ height: 16 }} />
            </div>
          </div>
        )}

        {/* ── SUB PAGE: SIGNALER ── */}
        {menuPanel === "report" && (
          <SubPage title="Signaler ce profil" onBack={closeAll}>
            {reportSent ? (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                  <IcoCheck size={38} color="var(--bp-primary)" />
                </div>
                <div style={{ fontWeight: 900, fontSize: 20, color: "var(--theme-text)", marginBottom: 10 }}>Signalement envoyé</div>
                <div style={{ fontSize: 14, color: "#94A3B8", lineHeight: 1.7, marginBottom: 32 }}>Notre équipe examinera ce profil dans les meilleurs délais. Merci de contribuer à la sécurité de la communauté.</div>
                <button onClick={closeAll} style={{ width: "100%", padding: "15px 0", background: "linear-gradient(135deg,var(--bp-primary),var(--bp-primary-dark))", color: "#fff", border: "none", borderRadius: 16, fontWeight: 700, fontSize: 15, cursor: "pointer" }}>Fermer</button>
              </div>
            ) : (
              <>
                <div style={{ padding: "4px 0 16px", fontSize: 13, color: "#94A3B8", lineHeight: 1.6 }}>
                  Sélectionnez le motif de votre signalement. Nous gardons cela confidentiel.
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
                  {["Spam ou faux compte", "Harcèlement ou intimidation", "Contenu inapproprié", "Usurpation d'identité", "Violence ou menaces", "Autre"].map(r => (
                    <button key={r} onClick={() => setReportReason(r)} style={{ padding: "14px 16px", borderRadius: 14, border: `2px solid ${reportReason === r ? "var(--bp-primary)" : "#E5E7EB"}`, background: reportReason === r ? "#F0FDF4" : "#fff", cursor: "pointer", textAlign: "left", fontSize: 14, fontWeight: 600, color: reportReason === r ? "var(--bp-primary-dark)" : "#64748B", display: "flex", alignItems: "center", gap: 12, transition: "all 0.15s" }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${reportReason === r ? "var(--bp-primary)" : "#E5E7EB"}`, background: reportReason === r ? "var(--bp-primary)" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
                        {reportReason === r && <IcoCheck size={11} />}
                      </div>
                      {r}
                    </button>
                  ))}
                </div>
                <div style={{ marginBottom: 22 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#64748B", marginBottom: 8 }}>Informations supplémentaires (optionnel)</div>
                  <textarea
                    value={reportDescription}
                    onChange={e => setReportDescription(e.target.value)}
                    placeholder="Décrivez ce qui s'est passé…"
                    maxLength={500}
                    rows={3}
                    style={{ width: "100%", padding: "12px 14px", borderRadius: 14, border: "2px solid #E5E7EB", fontSize: 14, color: "#64748B", resize: "none", fontFamily: "inherit", outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" }}
                    onFocus={e => (e.target.style.borderColor = "var(--bp-primary)")}
                    onBlur={e => (e.target.style.borderColor = "#E5E7EB")}
                  />
                  <div style={{ textAlign: "right", fontSize: 11, color: "#94A3B8", marginTop: 4 }}>{reportDescription.length}/500</div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={closeAll} style={{ flex: 1, padding: 15, background: "#F1F5F9", border: "none", borderRadius: 14, fontWeight: 700, fontSize: 14, cursor: "pointer", color: "#64748B" }}>Annuler</button>
                  <button onClick={handleReport} disabled={!reportReason.trim() || reportLoading} style={{ flex: 2, padding: 15, background: !reportReason.trim() ? "#E5E7EB" : "linear-gradient(135deg,var(--bp-primary),var(--bp-primary-dark))", color: !reportReason.trim() ? "#94A3B8" : "#fff", border: "none", borderRadius: 14, fontWeight: 700, fontSize: 14, cursor: !reportReason.trim() ? "default" : "pointer", transition: "all 0.2s" }}>
                    {reportLoading ? "Envoi…" : "Envoyer"}
                  </button>
                </div>
              </>
            )}
          </SubPage>
        )}

        {/* ── SUB PAGE: BLOQUER ── */}
        {menuPanel === "block" && (
          <SubPage title="Bloquer cet utilisateur" onBack={closeAll}>
            <div style={{ textAlign: "center", padding: "20px 0 28px" }}>
              {user.avatarUrl
                ? <img src={user.avatarUrl} alt="" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: "4px solid #FEE2E2", margin: "0 auto 16px", display: "block" }} />
                : <div style={{ width: 80, height: 80, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 26, border: "4px solid #FEE2E2", margin: "0 auto 16px" }}>{initials(user)}</div>
              }
              <div style={{ fontWeight: 800, fontSize: 18, color: "var(--theme-text)", marginBottom: 6 }}>Bloquer {name} ?</div>
            </div>
            <div style={{ background: "#FEE2E2", borderRadius: 16, padding: "16px 18px", marginBottom: 24, display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                "Il ne pourra plus vous envoyer de messages",
                "Il ne verra plus vos publications",
                "Vous ne verrez plus son profil ni ses contenus",
                "Il ne sera pas notifié du blocage",
              ].map((t, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13.5, color: "#64748B" }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                    <IcoCheck size={10} color="#EF4444" />
                  </div>
                  {t}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={closeAll} style={{ flex: 1, padding: 15, background: "#F1F5F9", border: "none", borderRadius: 14, fontWeight: 700, fontSize: 14, cursor: "pointer", color: "#64748B" }}>Annuler</button>
              <button onClick={handleBlockConfirm} disabled={blockLoading} style={{ flex: 2, padding: 15, background: "#EF4444", color: "#fff", border: "none", borderRadius: 14, fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: "0 4px 14px rgba(239,68,68,0.35)" }}>
                {blockLoading ? "…" : `Bloquer ${user.firstName}`}
              </button>
            </div>
          </SubPage>
        )}

        {/* ── SUB PAGE: PARTAGER ── */}
        {menuPanel === "share" && (() => {
          const profileUrl = `${window.location.origin}/profile?id=${userId}`;
          const shareItems = [
            { icon: "💬", label: "Envoyer dans BrutePawa", sublabel: "Via messagerie", onClick: () => { navigate(`/messages`); closeAll(); } },
            { icon: "🟢", label: "Partager sur WhatsApp", onClick: () => { window.open(`https://wa.me/?text=${encodeURIComponent(name + " sur BrutePawa\n" + profileUrl)}`, "_blank"); closeAll(); } },
            { icon: "🔵", label: "Partager sur Facebook", onClick: () => { window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`, "_blank"); closeAll(); } },
            { icon: "✈️", label: "Partager sur Telegram", onClick: () => { window.open(`https://t.me/share/url?url=${encodeURIComponent(profileUrl)}&text=${encodeURIComponent(name + " sur BrutePawa")}`, "_blank"); closeAll(); } },
          ];
          return (
            <SubPage title="Partager le profil" onBack={closeAll}>
              <div style={{ padding: "4px 0 20px", fontSize: 13, color: "#94A3B8" }}>Choisissez comment partager ce profil.</div>
              {/* Copy link big card */}
              <button onClick={handleCopyLink} style={{ width: "100%", padding: "16px 18px", background: copyDone ? "#F0FDF4" : "#F8FAFC", border: `2px solid ${copyDone ? "var(--bp-primary)" : "#E5E7EB"}`, borderRadius: 18, cursor: "pointer", display: "flex", alignItems: "center", gap: 14, marginBottom: 12, transition: "all 0.2s", textAlign: "left" }}>
                <div style={{ width: 50, height: 50, borderRadius: 16, background: copyDone ? "#DCFCE7" : "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 22 }}>
                  {copyDone ? "✅" : "🔗"}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: copyDone ? "var(--bp-primary-dark)" : "#111827" }}>{copyDone ? "Lien copié !" : "Copier le lien"}</div>
                  <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>{profileUrl.replace("https://","").substring(0,40)}{profileUrl.length > 44 ? "…" : ""}</div>
                </div>
              </button>
              {/* Other share options */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {shareItems.map((item, i) => (
                  <button key={i} onClick={item.onClick} style={{ width: "100%", padding: "14px 18px", background: "#F8FAFC", border: "2px solid #E5E7EB", borderRadius: 16, cursor: "pointer", display: "flex", alignItems: "center", gap: 14, textAlign: "left", transition: "all 0.15s" }}
                    onPointerDown={e => (e.currentTarget.style.background = "#F0FDF4")}
                    onPointerUp={e => (e.currentTarget.style.background = "#F8FAFC")}
                    onPointerLeave={e => (e.currentTarget.style.background = "#F8FAFC")}
                  >
                    <div style={{ width: 46, height: 46, borderRadius: 14, background: "var(--theme-surface)", border: "1.5px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 22 }}>{item.icon}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "var(--theme-text)" }}>{item.label}</div>
                      {item.sublabel && <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>{item.sublabel}</div>}
                    </div>
                  </button>
                ))}
              </div>
            </SubPage>
          );
        })()}

        {/* ── SUB PAGE: INFOS PUBLIQUES ── */}
        {menuPanel === "public_info" && (
          <SubPage title="Informations publiques" onBack={closeAll}>
            <div style={{ background: "#F8FAFC", borderRadius: 20, padding: "20px", marginBottom: 14, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              {user.avatarUrl
                ? <img src={user.avatarUrl} alt="" style={{ width: 90, height: 90, borderRadius: "50%", objectFit: "cover", border: "4px solid #fff", boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }} />
                : <div style={{ width: 90, height: 90, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 28, border: "4px solid #fff", boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}>{initials(user)}</div>
              }
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 900, fontSize: 20, color: "var(--theme-text)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  {name}
                  {[13, 26, 40].includes(userId) && <img src="/badge-verified.jpg" alt="Vérifié" style={{ width: 20, height: 20, objectFit: "cover", borderRadius: "50%", flexShrink: 0 }} />}
                </div>
                <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>@{name.toLowerCase().replace(/\s+/g, "_")}</div>
              </div>
              {user.bio && <div style={{ fontSize: 14, color: "#64748B", textAlign: "center", lineHeight: 1.6 }}>{user.bio}</div>}
            </div>
            {/* Info rows */}
            {[
              user.country && { icon: "📍", label: "Localisation", value: user.country + (flag ? ` ${flag}` : "") },
              { icon: "📅", label: "Membre depuis", value: `${joinYear}` },
              stats && { icon: "📝", label: "Publications", value: fmtCount(stats.postsCount) },
              stats && { icon: "👥", label: "Abonnés", value: fmtCount(stats.followersCount) },
            ].filter(Boolean).map((row: any, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "var(--theme-surface)", borderRadius: 14, marginBottom: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{row.icon}</div>
                <div>
                  <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 500 }}>{row.label}</div>
                  <div style={{ fontSize: 15, color: "var(--theme-text)", fontWeight: 700, marginTop: 2 }}>{row.value}</div>
                </div>
              </div>
            ))}
          </SubPage>
        )}

        {/* ── SUB PAGE: AMIS EN COMMUN ── */}
        {menuPanel === "mutual_friends" && (
          <SubPage title="Amis en commun" onBack={closeAll}>
            {mutualFriendsLoading ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <div style={{ width: 40, height: 40, border: "4px solid #DCFCE7", borderTop: "4px solid var(--bp-primary)", borderRadius: "50%", margin: "0 auto 14px", animation: "spin 0.8s linear infinite" }} />
                <div style={{ color: "#94A3B8", fontSize: 14 }}>Chargement…</div>
              </div>
            ) : mutualFriends.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <EmptyMutualIllustration />
                <div style={{ fontWeight: 800, fontSize: 17, color: "var(--theme-text)", marginTop: 16, marginBottom: 8 }}>Aucun ami en commun</div>
                <div style={{ fontSize: 13, color: "#94A3B8" }}>Vous n'avez pas encore d'amis en commun avec {user.firstName}.</div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 13, color: "#94A3B8", marginBottom: 14, fontWeight: 500 }}>{mutualFriends.length} ami{mutualFriends.length > 1 ? "s" : ""} en commun</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {mutualFriends.map(f => {
                    const fc = avatarColor(f.id);
                    return (
                      <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "#F8FAFC", borderRadius: 16 }}>
                        {f.avatarUrl
                          ? <img src={f.avatarUrl} alt="" style={{ width: 50, height: 50, borderRadius: "50%", objectFit: "cover", border: "2px solid #DCFCE7", flexShrink: 0 }} />
                          : <div style={{ width: 50, height: 50, borderRadius: "50%", background: fc, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 17, border: "2px solid #DCFCE7", flexShrink: 0 }}>{initials(f)}</div>
                        }
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--theme-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fullName(f)}</div>
                          {f.country && <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>{COUNTRY_FLAGS[f.country] ?? "🌍"} {f.country}</div>}
                        </div>
                        <button onClick={() => { closeAll(); navigate(`/profile?id=${f.id}`); }} style={{ background: "#F0FDF4", border: "1.5px solid #DCFCE7", borderRadius: 10, padding: "7px 12px", fontSize: 12.5, fontWeight: 700, color: "var(--bp-primary-dark)", cursor: "pointer", flexShrink: 0 }}>
                          Voir
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </SubPage>
        )}

        {/* ── SUB PAGE: GROUPES EN COMMUN ── */}
        {menuPanel === "mutual_groups" && (
          <SubPage title="Groupes en commun" onBack={closeAll}>
            {mutualGroupsLoading ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <div style={{ width: 40, height: 40, border: "4px solid #DCFCE7", borderTop: "4px solid var(--bp-primary)", borderRadius: "50%", margin: "0 auto 14px", animation: "spin 0.8s linear infinite" }} />
                <div style={{ color: "#94A3B8", fontSize: 14 }}>Chargement…</div>
              </div>
            ) : mutualGroups.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <EmptyMutualIllustration />
                <div style={{ fontWeight: 800, fontSize: 17, color: "var(--theme-text)", marginTop: 16, marginBottom: 8 }}>Aucun groupe en commun</div>
                <div style={{ fontSize: 13, color: "#94A3B8" }}>Vous n'avez pas de groupes en commun avec {user.firstName}.</div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 13, color: "#94A3B8", marginBottom: 14, fontWeight: 500 }}>{mutualGroups.length} groupe{mutualGroups.length > 1 ? "s" : ""} en commun</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {mutualGroups.map(g => (
                    <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "#F8FAFC", borderRadius: 16 }}>
                      {g.avatarUrl
                        ? <img src={g.avatarUrl} alt="" style={{ width: 50, height: 50, borderRadius: 14, objectFit: "cover", border: "2px solid #DCFCE7", flexShrink: 0 }} />
                        : <div style={{ width: 50, height: 50, borderRadius: 14, background: "var(--bp-primary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <IcoGroup />
                          </div>
                      }
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "var(--theme-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</div>
                        <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>{g.type === "channel" ? "Canal" : "Groupe"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </SubPage>
        )}
      </>
    );
  }

  /* ── MENU HELPER COMPONENTS ─────────────────────── */
  function MenuSection({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
    return (
      <div style={{ borderBottom: last ? "none" : "1px solid #F1F5F9" }}>
        <div style={{ padding: "10px 20px 4px", fontSize: 11, fontWeight: 800, color: "#94A3B8", letterSpacing: 0.8, textTransform: "uppercase" }}>{label}</div>
        {children}
      </div>
    );
  }
  function MenuItem({ icon, label, sublabel, labelColor, onClick, arrow, loading: itemLoading, sublabelGreen }: {
    icon: React.ReactNode; label: string; sublabel?: string; labelColor?: string;
    onClick: () => void; arrow?: boolean; loading?: boolean; sublabelGreen?: boolean;
  }) {
    return (
      <button onClick={onClick} disabled={itemLoading} style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", padding: "13px 20px", background: "none", border: "none", textAlign: "left", cursor: "pointer" }}
        onPointerDown={e => (e.currentTarget.style.background = "#F8FAFC")}
        onPointerUp={e => (e.currentTarget.style.background = "none")}
        onPointerLeave={e => (e.currentTarget.style.background = "none")}
      >
        <div style={{ width: 40, height: 40, borderRadius: 12, background: labelColor ? `${labelColor}15` : "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: labelColor ?? "#111827", lineHeight: 1.3 }}>{label}</div>
          {sublabel && <div style={{ fontSize: 12, color: sublabelGreen ? "var(--bp-primary-dark)" : "#94A3B8", marginTop: 2 }}>{sublabel}</div>}
        </div>
        {itemLoading && <div style={{ width: 18, height: 18, border: "2.5px solid var(--bp-primary)", borderTop: "2.5px solid transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />}
        {arrow && !itemLoading && <IcoChevron />}
      </button>
    );
  }
  function SubPage({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "#F8FAFC", display: "flex", flexDirection: "column", maxWidth: 600, margin: "0 auto" }}>
        <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ animation: "slideInRight 0.22s ease-out", flex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
          {/* Header */}
          <div style={{ background: "var(--theme-surface)", borderBottom: "1px solid #F1F5F9", padding: "0 16px", height: 58, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <button onClick={onBack} style={{ background: "#F1F5F9", border: "none", width: 40, height: 40, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
              onPointerDown={e => (e.currentTarget.style.background = "#E5E7EB")}
              onPointerUp={e => (e.currentTarget.style.background = "#F1F5F9")}
              onPointerLeave={e => (e.currentTarget.style.background = "#F1F5F9")}
            >
              <IcoBack />
            </button>
            <span style={{ fontWeight: 900, fontSize: 17, color: "var(--theme-text)", flex: 1 }}>{title}</span>
          </div>
          {/* Content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 80px" }}>
            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", maxWidth: 600, margin: "0 auto", position: "relative" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* ── STICKY HEADER ── */}
      <StickyHeader />

      {/* ── COVER + AVATAR ── */}
      <div style={{ position: "relative" }}>
        <div style={{ height: 190, background: `linear-gradient(135deg, ${color}ee 0%, ${color}88 60%, ${color}33 100%)`, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -60, right: -60, width: 220, height: 220, borderRadius: "50%", background: "rgba(255,255,255,0.12)" }} />
          <div style={{ position: "absolute", bottom: -40, right: 60, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
          {user.coverUrl && <img src={user.coverUrl} alt="cover" onClick={() => openImageViewer(user.coverUrl!)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block", cursor: "zoom-in" }} />}
        </div>
        <div style={{ position: "absolute", bottom: -48, left: 20, zIndex: 5 }}>
          {user.avatarUrl
            ? <img src={user.avatarUrl} alt={name} onClick={() => openImageViewer(user.avatarUrl!)} style={{ width: 96, height: 96, borderRadius: "50%", border: "4px solid #fff", objectFit: "cover", boxShadow: "0 4px 20px rgba(0,0,0,0.2)", cursor: "zoom-in" }} />
            : <div style={{ width: 96, height: 96, borderRadius: "50%", background: color, border: "4px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 32, boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>{initials(user)}</div>
          }
          {isOnline && (
            <div style={{ position: "absolute", bottom: 7, right: 5, width: 18, height: 18, borderRadius: "50%", background: "var(--bp-primary)", border: "2.5px solid #fff" }} />
          )}
        </div>
      </div>

      {/* ── PROFILE INFO ── */}
      <div style={{ background: "var(--theme-surface)", paddingTop: 62, borderBottom: "1px solid #F1F5F9" }}>
        <div style={{ padding: "0 20px 18px" }}>
          {/* Name */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 900, fontSize: 23, color: "var(--theme-text)", lineHeight: 1.2 }}>{name}</span>
            {[13, 26, 40].includes(userId) && <img src="/badge-verified.jpg" alt="Vérifié" style={{ width: 22, height: 22, objectFit: "cover", borderRadius: "50%", flexShrink: 0 }} />}
            {(user as any).role === "creator" && (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L14.09 8.26L21 9.27L16.5 13.97L17.64 21L12 17.77L6.36 21L7.5 13.97L3 9.27L9.91 8.26L12 2Z" fill="var(--bp-primary)"/>
                <polyline points="9,12 11,14 15,10" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            )}
          </div>
          <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 3 }}>@{name.toLowerCase().replace(/\s+/g, "_")}</div>
          {user.bio && <div style={{ fontSize: 14, color: "#64748B", marginTop: 9, lineHeight: 1.6 }}>{user.bio}</div>}
          {user.country && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8 }}>
              <IcoMapPin /><span style={{ fontSize: 13, color: "#94A3B8" }}>{user.country}</span>
            </div>
          )}

          {/* Stats */}
          <div style={{ display: "flex", marginTop: 18, paddingTop: 16, borderTop: "1px solid #F1F5F9" }}>
            {[
              { value: fmtCount(stats?.postsCount ?? posts.length), label: "Publications" },
              { value: stats ? fmtCount(stats.followersCount) : "—", label: "Abonnés" },
              { value: stats ? fmtCount(stats.followingCount) : "—", label: "Abonnements" },
            ].map((stat, i) => (
              <div key={i} style={{ flex: 1, textAlign: "center", borderRight: i < 2 ? "1px solid #F1F5F9" : "none", padding: "2px 4px" }}>
                <div style={{ fontWeight: 900, fontSize: 19, color: "var(--theme-text)", lineHeight: 1.2 }}>{stat.value}</div>
                <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 3, fontWeight: 500 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            {user.friendshipStatus === "none" && !pendingRequest && (
              <button disabled={actionLoading} onClick={handleSendRequest} style={{ flex: 1, padding: "12px 8px", background: "linear-gradient(135deg,var(--bp-primary),var(--bp-primary-dark))", color: "#fff", border: "none", borderRadius: 14, fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, opacity: actionLoading ? 0.7 : 1, boxShadow: "0 4px 14px rgba(34,197,94,0.35)", transition: "transform 0.15s" }}
                onPointerDown={e => (e.currentTarget.style.transform = "scale(0.97)")}
                onPointerUp={e => (e.currentTarget.style.transform = "scale(1)")}
                onPointerLeave={e => (e.currentTarget.style.transform = "scale(1)")}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                {actionLoading ? "…" : "Ajouter"}
              </button>
            )}
            {user.friendshipStatus === "pending_sent" && (
              <button disabled={actionLoading} onClick={handleCancel} style={{ flex: 1, padding: "12px 8px", background: "#F1F5F9", color: "#64748B", border: "none", borderRadius: 14, fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <IcoClock />{actionLoading ? "…" : "Demande envoyée"}
              </button>
            )}
            {(user.friendshipStatus === "pending_received" || pendingRequest) && (
              <>
                <button disabled={actionLoading} onClick={handleAccept} style={{ flex: 1, padding: "12px 8px", background: "linear-gradient(135deg,var(--bp-primary),var(--bp-primary-dark))", color: "#fff", border: "none", borderRadius: 14, fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: "0 4px 14px rgba(34,197,94,0.3)" }}>
                  <IcoCheck />{actionLoading ? "…" : "Confirmer"}
                </button>
                <button disabled={actionLoading} onClick={handleReject} style={{ flex: 1, padding: "12px 8px", background: "#F1F5F9", color: "#64748B", border: "none", borderRadius: 14, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Supprimer</button>
              </>
            )}
            {user.friendshipStatus === "friends" && (
              <button style={{ flex: 1, padding: "12px 8px", background: "#F0FDF4", color: "var(--bp-primary-dark)", border: "1.5px solid #DCFCE7", borderRadius: 14, fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <IcoCheck size={16} color="var(--bp-primary-dark)" />Ami(e)s
              </button>
            )}
            <button onClick={() => navigate(`/messages?userId=${user.id}`)} style={{ flex: 1, padding: "12px 8px", background: "#DCFCE7", color: "#0EA5E9", border: "1.5px solid #DCFCE7", borderRadius: 14, fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, transition: "transform 0.15s" }}
              onPointerDown={e => (e.currentTarget.style.transform = "scale(0.97)")}
              onPointerUp={e => (e.currentTarget.style.transform = "scale(1)")}
              onPointerLeave={e => (e.currentTarget.style.transform = "scale(1)")}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              Message
            </button>
          </div>

          {/* Blocked banner */}
          {isBlocked && (
            <div style={{ marginTop: 14, padding: "11px 16px", background: "#FEF3C7", borderRadius: 12, fontSize: 13, color: "#D97706", fontWeight: 600, display: "flex", alignItems: "center", gap: 10, border: "1px solid #FEF3C7" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#D97706" strokeWidth="2"/><path d="M6.34 17.66L17.66 6.34" stroke="#D97706" strokeWidth="2" strokeLinecap="round"/></svg>
              <span>Vous avez bloqué cet utilisateur.</span>
              <button onClick={handleUnblock} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#D97706", textDecoration: "underline", padding: 0 }}>Débloquer</button>
            </div>
          )}
        </div>

        {/* ── TABS ── */}
        <div style={{ display: "flex", borderTop: "1px solid #F1F5F9" }}>
          {([
            { id: "posts" as ProfileTab, label: "Publications" },
            { id: "about" as ProfileTab, label: "À propos" },
            { id: "photos" as ProfileTab, label: "Photos" },
          ]).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ flex: 1, padding: "14px 8px", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: activeTab === tab.id ? 800 : 500, color: activeTab === tab.id ? "var(--bp-primary)" : "#94A3B8", borderBottom: `2.5px solid ${activeTab === tab.id ? "var(--bp-primary)" : "transparent"}`, transition: "color 0.15s" }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ padding: "14px 12px 40px" }}>

        {/* PUBLICATIONS */}
        {activeTab === "posts" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {posts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "52px 20px 48px", background: "var(--theme-surface)", borderRadius: 22, boxShadow: "0 2px 12px rgba(0,0,0,0.05)", border: "1px solid rgba(34,197,94,0.07)" }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}><EmptyPostsIllustration /></div>
                <div style={{ fontWeight: 800, fontSize: 17, color: "var(--theme-text)", marginBottom: 8 }}>Aucune publication</div>
                <div style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.6 }}>Cet utilisateur n'a pas encore partagé de contenu.</div>
              </div>
            ) : posts.map(post => (
              <div key={post.id} style={{ background: "var(--theme-surface)", borderRadius: 20, padding: "16px 16px 12px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  {user.avatarUrl
                    ? <img src={user.avatarUrl} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2px solid #DCFCE7" }} />
                    : <div style={{ width: 44, height: 44, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 15, border: "2px solid #DCFCE7", flexShrink: 0 }}>{initials(user)}</div>
                  }
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "var(--theme-text)" }}>{name}</div>
                    <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                      <IcoGlobe />{relTime(post.createdAt)}
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setPostMenu(post.id); }}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 20, color: "#94A3B8", fontSize: 20, fontWeight: 700, lineHeight: 1, flexShrink: 0 }}>
                    ···
                  </button>
                </div>
                <div style={{ fontSize: 14.5, color: "#64748B", lineHeight: 1.65 }}>{post.content}</div>
                {post.imageUrl && <img src={post.imageUrl} alt="" onClick={() => openImageViewer(post.imageUrl!)} style={{ width: "100%", maxHeight: 320, objectFit: "cover", borderRadius: 14, marginTop: 12, cursor: "zoom-in" }} />}
                <div style={{ display: "flex", gap: 2, marginTop: 12, paddingTop: 10, borderTop: "1px solid #F8FAFC" }}>
                  {/* J'aime */}
                  <button onClick={() => handleLike(post.id)}
                    style={{ flex: 1, padding: "8px 4px", background: "none", border: "none", cursor: "pointer", fontWeight: 600, color: likedPostIds.has(post.id) ? "var(--bp-primary)" : "#64748B", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, borderRadius: 10, fontSize: 12.5, transition: "color .15s" }}
                    onPointerDown={e => (e.currentTarget.style.background = "#F8FAFC")}
                    onPointerUp={e => (e.currentTarget.style.background = "none")}
                    onPointerLeave={e => (e.currentTarget.style.background = "none")}
                  >
                    <IcoLike active={likedPostIds.has(post.id)} />
                    <span>{post.likesCount > 0 ? `${post.likesCount} ` : ""}J'aime</span>
                  </button>
                  {/* Commenter */}
                  <button onClick={() => navigate(`/post/${post.id}`)}
                    style={{ flex: 1, padding: "8px 4px", background: "none", border: "none", cursor: "pointer", fontWeight: 600, color: "#64748B", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, borderRadius: 10, fontSize: 12.5 }}
                    onPointerDown={e => (e.currentTarget.style.background = "#F8FAFC")}
                    onPointerUp={e => (e.currentTarget.style.background = "none")}
                    onPointerLeave={e => (e.currentTarget.style.background = "none")}
                  >
                    <IcoComment />
                    <span>{post.commentsCount > 0 ? `${post.commentsCount} ` : ""}Commenter</span>
                  </button>
                  {/* Partager */}
                  <button onClick={() => handleShare(post.id)}
                    style={{ flex: 1, padding: "8px 4px", background: "none", border: "none", cursor: "pointer", fontWeight: 600, color: "#64748B", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, borderRadius: 10, fontSize: 12.5 }}
                    onPointerDown={e => (e.currentTarget.style.background = "#F8FAFC")}
                    onPointerUp={e => (e.currentTarget.style.background = "none")}
                    onPointerLeave={e => (e.currentTarget.style.background = "none")}
                  >
                    <IcoShareFeed />
                    <span>Partager</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* À PROPOS */}
        {activeTab === "about" && (
          <div style={{ background: "var(--theme-surface)", borderRadius: 20, padding: "18px 20px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.04)" }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: "var(--theme-text)", marginBottom: 16 }}>Informations</div>
            {(() => {
              const rows = [
                user.bio && { icon: <IcoBriefcase />, label: user.bio },
                user.country && { icon: <IcoMapPin />, label: `Habite en ${user.country}` },
              ].filter(Boolean) as { icon: React.ReactNode; label: string }[];
              if (rows.length === 0) return <div style={{ color: "#94A3B8", fontSize: 14, textAlign: "center", padding: "20px 0" }}>Aucune information publique disponible.</div>;
              return rows.map((info, i) => (
                <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", paddingTop: i > 0 ? 14 : 0, paddingBottom: i < rows.length - 1 ? 14 : 0, borderTop: i > 0 ? "1px solid #F1F5F9" : "none" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{info.icon}</div>
                  <span style={{ fontSize: 14, color: "#64748B", lineHeight: 1.6, paddingTop: 8 }}>{info.label}</span>
                </div>
              ));
            })()}
          </div>
        )}

        {/* PHOTOS */}
        {activeTab === "photos" && (
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: "var(--theme-text)", marginBottom: 12, paddingLeft: 4 }}>Photos ({photoCount})</div>
            {photoCount === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 20px 44px", background: "var(--theme-surface)", borderRadius: 22, boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}><EmptyPhotosIllustration /></div>
                <div style={{ fontWeight: 800, fontSize: 17, color: "var(--theme-text)", marginBottom: 8 }}>Aucune photo</div>
                <div style={{ fontSize: 13, color: "#94A3B8" }}>Aucune photo partagée pour l'instant.</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 5 }}>
                {user.avatarUrl && (
                  <div onClick={() => openImageViewer(user.avatarUrl!)} style={{ aspectRatio: "1", borderRadius: 14, overflow: "hidden", border: "2.5px solid var(--bp-primary)", boxShadow: "0 2px 8px rgba(34,197,94,0.2)", cursor: "zoom-in" }}>
                    <img src={user.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                )}
                {posts.filter(p => p.imageUrl).map(p => (
                  <div key={p.id} onClick={() => openImageViewer(p.imageUrl!)} style={{ aspectRatio: "1", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", cursor: "zoom-in" }}>
                    <img src={p.imageUrl!} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Post menu bottom sheet — other user's posts ── */}
      {postMenu !== null && createPortal(
        <>
          <div onClick={() => setPostMenu(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9990 }} />
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--theme-surface)", borderRadius: "24px 24px 0 0", zIndex: 9991, paddingBottom: "env(safe-area-inset-bottom,12px)" }}>
            <div style={{ width: 40, height: 4, background: "#E5E7EB", borderRadius: 2, margin: "10px auto 6px" }} />
            {([
              {
                icon: savedPostIds.has(postMenu)
                  ? <svg viewBox="0 0 24 24" width="20" height="20" fill="var(--bp-primary)" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                  : <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>,
                label: savedPostIds.has(postMenu) ? "Enregistré" : "Enregistrer",
                action: async () => {
                  const id = postMenu; setPostMenu(null);
                  try {
                    const r = await apiToggleSaved(id);
                    setSavedPostIds(prev => { const s = new Set(prev); r.saved ? s.add(id) : s.delete(id); return s; });
                  } catch { /* ignore */ }
                },
              },
              {
                icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
                label: "Copier le lien",
                action: () => {
                  const id = postMenu; setPostMenu(null);
                  const url = `${window.location.origin}${import.meta.env.BASE_URL ?? ""}post/${id}`;
                  navigator.clipboard?.writeText(url).catch(() => {});
                },
              },
              {
                icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
                label: "Partager",
                action: () => {
                  const id = postMenu; setPostMenu(null);
                  const url = `${window.location.origin}${import.meta.env.BASE_URL ?? ""}post/${id}`;
                  if (navigator.share) navigator.share({ url }).catch(() => {});
                  else navigator.clipboard?.writeText(url).catch(() => {});
                },
              },
              {
                icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
                label: "Masquer ce post",
                action: async () => {
                  const id = postMenu; setPostMenu(null);
                  setPosts(ps => ps.filter(p => p.id !== id));
                  try { await apiHidePost(id); } catch { /* ignore */ }
                },
              },
              {
                icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
                label: "Signaler ce post",
                red: true,
                action: () => { const id = postMenu; setPostMenu(null); setPostReportSheet(id); setPostReportReason(""); },
              },
            ] as { icon: React.ReactNode; label: string; action: () => void; red?: boolean }[]).map((item, i) => (
              <button key={i} onClick={item.action} style={{ width: "100%", background: "none", border: "none", borderTop: i === 0 ? "none" : "1px solid #F8FAFC", cursor: "pointer", display: "flex", alignItems: "center", gap: 14, padding: "0 20px", height: 56, textAlign: "left" }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: item.red ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{item.icon}</div>
                <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: item.red ? "#EF4444" : "#111827" }}>{item.label}</span>
              </button>
            ))}
          </div>
        </>,
        document.body
      )}

      {/* ── Post report reason sheet ── */}
      {postReportSheet !== null && createPortal(
        <>
          <div onClick={() => setPostReportSheet(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9992 }} />
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--theme-surface)", borderRadius: "24px 24px 0 0", zIndex: 9993, padding: "24px 20px calc(24px + env(safe-area-inset-bottom,0px))" }}>
            <div style={{ width: 40, height: 4, background: "#E5E7EB", borderRadius: 2, margin: "0 auto 20px" }} />
            <div style={{ fontWeight: 800, fontSize: 17, color: "var(--theme-text)", marginBottom: 16 }}>Signaler ce post</div>
            {["Spam ou publicité", "Contenu inapproprié", "Harcèlement ou intimidation", "Fausses informations", "Contenu haineux", "Violence ou contenu choquant", "Autre raison"].map(reason => (
              <button key={reason} onClick={() => setPostReportReason(reason)}
                style={{ width: "100%", background: postReportReason === reason ? "rgba(34,197,94,0.06)" : "none", border: postReportReason === reason ? "1.5px solid var(--bp-primary)" : "1.5px solid #F1F5F9", borderRadius: 14, padding: "12px 16px", marginBottom: 8, cursor: "pointer", textAlign: "left", fontSize: 14, fontWeight: 600, color: "#64748B", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${postReportReason === reason ? "var(--bp-primary)" : "#E5E7EB"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {postReportReason === reason && <div style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--bp-primary)" }} />}
                </div>
                {reason}
              </button>
            ))}
            <button onClick={async () => {
              if (!postReportReason) return;
              const id = postReportSheet; setPostReportSheet(null);
              try { await apiReportPost(id, postReportReason); } catch { /* ignore */ }
            }} disabled={!postReportReason}
              style={{ width: "100%", height: 52, background: postReportReason ? "#EF4444" : "#F1F5F9", border: "none", borderRadius: 16, color: postReportReason ? "#fff" : "#9CA3AF", fontWeight: 700, fontSize: 15, cursor: postReportReason ? "pointer" : "default", marginTop: 4 }}>
              Signaler
            </button>
          </div>
        </>,
        document.body
      )}

      {/* ── OVERLAYS ── */}
      <MenuOverlays />

      {/* ── HIDE TOAST ── */}
      {hideToast && (
        <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", zIndex: 600, background: "rgba(15,23,42,0.9)", color: "#fff", padding: "12px 24px", borderRadius: 30, fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", boxShadow: "0 4px 20px rgba(0,0,0,0.3)", backdropFilter: "blur(8px)" }}>
          {hideToast}
        </div>
      )}

      <ImageViewer />
    </div>
  );
}
