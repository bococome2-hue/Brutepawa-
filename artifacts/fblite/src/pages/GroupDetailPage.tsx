import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "../router";
import {
  apiGetGroup, apiJoinGroup, apiLeaveGroup,
  apiGetGroupPosts, apiCreateGroupPost,
  apiGetGroupMembers, apiRemoveGroupMember, apiSetGroupMemberRole,
  apiRequestToJoin, apiGetJoinRequests, apiHandleJoinRequest,
  apiUpdateGroup,
  ApiGroupDetail, ApiGroupPost, ApiGroupMember, ApiJoinRequest,
} from "../lib/api";
import { useR2Upload } from "../hooks/useR2Upload";
import GroupBotsPanel from "../components/GroupBotsPanel";

const GROUP_CATEGORIES = ["general", "Agriculture", "Technologie", "Commerce", "Éducation", "Sport", "Santé", "Culture", "Religion"];

const AVATAR_COLORS = ["var(--bp-primary)", "#E91E63", "#9C27B0", "#FF9800", "var(--bp-primary)", "#0EA5E9", "#EF4444", "#6366F1"];
function avatarColor(id: number) { return AVATAR_COLORS[id % AVATAR_COLORS.length]; }
function initials(firstName: string, lastName: string) {
  return ((firstName?.[0] ?? "") + (lastName?.[0] ?? "")).toUpperCase() || "??";
}

function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function relTime(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (d < 60) return "À l'instant";
  if (d < 3600) return `Il y a ${Math.floor(d / 60)} min`;
  if (d < 86400) return `Il y a ${Math.floor(d / 3600)} h`;
  const days = Math.floor(d / 86400);
  if (days < 30) return `Il y a ${days} j`;
  if (days < 365) return `Il y a ${Math.floor(days / 30)} mois`;
  return `Il y a ${Math.floor(days / 365)} an(s)`;
}

function UserAvatar({ id, firstName, lastName, avatarUrl, size = 40 }: {
  id: number; firstName: string; lastName: string; avatarUrl: string | null; size?: number;
}) {
  return avatarUrl
    ? <img src={avatarUrl} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
    : <div style={{ width: size, height: size, borderRadius: "50%", background: avatarColor(id), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: size * 0.36, flexShrink: 0 }}>{initials(firstName, lastName)}</div>;
}

function roleLabel(role: string) {
  if (role === "admin") return { text: "Admin", color: "var(--bp-primary)" };
  if (role === "moderator") return { text: "Modérateur", color: "#9C27B0" };
  return null;
}

type Tab = "posts" | "members" | "requests" | "bots";

