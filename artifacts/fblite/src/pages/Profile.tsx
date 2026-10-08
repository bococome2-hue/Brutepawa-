import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "../router";
import { useR2Upload } from "../hooks/useR2Upload";
import { useCurrentUser, getCurrentUser } from "../hooks/useCurrentUser";
import { apiGetMe, apiUpdateMe, saveFbUser, apiGetFriends, apiGetUserPosts, apiDeletePost, apiArchivePost, apiPinPost, apiUnpinPost, apiTogglePostComments, apiSetPostAudience, apiGetPostStats, type PublicUser, type FeedPost } from "../lib/api";
import { computeScore, type ScoreFactors } from "../lib/score";
import ProModeModal from "../components/ProModeModal";
import ProfileStatusModal from "../components/ProfileStatusModal";
import ArchiveModal from "../components/ArchiveModal";
import ActivityHistoryModal from "../components/ActivityHistoryModal";
import FeaturedContentModal from "../components/FeaturedContentModal";
import DeactivateProModal from "../components/DeactivateProModal";
import VoirEnTantQueModal from "../components/VoirEnTantQueModal";
import LockProfileModal from "../components/LockProfileModal";
import ReviewTagsModal from "../components/ReviewTagsModal";
import TagReviewSettingsPage from "../components/TagReviewSettingsPage";

