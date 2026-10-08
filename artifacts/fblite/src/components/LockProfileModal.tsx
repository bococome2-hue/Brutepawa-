import { useState } from "react";
import { createPortal } from "react-dom";
import { apiToggleProfileLock } from "../lib/api";

interface Props {
  onClose: () => void;
  currentlyLocked: boolean;
  onToggle: (locked: boolean) => void;
}

export default function LockProfileModal({ onClose, currentlyLocked, onToggle }: Props) {
  const [locked, setLocked] = useState(currentlyLocked);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiToggleProfileLock(locked);
      localStorage.setItem("bp_profile_locked", locked ? "1" : "0");
      onToggle(locked);
      setDone(true);
      setTimeout(onClose, 1800);
    } catch {
      setError("Une erreur est survenue. Réessayez.");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <>
      <style>{`@keyframes slideUpLock{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
      <div
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", zIndex: 9100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          style={{ background: "var(--theme-surface)", borderRadius: "28px 28px 0 0", width: "100%", maxWidth: 600, padding: "0 0 40px", animation: "slideUpLock 0.3s cubic-bezier(0.32,0.72,0,1)", boxShadow: "0 -8px 48px rgba(0,0,0,0.2)" }}
          onClick={e => e.stopPropagation()}
        >
          {/* Handle */}
          <div style={{ display: "flex", justifyContent: "center", padding: "14px 0 0" }}>
            <div style={{ width: 44, height: 5, background: "#E5E7EB", borderRadius: 99 }} />
          </div>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 22px 14px" }}>
            <div style={{ width: 54, height: 54, borderRadius: "50%", background: locked ? "linear-gradient(135deg,#DCFCE7,#BBF7D0)" : "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.3s", boxShadow: locked ? "0 4px 16px rgba(34,197,94,0.2)" : "none" }}>
              {locked ? (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="11" width="18" height="11" rx="3" fill="var(--bp-primary)" opacity="0.15"/>
                  <rect x="3" y="11" width="18" height="11" rx="3" stroke="var(--bp-primary)" strokeWidth="2"/>
                  <path d="M7 11V7a5 5 0 0110 0v4" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="12" cy="16.5" r="1.5" fill="var(--bp-primary)"/>
                </svg>
              ) : (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="11" width="18" height="11" rx="3" stroke="#9CA3AF" strokeWidth="2"/>
                  <path d="M7 11V7a5 5 0 019.9-1" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="12" cy="16.5" r="1.5" fill="#9CA3AF"/>
                </svg>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 18, color: "var(--theme-text)" }}>Verrouiller le profil</div>
              <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>Contrôlez qui peut voir votre contenu</div>
            </div>
            <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: "50%", background: "#F1F5F9", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div style={{ padding: "0 18px" }}>
            {done ? (
              <div style={{ textAlign: "center", padding: "28px 0 8px" }}>
                <div style={{ width: 72, height: 72, borderRadius: "50%", background: locked ? "linear-gradient(135deg,#DCFCE7,#BBF7D0)" : "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: locked ? "0 8px 32px rgba(34,197,94,0.25)" : "none" }}>
                  {locked
                    ? <svg width="34" height="34" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="3" fill="var(--bp-primary)" opacity="0.2"/><rect x="3" y="11" width="18" height="11" rx="3" stroke="var(--bp-primary)" strokeWidth="2"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="16.5" r="1.5" fill="var(--bp-primary)"/></svg>
                    : <svg width="34" height="34" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="3" stroke="#64748B" strokeWidth="2"/><path d="M7 11V7a5 5 0 019.9-1" stroke="#64748B" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="16.5" r="1.5" fill="#64748B"/></svg>
                  }
                </div>
                <div style={{ fontWeight: 800, fontSize: 18, color: "var(--theme-text)", marginBottom: 8 }}>
                  {locked ? "Profil verrouillé !" : "Profil déverrouillé !"}
                </div>
                <div style={{ fontSize: 14, color: "#64748B", lineHeight: 1.6 }}>
                  {locked ? "Seuls vos amis peuvent voir vos photos et publications." : "Votre profil est maintenant accessible à tous."}
                </div>
              </div>
            ) : (
              <>
                {/* Benefits cards */}
                <div style={{ background: "#F8FAFC", borderRadius: 18, overflow: "hidden", marginBottom: 16 }}>
                  {[
                    { icon: "📷", text: "Photo de profil et couverture non téléchargeables" },
                    { icon: "📝", text: "Publications visibles uniquement par vos amis" },
                    { icon: "👥", text: "Les non-amis voient un profil limité" },
                    { icon: "🔍", text: "Vos infos personnelles sont masquées aux inconnus" },
                  ].map((item, i, arr) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px", borderBottom: i < arr.length - 1 ? "1px solid #F1F5F9" : "none" }}>
                      <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
                      <span style={{ fontSize: 13.5, color: "#64748B", lineHeight: 1.5 }}>{item.text}</span>
                    </div>
                  ))}
                </div>

                {/* Toggle row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: locked ? "#F0FDF4" : "#F8FAFC", borderRadius: 16, marginBottom: 20, border: locked ? "1.5px solid #DCFCE7" : "1.5px solid #F1F5F9", transition: "all 0.25s" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: locked ? "var(--bp-primary-dark)" : "#64748B" }}>
                      {locked ? "Profil verrouillé" : "Profil non verrouillé"}
                    </div>
                    <div style={{ fontSize: 12.5, color: locked ? "var(--bp-primary)" : "#9CA3AF", marginTop: 2 }}>
                      {locked ? "Restriction active" : "Cliquer pour activer"}
                    </div>
                  </div>
                  <button
                    onClick={() => setLocked(l => !l)}
                    style={{
                      width: 54, height: 30, borderRadius: 15, border: "none", cursor: "pointer",
                      background: locked ? "var(--bp-primary)" : "#E5E7EB",
                      position: "relative", transition: "background 0.25s",
                      boxShadow: locked ? "0 2px 8px rgba(34,197,94,0.35)" : "none",
                      flexShrink: 0,
                    }}
                    aria-label="Toggle lock"
                  >
                    <div style={{
                      width: 24, height: 24, borderRadius: "50%", background: "var(--theme-surface)",
                      position: "absolute", top: 3, transition: "left 0.25s cubic-bezier(0.4,0,0.2,1)",
                      left: locked ? 27 : 3,
                      boxShadow: "0 2px 6px rgba(0,0,0,0.22)",
                    }} />
                  </button>
                </div>

                {error && (
                  <div style={{ marginBottom: 14, padding: "10px 14px", background: "#FEE2E2", border: "1px solid #FCA5A5", borderRadius: 12, fontSize: 13, color: "#EF4444", fontWeight: 600 }}>
                    {error}
                  </div>
                )}

                {/* Buttons */}
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={onClose}
                    style={{ flex: 1, background: "#F1F5F9", border: "none", borderRadius: 14, padding: 14, fontWeight: 700, fontSize: 15, cursor: "pointer", color: "#64748B", transition: "background 0.15s" }}
                    onPointerDown={e => (e.currentTarget.style.background = "#E5E7EB")}
                    onPointerUp={e => (e.currentTarget.style.background = "#F1F5F9")}
                    onPointerLeave={e => (e.currentTarget.style.background = "#F1F5F9")}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={save}
                    disabled={saving || locked === currentlyLocked}
                    style={{
                      flex: 1.8,
                      background: locked === currentlyLocked ? "#E5E7EB" : "linear-gradient(135deg, var(--bp-primary), var(--bp-primary-dark))",
                      color: locked === currentlyLocked ? "#9CA3AF" : "#fff",
                      border: "none", borderRadius: 14, padding: 14,
                      fontWeight: 700, fontSize: 15,
                      cursor: locked === currentlyLocked ? "not-allowed" : "pointer",
                      boxShadow: locked === currentlyLocked ? "none" : "0 4px 16px rgba(34,197,94,0.35)",
                      transition: "all 0.2s",
                    }}
                  >
                    {saving ? (
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                        <span style={{ width: 16, height: 16, border: "2.5px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                        Enregistrement…
                      </span>
                    ) : "Confirmer"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
