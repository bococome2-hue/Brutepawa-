import { useState, useEffect, useRef } from "react";
import {
  apiGetWallet, apiGetTransactions, apiDeposit, apiTransfer, apiGetUsers,
  apiGetCreatorWallet, apiPurchaseTokens, apiGetTokenPurchaseStatus, apiGetGiftHistory,
  type ApiTx, type PublicUser, type ApiTokenPurchase, type ApiGiftHistoryItem,
} from "../lib/api";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { trackEvent } from "../lib/analytics";

const BP_GREEN   = "var(--bp-primary)";
const USD_RATE   = 600; // 1 USD = 600 FCFA

type Modal = "depot" | "retirer" | "envoyer" | "recevoir" | "jetons" | "historique" | "cadeaux" | null;
type DepotMethod = "mtn" | "orange" | "moov";
type TokenOp    = "orange" | "mtn" | "wave";
const TOKEN_PACKS = [
  { id: "pack_100"  as const, tokens: 100,  xof: 500,   label: "Pack Débutant"  },
  { id: "pack_500"  as const, tokens: 500,  xof: 2500,  label: "Pack Standard"  },
  { id: "pack_2000" as const, tokens: 2000, xof: 10000, label: "Pack Premium"   },
];
const TOKEN_OPERATORS: { id: TokenOp; label: string; color: string }[] = [
  { id: "orange", label: "Orange Money", color: "#FF6D00" },
  { id: "mtn",    label: "MTN MoMo",     color: "#FFC107" },
  { id: "wave",   label: "Wave",         color: "#1976D2" },
];
const METHOD_INFO: Record<DepotMethod, { label: string; color: string; prefix: string; abbr: string }> = {
  mtn:    { label: "MTN Mobile Money", color: "#FFC107", prefix: "+229 66", abbr: "MTN"    },
  orange: { label: "Orange Money",     color: "#FF6D00", prefix: "+229 97", abbr: "Orange" },
  moov:   { label: "Moov Money",       color: "#1565C0", prefix: "+229 96", abbr: "Moov"   },
};
const CHART_POINTS = [0, 12000, 28000, 52000, 47000, 65000, 78000, 82000, 95000]; // demo curve