export default function Profile() {
  const navigate = useNavigate();
  const localUser = useCurrentUser();

  const userInitials = localUser.name ? localUser.name.slice(0, 2).toUpperCase() : "ME";

  const [activeTab, setActiveTab] = useState<"posts" | "about" | "amis" | "photos">("posts");
  const [bio, setBio] = useState(localUser.bio || "Entrepreneur · Brute Pawa · " + (localUser.country || "Afrique francophone"));
  const [avatarUrl, setAvatarUrl] = useState<string>(localUser.avatarUrl ?? "");
  const [coverUrl, setCoverUrl] = useState<string>(localUser.coverUrl ?? "");
  const [uploadingWhat, setUploadingWhat] = useState<"avatar" | "cover" | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  /* Lock/unlock body scroll when profile menu sheet is open */
  useEffect(() => {
    if (showProfileMenu) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    } else {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    }
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [showProfileMenu]);
  const [showProMode, setShowProMode] = useState(false);
  const [isPro, setIsPro] = useState(() => localStorage.getItem("bp_pro_mode") === "1");
  const [showProfileStatus, setShowProfileStatus] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showActivityHistory, setShowActivityHistory] = useState(false);
  const [showFeaturedContent, setShowFeaturedContent] = useState(false);
  const [showDeactivatePro, setShowDeactivatePro] = useState(false);
  const [showVoirEnTantQue, setShowVoirEnTantQue] = useState(false);
  const [showLockProfile, setShowLockProfile] = useState(false);
  const [showReviewTags, setShowReviewTags] = useState(false);
  const [showTagReviewSettings, setShowTagReviewSettings] = useState(false);
  const [isProfileLocked, setIsProfileLocked] = useState(() => localStorage.getItem("bp_profile_locked") === "1");
  const handleLockToggle = (locked: boolean) => {
    setIsProfileLocked(locked);
    localStorage.setItem("bp_profile_locked", locked ? "1" : "0");
  };

  const copyProfileLink = useCallback(() => {
    const url = `${window.location.origin}${import.meta.env.BASE_URL ?? ""}profile/${localUser.id ?? ""}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setShowProfileMenu(false);
  }, [localUser.id]);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef  = useRef<HTMLInputElement>(null);
  const coverRef       = useRef<HTMLDivElement>(null);

  /* ── Cover parallax on scroll ── */
  useEffect(() => {
    const handleScroll = () => {
      if (!coverRef.current) return;
      const y = window.scrollY;
      coverRef.current.style.backgroundPositionY = `calc(center + ${y * 0.35}px)`;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  const { upload, progress, error: uploadErr } = useR2Upload();

  const [myPosts, setMyPosts] = useState<FeedPost[]>([]);
  const [friends, setFriends] = useState<PublicUser[]>([]);
  const [openMenu, setOpenMenu] = useState<{ id: number; isPinned: boolean; commentsDisabled: boolean; audience: string } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [statsModal, setStatsModal] = useState<{ views: number; likes: number; comments: number; shares: number; saves: number; engagement: string; reach: number } | null>(null);
  const [audienceSheet, setAudienceSheet] = useState<number | null>(null);
  const closeMenu = () => setOpenMenu(null);

  const archivePost = async (id: number) => {
    closeMenu();
    setMyPosts(ps => ps.filter(p => p.id !== id));
    try { await apiArchivePost(id); } catch { /* silently ignore */ }
  };

  const pinPost = async (id: number, alreadyPinned: boolean) => {
    closeMenu();
    if (alreadyPinned) {
      setMyPosts(ps => ps.map(p => p.id === id ? { ...p, isPinned: false } : p));
      try { await apiUnpinPost(id); } catch { /* silently ignore */ }
    } else {
      setMyPosts(ps => ps.map(p => ({ ...p, isPinned: p.id === id })));
      try { await apiPinPost(id); } catch { /* silently ignore */ }
    }
  };

  const deletePost = async (id: number) => {
    setConfirmDeleteId(null);
    setMyPosts(ps => ps.filter(p => p.id !== id));
    try { await apiDeletePost(id); } catch { /* silently ignore */ }
  };

  const toggleComments = async (id: number) => {
    closeMenu();
    setMyPosts(ps => ps.map(p => p.id === id ? { ...p, commentsDisabled: !p.commentsDisabled } : p));
    try { await apiTogglePostComments(id); } catch { /* silently ignore */ }
  };

  const fetchStats = async (id: number) => {
    closeMenu();
    try { const data = await apiGetPostStats(id); setStatsModal(data); } catch { /* silently ignore */ }
  };

  const copyPostLink = (id: number) => {
    closeMenu();
    const url = `${window.location.origin}${import.meta.env.BASE_URL ?? ""}post/${id}`;
    navigator.clipboard?.writeText(url).catch(() => {});
  };

  const setAudience = async (id: number, audience: string) => {
    setAudienceSheet(null);
    setMyPosts(ps => ps.map(p => p.id === id ? { ...p, audience } : p));
    try { await apiSetPostAudience(id, audience); } catch { /* silently ignore */ }
  };

  useEffect(() => {
    apiGetMe().then(user => {
      saveFbUser(user);
      setAvatarUrl(user.avatarUrl ?? "");
      setCoverUrl(user.coverUrl ?? "");
      if (user.bio) setBio(user.bio);
      if (typeof user.profileLocked === "boolean") {
        setIsProfileLocked(user.profileLocked);
        localStorage.setItem("bp_profile_locked", user.profileLocked ? "1" : "0");
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const u = getCurrentUser();
    if (!u.id) return;
    Promise.all([apiGetUserPosts(u.id), apiGetFriends()])
      .then(([posts, friendList]) => {
        setMyPosts(posts);
        setFriends(friendList);
      })
      .catch(() => {});
  }, []);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingWhat("avatar");
    setUploadError(null);
    const result = await upload(file);
    if (result) {
      setAvatarUrl(result.url);
      try {
        const updated = await apiUpdateMe({ avatarUrl: result.url });
        saveFbUser(updated);
      } catch {
        setUploadError("Erreur de sauvegarde");
      }
    } else {
      setUploadError("Upload échoué");
    }
    setUploadingWhat(null);
    e.target.value = "";
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingWhat("cover");
    setUploadError(null);
    const result = await upload(file);
    if (result) {
      setCoverUrl(result.url);
      try {
        const updated = await apiUpdateMe({ coverUrl: result.url });
        saveFbUser(updated);
      } catch {
        setUploadError("Erreur de sauvegarde");
      }
    } else {
      setUploadError("Upload échoué");
    }
    setUploadingWhat(null);
    e.target.value = "";
  };


  /* ── Score dynamique ── */
  let extData: Record<string, string> = {};
  try { extData = JSON.parse(localStorage.getItem("fb_profile_ext") ?? "{}"); } catch { /**/ }
  const scoreFactors: ScoreFactors = {
    avatarUrl,
    coverUrl,
    bio,
    phone: localUser.phone,
    postsCount: myPosts.length,
    friendsCount: friends.length,
    extCity: extData.city,
    extHometown: extData.hometown,
    extLanguages: extData.languages,
    extHobbies: extData.hobbies,
  };
  const score = computeScore(scoreFactors);

  const displayError = uploadError ?? uploadErr;

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", paddingBottom: 20 }}>
      <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />
      <input ref={coverInputRef}  type="file" accept="image/*" style={{ display: "none" }} onChange={handleCoverChange} />

      {/* Back button */}
      <div style={{ background: "var(--fb-white)", padding: "10px 16px", borderBottom: "1px solid var(--fb-divider)", display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={() => navigate("/")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--theme-text)", display: "flex", alignItems: "center", padding: "4px 6px", borderRadius: 8 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <span style={{ fontWeight: 700, fontSize: 17, flex: 1 }}>Profil</span>
        <button onClick={() => setShowProfileMenu(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--theme-text)", padding: "6px 8px", borderRadius: 8, fontSize: 20, letterSpacing: 2, lineHeight: 1 }}>···</button>
      </div>

      {/* Profile options bottom sheet — premium design */}
      {showProfileMenu && createPortal(
        <>
          {/* Backdrop */}
          <div onClick={() => { setShowProfileMenu(false); document.documentElement.style.overflow = ""; document.body.style.overflow = ""; }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(5px)", WebkitBackdropFilter: "blur(5px)", zIndex: 9000 }} />
          {/* Sheet */}
          <div onClick={e => e.stopPropagation()} style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9001, background: "var(--theme-surface)", borderRadius: "28px 28px 0 0", boxShadow: "0 -8px 48px rgba(0,0,0,0.18)", maxHeight: "92vh", overflowY: "auto", animation: "slideUpSheet 0.28s cubic-bezier(0.32,0.72,0,1)" }}>

            {/* Handle */}
            <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 0" }}>
              <div style={{ width: 44, height: 5, background: "#E5E7EB", borderRadius: 99 }} />
            </div>

            {/* ─ Header ─ */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px 14px" }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                {avatarUrl
                  ? <img src={avatarUrl} alt="avatar" style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover" }} />
                  : <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--bp-primary)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 18 }}>{userInitials}</div>
                }
                <div style={{ position: "absolute", bottom: 1, right: 1, width: 13, height: 13, borderRadius: "50%", background: "var(--bp-primary)", border: "2.5px solid #fff" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: "var(--theme-text)" }}>{localUser.name} {localUser.flag ?? "🌍"}</div>
                <button onClick={() => { setShowProfileMenu(false); document.documentElement.style.overflow = ""; document.body.style.overflow = ""; navigate(`/profile/${localUser.id}`); }} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                  <span style={{ fontSize: 13, color: "var(--bp-primary)", fontWeight: 600 }}>Voir votre profil</span>
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
                {isPro && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#DCFCE7", borderRadius: 99, padding: "3px 10px", marginTop: 5 }}>
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--bp-primary)" }}>Mode Pro activé</span>
                  </div>
                )}
              </div>
              <button onClick={() => { setShowProfileMenu(false); document.documentElement.style.overflow = ""; document.body.style.overflow = ""; }} style={{ width: 34, height: 34, borderRadius: "50%", background: "#F1F5F9", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div style={{ padding: "0 14px 36px", display: "flex", flexDirection: "column", gap: 10 }}>

              {/* ─ Section Profil ─ */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--bp-primary)", textTransform: "uppercase", letterSpacing: 0.8, padding: "0 4px 8px" }}>Profil</div>
                <div style={{ background: "#F8FAFC", borderRadius: 20, overflow: "hidden" }}>
                  {([
                    { svg: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a4 4 0 0 1 8 0v2"/><circle cx="18" cy="18" r="3"/><line x1="18" y1="15" x2="18" y2="18"/><line x1="18" y1="18" x2="21" y2="18"/></svg>, bg: "#DCFCE7", label: "Statut du profil", desc: "Définissez votre statut actuel", action: () => { setShowProfileMenu(false); document.documentElement.style.overflow=""; document.body.style.overflow=""; setShowProfileStatus(true); } },
                    { svg: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>, bg: "#DCFCE7", label: "Voir en tant que visiteur", desc: "Découvrez votre profil comme les autres", action: () => { setShowProfileMenu(false); document.documentElement.style.overflow=""; document.body.style.overflow=""; setShowVoirEnTantQue(true); } },
                    { svg: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>, bg: "#DCFCE7", label: "Copier le lien du profil", desc: "Partagez votre profil facilement", action: () => { copyProfileLink(); document.documentElement.style.overflow=""; document.body.style.overflow=""; } },
                  ] as {svg:React.ReactNode;bg:string;label:string;desc:string;action:()=>void}[]).map((item, i, arr) => (
                    <button key={i} onClick={item.action} style={{ width:"100%", background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:14, padding:"13px 16px", borderBottom: i < arr.length-1 ? "1px solid #F1F5F9" : "none", textAlign:"left" }}>
                      <div style={{ width:40, height:40, borderRadius:12, background:item.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{item.svg}</div>
                      <div style={{ flex:1 }}><div style={{ fontWeight:700, fontSize:14.5, color:"#111827" }}>{item.label}</div><div style={{ fontSize:12, color:"#9CA3AF", marginTop:1 }}>{item.desc}</div></div>
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#E5E7EB" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                  ))}
                </div>
              </div>

              {/* ─ Section Gestion du contenu ─ */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--bp-primary)", textTransform: "uppercase", letterSpacing: 0.8, padding: "0 4px 8px" }}>Gestion du contenu</div>
                <div style={{ background: "#F8FAFC", borderRadius: 20, overflow: "hidden" }}>
                  {([
                    { svg: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>, bg: "#DCFCE7", label: "Archive", desc: "Gérez vos publications archivées", action: () => { setShowProfileMenu(false); document.documentElement.style.overflow=""; document.body.style.overflow=""; setShowArchive(true); } },
                    { svg: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.27"/></svg>, bg: "#EDE9FE", label: "Historique d'activité", desc: "Consultez vos actions récentes", action: () => { setShowProfileMenu(false); document.documentElement.style.overflow=""; document.body.style.overflow=""; setShowActivityHistory(true); } },
                    { svg: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>, bg: "#FEF3C7", label: "Examiner les publications", desc: "Gérez et contrôlez vos publications", action: () => { setShowProfileMenu(false); document.documentElement.style.overflow=""; document.body.style.overflow=""; setShowTagReviewSettings(true); } },
                    { svg: <svg viewBox="0 0 24 24" width="18" height="18" fill="#F59E0B"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>, bg: "#FEF3C7", label: "Éléments à la une", desc: "Mettez en avant vos meilleurs contenus", action: () => { setShowProfileMenu(false); document.documentElement.style.overflow=""; document.body.style.overflow=""; setShowFeaturedContent(true); } },
                  ] as {svg:React.ReactNode;bg:string;label:string;desc:string;action:()=>void}[]).map((item, i, arr) => (
                    <button key={i} onClick={item.action} style={{ width:"100%", background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:14, padding:"13px 16px", borderBottom: i < arr.length-1 ? "1px solid #F1F5F9" : "none", textAlign:"left" }}>
                      <div style={{ width:40, height:40, borderRadius:12, background:item.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{item.svg}</div>
                      <div style={{ flex:1 }}><div style={{ fontWeight:700, fontSize:14.5, color:"#111827" }}>{item.label}</div><div style={{ fontSize:12, color:"#9CA3AF", marginTop:1 }}>{item.desc}</div></div>
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#E5E7EB" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                  ))}
                </div>
              </div>

              {/* ─ Section Outils professionnels ─ */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#F59E0B", textTransform: "uppercase", letterSpacing: 0.8, padding: "0 4px 8px" }}>Outils professionnels</div>
                <div style={{ background: "#F8FAFC", borderRadius: 20, overflow: "hidden" }}>
                  {([
                    { svg: <svg viewBox="0 0 24 24" width="18" height="18" fill="#F59E0B"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>, bg: "#FEF3C7", label: isPro ? "Mode Pro activé" : "Activer le mode Pro", desc: "Profitez des outils professionnels", badge: isPro ? "Actif" : null, action: () => { setShowProfileMenu(false); document.documentElement.style.overflow=""; document.body.style.overflow=""; isPro ? setShowDeactivatePro(true) : setShowProMode(true); } },
                    { svg: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>, bg: "#EDE9FE", label: "Statistiques du profil", desc: "Analysez vos performances", action: () => { setShowProfileMenu(false); document.documentElement.style.overflow=""; document.body.style.overflow=""; } },
                    { svg: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>, bg: "#DCFCE7", label: "Audience", desc: "Découvrez votre communauté", action: () => { setShowProfileMenu(false); document.documentElement.style.overflow=""; document.body.style.overflow=""; } },
                    { svg: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>, bg: "#DCFCE7", label: "Performances", desc: "Suivez l'évolution de votre profil", action: () => { setShowProfileMenu(false); document.documentElement.style.overflow=""; document.body.style.overflow=""; } },
                  ] as {svg:React.ReactNode;bg:string;label:string;desc:string;badge?:string|null;action:()=>void}[]).map((item, i, arr) => (
                    <button key={i} onClick={item.action} style={{ width:"100%", background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:14, padding:"13px 16px", borderBottom: i < arr.length-1 ? "1px solid #F1F5F9" : "none", textAlign:"left" }}>
                      <div style={{ width:40, height:40, borderRadius:12, background:item.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{item.svg}</div>
                      <div style={{ flex:1 }}><div style={{ fontWeight:700, fontSize:14.5, color:"#111827" }}>{item.label}</div><div style={{ fontSize:12, color:"#9CA3AF", marginTop:1 }}>{item.desc}</div></div>
                      {item.badge && <div style={{ background:"#DCFCE7", color:"var(--bp-primary)", fontSize:11, fontWeight:800, borderRadius:99, padding:"3px 9px", flexShrink:0 }}>{item.badge}</div>}
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#E5E7EB" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                  ))}
                </div>
              </div>

              {/* ─ Section Confidentialité ─ */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#F59E0B", textTransform: "uppercase", letterSpacing: 0.8, padding: "0 4px 8px" }}>Confidentialité</div>
                <div style={{ background: "#F8FAFC", borderRadius: 20, overflow: "hidden" }}>
                  {([
                    { svg: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={isProfileLocked?"#F59E0B":"#64748B"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{isProfileLocked ? <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></> : <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>}</svg>, bg: isProfileLocked ? "#FEF3C7" : "#F1F5F9", label: isProfileLocked ? "Déverrouiller le profil" : "Verrouiller le profil", desc: "Contrôlez qui peut voir votre contenu", action: () => { setShowProfileMenu(false); document.documentElement.style.overflow=""; document.body.style.overflow=""; setShowLockProfile(true); } },
                    { svg: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>, bg: "#DCFCE7", label: "Paramètres de visibilité", desc: "Gérez la visibilité de votre profil", action: () => { setShowProfileMenu(false); document.documentElement.style.overflow=""; document.body.style.overflow=""; navigate("/menu"); } },
                    { svg: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/></svg>, bg: "#EDE9FE", label: "Gestion des abonnés", desc: "Gérez votre liste d'abonnés", action: () => { setShowProfileMenu(false); document.documentElement.style.overflow=""; document.body.style.overflow=""; navigate("/community"); } },
                    { svg: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>, bg: "#FEE2E2", label: "Blocages", desc: "Gérez les utilisateurs bloqués", action: () => { setShowProfileMenu(false); document.documentElement.style.overflow=""; document.body.style.overflow=""; navigate("/menu"); } },
                  ] as {svg:React.ReactNode;bg:string;label:string;desc:string;action:()=>void}[]).map((item, i, arr) => (
                    <button key={i} onClick={item.action} style={{ width:"100%", background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:14, padding:"13px 16px", borderBottom: i < arr.length-1 ? "1px solid #F1F5F9" : "none", textAlign:"left" }}>
                      <div style={{ width:40, height:40, borderRadius:12, background:item.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{item.svg}</div>
                      <div style={{ flex:1 }}><div style={{ fontWeight:700, fontSize:14.5, color:"#111827" }}>{item.label}</div><div style={{ fontSize:12, color:"#9CA3AF", marginTop:1 }}>{item.desc}</div></div>
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#E5E7EB" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </>,
        document.body
      )}

      {displayError && (
        <div style={{ background: "#FEE2E2", color: "#EF4444", padding: "8px 16px", fontSize: 13, textAlign: "center" }}>
          {displayError.includes("401") || displayError.includes("Erreur 401")
            ? "Session expirée — reconnecte-toi pour uploader des photos"
            : displayError}
        </div>
      )}

      {/* ── Profile card ── */}
      <div style={{ background: "var(--theme-surface)", margin: "8px 10px 0", borderRadius: 14, boxShadow: "0 1px 6px rgba(0,0,0,0.08)", overflow: "visible" }}>

        {/* Cover photo */}
        <div
          ref={coverRef}
          className="profile-cover"
          style={{
            backgroundImage: coverUrl ? `url(${coverUrl})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            cursor: coverUrl ? "zoom-in" : "default",
          }}
          onClick={() => coverUrl && setLightboxUrl(coverUrl)}
        >
          {/* Clipped layer for abstract shapes + rounded corners */}
          <div style={{ position: "absolute", inset: 0, borderRadius: "12px 12px 0 0", overflow: "hidden", pointerEvents: "none", zIndex: 1 }}>
            {!coverUrl && (
              <svg style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%" }} viewBox="0 0 400 175" fill="none" preserveAspectRatio="xMidYMid slice">
                {/* Large diagonal triangle — top right */}
                <polygon points="240,0 400,0 400,175" fill="white" fillOpacity="0.06"/>
                {/* Second triangle — bottom left accent */}
                <polygon points="0,175 0,90 120,175" fill="white" fillOpacity="0.05"/>
                {/* Subtle stripe top-left to bottom-right */}
                <line x1="-20" y1="80" x2="420" y2="80" stroke="white" strokeOpacity="0.04" strokeWidth="60"/>
                {/* Geometric diamond shape center-right */}
                <polygon points="320,30 355,75 320,120 285,75" fill="white" fillOpacity="0.06"/>
                {/* Small circle top-left */}
                <circle cx="60" cy="40" r="55" fill="white" fillOpacity="0.04"/>
                {/* Medium circle bottom-right */}
                <circle cx="380" cy="155" r="70" fill="white" fillOpacity="0.05"/>
              </svg>
            )}
            {coverUrl && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.18)" }} />}
          </div>

          {/* Flag — top right white circle */}
          <div style={{ position: "absolute", top: 12, right: 12, zIndex: 3, width: 44, height: 44, borderRadius: "50%", background: "var(--theme-surface)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.22)", fontSize: 26 }}>
            {localUser.flag || "🌍"}
          </div>

          {/* Ajouter une couverture — bottom right */}
          <button
            onClick={e => { e.stopPropagation(); if (!uploadingWhat) coverInputRef.current?.click(); }}
            style={{ position: "absolute", bottom: 12, right: 12, zIndex: 3, background: "rgba(0,0,0,0.58)", borderRadius: 20, padding: "6px 13px", color: "#fff", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
          >
            {uploadingWhat === "cover" ? (
              <div style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            )}
            {uploadingWhat === "cover" ? `${progress}%` : (coverUrl ? "Modifier" : "Ajouter une couverture")}
          </button>

          {/* Avatar — overlapping cover */}
          <div className="profile-avatar-wrap" style={{ zIndex: 4 }}>
            <div style={{ position: "relative" }}>
              {/* Image cliquable → viewer */}
              <div
                onClick={e => { e.stopPropagation(); if (avatarUrl) setLightboxUrl(avatarUrl); }}
                style={{ cursor: avatarUrl ? "zoom-in" : "default" }}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" style={{ width: 96, height: 96, borderRadius: "50%", border: "4px solid #fff", objectFit: "cover", display: "block", boxShadow: "0 4px 16px rgba(0,0,0,0.22)" }} />
                ) : (
                  <div className="profile-avatar-lg">{userInitials}</div>
                )}
              </div>
              {/* Icône caméra — uniquement pour uploader */}
              <button
                onClick={e => { e.stopPropagation(); if (!uploadingWhat) avatarInputRef.current?.click(); }}
                style={{ position: "absolute", bottom: 2, right: 2, width: 28, height: 28, borderRadius: "50%", background: "var(--bp-primary)", border: "2.5px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 6px rgba(34,197,94,0.35)", cursor: "pointer", padding: 0 }}
              >
                {uploadingWhat === "avatar"
                  ? <div style={{ width: 12, height: 12, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                }
              </button>
              {/* Lock badge */}
              {isProfileLocked && (
                <div style={{ position: "absolute", top: 2, left: 2, width: 24, height: 24, borderRadius: "50%", background: "linear-gradient(135deg,var(--bp-primary),var(--bp-primary-dark))", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(34,197,94,0.4)" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="11" width="18" height="11" rx="3" fill="#fff" opacity="0.3"/>
                    <path d="M7 11V7a5 5 0 0110 0v4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
                    <circle cx="12" cy="16.5" r="1.8" fill="#fff"/>
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Profile info */}
        <div style={{ paddingTop: 54, paddingBottom: 4 }}>
          <div style={{ padding: "0 14px" }}>

            {/* Name row + Modifier button */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div style={{ flex: 1 }}>
                {/* Name + badges */}
                <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                  <span className="profile-name">{localUser.name}</span>
                  {/* Verified blue badge — premium users */}
                  {localUser.id !== undefined && [13, 26, 40].includes(localUser.id) && <img src="/badge-verified.jpg" alt="Vérifié" style={{ width: 22, height: 22, objectFit: "cover", borderRadius: "50%", flexShrink: 0 }} />}
                  {/* Medal badge — argent, SVG custom */}
                  <svg width="20" height="22" viewBox="0 0 20 22" fill="none" style={{ flexShrink: 0 }}>
                    {/* Ribbon */}
                    <rect x="7" y="0" width="6" height="9" rx="1.5" fill="#bbb"/>
                    <rect x="7" y="0" width="6" height="9" rx="1.5" fill="url(#rg)"/>
                    <defs>
                      <linearGradient id="rg" x1="7" y1="0" x2="13" y2="9" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#CBD5E1"/>
                        <stop offset="1" stopColor="#888"/>
                      </linearGradient>
                    </defs>
                    {/* Circle */}
                    <circle cx="10" cy="15" r="6.5" fill="#94A3B8" stroke="#aaa" strokeWidth="1"/>
                    <circle cx="10" cy="15" r="4.5" fill="#CBD5E1"/>
                    {/* Number 2 */}
                    <text x="10" y="19" textAnchor="middle" fontSize="6" fontWeight="800" fill="#666">2</text>
                  </svg>
                  {/* Flag removed */}
                </div>

                {/* Bio */}
                <div className="profile-bio">{bio}</div>

                {/* Location */}
                {(localUser.countryCode || localUser.country) && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3, color: "#64748B", fontSize: 13 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    {localUser.countryCode || localUser.country}
                  </div>
                )}

                {/* Level badge */}
                <button
                  onClick={() => navigate("/score")}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--theme-surface)", border: "1px solid #E5E7EB", borderRadius: 99, padding: "5px 13px", marginTop: 9, cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
                >
                  <span style={{ fontSize: 14 }}>🥈</span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: "#64748B" }}>Niveau {score.label} · {score.pct}%</span>
                </button>
              </div>

              {/* Modifier button */}
              <button
                onClick={() => navigate("/edit-profile")}
                style={{ display: "flex", alignItems: "center", gap: 5, background: "var(--theme-surface)", border: "1.5px solid #ccc", borderRadius: 8, padding: "7px 13px", fontSize: 13, fontWeight: 600, color: "var(--theme-text)", cursor: "pointer", flexShrink: 0, marginTop: 4 }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Modifier
              </button>
            </div>

            {/* Lock banner — visible when profile is locked */}
            {isProfileLocked && (
              <div
                onClick={() => setShowLockProfile(true)}
                style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, padding: "10px 14px", background: "var(--theme-surface)", border: "1px solid #E5E7EB", borderRadius: 12, cursor: "pointer" }}
              >
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="11" width="18" height="11" rx="3" fill="var(--bp-primary)" opacity="0.25"/>
                    <path d="M7 11V7a5 5 0 0110 0v4" stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round"/>
                    <circle cx="12" cy="16.5" r="1.8" fill="var(--bp-primary)"/>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--theme-text)" }}>Profil verrouillé</div>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 1 }}>Seuls vos amis voient votre contenu</div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--bp-primary)", flexShrink: 0 }}>Gérer</span>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            )}

            {/* Stats — Facebook-style card with vertical dividers */}
            <div style={{ display: "flex", marginTop: 16, marginBottom: 4, border: "1px solid #F1F5F9", borderRadius: 12, overflow: "hidden", background: "#F8FAFC" }}>
              {[
                { label: "Amis",         value: String(friends.length) },
                { label: "Abonnés",      value: "0" },
                { label: "Publications", value: String(myPosts.length) },
              ].map((s, i) => (
                <div key={s.label} style={{ flex: 1, textAlign: "center", padding: "12px 4px", borderRight: i < 2 ? "1px solid #F1F5F9" : "none" }}>
                  <div style={{ fontWeight: 900, fontSize: 22, color: "var(--theme-text)", lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 11.5, color: "#64748B", marginTop: 3, fontWeight: 500 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 8, marginTop: 12, marginBottom: 14 }}>
              <button
                style={{ flex: 1, padding: "8px 8px", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 14, fontWeight: 700, borderRadius: 10, background: "var(--bp-primary)", color: "#fff", border: "none", cursor: "pointer" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                Ajouter à l'histoire
              </button>
              <button
                onClick={() => navigate("/edit-profile")}
                style={{ flex: 1, padding: "8px 8px", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 14, fontWeight: 700, borderRadius: 10, background: "#F1F5F9", border: "none", color: "var(--theme-text)", cursor: "pointer" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Modifier le profil
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="profile-tabs">
            {([
              { id: "posts"  as const, label: "Publications" },
              { id: "about"  as const, label: "À propos" },
              { id: "amis"   as const, label: "Amis" },
              { id: "photos" as const, label: "Photos" },
            ] as const).map(tab => (
              <button key={tab.id} className={`profile-tab${activeTab === tab.id ? " active" : ""}`} onClick={() => setActiveTab(tab.id)}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: "12px" }}>
        {/* PUBLICATIONS */}
        {activeTab === "posts" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {myPosts.length === 0 && (
              <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--fb-text-secondary)", fontSize: 15 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
                <div>Aucune publication pour l'instant</div>
              </div>
            )}
            {myPosts.map(post => (
              <div key={post.id} className="post-card">
                <div className="post-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {avatarUrl
                      ? <img src={avatarUrl} alt="Avatar" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                      : <div className="avatar" style={{ background: "var(--bp-primary)" }}>{userInitials}</div>
                    }
                    <div className="post-meta">
                      <div className="post-author">
                        {localUser.name}
                        {localUser.flag && <span style={{ marginLeft: 4, fontSize: 14 }}>{localUser.flag}</span>}
                      </div>
                      <div className="post-time">🌐 {new Date(post.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</div>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setOpenMenu({ id: post.id, isPinned: post.isPinned ?? false, commentsDisabled: post.commentsDisabled ?? false, audience: post.audience ?? "public" }); }}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 20, color: "#64748B", fontSize: 20, fontWeight: 700, lineHeight: 1, flexShrink: 0 }}>
                    ···
                  </button>
                </div>
                {post.imageUrl && (() => {
                  const url = post.imageUrl!;
                  const isVid = /\.(mp4|mov|webm|ogg|m4v)(\?.*)?$/i.test(url);
                  return isVid
                    ? <video src={url} controls playsInline style={{ width: "100%", maxHeight: 360, objectFit: "cover", display: "block", background: "#000" }} />
                    : <img src={url} alt="" style={{ width: "100%", maxHeight: 360, objectFit: "cover" }} />;
                })()}
                {post.content && <div className="post-content">{post.content}</div>}
                <div className="post-actions">
                  <button className="post-btn" style={{ display:"flex",alignItems:"center",gap:5 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>{post.likesCount}</button>
                  <button className="post-btn" style={{ display:"flex",alignItems:"center",gap:5 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>{post.commentsCount}</button>
                  <button className="post-btn" style={{ display:"flex",alignItems:"center",gap:5 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>Partager</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Post menu bottom sheet — own posts ── */}
        {openMenu !== null && createPortal(
          <>
            <div onClick={closeMenu} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9990 }} />
            <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--theme-surface)", borderRadius: "24px 24px 0 0", zIndex: 9991, paddingBottom: "env(safe-area-inset-bottom,12px)", maxHeight: "80vh", overflowY: "auto" }}>
              <div style={{ width: 40, height: 4, background: "#E5E7EB", borderRadius: 2, margin: "10px auto 6px" }} />
              {([
                { icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>, label: "Modifier le post", action: closeMenu },
                { icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1v3.76z"/></svg>, label: openMenu.isPinned ? "Désépingler le post" : "Épingler le post", action: () => pinPost(openMenu.id, openMenu.isPinned) },
                { icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><line x1="10" y1="12" x2="14" y2="12"/></svg>, label: "Archiver le post", action: () => archivePost(openMenu.id) },
                { icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>{openMenu.commentsDisabled && <line x1="5" y1="5" x2="19" y2="19" strokeWidth="2.5"/>}</svg>, label: openMenu.commentsDisabled ? "Activer les commentaires" : "Désactiver les commentaires", action: () => toggleComments(openMenu.id) },
                { icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{openMenu.audience === "friends" ? <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></> : <><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>}</svg>, label: "Audience du post", action: () => { setAudienceSheet(openMenu.id); closeMenu(); } },
                { icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>, label: "Statistiques du post", action: () => fetchStats(openMenu.id) },
                { icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>, label: "Copier le lien", action: () => copyPostLink(openMenu.id) },
              ].map((item, i) => (
                <button key={i} onClick={item.action} style={{ width: "100%", background: "none", border: "none", borderTop: i === 0 ? "none" : "1px solid #F8FAFC", cursor: "pointer", display: "flex", alignItems: "center", gap: 14, padding: "0 20px", height: 56, textAlign: "left" }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: "rgba(34,197,94,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{item.icon}</div>
                  <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: "var(--theme-text)" }}>{item.label}</span>
                </button>
              )))}
              <button onClick={() => { setConfirmDeleteId(openMenu.id); closeMenu(); }} style={{ width: "100%", background: "none", border: "none", borderTop: "1px solid #F8FAFC", cursor: "pointer", display: "flex", alignItems: "center", gap: 14, padding: "0 20px", height: 56, textAlign: "left" }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: "rgba(239,68,68,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                </div>
                <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: "#EF4444" }}>Supprimer le post</span>
              </button>
            </div>
          </>,
          document.body
        )}

        {/* ── Confirm delete dialog ── */}
        {confirmDeleteId !== null && createPortal(
          <>
            <div onClick={() => setConfirmDeleteId(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 9995 }} />
            <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--theme-surface)", borderRadius: "24px 24px 0 0", zIndex: 9996, padding: "24px 20px calc(24px + env(safe-area-inset-bottom,0px))" }}>
              <div style={{ width: 40, height: 4, background: "#E5E7EB", borderRadius: 2, margin: "0 auto 20px" }} />
              <div style={{ fontWeight: 800, fontSize: 17, color: "var(--theme-text)", textAlign: "center", marginBottom: 8 }}>Supprimer ce post ?</div>
              <div style={{ fontSize: 14, color: "#64748B", textAlign: "center", marginBottom: 24 }}>Cette action est irréversible.</div>
              <button onClick={() => deletePost(confirmDeleteId)} style={{ width: "100%", height: 52, background: "#EF4444", border: "none", borderRadius: 16, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", marginBottom: 10 }}>Supprimer</button>
              <button onClick={() => setConfirmDeleteId(null)} style={{ width: "100%", height: 52, background: "#F1F5F9", border: "none", borderRadius: 16, color: "#64748B", fontWeight: 600, fontSize: 15, cursor: "pointer" }}>Annuler</button>
            </div>
          </>,
          document.body
        )}

        {/* ── Stats modal ── */}
        {statsModal !== null && createPortal(
          <>
            <div onClick={() => setStatsModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9995 }} />
            <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--theme-surface)", borderRadius: "24px 24px 0 0", zIndex: 9996, padding: "24px 20px calc(24px + env(safe-area-inset-bottom,0px))" }}>
              <div style={{ width: 40, height: 4, background: "#E5E7EB", borderRadius: 2, margin: "0 auto 20px" }} />
              <div style={{ fontWeight: 800, fontSize: 17, color: "var(--theme-text)", marginBottom: 20 }}>Statistiques</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 12 }}>
                {[
                  { label: "Vues", value: statsModal.views },
                  { label: "J'aime", value: statsModal.likes },
                  { label: "Commentaires", value: statsModal.comments },
                  { label: "Partages", value: statsModal.shares },
                  { label: "Enregistrements", value: statsModal.saves },
                  { label: "Portée", value: statsModal.reach },
                ].map((s, i) => (
                  <div key={i} style={{ background: "#F8FAFC", borderRadius: 16, padding: "14px 10px", textAlign: "center" }}>
                    <div style={{ fontWeight: 800, fontSize: 20, color: "var(--bp-primary)" }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: "rgba(34,197,94,0.06)", borderRadius: 12, padding: "12px 16px", textAlign: "center", marginBottom: 20 }}>
                <span style={{ fontSize: 13, color: "var(--bp-primary)", fontWeight: 600 }}>Engagement : {statsModal.engagement}</span>
              </div>
              <button onClick={() => setStatsModal(null)} style={{ width: "100%", height: 52, background: "#F1F5F9", border: "none", borderRadius: 16, color: "#64748B", fontWeight: 600, fontSize: 15, cursor: "pointer" }}>Fermer</button>
            </div>
          </>,
          document.body
        )}

        {/* ── Audience picker sheet ── */}
        {audienceSheet !== null && createPortal(
          <>
            <div onClick={() => setAudienceSheet(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9995 }} />
            <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--theme-surface)", borderRadius: "24px 24px 0 0", zIndex: 9996, padding: "24px 20px calc(24px + env(safe-area-inset-bottom,0px))" }}>
              <div style={{ width: 40, height: 4, background: "#E5E7EB", borderRadius: 2, margin: "0 auto 20px" }} />
              <div style={{ fontWeight: 800, fontSize: 17, color: "var(--theme-text)", marginBottom: 20 }}>Qui peut voir ce post ?</div>
              {[
                { value: "public", label: "Public", desc: "Tout le monde peut voir ce post" },
                { value: "friends", label: "Amis seulement", desc: "Seuls vos amis peuvent voir ce post" },
                { value: "private", label: "Moi uniquement", desc: "Seul vous pouvez voir ce post" },
              ].map(opt => {
                const post = myPosts.find(p => p.id === audienceSheet);
                const selected = (post?.audience ?? "public") === opt.value;
                return (
                  <button key={opt.value} onClick={() => setAudience(audienceSheet, opt.value)}
                    style={{ width: "100%", background: selected ? "rgba(34,197,94,0.06)" : "none", border: selected ? "1.5px solid var(--bp-primary)" : "1.5px solid #F1F5F9", borderRadius: 16, padding: "14px 16px", marginBottom: 10, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${selected ? "var(--bp-primary)" : "#E5E7EB"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {selected && <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--bp-primary)" }} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "var(--theme-text)" }}>{opt.label}</div>
                      <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{opt.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>,
          document.body
        )}

        {/* À PROPOS — premium redesign */}
        {activeTab === "about" && (() => {
          let extData: Record<string,string> = {};
          try { extData = JSON.parse(localStorage.getItem("fb_profile_ext") ?? "{}"); } catch { /**/ }

          const infoRows = [
            {
              icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--bp-primary)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>,
              label: bio,
            },
            {
              icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--bp-primary)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
              label: `Habite à ${localUser.country || localUser.countryCode || "TG"}`,
            },
            {
              icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--bp-primary)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.16 6.16l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
              label: localUser.phone || "Téléphone non spécifié",
            },
            {
              icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--bp-primary)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
              label: localUser.email || "Email non spécifié",
            },
            {
              icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--bp-primary)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
              label: `Membre depuis ${extData.joinDate || "mai 2024"}`,
            },
          ];

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

              {/* ── Informations card ── */}
              <div style={{ background: "var(--theme-surface)", borderRadius: 16, boxShadow: "0 1px 6px rgba(0,0,0,0.07)", overflow: "hidden" }}>
                <div style={{ padding: "16px 16px 10px", fontWeight: 800, fontSize: 16, color: "var(--theme-text)" }}>Informations</div>
                {infoRows.map((row, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderTop: i === 0 ? "none" : "1px solid #F1F5F9" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {row.icon}
                    </div>
                    <span style={{ flex: 1, fontSize: 14, color: "var(--theme-text)", lineHeight: 1.4 }}>{row.label}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </div>
                ))}
                {/* Profil vérifié row */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderTop: "1px solid #F1F5F9" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
                  </div>
                  <span style={{ flex: 1, fontSize: 14, color: "var(--bp-primary)", fontWeight: 700 }}>Profil vérifié</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              </div>

              {/* ── Score de confiance card ── */}
              <div
                onClick={() => navigate("/score")}
                style={{ background: "var(--theme-surface)", borderRadius: 16, boxShadow: "0 1px 6px rgba(0,0,0,0.07)", padding: "16px", cursor: "pointer" }}
              >
                <div style={{ fontWeight: 800, fontSize: 16, color: "var(--theme-text)", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
                  Score de confiance
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  {/* Medal SVG */}
                  <svg width="52" height="60" viewBox="0 0 52 60" fill="none" style={{ flexShrink: 0 }}>
                    <defs>
                      <linearGradient id="medal-ribbon" x1="0" y1="0" x2="1" y2="1">
                        <stop stopColor="#6366f1"/>
                        <stop offset="1" stopColor="#6366F1"/>
                      </linearGradient>
                      <linearGradient id="medal-body" x1="0" y1="0" x2="1" y2="1">
                        <stop stopColor="#E5E7EB"/>
                        <stop offset="1" stopColor="#9CA3AF"/>
                      </linearGradient>
                      <linearGradient id="medal-inner" x1="0" y1="0" x2="1" y2="1">
                        <stop stopColor="#f8fafc"/>
                        <stop offset="1" stopColor="#cbd5e1"/>
                      </linearGradient>
                    </defs>
                    {/* Ribbon left */}
                    <rect x="15" y="2" width="9" height="22" rx="3" fill="url(#medal-ribbon)" transform="rotate(-15 19.5 13)"/>
                    {/* Ribbon right */}
                    <rect x="28" y="2" width="9" height="22" rx="3" fill="url(#medal-ribbon)" transform="rotate(15 32.5 13)"/>
                    {/* Outer circle */}
                    <circle cx="26" cy="42" r="17" fill="url(#medal-body)" stroke="#94A3B8" strokeWidth="1.5"/>
                    {/* Inner circle */}
                    <circle cx="26" cy="42" r="12" fill="url(#medal-inner)"/>
                    {/* Number 2 */}
                    <text x="26" y="48" textAnchor="middle" fontSize="14" fontWeight="900" fill="#64748B">2</text>
                  </svg>

                  {/* Score details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: "var(--theme-text)" }}>Niveau {score.label}</div>
                    <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
                      Progression : <span style={{ color: "var(--bp-primary)", fontWeight: 700 }}>{score.pct}%</span>
                    </div>
                    {/* Progress bar */}
                    <div style={{ background: "#E5E7EB", borderRadius: 6, height: 7, marginTop: 7, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${score.pct}%`, background: "linear-gradient(90deg,var(--bp-primary),#27AE60)", borderRadius: 6, transition: "width 0.6s ease" }} />
                    </div>
                    {score.nextLevel && score.pointsToNext !== null && (
                      <div style={{ fontSize: 11.5, color: "#888", marginTop: 5 }}>
                        {score.pointsToNext} pts pour atteindre le niveau {score.nextLevel}
                      </div>
                    )}
                  </div>

                  {/* Points badge */}
                  <div style={{ flexShrink: 0, background: "linear-gradient(135deg,var(--bp-primary),#1a9e2f)", borderRadius: 14, padding: "10px 14px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, boxShadow: "0 3px 10px rgba(46,204,64,0.3)" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
                    <span style={{ fontSize: 18, fontWeight: 900, color: "#fff", lineHeight: 1 }}>{score.points}</span>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>Points</span>
                  </div>
                </div>
              </div>

              {/* ── Centres d'intérêt (si présents) ── */}
              {(() => {
                let hobbies: string[] = [];
                try {
                  const ext = JSON.parse(localStorage.getItem("fb_profile_ext") ?? "{}");
                  hobbies = (ext.hobbies ?? "").split(",").map((s: string) => s.trim()).filter(Boolean);
                } catch { /* ignore */ }
                return hobbies.length > 0 ? (
                  <div style={{ background: "var(--theme-surface)", borderRadius: 16, boxShadow: "0 1px 6px rgba(0,0,0,0.07)", padding: 16 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, color: "var(--theme-text)", marginBottom: 12 }}>Centres d'intérêt</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {hobbies.map(h => (
                        <span key={h} style={{ background: "#DCFCE7", color: "var(--bp-primary)", padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600, border: "1px solid #DCFCE7" }}>{h}</span>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          );
        })()}

        {/* AMIS */}
        {activeTab === "amis" && (
          <>
            <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 15 }}>{friends.length} ami{friends.length !== 1 ? "s" : ""}</div>
            {friends.length === 0 && (
              <div style={{ textAlign: "center", padding: "24px 16px", color: "var(--fb-text-secondary)", fontSize: 14 }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>👥</div>
                <div>Aucun ami pour l'instant</div>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {friends.slice(0, 6).map(u => {
                const name = `${u.firstName} ${u.lastName}`;
                const inits = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
                const COLORS = ["var(--bp-primary)","#EC4899","#8B5CF6","#D97706","#388E3C","#00838F"];
                const color = COLORS[u.id % COLORS.length];
                const FLAGS: Record<string,string> = { CI:"🇨🇮", SN:"🇸🇳", BJ:"🇧🇯", TG:"🇹🇬", BF:"🇧🇫", GH:"🇬🇭", ML:"🇲🇱" };
                const flag = u.country ? (FLAGS[u.country] ?? "🌍") : "🌍";
                return (
                  <div key={u.id} style={{ background: "var(--fb-white)", borderRadius: 10, border: "1px solid var(--fb-divider)", overflow: "hidden" }}>
                    <div style={{ height: 80, background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 32, fontWeight: 700, position: "relative", overflow: "hidden" }}>
                      {u.avatarUrl
                        ? <img src={u.avatarUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : inits}
                      <span style={{ position: "absolute", top: 4, right: 6, fontSize: 16 }}>{flag}</span>
                    </div>
                    <div style={{ padding: "8px 10px" }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{name}</div>
                      <div style={{ fontSize: 11, color: "var(--fb-text-secondary)" }}>{u.country}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* PHOTOS */}
        {activeTab === "photos" && (
          <>
            <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 15 }}>Photos</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 3 }}>
              {avatarUrl && (
                <div style={{ aspectRatio: "1", borderRadius: 4, overflow: "hidden", border: "2px solid var(--bp-primary)" }}>
                  <img src={avatarUrl} alt="Photo de profil" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              )}
              {coverUrl && (
                <div style={{ aspectRatio: "1", borderRadius: 4, overflow: "hidden" }}>
                  <img src={coverUrl} alt="Photo de couverture" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              )}
              {myPosts.filter(p => p.imageUrl).map(p => (
                <div key={p.id} style={{ aspectRatio: "1", borderRadius: 4, overflow: "hidden" }}>
                  <img src={p.imageUrl!} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ))}
              {!avatarUrl && !coverUrl && myPosts.filter(p => p.imageUrl).length === 0 && (
                <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "24px 16px", color: "var(--fb-text-secondary)" }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>📷</div>
                  <div>Aucune photo pour l'instant</div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {showProMode && (
        <ProModeModal
          onClose={() => setShowProMode(false)}
          onActivated={() => setIsPro(true)}
        />
      )}

      {showProfileStatus && (
        <ProfileStatusModal
          userName={localUser.name ?? ""}
          avatarUrl={avatarUrl || undefined}
          onClose={() => setShowProfileStatus(false)}
        />
      )}

      {showArchive && (
        <ArchiveModal onClose={() => setShowArchive(false)} />
      )}

      {showActivityHistory && (
        <ActivityHistoryModal
          onClose={() => setShowActivityHistory(false)}
          userId={localUser.id}
          userName={localUser.name}
        />
      )}

      {showFeaturedContent && (
        <FeaturedContentModal
          onClose={() => setShowFeaturedContent(false)}
          userId={localUser.id}
        />
      )}

      {showDeactivatePro && (
        <DeactivateProModal
          onClose={() => setShowDeactivatePro(false)}
          onDeactivated={() => setIsPro(false)}
        />
      )}

      {showVoirEnTantQue && (
        <VoirEnTantQueModal
          onClose={() => setShowVoirEnTantQue(false)}
          userName={localUser.name ?? ""}
          avatarUrl={avatarUrl || undefined}
          bio={bio}
          country={localUser.country}
          flag={localUser.flag}
          friendsCount={friends.length}
          postsCount={myPosts.length}
        />
      )}

      {showLockProfile && (
        <LockProfileModal
          onClose={() => setShowLockProfile(false)}
          currentlyLocked={isProfileLocked}
          onToggle={handleLockToggle}
        />
      )}

      {showReviewTags && (
        <ReviewTagsModal onClose={() => setShowReviewTags(false)} />
      )}

      {showTagReviewSettings && (
        <TagReviewSettingsPage
          onClose={() => setShowTagReviewSettings(false)}
          onOpenTagReview={() => {
            setShowTagReviewSettings(false);
            setShowReviewTags(true);
          }}
        />
      )}

      {/* ── Lightbox viewer (avatar / couverture) ── */}
      {lightboxUrl && createPortal(
        <div
          onClick={() => setLightboxUrl(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 99999,
            background: "rgba(0,0,0,0.92)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "fadeIn 0.18s ease",
          }}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 40, height: 40, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 22, lineHeight: 1 }}
            aria-label="Fermer"
          >×</button>
          <img
            src={lightboxUrl}
            alt=""
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: "95vw", maxHeight: "90vh", objectFit: "contain", borderRadius: 8, boxShadow: "0 8px 48px rgba(0,0,0,0.6)" }}
          />
        </div>,
        document.body
      )}
    </div>
  );
}
