import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { apiFetch } from "../lib/api";

interface Props { onClose: () => void; userId?: number; }
interface PhotoItem { id: number; imageUrl: string; createdAt: string; }

function relAge(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins} min`;
  if (hours < 24) return `${hours} h`;
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

type Step = "select" | "configure";

export default function FeaturedContentModal({ onClose, userId }: Props) {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [step, setStep] = useState<Step>("select");
  const [coverId, setCoverId] = useState<number | null>(null);
  const [title, setTitle] = useState("Collection");
  const [showDiscard, setShowDiscard] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    apiFetch(`/posts?authorId=${userId}`)
      .then(r => r.ok ? r.json() : [])
      .then((data: any[]) => setPhotos((Array.isArray(data) ? data : []).filter((p: any) => p.imageUrl).map((p: any) => ({ id: p.id, imageUrl: p.imageUrl, createdAt: p.createdAt }))))
      .catch(() => setPhotos([]))
      .finally(() => setLoading(false));
  }, [userId]);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const handleBack = () => {
    if (step === "configure" || selectedIds.size > 0) { setShowDiscard(true); }
    else { onClose(); }
  };

  const handleDiscard = () => { setShowDiscard(false); if (step === "configure") { setStep("select"); } else { onClose(); } };

  const handleNext = () => {
    if (selectedIds.size === 0) return;
    const firstSelected = photos.find(p => selectedIds.has(p.id));
    if (firstSelected) setCoverId(firstSelected.id);
    setStep("configure");
  };

  const handleSave = () => { setSaved(true); setTimeout(() => onClose(), 1800); };

  const selectedPhotos = photos.filter(p => selectedIds.has(p.id));
  const coverPhoto = photos.find(p => p.id === coverId);

  const ModeBar = () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px 8px", background: "var(--theme-surface)", borderBottom: "1px solid #E5E7EB" }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--theme-text)", display: "flex", alignItems: "center", gap: 4 }}>
        Mode payant <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, borderRadius: "50%", background: "#64748B", color: "#fff", fontSize: 10, fontWeight: 700 }}>?</span>
      </span>
      <button style={{ background: "#E5E7EB", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Changer de mode</button>
    </div>
  );

  const content = (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "#F1F5F9", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <ModeBar />
      <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", background: "var(--theme-surface)", borderBottom: "1px solid #E5E7EB" }}>
        <button onClick={handleBack} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--theme-text)", padding: "0 12px 0 0", lineHeight: 1 }}>‹</button>
        <span style={{ flex: 1, textAlign: "center", fontWeight: 700, fontSize: 16 }}>Ajouter au contenu À la une</span>
        <div style={{ width: 32 }} />
      </div>

      {step === "select" && (
        <>
          <div style={{ flex: 1, overflowY: "auto", background: "var(--theme-surface)" }}>
            <div style={{ padding: "16px 16px 8px", borderBottom: "1px solid #F1F5F9" }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Stories</div>
              <div style={{ fontSize: 13, color: "#64748B" }}>Ceci inclut toutes les stories actives et votre archive stories.</div>
            </div>
            <div style={{ padding: "16px 16px 8px" }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Photos importées</div>
              {loading && (
                <div style={{ textAlign: "center", padding: 24, color: "#64748B" }}>
                  <div style={{ width: 28, height: 28, border: "3px solid #E5E7EB", borderTopColor: "var(--bp-primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 10px" }} />Chargement…
                </div>
              )}
              {!loading && photos.length === 0 && (
                <div style={{ textAlign: "center", padding: "20px 0", color: "#64748B", fontSize: 14 }}>Aucune photo disponible</div>
              )}
              {!loading && photos.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 3 }}>
                  {photos.map(p => {
                    const sel = selectedIds.has(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => toggleSelect(p.id)}
                        style={{ position: "relative", aspectRatio: "1", border: `3px solid ${sel ? "var(--bp-primary)" : "transparent"}`, borderRadius: 4, overflow: "hidden", cursor: "pointer", padding: 0, background: "#E5E7EB" }}
                      >
                        <img src={p.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        <div style={{ position: "absolute", top: 4, left: 4, background: "rgba(0,0,0,0.55)", borderRadius: 4, padding: "2px 6px", fontSize: 11, color: "#fff", fontWeight: 600 }}>{relAge(p.createdAt)}</div>
                        {sel && (
                          <div style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", background: "var(--bp-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ color: "#fff", fontSize: 12, fontWeight: 900 }}>✓</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div style={{ padding: "16px 16px 8px", borderTop: "1px solid #F1F5F9" }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Photos identifiées</div>
              <div style={{ fontSize: 13, color: "#64748B", padding: "8px 0 16px" }}>Aucune photo identifiée disponible.</div>
            </div>
            <div style={{ height: 80 }} />
          </div>
          <div style={{ background: "var(--theme-surface)", borderTop: "1px solid #E5E7EB", padding: "10px 16px 20px" }}>
            <button
              onClick={handleNext}
              style={{ width: "100%", background: selectedIds.size > 0 ? "var(--bp-primary)" : "#E5E7EB", color: selectedIds.size > 0 ? "#fff" : "#CBD5E1", border: "none", borderRadius: 8, padding: "14px", fontSize: 15, fontWeight: 700, cursor: selectedIds.size > 0 ? "pointer" : "default" }}
            >
              Suivant
            </button>
          </div>
        </>
      )}

      {step === "configure" && (
        <>
          <div style={{ flex: 1, overflowY: "auto", background: "var(--theme-surface)" }}>
            <div style={{ padding: "10px 16px", fontSize: 13, color: "#64748B", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", gap: 6 }}>
              À la une est configurée sur <span style={{ fontWeight: 700, color: "var(--theme-text)", display: "flex", alignItems: "center", gap: 4 }}>🌍 Public</span>
            </div>
            <div style={{ padding: "20px 16px 12px", textAlign: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Couverture</div>
              <div style={{ position: "relative", width: 140, height: 180, margin: "0 auto", borderRadius: 8, overflow: "hidden", background: "#E5E7EB" }}>
                {coverPhoto && <img src={coverPhoto.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                <div style={{ position: "absolute", bottom: 8, right: 8, width: 32, height: 32, borderRadius: "50%", background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📷</div>
                {coverPhoto && <div style={{ position: "absolute", top: 6, left: 6, background: "rgba(0,0,0,0.55)", borderRadius: 4, padding: "2px 6px", fontSize: 11, color: "#fff", fontWeight: 600 }}>{relAge(coverPhoto.createdAt)}</div>}
              </div>
            </div>
            <div style={{ padding: "4px 16px 16px", textAlign: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Titre</div>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                style={{ width: "100%", border: "1.5px solid #E5E7EB", borderRadius: 8, padding: "10px 14px", fontSize: 14, textAlign: "center", boxSizing: "border-box", outline: "none" }}
              />
            </div>
            <div style={{ padding: "0 16px 16px" }}>
              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
                <button style={{ flexShrink: 0, width: 80, height: 80, borderRadius: 8, background: "#F1F5F9", border: "2px dashed #CBD5E1", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, fontSize: 12, color: "#64748B", fontWeight: 600 }}>
                  <span style={{ fontSize: 24 }}>⊕</span>Ajouter
                </button>
                {selectedPhotos.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setCoverId(p.id)}
                    style={{ flexShrink: 0, position: "relative", width: 80, height: 80, borderRadius: 8, overflow: "hidden", border: `3px solid ${coverId === p.id ? "var(--bp-primary)" : "transparent"}`, cursor: "pointer", padding: 0, background: "#E5E7EB" }}
                  >
                    <img src={p.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    <div style={{ position: "absolute", top: 4, left: 4, background: "rgba(0,0,0,0.55)", borderRadius: 3, padding: "1px 5px", fontSize: 10, color: "#fff", fontWeight: 600 }}>{relAge(p.createdAt)}</div>
                    {coverId === p.id && (
                      <div style={{ position: "absolute", top: 3, right: 3, width: 18, height: 18, borderRadius: "50%", background: "var(--bp-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ color: "#fff", fontSize: 10, fontWeight: 900 }}>✓</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ height: 80 }} />
          </div>
          <div style={{ background: "var(--theme-surface)", borderTop: "1px solid #E5E7EB", padding: "10px 16px 20px" }}>
            <button onClick={handleSave} style={{ width: "100%", background: "var(--bp-primary)", color: "#fff", border: "none", borderRadius: 8, padding: "14px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
              Enregistrer
            </button>
          </div>
        </>
      )}

      {/* Discard dialog */}
      {showDiscard && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--theme-surface)", borderRadius: 16, padding: "24px 20px", margin: "0 24px", width: "100%", maxWidth: 360 }}>
            <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 10 }}>Abandonner les modifications&nbsp;?</div>
            <div style={{ fontSize: 14, color: "#64748B", marginBottom: 20 }}>Les modifications apportées ne seront pas enregistrées.</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowDiscard(false)} style={{ flex: 1, background: "#E5E7EB", border: "none", borderRadius: 8, padding: "12px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Annuler</button>
              <button onClick={handleDiscard} style={{ flex: 1, background: "var(--bp-primary)", color: "#fff", border: "none", borderRadius: 8, padding: "12px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Abandonner</button>
            </div>
          </div>
        </div>
      )}

      {/* Saved confirmation */}
      {saved && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--theme-surface)", borderRadius: 16, padding: "32px 24px", margin: "0 24px", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <div style={{ fontWeight: 800, fontSize: 17 }}>Contenu à la une enregistré&nbsp;!</div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return createPortal(content, document.body);
}
