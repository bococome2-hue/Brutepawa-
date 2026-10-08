import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { apiFetch } from "../lib/api";

interface Props { onClose: () => void; userId?: number; userName?: string; }

interface Post { id: number; content: string; createdAt: string; }
interface Notif { id: number; type: string; fromUserName?: string; postId?: number; content?: string; createdAt: string; }

type SubPage = null | "publications" | "tags" | "interactions" | "groups" | "profile_info" | "contacts";

function relDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function groupBy<T>(items: T[], key: (i: T) => string): Record<string, T[]> {
  return items.reduce((acc, item) => {
    const k = key(item);
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

const SECTIONS = [
  { id: "publications" as SubPage, icon: "≡", label: "Vos publications", desc: "Photos, vidéos, textes et statuts que vous avez partagés sur Brute Pawa", btnLabel: "Gérer vos publications" },
  { id: "tags" as SubPage, icon: "🏷", label: "Activité dans laquelle vous apparaissez", desc: "Publications, photos et commentaires dans lesquels vous avez été identifié(e)", btnLabel: "Gérer tags" },
  { id: "interactions" as SubPage, icon: "👍", label: "Interactions", desc: "Mentions J'aime, réactions, commentaires et plus", btnLabel: "Gérer interactions" },
  { id: "groups" as SubPage, icon: "👥", label: "Groupes, évènements et reels", desc: "Votre activité dans les groupes, vos évènements, les reels que vous avez créés et plus encore", btnLabel: "Voir les groupes, évènements et reels" },
  { id: "profile_info" as SubPage, icon: "👤", label: "Informations de profil", desc: "Numéro de téléphone, adresse e-mail et plus", btnLabel: "Voir les informations de profil" },
  { id: "contacts" as SubPage, icon: "🔔", label: "Contacts", desc: "Ami(e)s, mentions J'aime et liens de parenté", btnLabel: "Voir les connexions" },
  { id: null, icon: "📌", label: "Actions enregistrées et autres activités", desc: "Vos actions enregistrées, vos sondages et plus", btnLabel: null },
];

export default function ActivityHistoryModal({ onClose, userId, userName }: Props) {
  const [subPage, setSubPage] = useState<SubPage>(null);
  const [expanded, setExpanded] = useState<SubPage | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2800); };

  useEffect(() => {
    if (!subPage) return;
    setLoading(true); setSelectedIds(new Set());
    if (subPage === "publications" && userId) {
      apiFetch(`/posts?authorId=${userId}&page=1`).then(r => r.ok ? r.json() : []).then(data => setPosts(Array.isArray(data) ? data : [])).catch(() => setPosts([])).finally(() => setLoading(false));
    } else if ((subPage === "interactions" || subPage === "tags") && userId) {
      apiFetch("/notifications").then(r => r.ok ? r.json() : []).then(data => setNotifs(Array.isArray(data) ? data : [])).catch(() => setNotifs([])).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [subPage, userId]);

  const toggleSelect = (id: number) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll = (ids: number[]) => setSelectedIds(new Set(ids));
  const deselectAll = () => setSelectedIds(new Set());

  const handleArchivePosts = async () => {
    if (selectedIds.size === 0) return;
    setActionLoading(true);
    try {
      for (const id of selectedIds) await apiFetch(`/posts/${id}/archive`, { method: "POST" });
      setPosts(prev => prev.filter(p => !selectedIds.has(p.id)));
      setSelectedIds(new Set());
      showToast(`${selectedIds.size} publication(s) archivée(s)`);
    } catch { showToast("Erreur lors de l'archivage"); }
    finally { setActionLoading(false); }
  };

  const handleDeletePosts = async () => {
    if (selectedIds.size === 0) return;
    setActionLoading(true);
    try {
      await apiFetch("/posts/archived/delete", { method: "POST", body: JSON.stringify({ ids: [...selectedIds] }) });
      setPosts(prev => prev.filter(p => !selectedIds.has(p.id)));
      setSelectedIds(new Set());
      showToast(`${selectedIds.size} publication(s) supprimée(s)`);
    } catch { showToast("Erreur lors de la suppression"); }
    finally { setActionLoading(false); }
  };

  const handleDeleteNotifs = async () => {
    if (selectedIds.size === 0) return;
    setActionLoading(true);
    try {
      setNotifs(prev => prev.filter(n => !selectedIds.has(n.id)));
      setSelectedIds(new Set());
      showToast("Éléments supprimés");
    } catch { showToast("Erreur"); }
    finally { setActionLoading(false); }
  };

  const ModeBar = () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px 8px", background: "var(--theme-surface)", borderBottom: "1px solid #E5E7EB" }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--theme-text)", display: "flex", alignItems: "center", gap: 4 }}>
        Mode payant <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, borderRadius: "50%", background: "#64748B", color: "#fff", fontSize: 10, fontWeight: 700 }}>?</span>
      </span>
      <button style={{ background: "#E5E7EB", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Changer de mode</button>
    </div>
  );

  const SubHeader = ({ title, onBack }: { title: string; onBack: () => void }) => (
    <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", background: "var(--theme-surface)", borderBottom: "1px solid #E5E7EB" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--theme-text)", padding: "0 12px 0 0", lineHeight: 1 }}>‹</button>
      <span style={{ flex: 1, textAlign: "center", fontWeight: 700, fontSize: 16 }}>{title}</span>
      <div style={{ width: 32 }} />
    </div>
  );

  const ActionableListPage = ({ title, items, onBack, renderItem, bottomBtn }: {
    title: string; items: { id: number }[]; onBack: () => void;
    renderItem: (item: any) => React.ReactNode;
    bottomBtn: React.ReactNode;
  }) => {
    const groups = groupBy(items as any[], (i: any) => relDate(i.createdAt));
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <ModeBar />
        <SubHeader title={title} onBack={onBack} />
        <div style={{ background: "var(--theme-surface)", borderBottom: "1px solid #E5E7EB", padding: "10px 16px", display: "flex", gap: 8 }}>
          <button onClick={() => {}} style={{ background: "#E5E7EB", border: "none", borderRadius: 20, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>📁 Archive</button>
          <button onClick={() => {}} style={{ background: "#E5E7EB", border: "none", borderRadius: 20, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>🗑️ Corbeille</button>
        </div>
        <div style={{ background: "#F1F5F9", borderBottom: "1px solid #E5E7EB", padding: "8px 16px 4px", fontSize: 12, color: "#64748B" }}>
          Il se peut que tous vos éléments n'apparaissent pas ici. <span style={{ color: "var(--theme-text)", fontWeight: 600 }}>En savoir plus.</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px 6px", background: "var(--theme-surface)" }}>
          <button onClick={() => selectAll(items.map(i => i.id))} style={{ background: "none", border: "none", color: "var(--bp-primary)", fontSize: 14, fontWeight: 600, cursor: "pointer", padding: 0 }}>Tout sélectionner</button>
          <button onClick={deselectAll} style={{ background: "none", border: "none", color: "var(--bp-primary)", fontSize: 14, fontWeight: 600, cursor: "pointer", padding: 0 }}>Désélectionner</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading && (
            <div style={{ textAlign: "center", padding: 32, color: "#64748B" }}>
              <div style={{ width: 28, height: 28, border: "3px solid #E5E7EB", borderTopColor: "var(--bp-primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />Chargement…
            </div>
          )}
          {!loading && items.length === 0 && (
            <div style={{ textAlign: "center", padding: "32px 16px", color: "#64748B" }}>
              <div style={{ fontSize: 44, marginBottom: 10 }}>📭</div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Aucun élément</div>
            </div>
          )}
          {!loading && Object.entries(groups).map(([date, grpItems]) => (
            <div key={date}>
              <div style={{ padding: "10px 16px 4px", fontSize: 13, fontWeight: 700, color: "var(--theme-text)", background: "#F1F5F9" }}>{date}</div>
              {(grpItems as any[]).map((item: any) => (
                <div key={item.id} style={{ background: "var(--theme-surface)", borderBottom: "1px solid #F1F5F9", padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <button style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px 0 0", color: "#64748B", fontSize: 18, lineHeight: 1 }}>⋮</button>
                  <div style={{ flex: 1, fontSize: 14, color: "var(--theme-text)", lineHeight: 1.45 }}>
                    {renderItem(item)}
                    <div style={{ fontSize: 12, color: "#64748B", display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>🌍 Public</div>
                  </div>
                  <button onClick={() => toggleSelect(item.id)} style={{ width: 22, height: 22, borderRadius: 4, border: `2px solid ${selectedIds.has(item.id) ? "var(--bp-primary)" : "#CBD5E1"}`, background: selectedIds.has(item.id) ? "var(--bp-primary)" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, marginTop: 2 }}>
                    {selectedIds.has(item.id) && <span style={{ color: "#fff", fontSize: 12, fontWeight: 900 }}>✓</span>}
                  </button>
                </div>
              ))}
            </div>
          ))}
          <div style={{ height: 80 }} />
        </div>
        <div style={{ background: "var(--theme-surface)", borderTop: "1px solid #E5E7EB", padding: "10px 16px 20px" }}>
          {bottomBtn}
        </div>
      </div>
    );
  };

  let subContent: React.ReactNode = null;

  if (subPage === "publications") {
    subContent = (
      <ActionableListPage
        title="Vos publications"
        items={posts}
        onBack={() => setSubPage(null)}
        renderItem={(p: Post) => (
          <>
            <span style={{ fontWeight: 700 }}>{userName ?? "Vous"}</span> a partagé une <span style={{ fontWeight: 700 }}>publication</span>.
            {p.content && <div style={{ color: "#64748B", fontSize: 13, marginTop: 2 }}>{p.content.slice(0, 80)}{p.content.length > 80 ? "…" : ""}</div>}
          </>
        )}
        bottomBtn={
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleArchivePosts} disabled={selectedIds.size === 0 || actionLoading} style={{ flex: 1, background: selectedIds.size > 0 ? "#E5E7EB" : "#F1F5F9", border: "none", borderRadius: 8, padding: 13, fontSize: 14, fontWeight: 700, cursor: selectedIds.size > 0 ? "pointer" : "default", color: selectedIds.size > 0 ? "#111827" : "#CBD5E1", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>📁 Archiver</button>
            <button onClick={handleDeletePosts} disabled={selectedIds.size === 0 || actionLoading} style={{ flex: 1, background: selectedIds.size > 0 ? "#FEE2E2" : "#F1F5F9", border: "none", borderRadius: 8, padding: 13, fontSize: 14, fontWeight: 700, cursor: selectedIds.size > 0 ? "pointer" : "default", color: selectedIds.size > 0 ? "#EF4444" : "#CBD5E1", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>🗑️ Supprimer</button>
          </div>
        }
      />
    );
  } else if (subPage === "tags") {
    const tagNotifs = notifs.filter(n => n.type === "mention" || n.type === "tag");
    subContent = (
      <ActionableListPage
        title="Activité dans laquelle vous apparaissez"
        items={tagNotifs}
        onBack={() => setSubPage(null)}
        renderItem={(n: Notif) => (
          <>
            <span style={{ fontWeight: 700 }}>{n.fromUserName ?? "Quelqu'un"}</span> a mentionné votre nom dans un <span style={{ fontWeight: 700 }}>commentaire</span>.
            {n.content && <div style={{ color: "var(--bp-primary)", fontSize: 13, marginTop: 2 }}>{n.content.slice(0, 80)}</div>}
          </>
        )}
        bottomBtn={
          <button onClick={handleDeleteNotifs} disabled={selectedIds.size === 0 || actionLoading} style={{ width: "100%", background: selectedIds.size > 0 ? "#1E293B" : "#F1F5F9", color: selectedIds.size > 0 ? "#fff" : "#CBD5E1", border: "none", borderRadius: 24, padding: 13, fontSize: 14, fontWeight: 700, cursor: selectedIds.size > 0 ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            ✕ Supprimer les tags
          </button>
        }
      />
    );
  } else if (subPage === "interactions") {
    const interactNotifs = notifs.filter(n => n.type === "like" || n.type === "comment" || n.type === "reaction");
    subContent = (
      <ActionableListPage
        title="Interactions"
        items={interactNotifs}
        onBack={() => setSubPage(null)}
        renderItem={(n: Notif) => (
          <>
            <span style={{ fontWeight: 700 }}>{userName ?? "Vous"}</span> aime la <span style={{ fontWeight: 700 }}>photo</span> de <span style={{ fontWeight: 700 }}>{n.fromUserName ?? "quelqu'un"}</span>.
            {n.content && <div style={{ color: "#64748B", fontSize: 13, marginTop: 2 }}>{n.content.slice(0, 80)}</div>}
          </>
        )}
        bottomBtn={
          <button onClick={handleDeleteNotifs} disabled={selectedIds.size === 0 || actionLoading} style={{ width: "100%", background: selectedIds.size > 0 ? "#1E293B" : "#F1F5F9", color: selectedIds.size > 0 ? "#fff" : "#CBD5E1", border: "none", borderRadius: 24, padding: 13, fontSize: 14, fontWeight: 700, cursor: selectedIds.size > 0 ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            ✕ Supprimer
          </button>
        }
      />
    );
  } else if (subPage === "groups" || subPage === "profile_info" || subPage === "contacts") {
    const labels: Record<string, string> = { groups: "Groupes, évènements et reels", profile_info: "Informations de profil", contacts: "Contacts" };
    subContent = (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <ModeBar />
        <SubHeader title={labels[subPage]} onBack={() => setSubPage(null)} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", gap: 12, color: "#64748B" }}>
          <div style={{ fontSize: 52 }}>{subPage === "groups" ? "👥" : subPage === "profile_info" ? "👤" : "📇"}</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "var(--theme-text)" }}>{labels[subPage]}</div>
          <div style={{ fontSize: 14, textAlign: "center", lineHeight: 1.5 }}>
            {subPage === "groups" && "Votre activité dans les groupes, évènements et reels apparaîtra ici."}
            {subPage === "profile_info" && "Vos informations de profil (téléphone, e-mail, etc.) apparaîtront ici."}
            {subPage === "contacts" && "Vos ami(e)s et connexions apparaîtront ici."}
          </div>
        </div>
      </div>
    );
  }

  const mainContent = (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "#F1F5F9", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {subPage ? (
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {subContent}
        </div>
      ) : (
        <>
          <ModeBar />
          <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", background: "var(--theme-surface)", borderBottom: "1px solid #E5E7EB" }}>
            <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--theme-text)", padding: "0 12px 0 0", lineHeight: 1 }}>‹</button>
            <span style={{ flex: 1, textAlign: "center", fontWeight: 700, fontSize: 16 }}>Historique d'activité</span>
            <div style={{ width: 32 }} />
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            <div style={{ background: "var(--theme-surface)", padding: "14px 16px", borderBottom: "1px solid #E5E7EB", fontSize: 13, color: "#64748B", lineHeight: 1.5 }}>
              Gérez votre activité et les éléments que vous avez partagés. Les éléments supprimés restent dans la corbeille et sont supprimés automatiquement après 30 jours.
            </div>
            <div style={{ padding: "10px 16px", display: "flex", gap: 8 }}>
              <button style={{ background: "#E5E7EB", border: "none", borderRadius: 20, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>📁 Archive</button>
              <button style={{ background: "#E5E7EB", border: "none", borderRadius: 20, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>🗑️ Corbeille</button>
            </div>
            <div style={{ background: "var(--theme-surface)" }}>
              {SECTIONS.map((section, i) => (
                <div key={section.label} style={{ borderBottom: "1px solid #F1F5F9" }}>
                  <button
                    onClick={() => setExpanded(expanded === section.id ? null : section.id)}
                    style={{ width: "100%", background: "none", border: "none", padding: "14px 16px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", textAlign: "left" }}
                  >
                    <span style={{ fontSize: 20, width: 24, textAlign: "center", flexShrink: 0 }}>{section.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "var(--theme-text)" }}>{section.label}</div>
                      <div style={{ fontSize: 12, color: "#64748B", marginTop: 2, lineHeight: 1.4 }}>{section.desc}</div>
                    </div>
                    <span style={{ color: "#64748B", fontSize: 16, transform: expanded === section.id ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>∨</span>
                  </button>
                  {expanded === section.id && section.btnLabel && (
                    <div style={{ padding: "0 16px 14px 54px" }}>
                      <button
                        onClick={() => section.id && setSubPage(section.id)}
                        style={{ width: "100%", background: "#F1F5F9", border: "none", borderRadius: 8, padding: "11px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer", color: "var(--theme-text)" }}
                      >
                        {section.btnLabel}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ height: 32 }} />
          </div>
        </>
      )}

      {toast && (
        <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.82)", color: "#fff", borderRadius: 20, padding: "10px 20px", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", zIndex: 20 }}>
          {toast}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return createPortal(mainContent, document.body);
}
