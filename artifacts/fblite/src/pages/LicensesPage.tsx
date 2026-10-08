import { useState, useMemo } from "react";
import { useNavigate } from "../router";
import {
  ArrowLeft, Code2, ShieldCheck, Search, ChevronRight, ExternalLink, X,
} from "lucide-react";
import { LICENSES, PRESENT_LICENSES, type LicenseEntry, type Category } from "../data/licenses-data";

const C = {
  bg: "#F7F8FA",
  card: "#FFFFFF",
  primary: "var(--bp-primary)",
  paleGreen: "#EAF9F0",
  text: "#111827",
  secondary: "#64748B",
  muted: "#9CA3AF",
  border: "#EEF0F3",
  shadow: "0 1px 10px rgba(15,23,42,0.05)",
};

const LICENSE_COLORS: Record<string, string> = {
  MIT: "#EAF9F0",
  "Apache-2.0": "#FEF9EA",
  ISC: "#EAF4FF",
  Unlicense: "#F5F3FF",
};
const LICENSE_TEXT_COLORS: Record<string, string> = {
  MIT: "#16A34A",
  "Apache-2.0": "#B45309",
  ISC: "#2563EB",
  Unlicense: "#7C3AED",
};

function LicenseBadge({ license }: { license: string }) {
  const bg = LICENSE_COLORS[license] ?? "#F3F4F6";
  const color = LICENSE_TEXT_COLORS[license] ?? "#374151";
  return (
    <span style={{ background: bg, color, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999 }}>
      {license}
    </span>
  );
}

function LibraryRow({ entry, onClick }: { entry: LicenseEntry; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 13, padding: "13px 16px",
        background: "none", border: "none", cursor: "pointer", width: "100%", textAlign: "left",
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 12, background: C.paleGreen, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Code2 size={18} color="var(--bp-primary)" strokeWidth={1.9} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, color: C.text, marginBottom: 4 }}>{entry.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <LicenseBadge license={entry.license} />
          <span style={{ fontSize: 11.5, color: C.muted }}>v{entry.version}</span>
        </div>
      </div>
      <ChevronRight size={16} color="#CBD5E1" strokeWidth={2.2} style={{ flexShrink: 0 }} />
    </button>
  );
}

function DetailView({ entry, onBack }: { entry: LicenseEntry; onBack: () => void }) {
  return (
    <div style={{ background: C.bg, minHeight: "100dvh", fontFamily: "Inter,-apple-system,BlinkMacSystemFont,sans-serif", paddingBottom: 28, zoom: 0.8 }}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: `1px solid ${C.border}`, height: 56, display: "flex", alignItems: "center", padding: "0 6px", position: "sticky", top: 0, zIndex: 30 }}>
        <button aria-label="Retour" onClick={onBack} style={{ width: 44, height: 44, borderRadius: "50%", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ArrowLeft size={22} color={C.text} strokeWidth={2} />
        </button>
        <h1 style={{ flex: 1, fontWeight: 700, fontSize: 15, color: C.text, margin: 0, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.name}</h1>
        <div style={{ width: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Code2 size={19} color="var(--bp-primary)" strokeWidth={1.9} />
        </div>
      </div>

      <div style={{ padding: "20px 16px 0" }}>
        {/* Main card */}
        <div style={{ background: C.card, borderRadius: 22, boxShadow: C.shadow, border: `1px solid ${C.border}`, padding: "24px 22px" }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: C.paleGreen, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
            <Code2 size={24} color="var(--bp-primary)" strokeWidth={1.9} />
          </div>
          <div style={{ fontWeight: 800, fontSize: 20, color: C.text, letterSpacing: "-0.3px", marginBottom: 10 }}>{entry.name}</div>
          <LicenseBadge license={entry.license} />

          <div style={{ height: 1, background: C.border, margin: "18px 0" }} />

          {[
            { label: "Version", value: `v${entry.version}` },
            { label: "Licence", value: entry.license },
            { label: "Auteur", value: entry.author || "Information non disponible dans les métadonnées du projet" },
            { label: "Catégorie", value: entry.category },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, gap: 12 }}>
              <span style={{ fontSize: 13, color: C.muted, fontWeight: 600, flexShrink: 0 }}>{label}</span>
              <span style={{ fontSize: 13, color: C.text, fontWeight: 500, textAlign: "right" }}>{value}</span>
            </div>
          ))}

          <div style={{ height: 1, background: C.border, margin: "6px 0 18px" }} />

          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 8 }}>Description</div>
          <div style={{ fontSize: 13, color: C.secondary, lineHeight: 1.6 }}>{entry.description}</div>

          {entry.homepage && (
            <>
              <div style={{ height: 1, background: C.border, margin: "18px 0" }} />
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 8 }}>Site officiel</div>
              <div style={{ fontSize: 12.5, color: C.primary, wordBreak: "break-all" }}>{entry.homepage}</div>
            </>
          )}
        </div>

        {/* Visit button */}
        {entry.homepage && (
          <a
            href={entry.homepage}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              width: "100%", marginTop: 16, padding: "15px 0", borderRadius: 999,
              background: C.primary, color: "#fff", fontWeight: 700, fontSize: 14,
              boxShadow: "0 8px 22px rgba(var(--bp-primary-rgb),0.3)",
              textDecoration: "none",
            }}
          >
            <ExternalLink size={17} strokeWidth={2.2} />
            Visiter le projet
          </a>
        )}

        <button
          onClick={onBack}
          style={{
            width: "100%", marginTop: 12, padding: "14px 0", borderRadius: 999, border: `1.5px solid ${C.border}`,
            background: "#fff", color: C.secondary, fontWeight: 600, fontSize: 13.5, cursor: "pointer",
          }}
        >
          Retour à la liste
        </button>
      </div>
    </div>
  );
}

