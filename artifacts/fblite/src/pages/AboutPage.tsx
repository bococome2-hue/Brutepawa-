import { useNavigate } from "../router";
import {
  ArrowLeft, BadgeCheck, FileText, ShieldCheck, Code2, Headphones, Trash2,
  ChevronRight, Globe, Instagram, Facebook, Twitter, Youtube,
} from "lucide-react";

const C = {
  bg: "#F7F8FA",
  card: "#FFFFFF",
  primary: "var(--bp-primary)",
  text: "#111827",
  secondary: "#64748B",
  muted: "#9CA3AF",
  border: "#EEF0F3",
  red: "#EF4444",
  shadow: "0 1px 10px rgba(15,23,42,0.05)",
};

function OptionRow({
  icon, title, subtitle, danger = false, last = false, onClick,
}: {
  icon: React.ReactNode; title: string; subtitle: React.ReactNode;
  danger?: boolean; last?: boolean; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 14, padding: "16px 18px",
        background: danger ? "#FEF2F2" : "none", border: "none", cursor: "pointer",
        width: "100%", textAlign: "left",
        borderBottom: last ? "none" : `1px solid ${C.border}`,
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
        background: danger ? "#FEE2E2" : "#EAF9F0",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14.5, color: danger ? C.red : C.text, marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 12.5, color: C.secondary, lineHeight: 1.45 }}>{subtitle}</div>
      </div>
      <ChevronRight size={18} color={danger ? C.red : "#CBD5E1"} strokeWidth={2.2} style={{ flexShrink: 0 }} />
    </button>
  );
}

export default function AboutPage() {
  const navigate = useNavigate();
  return (
    <div style={{ background: C.bg, minHeight: "100dvh", fontFamily: "Inter,-apple-system,BlinkMacSystemFont,sans-serif", paddingBottom: 24, zoom: 0.8 }}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: `1px solid ${C.border}`, height: 56, display: "flex", alignItems: "center", padding: "0 6px", position: "sticky", top: 0, zIndex: 30 }}>
        <button aria-label="Retour" onClick={() => navigate("/settings/messaging/advanced")} style={{ width: 44, height: 44, borderRadius: "50%", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ArrowLeft size={22} color={C.text} strokeWidth={2} />
        </button>
        <h1 style={{ flex: 1, fontWeight: 700, fontSize: 17, color: C.text, margin: 0, textAlign: "center", letterSpacing: "-0.3px" }}>À propos</h1>
        <div style={{ width: 44 }} />
      </div>

      {/* Hero */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "34px 24px 8px", textAlign: "center", position: "relative" }}>
        {/* Logo + halo decorations */}
        <div style={{ position: "relative", marginBottom: 20 }}>
          <div style={{ position: "absolute", inset: -26, borderRadius: "50%", background: "radial-gradient(circle, rgba(var(--bp-primary-rgb),0.12) 0%, rgba(var(--bp-primary-rgb),0) 70%)" }} />
          <span style={{ position: "absolute", top: -8, right: -34, width: 10, height: 10, borderRadius: "50%", background: C.primary, opacity: 0.85 }} />
          <span style={{ position: "absolute", top: 30, left: -46, width: 8, height: 8, borderRadius: "50%", background: "rgba(var(--bp-primary-rgb),0.25)" }} />
          <span style={{ position: "absolute", bottom: -4, right: -44, width: 7, height: 7, borderRadius: "50%", background: "rgba(var(--bp-primary-rgb),0.2)" }} />
          <div style={{ width: 92, height: 92, borderRadius: 28, background: "linear-gradient(135deg,var(--bp-primary),var(--bp-primary-dark))", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", boxShadow: "0 14px 40px rgba(var(--bp-primary-rgb),0.35)" }}>
            <span style={{ fontSize: 46, fontWeight: 900, color: "#fff", fontFamily: "Arial,sans-serif", lineHeight: 1 }}>b</span>
          </div>
        </div>

        {/* Name + verified badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
          <span style={{ fontWeight: 800, fontSize: 25, color: C.text, letterSpacing: "-0.5px" }}>BrutePawa</span>
          <BadgeCheck size={22} color="#fff" fill="var(--bp-primary)" strokeWidth={2} />
        </div>

        {/* Version badge */}
        <div style={{ background: "#EAF9F0", color: C.primary, fontSize: 12.5, fontWeight: 600, padding: "5px 14px", borderRadius: 999, marginBottom: 22 }}>
          Version 1.0.0
        </div>

        {/* Description card */}
        <div style={{ background: C.card, borderRadius: 20, padding: "18px 22px 20px", boxShadow: C.shadow, border: `1px solid ${C.border}`, width: "100%", maxWidth: 360 }}>
          <div style={{ fontSize: 34, lineHeight: 0.9, color: C.primary, fontWeight: 900, fontFamily: "Georgia,serif", marginBottom: 6 }}>“</div>
          <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.65, margin: 0 }}>
            BrutePawa est conçu pour vous<br />
            connecter, partager et créer des relations<br />
            <span style={{ color: C.primary, fontWeight: 600 }}>authentiques.</span>
          </p>
        </div>
      </div>

      {/* Options card */}
      <div style={{ padding: "26px 14px 0" }}>
        <div style={{ background: C.card, borderRadius: 22, boxShadow: C.shadow, overflow: "hidden", border: `1px solid ${C.border}` }}>
          <OptionRow
            icon={<FileText size={20} color="var(--bp-primary)" strokeWidth={1.9} />}
            title="Conditions d'utilisation"
            subtitle="Règles et conditions d'utilisation de BrutePawa"
            onClick={() => navigate("/settings/terms")}
          />
          <OptionRow
            icon={<ShieldCheck size={20} color="var(--bp-primary)" strokeWidth={1.9} />}
            title="Politique de confidentialité"
            subtitle={<>Découvrez comment nous protégeons<br />vos données</>}
            onClick={() => navigate("/settings/privacy-policy")}
          />
          <OptionRow
            icon={<Code2 size={20} color="var(--bp-primary)" strokeWidth={1.9} />}
            title="Licences et crédits"
            subtitle="Bibliothèques et ressources tierces utilisées"
            onClick={() => navigate("/settings/licenses")}
          />
          <OptionRow
            icon={<Headphones size={20} color="var(--bp-primary)" strokeWidth={1.9} />}
            title="Nous contacter"
            subtitle="Besoin d'aide ? Notre équipe est là"
          />
          <OptionRow
            danger
            last
            icon={<Trash2 size={20} color={C.red} strokeWidth={1.9} />}
            title="Supprimer mon compte"
            subtitle={<>Supprimer définitivement votre compte<br />et vos données</>}
            onClick={() => navigate("/settings/delete-account")}
          />
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", padding: "30px 0 10px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginBottom: 8 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: C.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontWeight: 900, fontSize: 13, fontFamily: "Arial,sans-serif" }}>b</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>BrutePawa</span>
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 18 }}>© 2026 BrutePawa. Tous droits réservés.</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 22 }}>
          <Globe size={17} color="#B0B7C3" strokeWidth={1.8} />
          <Instagram size={17} color="#B0B7C3" strokeWidth={1.8} />
          <Facebook size={17} color="#B0B7C3" strokeWidth={1.8} />
          <Twitter size={17} color="#B0B7C3" strokeWidth={1.8} />
          <Youtube size={17} color="#B0B7C3" strokeWidth={1.8} />
        </div>
      </div>
    </div>
  );
}
