import { useState, useEffect } from "react";
import { useNavigate } from "../router";
import { getBpToken } from "../lib/api";

interface CreatorWallet {
  tokenBalance: number;
  xofBalance: number;
  tokenToXof: number;
  minWithdrawTokens: number;
  revenueToday:  { tokens: number; xof: number };
  revenueMonth:  { tokens: number; xof: number };
}

interface Donor  { senderId: number; senderName: string; totalTokens: number; giftsCount: number; }
interface GiftTx { id: number; senderName: string; giftEmoji: string; giftName: string; tokenAmount: number; contextType: string; createdAt: string; }
interface Withdrawal { id: number; tokensAmount: number; xofAmount: number; status: string; paymentMethod: string; paymentPhone: string; createdAt: string; }

const OPERATORS = [
  { id: "orange" as const, label: "Orange Money", emoji: "🟠" },
  { id: "mtn"    as const, label: "MTN MoMo",     emoji: "🟡" },
  { id: "wave"   as const, label: "Wave",          emoji: "🔵" },
];

type Tab = "solde" | "revenus" | "donateurs" | "historique" | "retrait";

export default function CreatorDashboardPage() {
  const navigate = useNavigate();
  const [tab, setTab]             = useState<Tab>("solde");
  const [wallet, setWallet]       = useState<CreatorWallet | null>(null);
  const [donors, setDonors]       = useState<Donor[]>([]);
  const [gifts, setGifts]         = useState<GiftTx[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading]     = useState(true);

  // Withdrawal form state
  const [wdOperator, setWdOperator] = useState<"orange" | "mtn" | "wave">("orange");
  const [wdPhone, setWdPhone]       = useState("");
  const [wdTokens, setWdTokens]     = useState("");
  const [wdLoading, setWdLoading]   = useState(false);
  const [wdError, setWdError]       = useState<string | null>(null);
  const [wdSuccess, setWdSuccess]   = useState<string | null>(null);

  const token = getBpToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const loadAll = async () => {
    setLoading(true);
    try {
      const [walletRes, donorsRes, giftsRes, wdRes] = await Promise.all([
        fetch("/api/creator/wallet",      { headers }).then(r => r.json()),
        fetch("/api/creator/top-donors",  { headers }).then(r => r.json()),
        fetch("/api/gifts/received",      { headers }).then(r => r.json()),
        fetch("/api/creator/withdrawals", { headers }).then(r => r.json()),
      ]);
      setWallet(walletRes as CreatorWallet);
      setDonors(Array.isArray(donorsRes) ? donorsRes as Donor[] : []);
      setGifts(Array.isArray(giftsRes) ? giftsRes as GiftTx[] : []);
      setWithdrawals(Array.isArray(wdRes) ? wdRes as Withdrawal[] : []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  const handleWithdraw = async () => {
    const tokens = parseInt(wdTokens, 10);
    if (!tokens || tokens < (wallet?.minWithdrawTokens ?? 1000) || !wdPhone) return;
    setWdLoading(true); setWdError(null); setWdSuccess(null);
    try {
      const res = await fetch("/api/creator/withdraw", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod: wdOperator, paymentPhone: wdPhone, tokensAmount: tokens }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(e.error ?? "Erreur");
      }
      const xof = tokens * (wallet?.tokenToXof ?? 5);
      setWdSuccess(`Demande de ${xof.toLocaleString("fr-FR")} XOF soumise avec succès.`);
      setWdTokens(""); setWdPhone("");
      await loadAll();
    } catch (e) { setWdError(e instanceof Error ? e.message : "Erreur"); }
    finally { setWdLoading(false); }
  };

  const statusLabel: Record<string, string> = {
    pending: "En attente", validated: "Validé", paid: "Payé", rejected: "Rejeté",
  };
  const statusColor: Record<string, string> = {
    pending: "#FF9800", validated: "#2196F3", paid: "var(--bp-primary)", rejected: "#EF4444",
  };

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
      <div style={{ width: 32, height: 32, border: "4px solid #EC4899", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const w = wallet;

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #EC4899, #9C27B0)", color: "#fff", padding: "20px 16px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <button onClick={() => navigate("/")} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: 36, height: 36, color: "#fff", fontSize: 18, cursor: "pointer" }}>←</button>
          <div style={{ fontWeight: 800, fontSize: 18 }}>💎 Dashboard Créateur</div>
        </div>

        {/* Balance cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 14, padding: "12px 14px" }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>🪙 Jetons reçus</div>
            <div style={{ fontWeight: 900, fontSize: 28 }}>{(w?.tokenBalance ?? 0).toLocaleString()}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>{((w?.tokenBalance ?? 0) * (w?.tokenToXof ?? 5)).toLocaleString("fr-FR")} XOF</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 14, padding: "12px 14px" }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>📅 Ce mois</div>
            <div style={{ fontWeight: 900, fontSize: 28 }}>🪙 {(w?.revenueMonth.tokens ?? 0).toLocaleString()}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>{(w?.revenueMonth.xof ?? 0).toLocaleString("fr-FR")} XOF</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, padding: "10px 12px", background: "var(--fb-white)", borderBottom: "1px solid var(--fb-divider)", overflowX: "auto", scrollbarWidth: "none" }}>
        {([ ["solde","💰 Solde"], ["revenus","📈 Revenus"], ["donateurs","🏆 Donateurs"], ["historique","📋 Historique"], ["retrait","💸 Retrait"] ] as [Tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            flexShrink: 0, padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
            background: tab === t ? "#E91E63" : "var(--fb-bg)",
            color: tab === t ? "#fff" : "var(--fb-text)",
          }}>{label}</button>
        ))}
      </div>

      {/* ── SOLDE ── */}
      {tab === "solde" && (
        <div style={{ padding: 16 }}>
          <div style={{ background: "var(--fb-white)", borderRadius: 16, padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>📊 Résumé du solde</div>
            {[
              { label: "Solde jetons",      val: `🪙 ${(w?.tokenBalance ?? 0).toLocaleString()}` },
              { label: "Équivalent XOF",    val: `${((w?.tokenBalance ?? 0) * (w?.tokenToXof ?? 5)).toLocaleString("fr-FR")} FCFA` },
              { label: "Revenus aujourd'hui", val: `🪙 ${(w?.revenueToday.tokens ?? 0).toLocaleString()} = ${(w?.revenueToday.xof ?? 0).toLocaleString("fr-FR")} XOF` },
              { label: "Revenus ce mois",   val: `🪙 ${(w?.revenueMonth.tokens ?? 0).toLocaleString()} = ${(w?.revenueMonth.xof ?? 0).toLocaleString("fr-FR")} XOF` },
              { label: "Taux de conversion",val: `1 jeton = ${w?.tokenToXof ?? 5} XOF` },
              { label: "Retrait minimum",   val: `🪙 ${(w?.minWithdrawTokens ?? 1000).toLocaleString()} jetons = ${((w?.minWithdrawTokens ?? 1000) * (w?.tokenToXof ?? 5)).toLocaleString("fr-FR")} XOF` },
            ].map(({ label, val }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--fb-divider)" }}>
                <span style={{ color: "var(--fb-text-secondary)", fontSize: 14 }}>{label}</span>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── REVENUS ── */}
      {tab === "revenus" && (
        <div style={{ padding: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            {[
              { label: "Aujourd'hui",  tokens: w?.revenueToday.tokens ?? 0,  xof: w?.revenueToday.xof  ?? 0 },
              { label: "Ce mois",      tokens: w?.revenueMonth.tokens ?? 0, xof: w?.revenueMonth.xof ?? 0 },
            ].map(({ label, tokens, xof }) => (
              <div key={label} style={{ background: "var(--fb-white)", borderRadius: 14, padding: 16 }}>
                <div style={{ fontSize: 13, color: "var(--fb-text-secondary)" }}>{label}</div>
                <div style={{ fontWeight: 900, fontSize: 22, color: "#E91E63", marginTop: 4 }}>🪙 {tokens.toLocaleString()}</div>
                <div style={{ fontSize: 12, color: "var(--fb-text-secondary)", marginTop: 2 }}>{xof.toLocaleString("fr-FR")} XOF</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── DONATEURS ── */}
      {tab === "donateurs" && (
        <div style={{ background: "var(--fb-white)", marginTop: 4 }}>
          <div style={{ padding: "12px 16px", fontWeight: 700, fontSize: 15, borderBottom: "1px solid var(--fb-divider)" }}>
            🏆 Top donateurs
          </div>
          {donors.length === 0 && (
            <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--fb-text-secondary)", fontSize: 14 }}>
              Aucun donateur pour l'instant
            </div>
          )}
          {donors.map((d, i) => (
            <div key={d.senderId} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid var(--fb-divider)" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: i === 0 ? "#FBBF24" : i === 1 ? "#CBD5E1" : i === 2 ? "#D97706" : "#E5E7EB", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 14, flexShrink: 0 }}>
                {i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{d.senderName || `Utilisateur #${d.senderId}`}</div>
                <div style={{ fontSize: 12, color: "var(--fb-text-secondary)" }}>{d.giftsCount} cadeau{d.giftsCount !== 1 ? "x" : ""}</div>
              </div>
              <div style={{ fontWeight: 800, color: "#E91E63" }}>🪙 {d.totalTokens.toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── HISTORIQUE ── */}
      {tab === "historique" && (
        <div style={{ background: "var(--fb-white)", marginTop: 4 }}>
          <div style={{ padding: "12px 16px", fontWeight: 700, fontSize: 15, borderBottom: "1px solid var(--fb-divider)" }}>
            📋 Cadeaux reçus
          </div>
          {gifts.length === 0 && (
            <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--fb-text-secondary)", fontSize: 14 }}>
              Aucun cadeau reçu
            </div>
          )}
          {gifts.map(g => (
            <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid var(--fb-divider)" }}>
              <div style={{ fontSize: 32 }}>{g.giftEmoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{g.giftName} de {g.senderName || "Anonyme"}</div>
                <div style={{ fontSize: 12, color: "var(--fb-text-secondary)" }}>
                  {g.contextType === "live" ? "🔴 Live" : "🎥 Vidéo"} · {new Date(g.createdAt).toLocaleDateString("fr-FR")}
                </div>
              </div>
              <div style={{ fontWeight: 800, color: "#E91E63" }}>+🪙{g.tokenAmount}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── RETRAIT ── */}
      {tab === "retrait" && (
        <div style={{ padding: 16 }}>
          <div style={{ background: "var(--fb-white)", borderRadius: 16, padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>💸 Demander un retrait</div>
            <div style={{ fontSize: 13, color: "var(--fb-text-secondary)", marginBottom: 16 }}>
              Solde disponible : 🪙 {(w?.tokenBalance ?? 0).toLocaleString()} ({((w?.tokenBalance ?? 0) * (w?.tokenToXof ?? 5)).toLocaleString("fr-FR")} XOF)
            </div>

            {/* Operator */}
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Opérateur</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {OPERATORS.map(op => (
                <button key={op.id} onClick={() => setWdOperator(op.id)} style={{
                  flex: 1, padding: "10px 0", borderRadius: 12, cursor: "pointer", fontWeight: 700, fontSize: 12,
                  border: `2px solid ${wdOperator === op.id ? "#E91E63" : "var(--fb-divider)"}`,
                  background: wdOperator === op.id ? "#FEE2E2" : "var(--fb-bg)",
                }}>
                  <div style={{ fontSize: 20 }}>{op.emoji}</div>
                  <div style={{ marginTop: 2 }}>{op.label.split(" ")[0]}</div>
                </button>
              ))}
            </div>

            {/* Phone */}
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Numéro de téléphone</div>
            <input value={wdPhone} onChange={e => setWdPhone(e.target.value)} placeholder="+225 07 XX XX XX XX"
              style={{ width: "100%", background: "var(--fb-bg)", border: "none", borderRadius: 10, padding: "12px 14px", fontSize: 15, marginBottom: 14, boxSizing: "border-box" }} />

            {/* Amount */}
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Montant en jetons</div>
            <input value={wdTokens} onChange={e => setWdTokens(e.target.value)} type="number"
              placeholder={`Min. ${(w?.minWithdrawTokens ?? 1000).toLocaleString()} jetons`}
              style={{ width: "100%", background: "var(--fb-bg)", border: "none", borderRadius: 10, padding: "12px 14px", fontSize: 18, fontWeight: 800, marginBottom: 6, boxSizing: "border-box" }} />
            {wdTokens && (
              <div style={{ fontSize: 13, color: "#E91E63", fontWeight: 700, marginBottom: 12 }}>
                = {(parseInt(wdTokens || "0", 10) * (w?.tokenToXof ?? 5)).toLocaleString("fr-FR")} XOF
              </div>
            )}

            {wdError   && <div style={{ background: "#FEE2E2", color: "#EF4444", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 13 }}>❌ {wdError}</div>}
            {wdSuccess && <div style={{ background: "#DCFCE7", color: "var(--bp-primary-dark)", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 13 }}>✅ {wdSuccess}</div>}

            <button onClick={handleWithdraw}
              disabled={wdLoading || !wdPhone || !wdTokens || parseInt(wdTokens, 10) < (w?.minWithdrawTokens ?? 1000)}
              style={{
                width: "100%", background: wdLoading ? "#ccc" : "#E91E63", color: "#fff", border: "none",
                borderRadius: 12, padding: 14, fontWeight: 800, fontSize: 16, cursor: "pointer",
              }}>
              {wdLoading ? "Traitement…" : "Demander le retrait"}
            </button>
          </div>

          {/* Withdrawal history */}
          {withdrawals.length > 0 && (
            <div style={{ background: "var(--fb-white)", borderRadius: 16, padding: 16, marginTop: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Historique des retraits</div>
              {withdrawals.map(w => (
                <div key={w.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--fb-divider)" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{w.xofAmount.toLocaleString("fr-FR")} XOF</div>
                    <div style={{ fontSize: 12, color: "var(--fb-text-secondary)" }}>
                      {w.paymentMethod.toUpperCase()} · {new Date(w.createdAt).toLocaleDateString("fr-FR")}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: statusColor[w.status] ?? "#000" }}>
                    ● {statusLabel[w.status] ?? w.status}
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