const CATEGORY_ORDER: Category[] = [
  "Frameworks", "Bibliothèques", "Composants UI", "Icônes", "Outils CSS",
  "Outils de développement", "SDK et services",
];

export default function LicensesPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [filterLicense, setFilterLicense] = useState<string>("Toutes");
  const [selected, setSelected] = useState<LicenseEntry | null>(null);

  const filters = ["Toutes", ...PRESENT_LICENSES];

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return LICENSES.filter((e) => {
      const licOk = filterLicense === "Toutes" || e.license === filterLicense;
      const searchOk = !q || [e.name, e.author, e.license, e.category, e.description]
        .some((v) => v.toLowerCase().includes(q));
      return licOk && searchOk;
    });
  }, [query, filterLicense]);

  const grouped = useMemo(() => {
    const map: Partial<Record<Category, LicenseEntry[]>> = {};
    for (const e of filtered) {
      if (!map[e.category]) map[e.category] = [];
      map[e.category]!.push(e);
    }
    return CATEGORY_ORDER.filter((c) => map[c]?.length).map((c) => ({ cat: c, items: map[c]! }));
  }, [filtered]);

  if (selected) return <DetailView entry={selected} onBack={() => setSelected(null)} />;

  return (
    <div style={{ background: C.bg, minHeight: "100dvh", fontFamily: "Inter,-apple-system,BlinkMacSystemFont,sans-serif", paddingBottom: 28, zoom: 0.8 }}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: `1px solid ${C.border}`, height: 56, display: "flex", alignItems: "center", padding: "0 6px", position: "sticky", top: 0, zIndex: 30 }}>
        <button aria-label="Retour" onClick={() => navigate("/settings/messaging/about")} style={{ width: 44, height: 44, borderRadius: "50%", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ArrowLeft size={22} color={C.text} strokeWidth={2} />
        </button>
        <h1 style={{ flex: 1, fontWeight: 700, fontSize: 16, color: C.text, margin: 0, textAlign: "center", letterSpacing: "-0.3px" }}>Licences et crédits</h1>
        <div style={{ width: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Code2 size={19} color="var(--bp-primary)" strokeWidth={1.9} />
        </div>
      </div>

      {/* Intro */}
      <div style={{ padding: "16px 16px 0" }}>
        <div style={{ background: C.paleGreen, borderRadius: 18, padding: "14px 18px", display: "flex", gap: 12, alignItems: "flex-start" }}>
          <ShieldCheck size={19} color="var(--bp-primary)" strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12.5, color: C.secondary, lineHeight: 1.55 }}>
            BrutePawa utilise des technologies et ressources développées par des projets open source et des fournisseurs tiers. Nous remercions leurs auteurs et contributeurs.
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: "14px 16px 0" }}>
        <div style={{ position: "relative" }}>
          <Search size={15} color={C.muted} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une bibliothèque..."
            style={{
              width: "100%", boxSizing: "border-box", padding: "11px 38px 11px 38px",
              border: `1.5px solid ${C.border}`, borderRadius: 14, background: "#fff",
              fontSize: 13.5, color: C.text, outline: "none", fontFamily: "inherit",
            }}
          />
          {query && (
            <button onClick={() => setQuery("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4 }}>
              <X size={14} color={C.muted} />
            </button>
          )}
        </div>
      </div>

      {/* Licence filters */}
      <div style={{ padding: "12px 16px 0", display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none" }}>
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilterLicense(f)}
            style={{
              flexShrink: 0, padding: "6px 14px", borderRadius: 999, border: "none", cursor: "pointer",
              fontSize: 12.5, fontWeight: 600,
              background: filterLicense === f ? C.primary : "#fff",
              color: filterLicense === f ? "#fff" : C.secondary,
              boxShadow: filterLicense === f ? "0 4px 12px rgba(var(--bp-primary-rgb),0.3)" : C.shadow,
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div style={{ padding: "14px 16px 0", display: "flex", gap: 10 }}>
        {[
          { label: "bibliothèques", val: filtered.length },
          { label: "licences", val: [...new Set(filtered.map((e) => e.license))].length },
          { label: "catégories", val: grouped.length },
        ].map(({ label, val }) => (
          <div key={label} style={{ flex: 1, background: "#fff", borderRadius: 14, padding: "10px 12px", border: `1px solid ${C.border}`, textAlign: "center", boxShadow: C.shadow }}>
            <div style={{ fontWeight: 800, fontSize: 18, color: C.primary }}>{val}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Grouped list */}
      <div style={{ padding: "18px 16px 0" }}>
        {grouped.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: C.muted, fontSize: 14 }}>
            Aucun résultat pour « {query} »
          </div>
        ) : (
          grouped.map(({ cat, items }) => (
            <div key={cat} style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: C.secondary, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 10 }}>
                {cat} <span style={{ fontWeight: 500, color: C.muted, textTransform: "none" }}>({items.length})</span>
              </div>
              <div style={{ background: C.card, borderRadius: 20, boxShadow: C.shadow, border: `1px solid ${C.border}`, overflow: "hidden" }}>
                {items.map((entry, i) => {
                  const isLast = i === items.length - 1;
                  return (
                    <div key={entry.name} style={{ borderBottom: isLast ? "none" : `1px solid ${C.border}` }}>
                      <LibraryRow entry={entry} onClick={() => setSelected(entry)} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer note */}
      <div style={{ textAlign: "center", padding: "16px 24px", fontSize: 11.5, color: C.muted, lineHeight: 1.55 }}>
        {LICENSES.length} packages répertoriés · données extraites des métadonnées du projet
      </div>
    </div>
  );
}
