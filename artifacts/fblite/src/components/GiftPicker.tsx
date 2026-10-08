import { useState, useEffect } from "react";
import { getBpToken } from "../lib/api";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { trackEvent } from "../lib/analytics";

interface GiftItem {
  id: number;
  name: string;
  iconEmoji: string;
  iconUrl?: string;
  tokenCost: number;
  animationType: string;
}

const GIFT_IMG: Record<string, string> = {
  "Rose":          "/gifts/rose.jpg",
  "Cœur":          "/gifts/coeur.jpg",
  "Ours":          "/gifts/ours.jpg",
  "Gâteau":        "/gifts/gateau.jpg",
  "Couronne":      "/gifts/couronne.jpg",
  "Voiture":       "/gifts/voiture.jpg",
  "Diamant":       "/gifts/diamant.jpg",
  "Jet Privé":     "/gifts/jet-prive.jpg",
  "Lion Royal":    "/gifts/lion-royal.jpg",
  "Château Royal": "/gifts/chateau-royal.jpg",
  "Afrique d'Or":  "/gifts/afrique-or.jpg",
};

function giftImg(g: GiftItem): string | null {
  return g.iconUrl || GIFT_IMG[g.name] || null;
}

interface Props {
  streamId: number;
  receiverId: number;
  receiverName: string;
  receiverAvatar?: string;
  contextType: "live" | "video";
  contextId: number;
  tokenBalance: number;
  onClose: () => void;
  onSent: (gift: GiftItem, tokenBalance: number) => void;
  onBuyTokens?: () => void;
}

const CATEGORIES = [
  { id: "all",      label: "🔥 Populaires" },
  { id: "amour",    label: "❤️ Amour"       },
  { id: "prestige", label: "👑 Prestige"     },
  { id: "fun",      label: "🎉 Fun"          },
  { id: "premium",  label: "🚀 Premium"      },
];

function giftCategory(g: GiftItem): string[] {
  const cats = ["all"];
  if (g.tokenCost <= 150)                        cats.push("amour");
  if (g.tokenCost >= 200 && g.tokenCost <= 2000) cats.push("prestige");
  if (g.tokenCost >= 100 && g.tokenCost <= 1000) cats.push("fun");
  if (g.tokenCost >= 2000)                       cats.push("premium");
  return cats;
}

