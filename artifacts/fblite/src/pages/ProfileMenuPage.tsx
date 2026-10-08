import { useState, useEffect } from "react";
import { useNavigate } from "../router";
import { apiGetUserStats } from "../lib/api";
import { useCurrentUser } from "../hooks/useCurrentUser";

const C = {
  bg:"#F8FAFC", card:"#FFFFFF", primary:"var(--bp-primary)", primaryDark:"var(--bp-primary-dark)",
  text:"#111827", secondary:"#64748B", muted:"#9CA3AF",
  border:"#F1F5F9", danger:"#EF4444", premium:"#F4C542",
  shadow:"0 8px 30px rgba(0,0,0,0.05)", shadowMd:"0 4px 16px rgba(0,0,0,0.08)",
};

const Chevron = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M9 18l6-6-6-6" stroke="#CBD5E1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const BlueBadge = ({ size=18 }:{size?:number}) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" fill="#0EA5E9"/>
    <path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const Toggle = ({ on, onChange }:{on:boolean;onChange:(v:boolean)=>void}) => (
  <div onClick={e=>{e.stopPropagation();onChange(!on);}} style={{
    width:52, height:30, borderRadius:15,
    background: on ? C.primary : "#E5E7EB",
    position:"relative", cursor:"pointer",
    transition:"background 250ms ease", flexShrink:0,
    boxShadow: on ? "0 2px 10px rgba(34,197,94,0.4)" : "inset 0 1px 3px rgba(0,0,0,0.08)",
  }}>
    <div style={{
      position:"absolute", top:3,
      left: on ? "calc(100% - 27px)" : 3,
      width:24, height:24, borderRadius:"50%",
      background:"#fff", boxShadow:"0 2px 6px rgba(0,0,0,0.2)",
      transition:"left 250ms cubic-bezier(0.34, 1.56, 0.64, 1)",
    }}/>
  </div>
);

function Row({ bg, icon, title, sub, right, last=false, onClick }:{
  bg:string; icon:React.ReactNode; title:string; sub?:string;
  right?:React.ReactNode; last?:boolean; onClick?:()=>void;
}) {
  const [pressed, setPressed] = useState(false);
  return (
    <button onClick={onClick}
      onPointerDown={()=>setPressed(true)} onPointerUp={()=>setPressed(false)} onPointerLeave={()=>setPressed(false)}
      style={{
        display:"flex", alignItems:"center", gap:14, padding:"14px 18px",
        background: pressed?"#F8FAFC":"transparent",
        border:"none", cursor:"pointer", width:"100%", textAlign:"left",
        borderBottom: last?"none":"1px solid #F1F5F9",
        transition:"background 150ms",
      }}>
      <div style={{ width:46, height:46, borderRadius:"50%", background:bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:"0 3px 10px rgba(0,0,0,0.12)" }}>
        {icon}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:600, fontSize:15, color:C.text, letterSpacing:"-0.2px" }}>{title}</div>
        {sub && <div style={{ fontSize:13, color:C.secondary, marginTop:2 }}>{sub}</div>}
      </div>
      {right}
      <Chevron/>
    </button>
  );
}

/* ── Icon SVGs (Lucide-style, 20px, 2px stroke, round caps) ── */
const I = {
  lock: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
  bell: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
  globe: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
  signal: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M1.5 8.5a17 17 0 0121 0M5 12a12 12 0 0114 0M8.5 15.5a7 7 0 017 0M12 19h.01"/></svg>,
  sun: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  shield: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  badge: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>,
  crown: <svg width="22" height="22" viewBox="0 0 24 24" fill="#F4C542"><path d="M2 19h20v2H2v-2zM4 16l-2-9 5.5 4L12 3l4.5 8L22 7l-2 9H4z"/></svg>,
  db: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4.03 3-9 3S3 13.66 3 12"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/></svg>,
  bellN: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
};