/* ─── SVG Icons ───────────────────────────────────────────── */
const I = {
  shield: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>,
  eye: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  eyeOff: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  download: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  upload: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  send: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  receive: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>,
  coins: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><line x1="16.71" y1="13.88" x2="13.12" y2="16.71"/></svg>,
  history: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="12 8 12 12 14 14"/><path d="M3.05 11a9 9 0 1 0 .5-4"/><polyline points="3 3 3 9 9 9"/></svg>,
  gift: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>,
  check: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  arrowR: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  x: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  star: <svg viewBox="0 0 24 24" width="13" height="13" fill="#FBBF24" stroke="#FBBF24" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  lock: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={BP_GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  rocket: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={BP_GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/></svg>,
  tag: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={BP_GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  crown: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={BP_GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 20h18"/><path d="M5 20V8l7-5 7 5v12"/><path d="M5 14h14"/></svg>,
  chartLine: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
};

/* ─── Operator logo cells ──────────────────────────────────── */
const OPS = [
  { name: "MTN Mobile",   color: "#FFC107", text: "#000", abbr: "MTN",    avail: true  },
  { name: "Orange Money", color: "#FF6D00", text: "#fff", abbr: "Orange", avail: true  },
  { name: "Moov Money",   color: "#1565C0", text: "#fff", abbr: "Moov",   avail: true  },
  { name: "Wave",         color: "var(--theme-text)", text: "#fff", abbr: "Wave",   avail: true  },
  { name: "Airtel Money", color: "#EF4444", text: "#fff", abbr: "Airtel", avail: true  },
  { name: "Free Money",   color: "#E91E63", text: "#fff", abbr: "Free",   avail: false },
];

export default function WalletPage() {
  /* ── state ── */
  const [balance, setBalance]           = useState(0);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [transactions, setTransactions] = useState<ApiTx[]>([]);
  const [loading, setLoading]           = useState(true);
  const [users, setUsers]               = useState<PublicUser[]>([]);
  const [modal, setModal]               = useState<Modal>(() => {
    const p = new URLSearchParams(window.location.search).get("tab") as Modal;
    return (p && ["depot","envoyer","historique","jetons","cadeaux"].includes(p)) ? p : null;
  });
  const [hideBalance, setHideBalance]   = useState(false);
  const [chartRange, setChartRange]     = useState<"7J"|"30J"|"3M"|"1A">("7J");

  /* gift history */
  const [giftHistory, setGiftHistory]                 = useState<ApiGiftHistoryItem[]>([]);
  const [giftLoading, setGiftLoading]                 = useState(false);
  const [giftOffset, setGiftOffset]                   = useState(0);
  const [giftHasMore, setGiftHasMore]                 = useState(true);
  const GIFT_PAGE = 20;

  /* deposit */
  const [depotMethod, setDepotMethod]   = useState<DepotMethod>("mtn");
  const [depotAmount, setDepotAmount]   = useState("");
  const [depotPhone, setDepotPhone]     = useState("");

  /* send */
  const [sendTo, setSendTo]             = useState("");
  const [sendToId, setSendToId]         = useState<number|null>(null);
  const [sendAmount, setSendAmount]     = useState("");

  /* token purchase */
  const [tokenPack, setTokenPack]           = useState<typeof TOKEN_PACKS[0]|null>(null);
  const [tokenOp, setTokenOp]               = useState<TokenOp>("orange");
  const [tokenPhone, setTokenPhone]         = useState("");
  const [tokenLoading, setTokenLoading]     = useState(false);
  const [tokenResult, setTokenResult]       = useState<ApiTokenPurchase|null>(null);
  const [tokenError, setTokenError]         = useState<string|null>(null);
  const [tokenConfirmed, setTokenConfirmed] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval>|null>(null);

  /* action states */
  const [processing, setProcessing]   = useState(false);
  const [success, setSuccess]         = useState<string|null>(null);
  const [txError, setTxError]         = useState<string|null>(null);

  const meId = useCurrentUser().id ?? 0;

  /* ── initial load ── */
  useEffect(() => {
    Promise.all([apiGetWallet(), apiGetTransactions(), apiGetUsers(), apiGetCreatorWallet()])
      .then(([w, txs, userList, cw]) => {
        setBalance(Number(w.balance));
        setTransactions(txs);
        setUsers(userList.filter(u => u.id !== meId));
        setTokenBalance(cw.tokenBalance);
      })
      .catch(()=>{})
      .finally(()=>setLoading(false));
  }, []);

  /* ── token purchase poll ── */
  useEffect(() => {
    if (!tokenResult) { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } return; }
    const start = Date.now();
    pollRef.current = setInterval(async () => {
      if (Date.now() - start > 5*60*1000) { clearInterval(pollRef.current!); return; }
      try {
        const s = await apiGetTokenPurchaseStatus(tokenResult.purchaseId);
        if (s.status === "confirmed") {
          clearInterval(pollRef.current!); setTokenConfirmed(true);
          const cw = await apiGetCreatorWallet(); setTokenBalance(cw.tokenBalance);
        } else if (s.status === "failed") {
          clearInterval(pollRef.current!); setTokenError("Paiement échoué."); setTokenResult(null);
        }
      } catch { /* ignore */ }
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [tokenResult]);

  /* ── gift history load when modal opens ── */
  useEffect(() => {
    if (modal !== "cadeaux") return;
    setGiftLoading(true);
    apiGetGiftHistory(GIFT_PAGE, 0)
      .then(items => { setGiftHistory(items); setGiftOffset(items.length); setGiftHasMore(items.length===GIFT_PAGE); })
      .catch(()=>{}).finally(()=>setGiftLoading(false));
  }, [modal]);

  const loadMoreGifts = async () => {
    if (giftLoading || !giftHasMore) return;
    setGiftLoading(true);
    const items = await apiGetGiftHistory(GIFT_PAGE, giftOffset).catch(()=>[]);
    setGiftHistory(p=>[...p,...items]); setGiftOffset(p=>p+items.length); setGiftHasMore(items.length===GIFT_PAGE);
    setGiftLoading(false);
  };

  const reloadWallet = () =>
    Promise.all([apiGetWallet(), apiGetTransactions()])
      .then(([w, txs]) => { setBalance(Number(w.balance)); setTransactions(txs); });

  /* ── actions ── */
  const handleDeposit = async () => {
    if (!depotAmount||!depotPhone) return;
    setProcessing(true); setTxError(null);
    try {
      await apiDeposit(parseInt(depotAmount), depotMethod, depotPhone);
      await reloadWallet();
      trackEvent("wallet_deposit_completed", { payment_method: depotMethod });
      setSuccess(`+${parseInt(depotAmount).toLocaleString()} FCFA reçus !`);
      setDepotAmount(""); setDepotPhone("");
      setTimeout(()=>{ setSuccess(null); setModal(null); }, 2500);
    } catch(e) { setTxError(e instanceof Error ? e.message : "Dépôt échoué"); }
    setProcessing(false);
  };

  const handleSend = async () => {
    if (!sendAmount||!sendToId) return;
    const amt = parseInt(sendAmount);
    if (amt>balance) return;
    setProcessing(true); setTxError(null);
    try {
      await apiTransfer(sendToId, amt, `Transfert → ${sendTo}`);
      await reloadWallet();
      trackEvent("wallet_transfer_completed", { transfer_type: "peer" });
      setSuccess(`${amt.toLocaleString()} FCFA envoyés !`);
      setSendAmount(""); setSendTo(""); setSendToId(null);
      setTimeout(()=>{ setSuccess(null); setModal(null); }, 2500);
    } catch(e) { setTxError(e instanceof Error ? e.message : "Transfert échoué"); }
    setProcessing(false);
  };

  const handleTokenPurchase = async () => {
    if (!tokenPack||!tokenPhone) return;
    setTokenLoading(true); setTokenError(null); setTokenResult(null); setTokenConfirmed(false);
    try {
      const result = await apiPurchaseTokens({ packId: tokenPack.id, paymentMethod: tokenOp, paymentPhone: tokenPhone });
      setTokenResult(result);
      trackEvent("token_purchase_completed", { payment_method: tokenOp, pack: tokenPack.id });
    }
    catch(e) { setTokenError(e instanceof Error ? e.message : "Erreur d'achat"); }
    setTokenLoading(false);
  };

  /* ── normalise txs ── */
  const normTxs = transactions.map(tx => {
    let txType = "paiement";
    if (tx.type==="deposit") txType="depot";
    else if (tx.type==="transfer"&&tx.fromUserId===meId) txType="envoi";
    else if (tx.type==="transfer"&&tx.toUserId===meId)   txType="reception";
    return {
      ...tx, txType,
      label: tx.description??"Transaction",
      date: new Date(tx.createdAt).toLocaleDateString("fr-FR",{day:"numeric",month:"short",year:"numeric"}),
      time: new Date(tx.createdAt).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}),
    };
  });

  const txColor: Record<string,string> = { depot:"var(--bp-primary)", envoi:"#EF4444", reception:"var(--bp-primary)", paiement:"#F97316" };

  /* ── stat computations ── */
  const now = new Date();
  const monthTxs = normTxs.filter(tx => new Date(tx.createdAt).getMonth()===now.getMonth());
  const totalReceived  = monthTxs.filter(t=>t.txType==="reception"||t.txType==="depot").reduce((a,t)=>a+t.amount,0);
  const totalSent      = monthTxs.filter(t=>t.txType==="envoi").reduce((a,t)=>a+t.amount,0);
  const revenueMarket  = monthTxs.filter(t=>t.label.toLowerCase().includes("marketplace")).reduce((a,t)=>a+t.amount,0);

  /* ── chart SVG generator ── */
  const makeChart = () => {
    const pts  = CHART_POINTS;
    const W=240, H=80, pad=8;
    const max  = Math.max(...pts,1);
    const xs   = pts.map((_,i)=>pad + (i/(pts.length-1))*(W-2*pad));
    const ys   = pts.map(p  => H-pad - (p/max)*(H-2*pad));
    const line = xs.map((x,i)=>`${i===0?"M":"L"}${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(" ");
    const area = line + ` L${xs[xs.length-1].toFixed(1)} ${H} L${xs[0].toFixed(1)} ${H} Z`;
    const labels = ["12 Mai","13 Mai","14 Mai","15 Mai","16 Mai","17 Mai","18 Mai","19 Mai","20 Mai"];
    return { W, H, line, area, xs, ys, labels };
  };
  const chart = makeChart();

  /* ── helpers ── */
  const closeModal  = () => { setModal(null); setSuccess(null); setTxError(null); setTokenError(null); };
  const fmtNum = (n:number) => n.toLocaleString("fr-FR");

  /* ── action tile config ── */
  const ACTIONS = [
    { id:"depot" as Modal,     label:"Déposer",          icon: I.download, color:"var(--bp-primary)" },
    { id:"retirer" as Modal,   label:"Retirer",          icon: I.upload,   color:"#EF4444" },
    { id:"envoyer" as Modal,   label:"Envoyer",          icon: I.send,     color:"#6366F1" },
    { id:"recevoir" as Modal,  label:"Recevoir",         icon: I.receive,  color:"#F97316" },
    { id:"jetons" as Modal,    label:"Acheter des jetons", icon: I.coins,  color:"#EC4899" },
    { id:"historique" as Modal,label:"Historique",       icon: I.history,  color:"#64748B" },
  ];

  /* ═══════════════════════════════════════════════════════════ */
  return (
    <div style={{ background:"#F8FAFC", minHeight:"100vh", maxWidth:640, margin:"0 auto" }}>

      {/* ══ 1. HERO WALLET CARD ══════════════════════════════ */}
      <div style={{
        background:"linear-gradient(135deg, #0a8f32 0%, var(--bp-primary) 55%, var(--bp-primary) 100%)",
        borderRadius:"0 0 28px 28px", padding:"24px 20px 32px", position:"relative", overflow:"hidden",
      }}>
        {/* decorative circles */}
        <div style={{ position:"absolute", top:-40, right:-40, width:180, height:180, borderRadius:"50%", background:"rgba(255,255,255,0.06)" }} />
        <div style={{ position:"absolute", bottom:-60, left:-30, width:200, height:200, borderRadius:"50%", background:"rgba(255,255,255,0.04)" }} />

        {/* top row */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:20 }}>
          <div>
            <div style={{ color:"rgba(255,255,255,0.85)", fontSize:13, fontWeight:600, marginBottom:2 }}>Mon Portefeuille BrutePawa</div>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ background:"rgba(255,255,255,0.2)", borderRadius:20, padding:"3px 10px", display:"flex", alignItems:"center", gap:5, color:"#fff", fontSize:11.5, fontWeight:700 }}>
                <span style={{ opacity:0.9 }}>{I.shield}</span> Compte vérifié
              </div>
            </div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ background:"rgba(255,255,255,0.25)", borderRadius:20, padding:"4px 12px", color:"#fff", fontSize:11.5, fontWeight:700, display:"inline-flex", alignItems:"center", gap:5 }}>
              {I.check} Compte vérifié
            </div>
            <div style={{ background:"rgba(255,255,255,0.15)", borderRadius:12, padding:"3px 10px", color:"rgba(255,255,255,0.9)", fontSize:11, fontWeight:600, marginTop:5, textAlign:"center" }}>
              Niveau 1
            </div>
          </div>
        </div>

        {/* balance */}
        <div style={{ marginBottom:4 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
            <span style={{ color:"rgba(255,255,255,0.8)", fontSize:13, fontWeight:500 }}>Solde disponible</span>
            <button onClick={()=>setHideBalance(b=>!b)} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.75)", cursor:"pointer", padding:0, display:"flex" }}>
              {hideBalance ? I.eyeOff : I.eye}
            </button>
          </div>
          <div style={{ color:"#fff", fontSize:38, fontWeight:900, letterSpacing:-1, lineHeight:1 }}>
            {loading ? "…" : hideBalance ? "• • • • •" : `${fmtNum(balance)} FCFA`}
          </div>
          <div style={{ color:"rgba(255,255,255,0.65)", fontSize:13, marginTop:3 }}>
            {hideBalance ? "—" : `≈ ${(balance/USD_RATE).toFixed(2)} USD`}
          </div>
        </div>

        {/* jetons row */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:20, background:"rgba(255,255,255,0.12)", borderRadius:16, padding:"10px 14px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:32, height:32, borderRadius:"50%", background:"rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              {I.coins}
            </div>
            <div>
              <div style={{ color:"rgba(255,255,255,0.75)", fontSize:11 }}>Jetons disponibles</div>
              <div style={{ color:"#fff", fontWeight:800, fontSize:15 }}>{fmtNum(tokenBalance)} Jeton{tokenBalance!==1?"s":""}</div>
            </div>
          </div>
          <button onClick={()=>setModal("jetons")} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.8)", cursor:"pointer", display:"flex", alignItems:"center", gap:4, fontSize:13 }}>
            {I.arrowR}
          </button>
        </div>
      </div>

      {/* ══ 2. QUICK ACTIONS ════════════════════════════════ */}
      <div style={{ background:"#fff", margin:"12px 12px 0", borderRadius:20, padding:"16px 12px", boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
        <div style={{ fontWeight:700, fontSize:14, color:"#111827", marginBottom:14 }}>Actions rapides</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
          {ACTIONS.map(a => (
            <button key={a.id} onClick={()=>setModal(a.id)}
              style={{ border:"none", background:"none", cursor:"pointer", padding:"10px 4px 8px", borderRadius:16, display:"flex", flexDirection:"column", alignItems:"center", gap:6, transition:"background .15s" }}
              onMouseEnter={e=>(e.currentTarget.style.background="#F8FAFC")}
              onMouseLeave={e=>(e.currentTarget.style.background="none")}
            >
              <div style={{ width:48, height:48, borderRadius:16, background:`${a.color}15`, display:"flex", alignItems:"center", justifyContent:"center", color:a.color }}>
                {a.icon}
              </div>
              <div style={{ fontSize:12, fontWeight:600, color:"#64748B", textAlign:"center", lineHeight:1.2 }}>{a.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ══ 3. STATS ════════════════════════════════════════ */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, margin:"10px 12px 0" }}>
        {[
          { label:"Transactions ce mois", val: monthTxs.length.toString(), icon: I.chartLine, color:"#6366F1" },
          { label:"Montant reçu",          val:`${fmtNum(totalReceived)} FCFA`,    icon: I.download, color: BP_GREEN },
          { label:"Montant envoyé",         val:`${fmtNum(totalSent)} FCFA`,        icon: I.upload,   color:"#EF4444" },
          { label:"Revenus Marketplace",   val:`${fmtNum(revenueMarket)} FCFA`,   icon: I.tag,      color:"#F97316" },
        ].map((s,i) => (
          <div key={i} style={{ background:"#fff", borderRadius:16, padding:"14px 14px 12px", boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
              <span style={{ fontSize:11.5, color:"#9CA3AF", fontWeight:500, lineHeight:1.3 }}>{s.label}</span>
              <div style={{ width:28, height:28, borderRadius:10, background:`${s.color}15`, display:"flex", alignItems:"center", justifyContent:"center", color:s.color }}>
                {s.icon}
              </div>
            </div>
            <div style={{ fontWeight:800, fontSize:17, color:"#111827" }}>{s.val}</div>
            <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:4 }}>
              <div style={{ width:16, height:16, borderRadius:"50%", background:`${s.color}20`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
              </div>
              <span style={{ fontSize:11, color:s.color, fontWeight:600 }}>Ce mois</span>
            </div>
          </div>
        ))}
      </div>

      {/* ══ 4. OPERATORS + CHART (2-col) ═════════════════════ */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, margin:"10px 12px 0" }}>

        {/* Operators */}
        <div style={{ background:"#fff", borderRadius:20, padding:"14px 12px", boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
            <span style={{ fontWeight:700, fontSize:13, color:"#111827" }}>Opérateurs</span>
            <button style={{ background:"none", border:"none", color:BP_GREEN, fontSize:11, fontWeight:700, cursor:"pointer" }}>Voir tout</button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
            {OPS.map(op => (
              <div key={op.name} style={{ textAlign:"center" }}>
                <div style={{ width:36, height:36, borderRadius:12, background:op.color, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 4px" }}>
                  <span style={{ color:op.text, fontWeight:900, fontSize:8.5, lineHeight:1 }}>{op.abbr}</span>
                </div>
                <div style={{ fontSize:9, fontWeight:600, color:"#64748B", marginBottom:2, lineHeight:1.1 }}>{op.name}</div>
                <div style={{ fontSize:8.5, fontWeight:700, color: op.avail ? BP_GREEN : "#9CA3AF", background: op.avail ? `${BP_GREEN}15` : "#F1F5F9", borderRadius:10, padding:"1px 4px", display:"inline-block" }}>
                  {op.avail ? "Disponible" : "Bientôt"}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div style={{ background:"#fff", borderRadius:20, padding:"14px 12px", boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ fontWeight:700, fontSize:13, color:"#111827", marginBottom:8 }}>Évolution du solde</div>
          {/* range buttons */}
          <div style={{ display:"flex", gap:4, marginBottom:8 }}>
            {(["7J","30J","3M","1A"] as const).map(r => (
              <button key={r} onClick={()=>setChartRange(r)} style={{ padding:"2px 8px", borderRadius:10, border:"none", background: chartRange===r ? BP_GREEN : "#F1F5F9", color: chartRange===r ? "#fff" : "#9CA3AF", fontSize:10, fontWeight:700, cursor:"pointer" }}>{r}</button>
            ))}
          </div>
          <svg viewBox={`0 0 ${chart.W} ${chart.H}`} width="100%" style={{ overflow:"visible" }}>
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={BP_GREEN} stopOpacity="0.25" />
                <stop offset="100%" stopColor={BP_GREEN} stopOpacity="0.01" />
              </linearGradient>
            </defs>
            {/* grid lines */}
            {[0,1,2,3].map(i => (
              <line key={i} x1="8" x2={chart.W-8} y1={8+(i/3)*(chart.H-16)} y2={8+(i/3)*(chart.H-16)} stroke="#F1F5F9" strokeWidth="1" />
            ))}
            <path d={chart.area} fill="url(#chartGrad)" />
            <path d={chart.line} fill="none" stroke={BP_GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {/* dots */}
            {chart.xs.map((x,i) => (
              <circle key={i} cx={x} cy={chart.ys[i]} r="3" fill={BP_GREEN} stroke="#fff" strokeWidth="1.5" />
            ))}
          </svg>
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
            {["12","13","14","15","16","17","18"].map(d=>(
              <span key={d} style={{ fontSize:8, color:"#E5E7EB" }}>{d}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ══ 5. TRANSACTIONS RÉCENTES ════════════════════════ */}
      <div style={{ background:"#fff", margin:"10px 12px 0", borderRadius:20, boxShadow:"0 2px 8px rgba(0,0,0,0.05)", overflow:"hidden" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 16px 10px" }}>
          <span style={{ fontWeight:700, fontSize:14, color:"#111827" }}>Transactions récentes</span>
          <button onClick={()=>setModal("historique")} style={{ background:"none", border:"none", color:BP_GREEN, fontWeight:700, fontSize:12.5, cursor:"pointer" }}>Voir tout</button>
        </div>
        {normTxs.length===0 && (
          <div style={{ padding:"24px 16px", textAlign:"center", color:"#9CA3AF", fontSize:13 }}>
            Aucune transaction pour l'instant. Faites votre premier dépôt !
          </div>
        )}
        {normTxs.slice(0,5).map(tx => {
          const isIn = tx.txType==="depot"||tx.txType==="reception";
          const color = txColor[tx.txType]??"#9CA3AF";
          return (
            <div key={tx.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 16px", borderTop:"1px solid #F8FAFC" }}>
              <div style={{ width:42, height:42, borderRadius:14, background:`${color}18`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, color }}>
                {isIn ? I.download : I.upload}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:13.5, color:"#111827", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{tx.label}</div>
                <div style={{ fontSize:11.5, color:"#9CA3AF", marginTop:1 }}>{tx.date}, {tx.time}</div>
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{ fontWeight:800, fontSize:14, color }}>{isIn?"+":"-"}{fmtNum(tx.amount)} FCFA</div>
                <div style={{ fontSize:10.5, fontWeight:700, color: tx.status==="completed" ? BP_GREEN : "#F97316", display:"flex", alignItems:"center", gap:3, justifyContent:"flex-end", marginTop:2 }}>
                  <span style={{ width:6, height:6, borderRadius:"50%", background: tx.status==="completed" ? BP_GREEN : "#F97316", display:"inline-block" }} />
                  {tx.status==="completed" ? "Réussi" : tx.status==="pending" ? "En attente" : "Échoué"}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ══ 6. JETONS PROGRAMME + SÉCURITÉ (2-col) ══════════ */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, margin:"10px 12px 12px" }}>

        {/* Programme jetons */}
        <div style={{ background:"#fff", borderRadius:20, padding:"14px 12px", boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ fontWeight:700, fontSize:13, color:"#111827", marginBottom:8 }}>Programme Jetons</div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
            <div style={{ width:38, height:38, borderRadius:12, background:"#EC489915", display:"flex", alignItems:"center", justifyContent:"center", color:"#EC4899" }}>{I.coins}</div>
            <div>
              <div style={{ fontSize:10.5, color:"#9CA3AF" }}>Jetons disponibles</div>
              <div style={{ fontWeight:800, fontSize:15, color:"#111827" }}>{fmtNum(tokenBalance)} Jeton{tokenBalance!==1?"s":""}</div>
            </div>
          </div>
          {[
            { icon: I.rocket, label:"Mise en avant des annonces" },
            { icon: I.gift,   label:"Cadeaux virtuels"           },
            { icon: I.tag,    label:"Promotions exclusives"       },
            { icon: I.crown,  label:"Abonnements premium"         },
          ].map((item, i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:7, marginBottom:5 }}>
              <span>{item.icon}</span>
              <span style={{ fontSize:11, color:"#64748B" }}>{item.label}</span>
            </div>
          ))}
          <button onClick={()=>setModal("jetons")} style={{ width:"100%", marginTop:10, background:BP_GREEN, color:"#fff", border:"none", borderRadius:12, padding:"9px 0", fontWeight:700, fontSize:12.5, cursor:"pointer", boxShadow:`0 3px 12px ${BP_GREEN}40` }}>
            Acheter des jetons
          </button>
        </div>

        {/* Sécurité */}
        <div style={{ background:"#fff", borderRadius:20, padding:"14px 12px", boxShadow:"0 2px 8px rgba(0,0,0,0.05)", display:"flex", flexDirection:"column", gap:0 }}>
          <div style={{ fontWeight:700, fontSize:13, color:"#111827", marginBottom:10 }}>Votre compte est sécurisé</div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", marginBottom:12 }}>
            <div style={{ width:54, height:54, borderRadius:18, background:`${BP_GREEN}15`, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke={BP_GREEN} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
            </div>
          </div>
          {[
            "Vérification effectuée",
            "Transactions protégées",
            "Connexion sécurisée",
            "Authentification renforcée",
          ].map((item,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
              <div style={{ width:16, height:16, borderRadius:"50%", background:BP_GREEN, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                {I.check}
              </div>
              <span style={{ fontSize:10.5, color:"#64748B", fontWeight:500 }}>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ══ MODAL OVERLAY ════════════════════════════════════ */}
      {modal && (
        <div
          onClick={e=>{ if (e.target===e.currentTarget) closeModal(); }}
          style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.55)", zIndex:100, display:"flex", flexDirection:"column", justifyContent:"flex-end" }}
        >
          <div style={{ background:"#fff", borderRadius:"24px 24px 0 0", maxHeight:"88vh", overflow:"auto", padding:"0 0 32px" }}>
            {/* drag handle */}
            <div style={{ padding:"12px 20px 0", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ width:36, height:4, borderRadius:2, background:"#E5E7EB", margin:"0 auto" }} />
            </div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 20px 16px", borderBottom:"1px solid #F1F5F9" }}>
              <span style={{ fontWeight:800, fontSize:17, color:"#111827" }}>
                {modal==="depot" && "Déposer de l'argent"}
                {modal==="retirer" && "Retirer de l'argent"}
                {modal==="envoyer" && "Envoyer de l'argent"}
                {modal==="recevoir" && "Recevoir de l'argent"}
                {modal==="jetons" && "Acheter des jetons"}
                {modal==="historique" && "Toutes les transactions"}
                {modal==="cadeaux" && "Cadeaux envoyés"}
              </span>
              <button onClick={closeModal} style={{ width:32, height:32, borderRadius:"50%", background:"#F1F5F9", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#64748B" }}>
                {I.x}
              </button>
            </div>

            <div style={{ padding:"16px 20px" }}>
              {success && <div style={{ background:"#DCFCE7", color:"var(--bp-primary-dark)", borderRadius:12, padding:"12px 16px", fontWeight:700, marginBottom:12, textAlign:"center" }}>{success}</div>}
              {txError && <div style={{ background:"#FEE2E2", color:"#EF4444", borderRadius:12, padding:"12px 16px", fontWeight:700, marginBottom:12 }}>{txError}</div>}

              {/* ── DEPOT ── */}
              {modal==="depot" && (
                <div>
                  <div style={{ display:"flex", gap:8, marginBottom:16 }}>
                    {(Object.entries(METHOD_INFO) as [DepotMethod, typeof METHOD_INFO[DepotMethod]][]).map(([k,m])=>(
                      <button key={k} onClick={()=>setDepotMethod(k)} style={{ flex:1, padding:"12px 0", borderRadius:14, cursor:"pointer", fontWeight:700, fontSize:12, border:`2px solid ${depotMethod===k ? m.color : "#E5E7EB"}`, background: depotMethod===k ? `${m.color}15` : "#fff" }}>
                        <div style={{ width:28, height:28, borderRadius:10, background:m.color, color: k==="mtn"?"#000":"#fff", fontSize:10, fontWeight:900, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 6px" }}>{m.abbr}</div>
                        <div>{m.abbr}</div>
                      </button>
                    ))}
                  </div>
                  <label style={lbl}>Numéro de téléphone</label>
                  <input value={depotPhone} onChange={e=>setDepotPhone(e.target.value)} placeholder={METHOD_INFO[depotMethod].prefix+" XX XX XX"} style={ipt} />
                  <label style={lbl}>Montant (FCFA)</label>
                  <input value={depotAmount} onChange={e=>setDepotAmount(e.target.value)} type="number" placeholder="Ex : 50 000" style={{ ...ipt, fontSize:22, fontWeight:800 }} />
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>
                    {[5000,10000,25000,50000,100000].map(a=>(
                      <button key={a} onClick={()=>setDepotAmount(String(a))} style={{ padding:"6px 14px", borderRadius:20, border:`1px solid ${depotAmount===String(a)?BP_GREEN:"#E5E7EB"}`, background: depotAmount===String(a)?BP_GREEN:"#fff", color: depotAmount===String(a)?"#fff":"#64748B", fontWeight:700, cursor:"pointer", fontSize:13 }}>{fmtNum(a)}</button>
                    ))}
                  </div>
                  <button onClick={handleDeposit} disabled={processing||!depotAmount||!depotPhone} style={btnGreen(processing||!depotAmount||!depotPhone)}>
                    {processing?"Traitement…":`Déposer ${depotAmount?fmtNum(parseInt(depotAmount))+" FCFA":""}`}
                  </button>
                </div>
              )}

              {/* ── RETIRER (placeholder) ── */}
              {modal==="retirer" && (
                <div style={{ textAlign:"center", padding:"32px 16px" }}>
                  <div style={{ width:64, height:64, borderRadius:20, background:"#F1F5F9", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", color:"#9CA3AF" }}>{I.upload}</div>
                  <div style={{ fontWeight:700, fontSize:16, color:"#111827", marginBottom:8 }}>Retrait Mobile Money</div>
                  <div style={{ fontSize:14, color:"#64748B", lineHeight:1.6 }}>Le retrait vers votre compte Mobile Money sera disponible prochainement.</div>
                </div>
              )}

              {/* ── ENVOYER ── */}
              {modal==="envoyer" && (
                <div>
                  <label style={lbl}>Envoyer à</label>
                  <input value={sendTo} onChange={e=>{ setSendTo(e.target.value); setSendToId(null); }} placeholder="Nom ou email" style={ipt} />
                  {users.length>0 && (
                    <div style={{ display:"flex", gap:10, overflowX:"auto", scrollbarWidth:"none", marginBottom:16, paddingBottom:4 }}>
                      {users.slice(0,8).map(u=>{
                        const name=`${u.firstName} ${u.lastName}`;
                        const colors=["var(--bp-primary)","#EC4899","#8B5CF6","#D97706",BP_GREEN];
                        const color=colors[u.id%colors.length];
                        const inits=name.split(" ").map((w:string)=>w[0]).join("").slice(0,2).toUpperCase();
                        const sel=sendToId===u.id;
                        return (
                          <div key={u.id} onClick={()=>{ setSendTo(name); setSendToId(u.id); }} style={{ flexShrink:0, textAlign:"center", cursor:"pointer" }}>
                            <div style={{ width:44, height:44, borderRadius:"50%", background:color, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:14, border:`3px solid ${sel?BP_GREEN:"transparent"}`, margin:"0 auto 4px", overflow:"hidden" }}>
                              {u.avatarUrl?<img src={u.avatarUrl} alt={name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />:inits}
                            </div>
                            <div style={{ fontSize:10, fontWeight:600, color:"#64748B" }}>{u.firstName}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <label style={lbl}>Montant (FCFA)</label>
                  <input value={sendAmount} onChange={e=>setSendAmount(e.target.value)} type="number" placeholder="Ex : 25 000" style={{ ...ipt, fontSize:22, fontWeight:800 }} />
                  {sendAmount && parseInt(sendAmount)>balance && <div style={{ color:"#EF4444", fontSize:13, fontWeight:700, marginBottom:8 }}>Solde insuffisant ({fmtNum(balance)} FCFA disponibles)</div>}
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>
                    {[5000,10000,25000,50000].map(a=>(
                      <button key={a} onClick={()=>setSendAmount(String(a))} style={{ padding:"6px 14px", borderRadius:20, border:`1px solid ${sendAmount===String(a)?BP_GREEN:"#E5E7EB"}`, background: sendAmount===String(a)?BP_GREEN:"#fff", color: sendAmount===String(a)?"#fff":"#64748B", fontWeight:700, cursor:"pointer", fontSize:13 }}>{fmtNum(a)}</button>
                    ))}
                  </div>
                  <button onClick={handleSend} disabled={processing||!sendAmount||!sendToId||parseInt(sendAmount)>balance} style={btnGreen(processing||!sendAmount||!sendToId||parseInt(sendAmount||"0")>balance)}>
                    {processing?"Envoi en cours…":`Envoyer ${sendAmount?fmtNum(parseInt(sendAmount))+" FCFA":""}`}
                  </button>
                </div>
              )}

              {/* ── RECEVOIR ── */}
              {modal==="recevoir" && (
                <div style={{ textAlign:"center", padding:"20px 0" }}>
                  <div style={{ fontWeight:700, fontSize:15, color:"#111827", marginBottom:6 }}>Partagez votre identifiant</div>
                  <div style={{ fontSize:13, color:"#64748B", marginBottom:20 }}>Demandez à votre contact de vous envoyer de l'argent avec cet identifiant.</div>
                  <div style={{ background:"#F8FAFC", border:"2px solid #E5E7EB", borderRadius:16, padding:"16px 20px", fontFamily:"monospace", fontSize:16, fontWeight:800, color:"#111827", letterSpacing:1, marginBottom:16 }}>
                    BP-{String(meId).padStart(6,"0")}
                  </div>
                  <div style={{ fontSize:12, color:"#9CA3AF" }}>ID BrutePawa unique</div>
                </div>
              )}

              {/* ── JETONS ── */}
              {modal==="jetons" && (
                <div>
                  {!tokenResult ? (
                    <>
                      <div style={{ background:"linear-gradient(135deg, #EC4899, #8B5CF6)", borderRadius:16, padding:"14px 16px", marginBottom:16, color:"#fff" }}>
                        <div style={{ fontSize:12, opacity:0.8 }}>Solde jetons</div>
                        <div style={{ fontSize:30, fontWeight:900, margin:"2px 0" }}>{fmtNum(tokenBalance)} jetons</div>
                        <div style={{ fontSize:12, opacity:0.7 }}>1 jeton = 5 XOF</div>
                      </div>
                      <div style={{ fontWeight:700, fontSize:14, marginBottom:10 }}>Choisir un pack</div>
                      {TOKEN_PACKS.map(p=>(
                        <button key={p.id} onClick={()=>setTokenPack(p)} style={{ width:"100%", display:"flex", alignItems:"center", gap:14, padding:"14px 16px", borderRadius:14, border:`2px solid ${tokenPack?.id===p.id?"#EC4899":"#E5E7EB"}`, background: tokenPack?.id===p.id?"#FEE2E2":"#fff", cursor:"pointer", textAlign:"left", marginBottom:8 }}>
                          <div style={{ width:40, height:40, borderRadius:12, background:"#EC489915", display:"flex", alignItems:"center", justifyContent:"center", color:"#EC4899", flexShrink:0 }}>{I.coins}</div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontWeight:800, fontSize:14 }}>{p.label}</div>
                            <div style={{ fontSize:12.5, color:"#64748B" }}>{fmtNum(p.tokens)} jetons</div>
                          </div>
                          <div style={{ fontWeight:900, fontSize:15, color:"#EC4899" }}>{fmtNum(p.xof)} XOF</div>
                        </button>
                      ))}
                      {tokenPack && (
                        <>
                          <div style={{ fontWeight:700, fontSize:14, margin:"14px 0 8px" }}>Opérateur Mobile Money</div>
                          <div style={{ display:"flex", gap:8, marginBottom:14 }}>
                            {TOKEN_OPERATORS.map(op=>(
                              <button key={op.id} onClick={()=>setTokenOp(op.id)} style={{ flex:1, padding:"10px 0", borderRadius:12, cursor:"pointer", fontWeight:700, fontSize:12, border:`2px solid ${tokenOp===op.id?"#EC4899":"#E5E7EB"}`, background: tokenOp===op.id?"#FEE2E2":"#fff" }}>
                                <div style={{ width:26, height:26, borderRadius:8, background:op.color, margin:"0 auto 5px", fontSize:9, fontWeight:900, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center" }}>{op.id.toUpperCase()}</div>
                                <div>{op.label.split(" ")[0]}</div>
                              </button>
                            ))}
                          </div>
                          <label style={lbl}>Numéro de téléphone</label>
                          <input value={tokenPhone} onChange={e=>setTokenPhone(e.target.value)} placeholder="+225 07 XX XX XX XX" style={ipt} />
                          {tokenError && <div style={{ background:"#FEE2E2", color:"#EF4444", borderRadius:10, padding:"10px 14px", marginBottom:12, fontSize:13 }}>{tokenError}</div>}
                          <button onClick={handleTokenPurchase} disabled={tokenLoading||!tokenPhone} style={btnPink(tokenLoading||!tokenPhone)}>
                            {tokenLoading?"Traitement…":`Acheter ${fmtNum(tokenPack.tokens)} jetons — ${fmtNum(tokenPack.xof)} XOF`}
                          </button>
                        </>
                      )}
                    </>
                  ) : tokenConfirmed ? (
                    <div style={{ textAlign:"center", padding:"20px 0" }}>
                      <div style={{ width:64, height:64, borderRadius:20, background:`${BP_GREEN}20`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px", color:BP_GREEN }}>
                        <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                      <div style={{ fontWeight:900, fontSize:20, color:BP_GREEN, marginBottom:6 }}>Jetons crédités !</div>
                      <div style={{ fontSize:14, color:"#64748B", marginBottom:20 }}>+{fmtNum(tokenResult!.tokens)} jetons ajoutés à votre solde.</div>
                      <button onClick={()=>{ setTokenResult(null); setTokenPack(null); setTokenPhone(""); setTokenConfirmed(false); }} style={btnGreen(false)}>Acheter d'autres jetons</button>
                    </div>
                  ) : (
                    <div>
                      <div style={{ textAlign:"center", marginBottom:16 }}>
                        <div style={{ fontWeight:800, fontSize:17 }}>Paiement en attente</div>
                        <div style={{ fontSize:13, color:"#64748B", marginTop:4 }}>Effectuez le paiement selon les instructions</div>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, marginTop:8, fontSize:12, color:"#9CA3AF" }}>
                          <span style={{ width:8, height:8, borderRadius:"50%", background:BP_GREEN, display:"inline-block", animation:"pulse 1.2s infinite" }} />
                          Vérification automatique en cours…
                        </div>
                      </div>
                      <div style={{ background:"#F8FAFC", borderRadius:12, padding:16, marginBottom:12, fontSize:14, lineHeight:1.7 }}>{tokenResult.instructions.message}</div>
                      <div style={{ fontWeight:700, fontSize:13, marginBottom:6 }}>Référence</div>
                      <div style={{ fontFamily:"monospace", background:"#F0FDF4", borderRadius:8, padding:"10px 14px", fontSize:14, fontWeight:700, marginBottom:14, wordBreak:"break-all" }}>{tokenResult.paymentRef}</div>
                      <button onClick={()=>{ setTokenResult(null); setTokenPack(null); setTokenPhone(""); }} style={btnPink(false)}>Annuler / Nouveau achat</button>
                    </div>
                  )}
                </div>
              )}

              {/* ── HISTORIQUE ── */}
              {modal==="historique" && (
                <div>
                  {normTxs.length===0 && <div style={{ textAlign:"center", padding:"32px 0", color:"#9CA3AF", fontSize:14 }}>Aucune transaction pour l'instant</div>}
                  {normTxs.map(tx=>{
                    const isIn=tx.txType==="depot"||tx.txType==="reception";
                    const color=txColor[tx.txType]??"#9CA3AF";
                    return (
                      <div key={tx.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 0", borderBottom:"1px solid #F8FAFC" }}>
                        <div style={{ width:44, height:44, borderRadius:14, background:`${color}18`, display:"flex", alignItems:"center", justifyContent:"center", color, flexShrink:0 }}>
                          {isIn?I.download:I.upload}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:700, fontSize:13.5, color:"#111827", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{tx.label}</div>
                          <div style={{ fontSize:11.5, color:"#9CA3AF" }}>{tx.date}</div>
                          <div style={{ fontSize:11, fontWeight:700, color: tx.status==="completed"?BP_GREEN:"#F97316", display:"flex", alignItems:"center", gap:4, marginTop:1 }}>
                            <span style={{ width:6, height:6, borderRadius:"50%", background: tx.status==="completed"?BP_GREEN:"#F97316", display:"inline-block" }} />
                            {tx.status==="completed"?"Réussi":tx.status==="pending"?"En attente":"Échoué"}
                          </div>
                        </div>
                        <div style={{ fontWeight:900, color, fontSize:15, flexShrink:0 }}>{isIn?"+":"-"}{fmtNum(tx.amount)} FCFA</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── CADEAUX ── */}
              {modal==="cadeaux" && (
                <div>
                  {giftLoading && giftHistory.length===0 && <div style={{ textAlign:"center", padding:"32px 0", color:"#9CA3AF" }}>Chargement…</div>}
                  {!giftLoading && giftHistory.length===0 && (
                    <div style={{ textAlign:"center", padding:"32px 0" }}>
                      <div style={{ width:56, height:56, borderRadius:18, background:"#FEE2E2", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px", color:"#EC4899" }}>{I.gift}</div>
                      <div style={{ fontWeight:700, fontSize:15, marginBottom:6 }}>Aucun cadeau envoyé</div>
                      <div style={{ fontSize:13, color:"#9CA3AF" }}>Rejoignez un live et envoyez des cadeaux !</div>
                    </div>
                  )}
                  {giftHistory.map(gift=>{
                    const date=new Date(gift.createdAt).toLocaleDateString("fr-FR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
                    const recipient=gift.receiverName?.trim()||`Utilisateur #${gift.receiverId}`;
                    return (
                      <div key={gift.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 0", borderBottom:"1px solid #F8FAFC" }}>
                        <div style={{ width:46, height:46, borderRadius:14, background:"linear-gradient(135deg, #FEE2E2, #FEE2E2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>
                          {gift.giftEmoji||"🎁"}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:800, fontSize:13.5 }}>{gift.giftName}</div>
                          <div style={{ fontSize:12, color:"#9CA3AF", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            À {recipient} · #{gift.contextId}
                          </div>
                          <div style={{ fontSize:11, color:"#9CA3AF" }}>{date}</div>
                        </div>
                        <div style={{ fontWeight:900, fontSize:14, color:"#EC4899", flexShrink:0 }}>-{fmtNum(gift.tokenAmount)} j.</div>
                      </div>
                    );
                  })}
                  {giftHasMore && (
                    <button onClick={loadMoreGifts} disabled={giftLoading} style={{ width:"100%", marginTop:12, background:"none", border:"2px solid #E5E7EB", borderRadius:12, padding:"11px 0", fontWeight:700, color:"#64748B", cursor:"pointer", fontSize:14 }}>
                      {giftLoading?"Chargement…":"Voir plus"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.25} }`}</style>
    </div>
  );
}

/* ── shared input/button styles ────────────────────────────── */
const lbl: React.CSSProperties = { display:"block", fontSize:13, fontWeight:700, color:"#64748B", marginBottom:6 };
const ipt: React.CSSProperties = { width:"100%", background:"#F8FAFC", border:"1.5px solid #E5E7EB", borderRadius:12, padding:"12px 14px", fontSize:15, marginBottom:14, boxSizing:"border-box", fontFamily:"inherit", outline:"none", color:"#111827" };
const btnGreen = (disabled: boolean): React.CSSProperties => ({
  width:"100%", background: disabled?"#E5E7EB":"linear-gradient(135deg, var(--bp-primary), var(--bp-primary))", color:"#fff", border:"none",
  borderRadius:14, padding:"15px 0", fontWeight:800, fontSize:16, cursor: disabled?"default":"pointer",
  boxShadow: disabled?"none":"0 6px 20px rgba(22,194,74,0.4)", opacity: disabled ? 0.7 : 1,
});
const btnPink = (disabled: boolean): React.CSSProperties => ({
  width:"100%", background: disabled?"#E5E7EB":"linear-gradient(135deg, #EC4899, #8B5CF6)", color:"#fff", border:"none",
  borderRadius:14, padding:"15px 0", fontWeight:800, fontSize:16, cursor: disabled?"default":"pointer",
  boxShadow: disabled?"none":"0 6px 20px rgba(236,72,153,0.4)", opacity: disabled ? 0.7 : 1,
});
