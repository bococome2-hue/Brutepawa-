import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { apiFetch } from "../lib/api";

interface Props {
  onClose: () => void;
}

interface ArchivedItem {
  id: number;
  type: "post" | "live" | "story";
  summary: string;
  archivedAt: string;
  authorName: string;
}

type FilterTab = "posts" | "stories" | "trash";

function relDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function groupByDate(items: ArchivedItem[]): Record<string, ArchivedItem[]> {
  const groups: Record<string, ArchivedItem[]> = {};
  for (const item of items) {
    const key = relDate(item.archivedAt);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}

export default function ArchiveModal({ onClose }: Props) {
  const [tab, setTab] = useState<FilterTab>("posts");
  const [items, setItems] = useState<ArchivedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [showWelcome, setShowWelcome] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiFetch("/posts/archived")
      .then(r => r.ok ? r.json() : [])
      .then((data: ArchivedItem[]) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(items.map(i => i.id)));
  const deselectAll = () => setSelected(new Set());

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const handleRestore = async () => {
    if (selected.size === 0) return;
    setActionLoading(true);
    try {
      await apiFetch("/posts/archived/restore", { method: "POST", body: JSON.stringify({ ids: [...selected] }) });
      setItems(prev => prev.filter(i => !selected.has(i.id)));
      setSelected(new Set());
      showToast(`${selected.size} élément(s) restauré(s)`);
    } catch { showToast("Erreur lors de la restauration"); }
    finally { setActionLoading(false); }
  };

  const handleDelete = async () => {
    if (selected.size === 0) return;
    setActionLoading(true);
    try {
      await apiFetch("/posts/archived/delete", { method: "POST", body: JSON.stringify({ ids: [...selected] }) });
      setItems(prev => prev.filter(i => !selected.has(i.id)));
      setSelected(new Set());
      showToast(`${selected.size} élément(s) supprimé(s)`);
    } catch { showToast("Erreur lors de la suppression"); }
    finally { setActionLoading(false); }
  };

  const groups = groupByDate(items);

  const content = (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "#F1F5F9", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Mode bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px 8px", background: "var(--theme-surface)", borderBottom: "1px solid #E5E7EB" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--theme-text)", display: "flex", alignItems: "center", gap: 4 }}>
          Mode payant
          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, borderRadius: "50%", background: "#64748B", color: "#fff", fontSize: 10, fontWeight: 700 }}>?</span>
        </span>
        <button style={{ background: "#E5E7EB", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Changer de mode</button>
      </div>
      {/* Title bar */}
      <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", background: "var(--theme-surface)", borderBottom: "1px solid #E5E7EB" }}>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--theme-text)", padding: "0 12px 0 0", lineHeight: 1 }}>‹</button>
        <span style={{ flex: 1, textAlign: "center", fontWeight: 700, fontSize: 16 }}>Archive</span>
        <div style={{ width: 32 }} />
      </div>

      {/* Filter chips + filtres button */}
      <div style={{ background: "var(--theme-surface)", borderBottom: "1px solid #E5E7EB", padding: "10px 16px", display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={() => setTab("stories")}
          style={{ background: tab === "stories" ? "var(--bp-primary)" : "#E5E7EB", color: tab === "stories" ? "#fff" : "#111827", border: "none", borderRadius: 20, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
        >
          🔄 Archive stories
        </button>
        <button
          onClick={() => setTab("trash")}
          style={{ background: tab === "trash" ? "var(--bp-primary)" : "#E5E7EB", color: tab === "trash" ? "#fff" : "#111827", border: "none", borderRadius: 20, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
        >
          🗑️ Corbeille
        </button>
        <button
          onClick={() => setShowFilters(f => !f)}
          style={{ background: "#E5E7EB", border: "none", borderRadius: 20, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
        >
          ≡ Filtres
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* Welcome info card */}
        {showWelcome && (
          <div style={{ background: "var(--theme-surface)", margin: "12px 12px 0", borderRadius: 12, padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start", border: "1px solid #E5E7EB" }}>
            <span style={{ fontSize: 24, flexShrink: 0 }}>🅱️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Bienvenue dans l'archive</div>
              <div style={{ fontSize: 13, color: "#64748B", lineHeight: 1.5 }}>
                Déplacer les publications, photos ou autres éléments dans votre archive vous permet d'enregistrer ceux que vous ne voulez plus montrer sur votre profil. Les éléments de votre archive ne sont visibles que par vous. Vous pouvez les restaurer sur votre profil à tout moment ou les déplacer dans la corbeille, où ils seront stockés pendant 30 jours avant d'être supprimés.
              </div>
            </div>
            <button onClick={() => setShowWelcome(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#64748B", flexShrink: 0, padding: 0, lineHeight: 1 }}>✕</button>
          </div>
        )}

        {/* Select all / deselect */}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 16px 6px" }}>
          <button onClick={selectAll} style={{ background: "none", border: "none", color: "var(--bp-primary)", fontSize: 14, fontWeight: 600, cursor: "pointer", padding: 0 }}>Tout sélectionner</button>
          <button onClick={deselectAll} style={{ background: "none", border: "none", color: "var(--bp-primary)", fontSize: 14, fontWeight: 600, cursor: "pointer", padding: 0 }}>Désélectionner</button>
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: 32, color: "#64748B" }}>
            <div style={{ width: 28, height: 28, border: "3px solid #E5E7EB", borderTopColor: "var(--bp-primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
            Chargement…
          </div>
        )}

        {!loading && items.length === 0 && (
          <div style={{ textAlign: "center", padding: "32px 16px", color: "#64748B" }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>🗄️</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Aucun élément archivé</div>
            <div style={{ fontSize: 13 }}>Vos éléments archivés apparaîtront ici.</div>
          </div>
        )}

        {!loading && Object.entries(groups).map(([date, dateItems]) => (
          <div key={date}>
            <div style={{ padding: "12px 16px 6px", fontSize: 14, fontWeight: 700, color: "var(--theme-text)" }}>{date}</div>
            {dateItems.map(item => (
              <div key={item.id} style={{ background: "var(--theme-surface)", margin: "0 0 1px", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                <button style={{ background: "none", border: "none", cursor: "pointer", padding: "0 4px 0 0", color: "#64748B", fontSize: 20, lineHeight: 1 }}>⋮</button>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: "var(--theme-text)", lineHeight: 1.4 }}>
                    <span style={{ fontWeight: 700 }}>{item.authorName}</span> {item.summary}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748B", display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
                    <span>📁</span> Archivé le {relDate(item.archivedAt)}
                  </div>
                </div>
                <button
                  onClick={() => toggleSelect(item.id)}
                  style={{ width: 22, height: 22, borderRadius: 4, border: `2px solid ${selected.has(item.id) ? "var(--bp-primary)" : "#CBD5E1"}`, background: selected.has(item.id) ? "var(--bp-primary)" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
                >
                  {selected.has(item.id) && <span style={{ color: "#fff", fontSize: 12, fontWeight: 900 }}>✓</span>}
                </button>
              </div>
            ))}
            <button style={{ width: "100%", background: "none", border: "none", color: "var(--bp-primary)", fontSize: 14, fontWeight: 600, padding: "10px 16px", cursor: "pointer", textAlign: "left" }}>Suivant</button>
          </div>
        ))}
        <div style={{ height: 80 }} />
      </div>

      {/* Bottom action buttons */}
      <div style={{ background: "var(--theme-surface)", borderTop: "1px solid #E5E7EB", padding: "10px 16px 20px", display: "flex", gap: 10 }}>
        <button
          onClick={handleRestore}
          disabled={selected.size === 0 || actionLoading}
          style={{ flex: 1, background: selected.size > 0 ? "#E5E7EB" : "#F1F5F9", border: "none", borderRadius: 8, padding: "13px", fontSize: 15, fontWeight: 700, cursor: selected.size > 0 ? "pointer" : "default", color: selected.size > 0 ? "#111827" : "#CBD5E1", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          🔄 Restaurer
        </button>
        <button
          onClick={handleDelete}
          disabled={selected.size === 0 || actionLoading}
          style={{ flex: 1, background: selected.size > 0 ? "#FEE2E2" : "#F1F5F9", border: "none", borderRadius: 8, padding: "13px", fontSize: 15, fontWeight: 700, cursor: selected.size > 0 ? "pointer" : "default", color: selected.size > 0 ? "#EF4444" : "#CBD5E1", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          🗑️ Supprimer
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: "absolute", bottom: 90, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.82)", color: "#fff", borderRadius: 20, padding: "10px 20px", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", zIndex: 20 }}>
          {toast}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return createPortal(content, document.body);
}