export default function ProfileMenuPage() {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.name || "Junior Omar";
  const username = user.username || (user.email?.split("@")[0]) || "junioromar";
  const userId = user.id ? String(user.id).padStart(8,"0") : "10000123";

  const [dataSaver, setDataSaver] = useState(()=>localStorage.getItem("bp_data_saver")!=="false");

  const usedGB=1.24, totalGB=10, pct=Math.round(usedGB/totalGB*100);

  return (
    <div style={{ background:C.bg, minHeight:"100dvh", fontFamily:"Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>

      {/* ═══════════════════════════════════════
          PREMIUM GRADIENT HEADER
      ═══════════════════════════════════════ */}
      <div style={{ background:"linear-gradient(135deg,var(--bp-primary-dark) 0%,var(--bp-primary-dark) 35%,var(--bp-primary) 70%,var(--bp-primary) 100%)", position:"relative", overflow:"hidden" }}>
        {/* Geometric decorations */}
        <div style={{ position:"absolute", top:-90, right:-90, width:240, height:240, borderRadius:"50%", background:"rgba(255,255,255,0.07)", pointerEvents:"none" }}/>
        <div style={{ position:"absolute", top:10, right:20, width:110, height:110, borderRadius:"50%", background:"rgba(255,255,255,0.05)", pointerEvents:"none" }}/>
        <div style={{ position:"absolute", bottom:-50, left:-60, width:180, height:180, borderRadius:"50%", background:"rgba(255,255,255,0.06)", pointerEvents:"none" }}/>
        <div style={{ position:"absolute", top:30, left:160, width:70, height:70, borderRadius:"50%", background:"rgba(255,255,255,0.04)", pointerEvents:"none" }}/>

        <div style={{ position:"relative", zIndex:2, padding:"calc(env(safe-area-inset-top,0px) + 14px) 16px 18px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {/* Glassmorphism logo */}
            <div style={{ width:42, height:42, borderRadius:13, background:"rgba(255,255,255,0.2)", backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)", border:"1.5px solid rgba(255,255,255,0.35)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 14px rgba(0,0,0,0.15)" }}>
              <span style={{ color:"#fff", fontWeight:900, fontSize:23, fontFamily:"Arial,sans-serif", lineHeight:1 }}>B</span>
            </div>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                <span style={{ fontWeight:800, fontSize:17, color:"#fff", letterSpacing:"-0.3px" }}>BrutePawa</span>
                <BlueBadge size={16}/>
              </div>
              <div style={{ fontSize:11.5, color:"rgba(255,255,255,0.82)", marginTop:1 }}>Réseau social panafricain</div>
            </div>
          </div>
          {/* Glassmorphism bell */}
          <button style={{ width:42, height:42, borderRadius:"50%", background:"rgba(255,255,255,0.18)", backdropFilter:"blur(10px)", WebkitBackdropFilter:"blur(10px)", border:"1.5px solid rgba(255,255,255,0.25)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", position:"relative", boxShadow:"0 4px 12px rgba(0,0,0,0.12)" }}>
            {I.bellN}
            <span style={{ position:"absolute", top:6, right:6, background:"#EF4444", color:"#fff", borderRadius:"50%", width:16, height:16, fontSize:9, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center", border:"2px solid rgba(255,255,255,0.3)" }}>3</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          SCROLLABLE CONTENT
      ═══════════════════════════════════════ */}
      <div style={{ padding:"14px 0 88px" }}>

        {/* ── User card ── */}
        <div style={{ margin:"0 14px 12px", background:C.card, borderRadius:24, boxShadow:C.shadow }}>
          <button onClick={()=>navigate("/profile")} style={{ display:"flex", alignItems:"center", gap:14, padding:"16px", background:"none", border:"none", cursor:"pointer", width:"100%", textAlign:"left", borderRadius:24 }}>
            <div style={{ position:"relative", flexShrink:0 }}>
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" style={{ width:72, height:72, borderRadius:"50%", objectFit:"cover", border:"3px solid #fff", boxShadow:"0 4px 16px rgba(0,0,0,0.15)" }}/>
              ) : (
                <div style={{ width:72, height:72, borderRadius:"50%", background:"linear-gradient(135deg,var(--bp-primary),var(--bp-primary-dark))", display:"flex", alignItems:"center", justifyContent:"center", border:"3px solid #fff", boxShadow:"0 4px 16px rgba(34,197,94,0.35)" }}>
                  <span style={{ fontSize:28, fontWeight:800, color:"#fff" }}>{name.charAt(0).toUpperCase()}</span>
                </div>
              )}
              {/* Online dot */}
              <div style={{ position:"absolute", bottom:4, right:4, width:14, height:14, borderRadius:"50%", background:"var(--bp-primary)", border:"2.5px solid #fff", boxShadow:"0 1px 4px rgba(34,197,94,0.5)" }}/>
              {/* Verified badge on avatar */}
              <div style={{ position:"absolute", bottom:-2, right:-2, width:22, height:22, borderRadius:"50%", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 6px rgba(0,0,0,0.15)" }}>
                <BlueBadge size={18}/>
              </div>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:5, flexWrap:"wrap" }}>
                <span style={{ fontWeight:700, fontSize:17, color:C.text, letterSpacing:"-0.3px" }}>{name}</span>
              </div>
              <div style={{ fontSize:13, color:C.secondary, marginTop:2 }}>@{username}</div>
              <div style={{ fontSize:12, color:C.muted, marginTop:1 }}>ID : {userId}</div>
            </div>
            <div style={{ width:32, height:32, borderRadius:"50%", background:"#F8FAFC", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <Chevron/>
            </div>
          </button>
        </div>

        {/* ── Messagerie card ── */}
        <div style={{ margin:"0 14px 12px", background:C.card, borderRadius:24, boxShadow:C.shadow, overflow:"hidden" }}>
          <Row bg="linear-gradient(135deg,#0EA5E9,#06B6D4)"
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>}
            title="Messagerie" sub="Notifications, archive, confidentialité…" onClick={()=>navigate("/settings/messaging")} last/>
        </div>

        {/* ── Main settings card ── */}
        <div style={{ margin:"0 14px 12px", background:C.card, borderRadius:24, boxShadow:C.shadow, overflow:"hidden" }}>
          <Row bg="linear-gradient(135deg,var(--bp-primary-dark),var(--bp-primary))" icon={I.lock} title="Confidentialité" sub="Gérer qui voit vos informations" onClick={()=>navigate("/settings/privacy")}/>
          <Row bg="linear-gradient(135deg,#D97706,#F59E0B)" icon={I.bell} title="Notifications" sub="Personnaliser vos alertes" onClick={()=>navigate("/settings/notifications")} right={<div style={{ width:9,height:9,borderRadius:"50%",background:C.danger,marginRight:6,boxShadow:"0 0 0 3px rgba(239,68,68,0.15)" }}/>}/>
          <Row bg="linear-gradient(135deg,#0EA5E9,#06B6D4)" icon={I.globe} title="Langue & région" sub="Français · ML" onClick={()=>navigate("/settings/language")}/>
          <Row bg="linear-gradient(135deg,var(--bp-primary-dark),var(--bp-primary))" icon={I.signal} title="Mode données" sub={`Économiseur : ${dataSaver?"Activé":"Désactivé"}`} onClick={()=>navigate("/settings/data")} right={<Toggle on={dataSaver} onChange={setDataSaver}/>}/>
          <Row bg="linear-gradient(135deg,#D97706,#F59E0B)" icon={I.sun} title="Apparence" sub="Thème clair" onClick={()=>navigate("/settings/appearance")}/>
          <Row bg="linear-gradient(135deg,#0EA5E9,#0EA5E9)" icon={I.shield} title="Vérification du compte" sub="Ajouter votre numéro de téléphone" onClick={()=>navigate("/settings/verify")}/>
          <Row bg="linear-gradient(135deg,#0EA5E9,#3B82F6)" icon={I.badge} title="Badge vérifié" sub="Vérification identité · 2 500 FCFA" onClick={()=>navigate("/settings/badge")} last
            right={<span style={{ background:"linear-gradient(135deg,#DCFCE7,#BBF7D0)", color:"var(--bp-primary-dark)", fontSize:11, fontWeight:700, padding:"4px 11px", borderRadius:20, marginRight:4, whiteSpace:"nowrap", boxShadow:"0 1px 4px rgba(34,197,94,0.2)" }}>Vérifié</span>}/>
        </div>

        {/* ── Premium card ── */}
        <div style={{ margin:"0 14px 12px", background:"linear-gradient(135deg,#052e16 0%,#064E3B 60%,#065F46 100%)", borderRadius:24, overflow:"hidden", boxShadow:"0 12px 40px rgba(6,78,59,0.45)" }}>
          <div style={{ position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:-40, right:-40, width:130, height:130, borderRadius:"50%", background:"rgba(244,197,66,0.08)", pointerEvents:"none" }}/>
            <div style={{ position:"absolute", bottom:-20, left:60, width:80, height:80, borderRadius:"50%", background:"rgba(255,255,255,0.04)", pointerEvents:"none" }}/>
            <button onClick={()=>navigate("/settings/premium")} style={{ display:"flex", alignItems:"center", gap:14, padding:"16px 18px", background:"none", border:"none", cursor:"pointer", width:"100%", textAlign:"left", position:"relative", zIndex:1 }}>
              <div style={{ width:48, height:48, borderRadius:"50%", background:"rgba(244,197,66,0.2)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:"0 4px 12px rgba(244,197,66,0.25)", border:"1px solid rgba(244,197,66,0.3)" }}>
                {I.crown}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:15, color:"#fff", letterSpacing:"-0.2px" }}>Compte Premium</div>
                <div style={{ fontSize:13, color:"rgba(255,255,255,0.68)", marginTop:2 }}>Profitez de toutes les fonctionnalités</div>
              </div>
              <span style={{ background:"linear-gradient(135deg,#FBBF24,#F4C542)", color:"#1C1917", fontSize:11, fontWeight:800, padding:"6px 12px", borderRadius:20, whiteSpace:"nowrap", flexShrink:0, boxShadow:"0 3px 10px rgba(244,197,66,0.4)" }}>2 500 FCFA/mois</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink:0 }}><path d="M9 18l6-6-6-6" stroke="rgba(255,255,255,0.45)" strokeWidth="2.2" strokeLinecap="round"/></svg>
            </button>
          </div>
        </div>

        {/* ── Storage card ── */}
        <div style={{ margin:"0 14px 12px", background:C.card, borderRadius:24, boxShadow:C.shadow }}>
          <div style={{ padding:"14px 18px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:10 }}>
              <div style={{ width:46, height:46, borderRadius:"50%", background:"#F0FDF4", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:"0 2px 8px rgba(34,197,94,0.12)" }}>{I.db}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:15, color:C.text }}>Espace de stockage</div>
                <div style={{ fontSize:13, color:C.secondary, marginTop:2 }}>{usedGB} Go / {totalGB} Go utilisés</div>
              </div>
              <span style={{ fontSize:14, fontWeight:700, color:C.primary }}>{pct}%</span>
            </div>
            <div style={{ height:8, background:"#E5E7EB", borderRadius:999, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${pct}%`, background:"linear-gradient(90deg,var(--bp-primary),var(--bp-primary-dark))", borderRadius:999, transition:"width 1.2s ease", boxShadow:"0 0 8px rgba(34,197,94,0.4)" }}/>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign:"center", padding:"16px 0 4px" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:7, marginBottom:4 }}>
            <div style={{ width:24, height:24, borderRadius:7, background:"var(--bp-primary)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <span style={{ color:"#fff", fontWeight:900, fontSize:14, fontFamily:"Arial,sans-serif" }}>B</span>
            </div>
            <span style={{ fontWeight:700, fontSize:15, color:C.text }}>BrutePawa</span>
            <BlueBadge size={15}/>
          </div>
          <div style={{ fontSize:12, color:C.secondary }}>Connecter · Partager · Gagner</div>
          <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>Réseau social panafricain 🌍</div>
          <div style={{ fontSize:10, color:"#E5E7EB", marginTop:8 }}>Version 2.0.0 · © 2026 BrutePawa</div>
        </div>
      </div>
    </div>
  );
}
