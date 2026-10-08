import { useState } from "react";
import { createPortal } from "react-dom";
import { apiFetch } from "../lib/api";

interface Props {
  onClose: () => void;
  onDeactivated: () => void;
}

type Step = "info" | "confirm" | "success";

const CHANGES = [
  { icon: "📈", text: "Vos statistiques existantes ne seront plus disponibles." },
  { icon: "📊", text: "Vous n'aurez plus accès à votre tableau de bord ni à aucun outil du mode pro." },
  { icon: "👥", text: "Votre paramètre Qui peut me suivre sera défini sur Ami(e)s afin que seul(e)s vos ami(e)s puissent vous suivre." },
  { icon: "✅", text: "Vous perdrez tous les followers qui ne sont pas vos ami(e)s. Vous pourrez récupérer vos followers en réactivant le mode professionnel." },
];

export default function DeactivateProModal({ onClose, onDeactivated }: Props) {
  const [step, setStep] = useState<Step>("info");
  const [loading, setLoading] = useState(false);

  const handleDeactivate = async () => {
    setLoading(true);
    try {
      await apiFetch("/users/me/pro", { method: "DELETE" });
    } catch {
      // Even if API fails, deactivate locally
    } finally {
      localStorage.removeItem("bp_pro_mode");
      onDeactivated();
      setStep("success");
      setLoading(false);
    }
  };

  const ModeBar = () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px 8px", background: "var(--theme-surface)", borderBottom: "1px solid #E5E7EB" }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--theme-text)", display: "flex", alignItems: "center", gap: 4 }}>
        Mode payant <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, borderRadius: "50%", background: "#64748B", color: "#fff", fontSize: 10, fontWeight: 700 }}>?</span>
      </span>
      <button style={{ background: "#E5E7EB", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Changer de mode</button>
    </div>
  );

  const content = (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "var(--theme-surface)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <ModeBar />
      <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", background: "var(--theme-surface)", borderBottom: "1px solid #E5E7EB" }}>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--theme-text)", padding: "0 12px 0 0", lineHeight: 1 }}>‹</button>
        <span style={{ flex: 1, textAlign: "center", fontWeight: 700, fontSize: 16 }}>Mode professionnel</span>
        <div style={{ width: 32 }} />
      </div>

      {step === "info" && (
        <>
          <div style={{ flex: 1, overflowY: "auto", padding: "28px 20px 0" }}>
            <h2 style={{ textAlign: "center", fontWeight: 900, fontSize: 24, margin: "0 0 12px", lineHeight: 1.2 }}>
              Si vous désactivez le mode professionnel
            </h2>
            <p style={{ textAlign: "center", fontSize: 14, color: "#64748B", margin: "0 0 28px", lineHeight: 1.5 }}>
              Découvrez ce qui change et ce qui ne change pas si vous désactivez le mode professionnel.
            </p>
            <h3 style={{ fontWeight: 800, fontSize: 16, margin: "0 0 16px" }}>Ce qui change</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {CHANGES.map((c, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{c.icon}</div>
                  <p style={{ margin: 0, fontSize: 14, color: "var(--theme-text)", lineHeight: 1.5 }}>{c.text}</p>
                </div>
              ))}
            </div>
            <div style={{ height: 100 }} />
          </div>
          <div style={{ background: "var(--theme-surface)", borderTop: "1px solid #E5E7EB", padding: "10px 16px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={() => setStep("confirm")} style={{ width: "100%", background: "var(--bp-primary)", color: "#fff", border: "none", borderRadius: 8, padding: "14px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
              Désactiver
            </button>
            <button onClick={onClose} style={{ width: "100%", background: "none", border: "none", padding: "12px", fontSize: 15, fontWeight: 600, cursor: "pointer", color: "var(--theme-text)" }}>
              Retour
            </button>
          </div>
        </>
      )}

      {step === "confirm" && (
        <>
          <div style={{ flex: 1, overflowY: "auto", padding: "40px 24px 0", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <h2 style={{ textAlign: "center", fontWeight: 900, fontSize: 24, margin: "0 0 16px", lineHeight: 1.2 }}>
              Désactiver le mode professionnel
            </h2>
            <p style={{ textAlign: "center", fontSize: 14, color: "#64748B", margin: 0, lineHeight: 1.6 }}>
              Avant de désactiver le mode professionnel, consultez les changements importants que cela entraînera. Si vous changez d'avis, vous pouvez activer le mode professionnel à tout moment.
            </p>
          </div>
          <div style={{ background: "var(--theme-surface)", borderTop: "1px solid #E5E7EB", padding: "10px 16px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              onClick={handleDeactivate}
              disabled={loading}
              style={{ width: "100%", background: loading ? "#CBD5E1" : "var(--bp-primary)", color: "#fff", border: "none", borderRadius: 8, padding: "14px", fontSize: 15, fontWeight: 700, cursor: loading ? "default" : "pointer" }}
            >
              {loading ? "Désactivation…" : "Continuer"}
            </button>
            <button onClick={onClose} style={{ width: "100%", background: "#F1F5F9", border: "none", borderRadius: 8, padding: "14px", fontSize: 15, fontWeight: 600, cursor: "pointer", color: "var(--theme-text)" }}>
              Fermer
            </button>
          </div>
        </>
      )}

      {step === "success" && (
        <>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
            <div style={{ fontSize: 56, marginBottom: 20 }}>✅</div>
            <h2 style={{ textAlign: "center", fontWeight: 900, fontSize: 22, margin: "0 0 14px", lineHeight: 1.2 }}>
              Mode professionnel désactivé avec succès
            </h2>
            <p style={{ textAlign: "center", fontSize: 14, color: "#64748B", margin: 0, lineHeight: 1.6 }}>
              Le mode professionnel a été désactivé. Donnez-nous votre avis pour nous aider à améliorer votre expérience en mode professionnel.
            </p>
          </div>
          <div style={{ background: "var(--theme-surface)", borderTop: "1px solid #E5E7EB", padding: "10px 16px 24px" }}>
            <button onClick={onClose} style={{ width: "100%", background: "#F1F5F9", border: "none", borderRadius: 8, padding: "14px", fontSize: 15, fontWeight: 700, cursor: "pointer", color: "var(--theme-text)" }}>
              Fermer
            </button>
          </div>
        </>
      )}
    </div>
  );

  return createPortal(content, document.body);
}