export default function GroupDetailPage({ groupId }: { groupId: number }) {
  const navigate = useNavigate();
  const [group, setGroup] = useState<ApiGroupDetail | null>(null);
  const [posts, setPosts] = useState<ApiGroupPost[]>([]);
  const [members, setMembers] = useState<ApiGroupMember[]>([]);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [joinRequests, setJoinRequests] = useState<ApiJoinRequest[]>([]);
  const [tab, setTab] = useState<Tab>("posts");
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { upload, status: uploadStatus, error: uploadError, reset: resetUpload } = useR2Upload();

  const isAdmin = myRole === "admin";
  const isAdminOrMod = myRole === "admin" || myRole === "moderator";

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editPrivacy, setEditPrivacy] = useState<"public" | "private">("public");
  const [editCoverUrl, setEditCoverUrl] = useState<string | null>(null);
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null);
  const [editCoverPreview, setEditCoverPreview] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const editCoverInputRef = useRef<HTMLInputElement>(null);
  const { upload: uploadCover, status: coverUploadStatus, reset: resetCoverUpload } = useR2Upload();

  const openEdit = () => {
    if (!group) return;
    setEditName(group.name);
    setEditDescription(group.description ?? "");
    setEditCategory(group.category);
    setEditPrivacy(group.privacy as "public" | "private");
    setEditCoverUrl(group.coverUrl);
    setEditCoverFile(null);
    setEditCoverPreview(null);
    resetCoverUpload();
    setEditError(null);
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditCoverFile(null);
    setEditCoverPreview(null);
    resetCoverUpload();
    setEditError(null);
  };

  const handleEditCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditCoverFile(file);
    const reader = new FileReader();
    reader.onload = ev => setEditCoverPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    resetCoverUpload();
    if (e.target) e.target.value = "";
  };

  const handleEditSave = async () => {
    if (!group) return;
    if (!editName.trim()) {
      setEditError("Le nom du groupe est requis.");
      return;
    }
    if (editPrivacy === "private" && group.privacy === "public") {
      if (!confirm("Attention : passer ce groupe en privé empêchera les non-membres de voir les publications et de rejoindre directement. Continuer ?")) {
        return;
      }
    }
    setEditSaving(true);
    setEditError(null);
    try {
      let finalCoverUrl = editCoverUrl;
      if (editCoverFile) {
        const uploaded = await uploadCover(editCoverFile);
        if (!uploaded) {
          setEditError("Échec de l'upload de l'image de couverture");
          setEditSaving(false);
          return;
        }
        finalCoverUrl = uploaded.url;
      }
      const updated = await apiUpdateGroup(group.id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        category: editCategory,
        coverUrl: finalCoverUrl,
        privacy: editPrivacy,
      });
      setGroup(prev => prev ? { ...prev, ...updated } : prev);
      closeEdit();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Erreur lors de la mise à jour");
    }
    setEditSaving(false);
  };

  const loadGroup = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const g = await apiGetGroup(groupId);
      setGroup(g);
    } catch {
      setError("Impossible de charger ce groupe.");
    }
    setLoading(false);
  }, [groupId]);

  const loadPosts = useCallback(async () => {
    setPostsLoading(true);
    try {
      const p = await apiGetGroupPosts(groupId);
      setPosts(p);
    } catch { /* ignore */ }
    setPostsLoading(false);
  }, [groupId]);

  const loadMembers = useCallback(async () => {
    setMembersLoading(true);
    try {
      const data = await apiGetGroupMembers(groupId);
      setMembers(data.members);
      setMyRole(data.myRole);
    } catch { /* ignore */ }
    setMembersLoading(false);
  }, [groupId]);

  const loadJoinRequests = useCallback(async () => {
    setRequestsLoading(true);
    try {
      const reqs = await apiGetJoinRequests(groupId);
      setJoinRequests(reqs);
    } catch { /* ignore */ }
    setRequestsLoading(false);
  }, [groupId]);

  useEffect(() => {
    loadGroup();
    loadPosts();
  }, [loadGroup, loadPosts]);

  useEffect(() => {
    if (group?.isMember) {
      loadMembers();
    }
  }, [group?.isMember, loadMembers]);

  useEffect(() => {
    if (tab === "members" && group?.isMember) loadMembers();
    if (tab === "requests" && isAdminOrMod) loadJoinRequests();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleJoin = async () => {
    if (!group) return;
    setActionLoading(true);
    try {
      await apiJoinGroup(group.id);
      setGroup(prev => prev ? { ...prev, isMember: true, membersCount: prev.membersCount + 1 } : prev);
      await loadPosts();
      await loadMembers();
    } catch { /* ignore */ }
    setActionLoading(false);
  };

  const handleRequestToJoin = async () => {
    if (!group) return;
    setActionLoading(true);
    try {
      await apiRequestToJoin(group.id);
      setGroup(prev => prev ? { ...prev, joinRequestStatus: "pending" } : prev);
    } catch { /* ignore */ }
    setActionLoading(false);
  };

  const handleLeave = async () => {
    if (!group) return;
    setActionLoading(true);
    try {
      await apiLeaveGroup(group.id);
      setGroup(prev => prev ? { ...prev, isMember: false, membersCount: Math.max(0, prev.membersCount - 1), memberRole: null } : prev);
      setMyRole(null);
      setPosts([]);
      setMembers([]);
      setTab("posts");
    } catch { /* ignore */ }
    setActionLoading(false);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = ev => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    resetUpload();
    if (e.target) e.target.value = "";
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    resetUpload();
  };

  const handlePost = async () => {
    if (!postContent.trim() || !group) return;
    setPosting(true);
    setPostError(null);
    try {
      let imageUrl: string | undefined;
      if (imageFile) {
        const uploaded = await upload(imageFile);
        if (!uploaded) {
          setPostError(uploadError ?? "Échec de l'upload de l'image");
          setPosting(false);
          return;
        }
        imageUrl = uploaded.url;
      }
      await apiCreateGroupPost(group.id, postContent.trim(), imageUrl);
      setPostContent("");
      clearImage();
      await loadPosts();
    } catch (err) {
      setPostError(err instanceof Error ? err.message : "Erreur lors de la publication");
    }
    setPosting(false);
  };

  const handleRemoveMember = async (targetUserId: number) => {
    if (!group) return;
    try {
      await apiRemoveGroupMember(group.id, targetUserId);
      setMembers(prev => prev.filter(m => m.userId !== targetUserId));
      setGroup(prev => prev ? { ...prev, membersCount: Math.max(0, prev.membersCount - 1) } : prev);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur");
    }
  };

  const handleChangeRole = async (targetUserId: number, currentRole: string) => {
    if (!group) return;
    const newRole = currentRole === "moderator" ? "member" : "moderator";
    try {
      await apiSetGroupMemberRole(group.id, targetUserId, newRole);
      setMembers(prev => prev.map(m => m.userId === targetUserId ? { ...m, role: newRole } : m));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur");
    }
  };

  const handleJoinRequest = async (requestId: number, action: "approve" | "reject") => {
    if (!group) return;
    try {
      await apiHandleJoinRequest(group.id, requestId, action);
      setJoinRequests(prev => prev.filter(r => r.requestId !== requestId));
      if (action === "approve") {
        setGroup(prev => prev ? { ...prev, membersCount: prev.membersCount + 1 } : prev);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur");
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 600, margin: "0 auto", padding: 32, textAlign: "center", color: "var(--fb-text-secondary)" }}>
        Chargement…
      </div>
    );
  }

  if (error || !group) {
    return (
      <div style={{ maxWidth: 600, margin: "0 auto", padding: 32, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>😕</div>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{error ?? "Groupe introuvable"}</div>
        <button
          onClick={() => navigate("/community")}
          style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "var(--bp-primary)", color: "#fff", fontWeight: 700, cursor: "pointer" }}
        >
          ← Retour aux groupes
        </button>
      </div>
    );
  }

  const pendingRequestCount = joinRequests.length;

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      {/* Cover / header */}
      <div style={{ position: "relative", background: group.coverUrl ? undefined : "linear-gradient(135deg, var(--bp-primary) 0%, #0EA5E9 100%)", height: 180, overflow: "hidden" }}>
        {group.coverUrl && (
          <img src={group.coverUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        )}
        {!group.coverUrl && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 64 }}>
            {group.emoji}
          </div>
        )}
        <button
          onClick={() => navigate("/community")}
          style={{ position: "absolute", top: 12, left: 12, background: "rgba(0,0,0,0.45)", border: "none", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", fontSize: 18, backdropFilter: "blur(4px)" }}
        >
          ←
        </button>
      </div>

      {/* Info card */}
      <div style={{ background: "var(--fb-white)", padding: "16px 16px 20px", borderBottom: "1px solid var(--fb-divider)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ fontSize: 40, lineHeight: 1, flexShrink: 0, marginTop: 4 }}>{group.emoji}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, lineHeight: 1.2 }}>{group.name}</h1>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", marginTop: 6 }}>
              <span style={{ fontSize: 13, color: "var(--fb-text-secondary)" }}>
                {group.privacy === "public" ? "🌍 Groupe public" : "🔒 Groupe privé"}
              </span>
              <span style={{ fontSize: 13, color: "var(--fb-text-secondary)" }}>
                👥 {formatCount(group.membersCount)} membre{group.membersCount !== 1 ? "s" : ""}
              </span>
              {group.country && (
                <span style={{ fontSize: 13, color: "var(--fb-text-secondary)" }}>📍 {group.country}</span>
              )}
              <span style={{ fontSize: 13, color: "var(--fb-text-secondary)" }}>🗓 Créé {relTime(group.createdAt)}</span>
            </div>
            <div style={{ marginTop: 6 }}>
              <span style={{ fontSize: 12, background: "var(--fb-divider)", borderRadius: 12, padding: "3px 10px", fontWeight: 600, color: "var(--fb-text-secondary)" }}>
                {group.category}
              </span>
              {myRole && roleLabel(myRole) && (
                <span style={{ fontSize: 12, background: roleLabel(myRole)!.color + "20", borderRadius: 12, padding: "3px 10px", fontWeight: 700, color: roleLabel(myRole)!.color, marginLeft: 6 }}>
                  {roleLabel(myRole)!.text}
                </span>
              )}
            </div>
          </div>
        </div>

        {group.description && (
          <p style={{ margin: "14px 0 0", fontSize: 14, color: "var(--fb-text)", lineHeight: 1.6 }}>
            {group.description}
          </p>
        )}

        {/* Join / Leave / Request button */}
        <div style={{ marginTop: 16 }}>
          {isAdmin && (
            <button
              onClick={openEdit}
              style={{ width: "100%", marginBottom: 10, padding: "10px 0", borderRadius: 8, border: "1px solid var(--fb-border)", background: "var(--fb-bg)", color: "var(--fb-text)", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              ✏️ Modifier le groupe
            </button>
          )}
          {group.isMember ? (
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1, padding: "11px 0", textAlign: "center", background: "var(--fb-divider)", borderRadius: 8, fontWeight: 700, fontSize: 14, color: "var(--bp-primary)" }}>
                ✓ Membre
              </div>
              <button
                onClick={handleLeave}
                disabled={actionLoading || myRole === "admin"}
                title={myRole === "admin" ? "L'administrateur ne peut pas quitter le groupe" : undefined}
                style={{ padding: "11px 18px", borderRadius: 8, border: "1px solid var(--fb-border)", background: "var(--fb-white)", color: "var(--fb-text)", fontWeight: 600, fontSize: 14, cursor: myRole === "admin" ? "not-allowed" : "pointer", opacity: myRole === "admin" ? 0.5 : 1 }}
              >
                {actionLoading ? "…" : "Quitter"}
              </button>
            </div>
          ) : group.privacy === "private" ? (
            group.joinRequestStatus === "pending" ? (
              <div style={{ padding: "12px 0", textAlign: "center", background: "var(--fb-divider)", borderRadius: 8, fontWeight: 700, fontSize: 14, color: "var(--fb-text-secondary)" }}>
                ⏳ Demande envoyée — en attente d'approbation
              </div>
            ) : group.joinRequestStatus === "rejected" ? (
              <div style={{ padding: "12px 0", textAlign: "center", background: "#FEE2E2", borderRadius: 8, fontWeight: 700, fontSize: 14, color: "#D32F2F" }}>
                ✗ Demande refusée
              </div>
            ) : (
              <button
                onClick={handleRequestToJoin}
                disabled={actionLoading}
                className="btn-primary"
                style={{ width: "100%", padding: "12px 0", fontSize: 15, fontWeight: 700 }}
              >
                {actionLoading ? "…" : "🔒 Demander à rejoindre"}
              </button>
            )
          ) : (
            <button
              onClick={handleJoin}
              disabled={actionLoading}
              className="btn-primary"
              style={{ width: "100%", padding: "12px 0", fontSize: 15, fontWeight: 700 }}
            >
              {actionLoading ? "…" : "+ Rejoindre le groupe"}
            </button>
          )}
        </div>
      </div>

      {/* Tab bar (members only) */}
      {group.isMember && (
        <div style={{ display: "flex", background: "var(--fb-white)", borderBottom: "1px solid var(--fb-divider)" }}>
          {(["posts", "members", ...(isAdminOrMod ? ["requests"] : []), ...(isAdmin ? ["bots"] : [])] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: "12px 0", border: "none", background: "none", fontWeight: tab === t ? 700 : 500,
                fontSize: 13, cursor: "pointer", color: tab === t ? "var(--bp-primary)" : "var(--fb-text-secondary)",
                borderBottom: tab === t ? "3px solid var(--bp-primary)" : "3px solid transparent",
                position: "relative",
              }}
            >
              {t === "posts" && "Publications"}
              {t === "members" && "Membres"}
              {t === "requests" && (
                <>
                  Demandes
                  {pendingRequestCount > 0 && (
                    <span style={{ position: "absolute", top: 8, right: "calc(50% - 28px)", background: "#EF4444", color: "#fff", borderRadius: "50%", width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>
                      {pendingRequestCount > 9 ? "9+" : pendingRequestCount}
                    </span>
                  )}
                </>
              )}
              {t === "bots" && "🤖 Bots"}
            </button>
          ))}
        </div>
      )}

      {/* Posts tab */}
      {(!group.isMember || tab === "posts") && (
        <>
          {/* Post composer (members only) */}
          {group.isMember && (
            <div style={{ background: "var(--fb-white)", margin: "12px 0 0", borderTop: "1px solid var(--fb-divider)", borderBottom: "1px solid var(--fb-divider)", padding: "12px 16px" }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>📝 Nouvelle publication</div>
              <textarea
                value={postContent}
                onChange={e => setPostContent(e.target.value)}
                placeholder="Partagez quelque chose avec le groupe…"
                rows={3}
                style={{ width: "100%", resize: "vertical", borderRadius: 8, border: "1px solid var(--fb-border)", padding: "10px 12px", fontSize: 14, fontFamily: "inherit", background: "var(--fb-bg)", color: "var(--fb-text)", boxSizing: "border-box" }}
              />

              {imagePreview && (
                <div style={{ position: "relative", marginTop: 8, display: "inline-block" }}>
                  <img
                    src={imagePreview}
                    alt="aperçu"
                    style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 8, objectFit: "cover", display: "block" }}
                  />
                  <button
                    onClick={clearImage}
                    style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.55)", border: "none", borderRadius: "50%", width: 26, height: 26, color: "#fff", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
                    title="Supprimer l'image"
                  >×</button>
                </div>
              )}

              {uploadStatus === "uploading" && (
                <div style={{ fontSize: 12, color: "var(--fb-text-secondary)", marginTop: 4 }}>Envoi de l'image…</div>
              )}

              {postError && (
                <div style={{ fontSize: 12, color: "var(--fb-red, #EF4444)", marginTop: 4 }}>{postError}</div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleImageSelect}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={posting}
                  style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--fb-border)", background: "var(--fb-bg)", color: "var(--fb-text-secondary)", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
                  title="Ajouter une photo"
                >
                  🖼️ Photo
                </button>
                <button
                  onClick={handlePost}
                  disabled={posting || !postContent.trim()}
                  className="btn-primary"
                  style={{ padding: "9px 20px", fontSize: 14, fontWeight: 700 }}
                >
                  {posting ? "Publication…" : "Publier"}
                </button>
              </div>
            </div>
          )}

          {/* Posts feed */}
          <div style={{ padding: "12px 12px 24px" }}>
            <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 12 }}>Publications</div>

            {postsLoading ? (
              <div style={{ textAlign: "center", padding: 32, color: "var(--fb-text-secondary)" }}>Chargement…</div>
            ) : !group.isMember && group.privacy === "private" ? (
              <div style={{ background: "var(--fb-white)", borderRadius: 12, border: "1px solid var(--fb-divider)", padding: "32px 20px", textAlign: "center", color: "var(--fb-text-secondary)" }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>🔒</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "var(--fb-text)", marginBottom: 6 }}>Contenu réservé aux membres</div>
                <div style={{ fontSize: 13 }}>Ce groupe est privé. Faites une demande pour voir les publications.</div>
              </div>
            ) : posts.length === 0 ? (
              <div style={{ background: "var(--fb-white)", borderRadius: 12, border: "1px solid var(--fb-divider)", padding: "32px 20px", textAlign: "center", color: "var(--fb-text-secondary)" }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>📝</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "var(--fb-text)", marginBottom: 6 }}>Aucune publication pour l'instant</div>
                <div style={{ fontSize: 13 }}>
                  {group.isMember
                    ? "Soyez le premier à partager quelque chose dans ce groupe."
                    : "Rejoignez le groupe pour voir et partager des publications."}
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {posts.map(post => (
                  <div key={post.id} style={{ background: "var(--fb-white)", borderRadius: 12, border: "1px solid var(--fb-divider)", padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <UserAvatar
                        id={post.authorId}
                        firstName={post.authorFirstName}
                        lastName={post.authorLastName}
                        avatarUrl={post.authorAvatarUrl}
                        size={38}
                      />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{post.authorFirstName} {post.authorLastName}</div>
                        <div style={{ fontSize: 12, color: "var(--fb-text-secondary)" }}>{relTime(post.createdAt)}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.6, color: "var(--fb-text)", whiteSpace: "pre-wrap" }}>{post.content}</div>
                    {post.imageUrl && (
                      <img
                        src={post.imageUrl}
                        alt=""
                        style={{ marginTop: 10, width: "100%", borderRadius: 8, objectFit: "cover", maxHeight: 300 }}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Members tab */}
      {group.isMember && tab === "members" && (
        <div style={{ padding: "12px 12px 24px" }}>
          <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 12 }}>
            Membres ({members.length})
          </div>
          {membersLoading ? (
            <div style={{ textAlign: "center", padding: 32, color: "var(--fb-text-secondary)" }}>Chargement…</div>
          ) : members.length === 0 ? (
            <div style={{ textAlign: "center", padding: 32, color: "var(--fb-text-secondary)" }}>Aucun membre trouvé</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {members.map(member => {
                const badge = roleLabel(member.role);
                return (
                  <div
                    key={member.userId}
                    style={{ background: "var(--fb-white)", borderRadius: 12, border: "1px solid var(--fb-divider)", padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <UserAvatar
                      id={member.userId}
                      firstName={member.firstName}
                      lastName={member.lastName}
                      avatarUrl={member.avatarUrl}
                      size={42}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                        {member.firstName} {member.lastName}
                        {badge && (
                          <span style={{ fontSize: 11, background: badge.color + "20", color: badge.color, borderRadius: 8, padding: "2px 7px", fontWeight: 700 }}>
                            {badge.text}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--fb-text-secondary)" }}>
                        Membre depuis {relTime(member.joinedAt)}
                      </div>
                    </div>
                    {isAdmin && member.role !== "admin" && (
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button
                          onClick={() => handleChangeRole(member.userId, member.role)}
                          style={{
                            padding: "6px 11px", borderRadius: 8, border: "1px solid var(--fb-border)",
                            background: "var(--fb-bg)", color: "var(--fb-text-secondary)", fontWeight: 600, fontSize: 12, cursor: "pointer",
                          }}
                          title={member.role === "moderator" ? "Rétrograder en membre" : "Promouvoir modérateur"}
                        >
                          {member.role === "moderator" ? "↓ Membre" : "↑ Modo"}
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Retirer ${member.firstName} ${member.lastName} du groupe ?`)) {
                              handleRemoveMember(member.userId);
                            }
                          }}
                          style={{
                            padding: "6px 11px", borderRadius: 8, border: "1px solid #EF4444",
                            background: "#FEE2E2", color: "#D32F2F", fontWeight: 600, fontSize: 12, cursor: "pointer",
                          }}
                          title="Retirer du groupe"
                        >
                          Retirer
                        </button>
                      </div>
                    )}
                    {!isAdmin && isAdminOrMod && member.role === "member" && (
                      <button
                        onClick={() => {
                          if (confirm(`Retirer ${member.firstName} ${member.lastName} du groupe ?`)) {
                            handleRemoveMember(member.userId);
                          }
                        }}
                        style={{
                          padding: "6px 11px", borderRadius: 8, border: "1px solid #EF4444",
                          background: "#FEE2E2", color: "#D32F2F", fontWeight: 600, fontSize: 12, cursor: "pointer", flexShrink: 0,
                        }}
                      >
                        Retirer
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Edit group modal */}
      {editOpen && (
        <div
          onClick={e => { if (e.target === e.currentTarget) closeEdit(); }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
        >
          <div style={{ background: "var(--fb-white)", borderRadius: "16px 16px 0 0", width: "100%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto", padding: "20px 20px 40px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div style={{ fontWeight: 800, fontSize: 17 }}>✏️ Modifier le groupe</div>
              <button onClick={closeEdit} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--fb-text-secondary)", lineHeight: 1, padding: "4px 8px" }}>×</button>
            </div>

            {/* Cover image */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--fb-text-secondary)" }}>Image de couverture</div>
              <div
                style={{
                  height: 120, borderRadius: 10, overflow: "hidden", background: (editCoverPreview || editCoverUrl)
                    ? undefined
                    : "linear-gradient(135deg, var(--bp-primary) 0%, #0EA5E9 100%)",
                  display: "flex", alignItems: "center", justifyContent: "center", position: "relative", cursor: "pointer", border: "1px solid var(--fb-border)",
                }}
                onClick={() => editCoverInputRef.current?.click()}
              >
                {(editCoverPreview || editCoverUrl) ? (
                  <img src={editCoverPreview ?? editCoverUrl!} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>📷 Ajouter une photo</div>
                )}
                <div style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.5)", borderRadius: 8, padding: "4px 10px", color: "#fff", fontSize: 12, fontWeight: 600, backdropFilter: "blur(4px)" }}>
                  {coverUploadStatus === "uploading" ? "Envoi…" : "Modifier"}
                </div>
              </div>
              <input ref={editCoverInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleEditCoverSelect} />
              {(editCoverPreview || editCoverUrl) && (
                <button
                  onClick={() => { setEditCoverUrl(null); setEditCoverFile(null); setEditCoverPreview(null); resetCoverUpload(); }}
                  style={{ marginTop: 6, fontSize: 12, color: "#D32F2F", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
                >
                  🗑 Supprimer la couverture
                </button>
              )}
            </div>

            {/* Name */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--fb-text-secondary)", display: "block", marginBottom: 5 }}>Nom du groupe *</label>
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="Nom du groupe"
                maxLength={100}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--fb-border)", background: "var(--fb-bg)", color: "var(--fb-text)", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }}
              />
            </div>

            {/* Description */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--fb-text-secondary)", display: "block", marginBottom: 5 }}>Description</label>
              <textarea
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                placeholder="Décrivez votre groupe…"
                rows={3}
                maxLength={500}
                style={{ width: "100%", resize: "vertical", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--fb-border)", background: "var(--fb-bg)", color: "var(--fb-text)", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }}
              />
            </div>

            {/* Category */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--fb-text-secondary)", display: "block", marginBottom: 5 }}>Catégorie</label>
              <select
                value={editCategory}
                onChange={e => setEditCategory(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--fb-border)", background: "var(--fb-bg)", color: "var(--fb-text)", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }}
              >
                {GROUP_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Privacy */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fb-text-secondary)", marginBottom: 8 }}>Confidentialité</div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setEditPrivacy("public")}
                  style={{
                    flex: 1, padding: "12px 0", borderRadius: 10, border: `2px solid ${editPrivacy === "public" ? "var(--bp-primary)" : "var(--fb-border)"}`,
                    background: editPrivacy === "public" ? "var(--bp-primary)10" : "var(--fb-bg)", color: editPrivacy === "public" ? "var(--bp-primary)" : "var(--fb-text)",
                    fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  }}
                >
                  <span style={{ fontSize: 20 }}>🌍</span>
                  <span>Public</span>
                  <span style={{ fontSize: 11, fontWeight: 400, color: "var(--fb-text-secondary)" }}>Tout le monde peut rejoindre</span>
                </button>
                <button
                  onClick={() => setEditPrivacy("private")}
                  style={{
                    flex: 1, padding: "12px 0", borderRadius: 10, border: `2px solid ${editPrivacy === "private" ? "var(--bp-primary)" : "var(--fb-border)"}`,
                    background: editPrivacy === "private" ? "var(--bp-primary)10" : "var(--fb-bg)", color: editPrivacy === "private" ? "var(--bp-primary)" : "var(--fb-text)",
                    fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  }}
                >
                  <span style={{ fontSize: 20 }}>🔒</span>
                  <span>Privé</span>
                  <span style={{ fontSize: 11, fontWeight: 400, color: "var(--fb-text-secondary)" }}>Approbation requise</span>
                </button>
              </div>
              {editPrivacy === "private" && group.privacy === "public" && (
                <div style={{ marginTop: 8, padding: "10px 12px", background: "#FEF3C7", borderRadius: 8, border: "1px solid #FFD54F", fontSize: 13, color: "#795548" }}>
                  ⚠️ Passer en privé empêchera les nouveaux membres de rejoindre directement. Une confirmation sera demandée à l'enregistrement.
                </div>
              )}
            </div>

            {editError && (
              <div style={{ marginBottom: 12, padding: "10px 12px", background: "#FEE2E2", borderRadius: 8, color: "#D32F2F", fontSize: 13 }}>{editError}</div>
            )}

            <button
              onClick={handleEditSave}
              disabled={editSaving || !editName.trim()}
              className="btn-primary"
              style={{ width: "100%", padding: "13px 0", fontSize: 15, fontWeight: 700 }}
            >
              {editSaving ? "Enregistrement…" : "Enregistrer les modifications"}
            </button>
          </div>
        </div>
      )}

      {/* Bots tab (admin only) */}
      {group.isMember && tab === "bots" && isAdmin && (
        <GroupBotsPanel groupId={groupId} />
      )}

      {/* Requests tab (admin/moderator only) */}
      {group.isMember && tab === "requests" && isAdminOrMod && (
        <div style={{ padding: "12px 12px 24px" }}>
          <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 12 }}>
            Demandes d'adhésion
            {pendingRequestCount > 0 && (
              <span style={{ marginLeft: 8, fontSize: 14, background: "#EF4444", color: "#fff", borderRadius: 20, padding: "2px 10px", fontWeight: 700 }}>
                {pendingRequestCount}
              </span>
            )}
          </div>
          {requestsLoading ? (
            <div style={{ textAlign: "center", padding: 32, color: "var(--fb-text-secondary)" }}>Chargement…</div>
          ) : joinRequests.length === 0 ? (
            <div style={{ background: "var(--fb-white)", borderRadius: 12, border: "1px solid var(--fb-divider)", padding: "32px 20px", textAlign: "center", color: "var(--fb-text-secondary)" }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "var(--fb-text)", marginBottom: 6 }}>Aucune demande en attente</div>
              <div style={{ fontSize: 13 }}>Toutes les demandes d'adhésion ont été traitées.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {joinRequests.map(req => (
                <div
                  key={req.requestId}
                  style={{ background: "var(--fb-white)", borderRadius: 12, border: "1px solid var(--fb-divider)", padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}
                >
                  <UserAvatar
                    id={req.userId}
                    firstName={req.firstName}
                    lastName={req.lastName}
                    avatarUrl={req.avatarUrl}
                    size={42}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{req.firstName} {req.lastName}</div>
                    <div style={{ fontSize: 12, color: "var(--fb-text-secondary)" }}>
                      Demande envoyée {relTime(req.createdAt)}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => handleJoinRequest(req.requestId, "approve")}
                      style={{
                        padding: "7px 13px", borderRadius: 8, border: "none",
                        background: "var(--bp-primary)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
                      }}
                    >
                      ✓ Accepter
                    </button>
                    <button
                      onClick={() => handleJoinRequest(req.requestId, "reject")}
                      style={{
                        padding: "7px 13px", borderRadius: 8, border: "1px solid var(--fb-border)",
                        background: "var(--fb-bg)", color: "var(--fb-text-secondary)", fontWeight: 700, fontSize: 13, cursor: "pointer",
                      }}
                    >
                      ✗ Refuser
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