function fmtPrice(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)} 000`;
  return String(n);
}

/* ── Particle burst ── */
function Burst({ img, emoji }: { img: string | null; emoji: string }) {
  const particles = Array.from({ length: 14 }, (_, i) => {
    const angle = (i / 14) * 360;
    const dist  = 60 + Math.random() * 50;
    return {
      dx: Math.cos((angle * Math.PI) / 180) * dist,
      dy: Math.sin((angle * Math.PI) / 180) * dist,
      rot: Math.random() * 360,
    };
  });
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {particles.map((p, i) => (
        <div key={i} style={{
          position: "absolute", width: 28, height: 28,
          animation: `giftBurst 0.75s ${i * 0.03}s ease-out forwards`,
          ["--dx" as string]: `${p.dx}px`,
          ["--dy" as string]: `${p.dy}px`,
          ["--rot" as string]: `${p.rot}deg`,
        }}>
          {img
            ? <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 6 }} />
            : <span style={{ fontSize: 24 }}>{emoji}</span>
          }
        </div>
      ))}
      <style>{`
        @keyframes giftBurst {
          0%   { transform: translate(0,0) rotate(0deg) scale(1); opacity:1; }
          100% { transform: translate(var(--dx),var(--dy)) rotate(var(--rot)) scale(0.1); opacity:0; }
        }
      `}</style>
    </div>
  );
}

export default function GiftPicker({
  streamId, receiverId, receiverName, receiverAvatar,
  contextType, contextId,
  tokenBalance: initialBalance, onClose, onSent, onBuyTokens,
}: Props) {
  const currentUser = useCurrentUser();
  const [catalog, setCatalog]     = useState<GiftItem[]>([]);
  const [selected, setSelected]   = useState<GiftItem | null>(null);
  const [qty, setQty]             = useState(1);
  const [balance, setBalance]     = useState(initialBalance);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [success, setSuccess]     = useState(false);
  const [cat, setCat]             = useState("all");
  const [showBurst, setShowBurst] = useState(false);

  useEffect(() => {
    fetch("/api/gifts/catalog")
      .then(r => r.json())
      .then((d: GiftItem[]) => setCatalog(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const token = getBpToken();
    if (!token) return;
    fetch("/api/creator/wallet", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((d: { tokenBalance?: number }) => { if (d.tokenBalance !== undefined) setBalance(d.tokenBalance); })
      .catch(() => {});
  }, []);

  const filtered  = catalog.filter(g => giftCategory(g).includes(cat));
  const totalCost = selected ? selected.tokenCost * qty : 0;
  const canAffordSel = selected ? balance >= totalCost : false;

  const handleSend = async () => {
    if (!selected || loading || success || !canAffordSel) return;
    setLoading(true); setError(null);
    const token   = getBpToken();
    try {
      for (let i = 0; i < qty; i++) {
        const res = await fetch("/api/gifts/send", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ giftId: selected.id, receiverId, contextType, contextId, senderName: currentUser.name ?? "" }),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({})) as { error?: string };
          throw new Error(e.error ?? "Erreur d'envoi");
        }
      }
      const newBal = balance - totalCost;
      setBalance(newBal);
      setSuccess(true);
      setShowBurst(true);
      trackEvent("gift_sent", { context_type: contextType, quantity: qty });
      setTimeout(() => { onSent(selected, newBal); onClose(); }, 1300);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  const initials = receiverName.slice(0, 2).toUpperCase();

  return (
    <>
      {showBurst && selected && <Burst img={giftImg(selected)} emoji={selected.iconEmoji} />}

      <style>{`
        @keyframes sheetUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes selGlow {
          from { box-shadow: 0 0 16px rgba(22,194,74,0.55), 0 3px 10px rgba(0,0,0,0.5); }
          to   { box-shadow: 0 0 32px rgba(22,194,74,0.9), 0 4px 16px rgba(0,0,0,0.6); }
        }
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseGlow {
          0%,100% { opacity: 0.7; transform: scaleX(1); }
          50%      { opacity: 1;   transform: scaleX(1.03); }
        }
        @keyframes twinkle {
          0%,100% { opacity: 0; transform: scale(0.5) rotate(0deg); }
          50%      { opacity: 1; transform: scale(1.2) rotate(20deg); }
        }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.55)" }}
      >
        {/* ── Bottom sheet ── */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            background: "linear-gradient(180deg,#060e08 0%,#040a06 100%)",
            borderRadius: "22px 22px 0 0",
            maxHeight: "90vh",
            display: "flex", flexDirection: "column",
            boxShadow: "0 -8px 50px rgba(0,0,0,0.7), 0 -1px 0 rgba(255,255,255,0.06)",
            animation: "sheetUp 0.3s cubic-bezier(0.34,1.4,0.64,1) forwards",
          }}
        >
          {/* Drag handle */}
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 10, paddingBottom: 2, flexShrink: 0 }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.18)" }} />
          </div>

          {/* ── Header ── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px 10px", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 42, height: 42, borderRadius: "50%",
                background: "linear-gradient(135deg,var(--bp-primary),var(--bp-primary))",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 16px rgba(22,194,74,0.5)", flexShrink: 0,
              }}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="#fff">
                  <path d="M20 6h-2.18c.07-.31.18-.59.18-.9C18 3.4 16.6 2 14.9 2c-.92 0-1.73.42-2.3 1.08L12 3.7l-.6-.62C10.83 2.42 10.02 2 9.1 2 7.4 2 6 3.4 6 5.1c0 .31.11.59.18.9H4c-1.11 0-2 .89-2 2v13c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2z"/>
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: "#fff", lineHeight: 1.2 }}>Envoyer un cadeau</div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
                  {receiverAvatar ? (
                    <img src={receiverAvatar} alt="" style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: "linear-gradient(135deg,var(--bp-primary),#0EA5E9)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                      {initials}
                    </div>
                  )}
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
                    à <strong style={{ color: "#fff" }}>{receiverName}</strong>
                  </span>
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="var(--bp-primary)"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                </div>
              </div>
            </div>

            {/* Balance */}
            <div style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(22,194,74,0.3)",
              borderRadius: 14, padding: "8px 12px", textAlign: "right",
              boxShadow: "0 0 12px rgba(22,194,74,0.12)",
            }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", marginBottom: 2 }}>Solde actuel</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end", marginBottom: 4 }}>
                <svg viewBox="0 0 20 20" width="15" height="15" fill="#FBBF24"><circle cx="10" cy="10" r="9"/></svg>
                <span style={{ fontWeight: 900, fontSize: 15, color: "#FBBF24" }}>{balance.toLocaleString()} Jeton{balance !== 1 ? "s" : ""}</span>
              </div>
              <button
                onClick={onBuyTokens}
                style={{
                  background: "transparent", border: "1.5px solid var(--bp-primary)",
                  borderRadius: 20, padding: "3px 10px",
                  color: "var(--bp-primary)", fontSize: 11, fontWeight: 700,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 4, marginLeft: "auto",
                }}
              >
                <svg viewBox="0 0 24 24" width="11" height="11" fill="var(--bp-primary)"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                Recharger
              </button>
            </div>
          </div>

          {/* ── Category tabs ── */}
          <div style={{
            display: "flex", gap: 7, padding: "0 14px 10px",
            overflowX: "auto", scrollbarWidth: "none", flexShrink: 0,
          }}>
            {CATEGORIES.map(c => (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                style={{
                  flexShrink: 0, padding: "7px 14px", borderRadius: 22, border: "none",
                  background: cat === c.id ? "linear-gradient(135deg,var(--bp-primary),var(--bp-primary))" : "rgba(255,255,255,0.08)",
                  color: cat === c.id ? "#fff" : "rgba(255,255,255,0.55)",
                  fontWeight: cat === c.id ? 800 : 600, fontSize: 13,
                  cursor: "pointer",
                  boxShadow: cat === c.id ? "0 4px 16px rgba(22,194,74,0.45)" : "none",
                  transition: "all 0.18s",
                }}
              >{c.label}</button>
            ))}
          </div>

          {/* ── Gift grid (scrollable) ── */}
          <div style={{ overflowY: "auto", padding: "0 12px 10px", flex: 1, scrollbarWidth: "none" }}>
            {catalog.length === 0 ? (
              <div style={{ textAlign: "center", color: "rgba(255,255,255,0.35)", padding: "28px 0", fontSize: 14 }}>
                Chargement…
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {filtered.map(g => {
                  const canAfford = balance >= g.tokenCost;
                  const isSel    = selected?.id === g.id;
                  const img      = giftImg(g);
                  const price    = fmtPrice(g.tokenCost);

                  return (
                    <button
                      key={g.id}
                      onClick={() => { setSelected(g); setQty(1); setError(null); }}
                      style={{
                        position: "relative",
                        background: isSel ? "rgba(22,194,74,0.12)" : "rgba(18,18,32,0.95)",
                        border: isSel ? "2px solid var(--bp-primary)" : "1.5px solid rgba(255,255,255,0.08)",
                        borderRadius: 14, padding: 0, overflow: "hidden",
                        cursor: "pointer",
                        opacity: canAfford ? 1 : 0.45,
                        textAlign: "left",
                        boxShadow: isSel
                          ? "0 0 22px rgba(22,194,74,0.65), 0 4px 16px rgba(0,0,0,0.55)"
                          : "0 3px 10px rgba(0,0,0,0.5)",
                        transition: "all 0.15s",
                        transform: isSel ? "scale(1.06)" : "scale(1)",
                        aspectRatio: "3/4",
                        animation: isSel ? "selGlow 1.6s ease-in-out infinite alternate" : "none",
                      }}
                    >
                      {/* Gift image */}
                      {img ? (
                        <img
                          src={img} alt={g.name} draggable={false}
                          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", borderRadius: 12, display: "block" }}
                        />
                      ) : (
                        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>
                          {g.iconEmoji}
                        </div>
                      )}

                      {/* Bottom overlay */}
                      <div style={{
                        position: "absolute", bottom: 0, left: 0, right: 0, height: "60%",
                        background: "linear-gradient(to top,rgba(0,0,0,0.95) 0%,rgba(0,0,0,0.5) 55%,transparent 100%)",
                        borderRadius: "0 0 12px 12px", pointerEvents: "none",
                      }} />

                      {/* Selected check */}
                      {isSel && (
                        <div style={{
                          position: "absolute", top: 5, right: 5,
                          width: 17, height: 17, borderRadius: "50%", background: "var(--bp-primary)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          boxShadow: "0 0 8px rgba(22,194,74,0.8)",
                        }}>
                          <svg viewBox="0 0 24 24" width="11" height="11" fill="#fff"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                        </div>
                      )}

                      {/* Name + price at bottom */}
                      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 7px 7px" }}>
                        <div style={{
                          color: isSel ? "var(--bp-primary)" : "#fff", fontWeight: 700, fontSize: 11,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          marginBottom: 4, lineHeight: 1.2, transition: "color 0.15s",
                        }}>{g.name}</div>
                        <div style={{
                          display: "inline-flex", alignItems: "center", gap: 3,
                          background: "rgba(255,215,0,0.15)", border: "1px solid rgba(255,215,0,0.35)",
                          borderRadius: 20, padding: "2px 7px",
                        }}>
                          <svg viewBox="0 0 20 20" width="11" height="11" fill="#FBBF24"><circle cx="10" cy="10" r="9"/></svg>
                          <span style={{ color: "#FBBF24", fontWeight: 800, fontSize: 11 }}>{price}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Selected gift detail panel — OUTSIDE scroll, always visible ── */}
          {selected && (
            <div style={{
              flexShrink: 0,
              margin: "0 12px 4px",
              background: "rgba(255,255,255,0.05)",
              border: "1.5px solid rgba(22,194,74,0.35)",
              borderRadius: 16, padding: "11px 13px",
              display: "flex", alignItems: "center", gap: 12,
              animation: "slideUp 0.2s ease-out",
            }}>
              {/* Gift image */}
              {giftImg(selected) ? (
                <div style={{ width: 58, height: 72, borderRadius: 10, overflow: "hidden", flexShrink: 0, boxShadow: "0 0 18px rgba(22,194,74,0.4)" }}>
                  <img src={giftImg(selected)!} alt={selected.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </div>
              ) : (
                <div style={{ fontSize: 46, lineHeight: 1, flexShrink: 0 }}>{selected.iconEmoji}</div>
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Name + badge */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 800, fontSize: 14, color: "#fff" }}>{selected.name}</span>
                  {selected.tokenCost >= 2000 && (
                    <span style={{
                      background: "linear-gradient(135deg,#FBBF24,#FFA000)",
                      borderRadius: 6, padding: "1px 6px",
                      fontSize: 9, fontWeight: 800, color: "#000",
                    }}>Premium</span>
                  )}
                </div>
                {/* Price */}
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                  <svg viewBox="0 0 20 20" width="14" height="14" fill="#FBBF24"><circle cx="10" cy="10" r="9"/></svg>
                  <span style={{ color: "#FBBF24", fontWeight: 900, fontSize: 13 }}>
                    {(selected.tokenCost * qty).toLocaleString()} Jetons
                  </span>
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 3, lineHeight: 1.4 }}>
                  Un cadeau qui montre ton soutien pour ce créateur.
                </div>
              </div>

              {/* Qty controls */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <button
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: "rgba(255,255,255,0.12)", border: "1.5px solid rgba(255,255,255,0.2)",
                    color: "#fff", fontSize: 20, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    lineHeight: 1, fontWeight: 300,
                  }}
                >−</button>
                <span style={{ color: "#fff", fontWeight: 900, fontSize: 18, minWidth: 24, textAlign: "center" }}>{qty}</span>
                <button
                  onClick={() => setQty(q => q + 1)}
                  style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: "rgba(22,194,74,0.25)", border: "1.5px solid rgba(22,194,74,0.5)",
                    color: "var(--bp-primary)", fontSize: 20, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    lineHeight: 1, fontWeight: 300,
                  }}
                >+</button>
              </div>
            </div>
          )}

          {/* ── Error / success ── */}
          {(error || success) && (
            <div style={{ padding: "0 14px 4px", flexShrink: 0 }}>
              {error && (
                <div style={{ background: "rgba(244,67,54,0.15)", border: "1px solid rgba(244,67,54,0.35)", borderRadius: 10, padding: "9px 13px", fontSize: 13, color: "#EF4444", display: "flex", alignItems: "center", gap: 8 }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="#EF4444"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                  {error}
                </div>
              )}
              {success && (
                <div style={{ background: "rgba(22,194,74,0.15)", border: "1px solid rgba(22,194,74,0.35)", borderRadius: 10, padding: "9px 13px", fontSize: 14, color: "var(--bp-primary)", textAlign: "center", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--bp-primary)"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  Cadeau envoyé avec succès !
                </div>
              )}
            </div>
          )}

          {/* ── Send button ── */}
          <div style={{ padding: "6px 14px 26px", flexShrink: 0 }}>
            <button
              onClick={selected ? handleSend : onBuyTokens}
              disabled={loading || success}
              style={{
                width: "100%", border: "none", borderRadius: 50,
                padding: 0, cursor: loading || success ? "not-allowed" : "pointer",
                background: "none", position: "relative", overflow: "visible",
                display: "block",
              }}
            >
              {/* Outer glow ring */}
              {!loading && !success && (
                <div style={{
                  position: "absolute", inset: -4, borderRadius: 54,
                  background: "radial-gradient(ellipse at 50% 120%, rgba(22,194,74,0.55) 0%, transparent 70%)",
                  animation: "pulseGlow 2s ease-in-out infinite",
                  pointerEvents: "none",
                }} />
              )}

              {loading ? (
                <div style={{
                  borderRadius: 50, padding: "14px 20px",
                  background: "linear-gradient(135deg,#052e16,#052e16)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                }}>
                  <div style={{ width: 20, height: 20, border: "2.5px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                  <span style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>Envoi en cours…</span>
                </div>
              ) : success ? (
                <div style={{
                  borderRadius: 50, padding: "14px 20px",
                  background: "linear-gradient(135deg,#052e16,#052e16)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                }}>
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="var(--bp-primary)"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  <span style={{ color: "var(--bp-primary)", fontWeight: 900, fontSize: 18 }}>Envoyé !</span>
                </div>
              ) : selected ? (
                <div style={{ position: "relative", borderRadius: 50, overflow: "hidden" }}>
                  <div style={{
                    borderRadius: 50, padding: "15px 20px",
                    background: canAffordSel
                      ? "linear-gradient(135deg,var(--bp-primary) 0%,var(--bp-primary-dark) 100%)"
                      : "rgba(255,255,255,0.08)",
                    border: canAffordSel ? "none" : "1.5px solid rgba(255,255,255,0.12)",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                    boxShadow: canAffordSel ? "0 0 30px rgba(34,197,94,0.55), inset 0 1px 0 rgba(255,255,255,0.2)" : "none",
                  }}>
                    <svg viewBox="0 0 24 24" width="22" height="22" fill={canAffordSel ? "#fff" : "rgba(255,255,255,0.4)"}><path d="M20 6h-2.18c.07-.31.18-.59.18-.9C18 3.4 16.6 2 14.9 2c-.92 0-1.73.42-2.3 1.08L12 3.7l-.6-.62C10.83 2.42 10.02 2 9.1 2 7.4 2 6 3.4 6 5.1c0 .31.11.59.18.9H4c-1.11 0-2 .89-2 2v13c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2z"/></svg>
                    <span style={{ color: canAffordSel ? "#fff" : "rgba(255,255,255,0.35)", fontWeight: 900, fontSize: 16 }}>
                      {canAffordSel ? "Envoyer le cadeau" : "Solde insuffisant"}
                    </span>
                    {canAffordSel && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(0,0,0,0.2)", borderRadius: 20, padding: "3px 9px" }}>
                        <svg viewBox="0 0 20 20" width="12" height="12" fill="#FBBF24"><circle cx="10" cy="10" r="9"/></svg>
                        <span style={{ color: "#FBBF24", fontWeight: 800, fontSize: 13 }}>{totalCost.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{
                  borderRadius: 50, padding: "15px 20px",
                  background: "linear-gradient(135deg,rgba(34,197,94,0.15) 0%,rgba(34,197,94,0.05) 100%)",
                  border: "1.5px solid rgba(34,197,94,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                }}>
                  <svg viewBox="0 0 20 20" width="18" height="18" fill="#FBBF24"><circle cx="10" cy="10" r="9"/></svg>
                  <span style={{ color: "rgba(255,255,255,0.6)", fontWeight: 800, fontSize: 16 }}>Envoyer un jeton</span>
                </div>
              )}
            </button>

            {/* Security line */}
            {selected && canAffordSel && !loading && !success && (
              <div style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                <svg viewBox="0 0 24 24" width="10" height="10" fill="rgba(22,194,74,0.5)"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
                Paiement 100% sécurisé avec vos jetons BrutePawa
              </div>
            )}
            {selected && !canAffordSel && !loading && !success && (
              <div style={{ textAlign: "center", marginTop: 8, fontSize: 12, color: "#EF4444", fontWeight: 600 }}>
                Solde insuffisant — appuie sur Recharger ci-dessus
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
