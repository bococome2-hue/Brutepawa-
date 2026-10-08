import { useState } from "react";
import { useNavigate } from "../router";

const C = { bg:"#F8FAFC", card:"#FFFFFF", primary:"var(--bp-primary)", primaryDark:"var(--bp-primary-dark)", text:"#111827", secondary:"#64748B", muted:"#9CA3AF", shadow:"0 8px 30px rgba(0,0,0,0.05)" };

function SubHeader({ title, onBack }:{title:string;onBack:()=>void}) {
  return (
    <div style={{ background:"#fff", borderBottom:"1px solid #F1F5F9", height:56, display:"flex", alignItems:"center", padding:"0 6px", position:"sticky", top:0, zIndex:30, boxShadow:"0 1px 8px rgba(0,0,0,0.04)" }}>
      <button onClick={onBack} style={{ width:44,height:44,borderRadius:"50%",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2.2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
      </button>
      <h1 style={{ flex:1,fontWeight:700,fontSize:17,color:C.text,margin:0,letterSpacing:"-0.3px",textAlign:"center" }}>{title}</h1>
      <button style={{ width:44,height:44,borderRadius:"50%",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="5" r="1.5" fill={C.muted}/><circle cx="12" cy="12" r="1.5" fill={C.muted}/><circle cx="12" cy="19" r="1.5" fill={C.muted}/></svg>
      </button>
    </div>
  );
}

const FEATURES = [
  { icon:"storage",  label:"Stockage 10x plus grand",      sub:"Gagnez plus d'espace",       free:"2 Go",      prem:"20 Go" },
  { icon:"eye",      label:"Voir qui visite votre profil", sub:"En illimité",                free:"Non",       prem:"Oui"   },
  { icon:"dollar",   label:"Monétisation de vos contenus", sub:"Gagnez plus",               free:"Non",       prem:"Oui"   },
  { icon:"badge",    label:"Badge Premium",                sub:"Crédibilité maximale",        free:"Non",       prem:"Oui"   },
  { icon:"support",  label:"Support prioritaire",          sub:"Réponse en 1h",              free:"48h",       prem:"1h"    },
  { icon:"trend",    label:"Priorité algorithme",          sub:"Plus de visibilité",         free:"Standard",  prem:"Prioritaire" },
];

const FIcon = ({ k }:{k:string}) => {
  const p = { stroke:"#F4C542", fill:"none", strokeWidth:2, strokeLinecap:"round" as const };
  if(k==="storage")  return <svg width="20" height="20" viewBox="0 0 24 24" {...p}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4.03 3-9 3S3 13.66 3 12"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/></svg>;
  if(k==="eye")      return <svg width="20" height="20" viewBox="0 0 24 24" {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
  if(k==="dollar")   return <svg width="20" height="20" viewBox="0 0 24 24" {...p}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>;
  if(k==="badge")    return <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" fill="#F4C542"/><path d="M9 12l2 2 4-4" stroke="#1C1917" strokeWidth="2" strokeLinecap="round"/></svg>;
  if(k==="support")  return <svg width="20" height="20" viewBox="0 0 24 24" {...p}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>;
  return <svg width="20" height="20" viewBox="0 0 24 24" {...p}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
};

export default function PremiumPage() {
  const navigate = useNavigate();
  const [plan, setPlan] = useState<"monthly"|"yearly">("yearly");
  const [loading, setLoading] = useState(false);
  const price = plan==="yearly" ? 2000 : 2500;

  const subscribe = async () => {
    setLoading(true);
    await new Promise(r=>setTimeout(r,1800));
    setLoading(false);
  };

  return (
    <div style={{ background:C.bg, minHeight:"100dvh", fontFamily:"Inter,-apple-system,BlinkMacSystemFont,sans-serif" }}>
      <SubHeader title="Compte Premium" onBack={()=>navigate("/settings")}/>

      <div style={{ paddingBottom:110 }}>
        {/* ═══ HERO DARK ═══ */}
        <div style={{ background:"linear-gradient(160deg,#052e16 0%,#064E3B 45%,#065F46 100%)", position:"relative", overflow:"hidden", padding:"32px 20px 36px" }}>
          <div style={{ position:"absolute",top:-60,right:-60,width:200,height:200,borderRadius:"50%",background:"rgba(244,197,66,0.07)",pointerEvents:"none" }}/>
          <div style={{ position:"absolute",bottom:-30,left:-40,width:140,height:140,borderRadius:"50%",background:"rgba(255,255,255,0.04)",pointerEvents:"none" }}/>

          {/* Crown illustration */}
          <div style={{ display:"flex",justifyContent:"center",marginBottom:20 }}>
            <div style={{ width:110,height:110,borderRadius:"50%",background:"radial-gradient(circle at 40% 35%,rgba(244,197,66,0.22),rgba(244,197,66,0.06))",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 0 12px rgba(244,197,66,0.06),0 0 0 24px rgba(244,197,66,0.03)" }}>
              <svg width="70" height="70" viewBox="0 0 24 24">
                <defs>
                  <linearGradient id="cg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FBBF24"/>
                    <stop offset="55%" stopColor="#F4C542"/>
                    <stop offset="100%" stopColor="#D97706"/>
                  </linearGradient>
                </defs>
                <path d="M2 19h20v2H2v-2z" fill="url(#cg)"/>
                <path d="M4 16l-2-9 5.5 4L12 3l4.5 8L22 7l-2 9H4z" fill="url(#cg)"/>
                <circle cx="12" cy="8.5" r="1.2" fill="#fff" opacity=".7"/>
                <circle cx="7" cy="12" r=".8" fill="#fff" opacity=".5"/>
                <circle cx="17" cy="12" r=".8" fill="#fff" opacity=".5"/>
              </svg>
            </div>
          </div>

          <div style={{ textAlign:"center",marginBottom:24 }}>
            <div style={{ fontWeight:800,fontSize:24,color:"#fff",letterSpacing:"-0.5px",marginBottom:8 }}>Déverrouillez tout le potentiel</div>
            <div style={{ fontSize:14,color:"rgba(255,255,255,0.7)",lineHeight:1.6 }}>Plus de liberté, plus de visibilité.</div>
          </div>

          {/* Plan toggle */}
          <div style={{ background:"rgba(255,255,255,0.1)",backdropFilter:"blur(10px)",borderRadius:20,padding:4,display:"flex",gap:4,border:"1px solid rgba(255,255,255,0.15)" }}>
            {(["monthly","yearly"] as const).map(p=>(
              <button key={p} onClick={()=>setPlan(p)} style={{ flex:1,padding:"11px 8px",borderRadius:16,border:"none",cursor:"pointer",background:plan===p?"linear-gradient(135deg,#FBBF24,#F4C542)":"transparent",color:plan===p?"#1C1917":"rgba(255,255,255,0.72)",fontWeight:plan===p?700:500,fontSize:14,transition:"all 250ms ease",boxShadow:plan===p?"0 4px 12px rgba(244,197,66,0.4)":"none",display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}>
                {p==="monthly" ? "Mensuel" : <><span>Annuel</span><span style={{ background:"#EF4444",color:"#fff",fontSize:10,fontWeight:800,padding:"2px 6px",borderRadius:8 }}>-20%</span></>}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding:"16px 14px 0" }}>
          {/* Features list */}
          <div style={{ background:C.card,borderRadius:24,boxShadow:C.shadow,overflow:"hidden",marginBottom:12 }}>
            {FEATURES.map((f,i)=>(
              <div key={i} style={{ display:"flex",alignItems:"center",gap:14,padding:"14px 18px",borderBottom:i<FEATURES.length-1?"1px solid #F1F5F9":"none" }}>
                <div style={{ width:44,height:44,borderRadius:"50%",background:"linear-gradient(135deg,#052e16,#064E3B)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:"0 3px 10px rgba(6,78,59,0.3)" }}>
                  <FIcon k={f.icon}/>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600,fontSize:15,color:C.text }}>{f.label}</div>
                  <div style={{ fontSize:13,color:C.secondary,marginTop:2 }}>{f.sub}</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="#CBD5E1" strokeWidth="2.2" strokeLinecap="round"/></svg>
              </div>
            ))}
          </div>

          {/* Comparatif Gratuit vs Premium */}
          <div style={{ background:C.card,borderRadius:24,boxShadow:C.shadow,overflow:"hidden" }}>
            {/* Header row */}
            <div style={{ display:"grid",gridTemplateColumns:"1fr 72px 80px" }}>
              <div style={{ padding:"12px 16px",fontWeight:700,fontSize:12,color:C.muted,textTransform:"uppercase",letterSpacing:"0.5px" }}>Fonctionnalité</div>
              <div style={{ padding:"12px 8px",fontWeight:700,fontSize:12,color:C.muted,textAlign:"center",borderLeft:"1px solid #F1F5F9" }}>Gratuit</div>
              <div style={{ padding:"12px 8px",fontWeight:700,fontSize:12,color:"#F4C542",textAlign:"center",background:"#052e16",borderLeft:"1px solid rgba(255,255,255,0.1)" }}>Premium</div>
            </div>
            {FEATURES.map((f,i)=>(
              <div key={i} style={{ display:"grid",gridTemplateColumns:"1fr 72px 80px",borderTop:"1px solid #F1F5F9" }}>
                <div style={{ padding:"12px 16px",fontSize:13,fontWeight:500,color:C.text }}>{f.label}</div>
                <div style={{ padding:"12px 8px",textAlign:"center",borderLeft:"1px solid #F1F5F9",display:"flex",alignItems:"center",justifyContent:"center" }}>
                  {f.free==="Non"
                    ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    : <span style={{ fontSize:11,color:C.muted }}>{f.free}</span>}
                </div>
                <div style={{ padding:"12px 8px",textAlign:"center",background:"rgba(5,46,22,0.04)",borderLeft:"1px solid rgba(5,46,22,0.08)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                  {f.prem==="Oui"
                    ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                    : <span style={{ fontSize:11,color:C.primary,fontWeight:700 }}>{f.prem}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fixed CTA */}
      <div className="sc-fixed-escape" style={{ position:"fixed",bottom:0,left:0,right:0,padding:"12px 14px",paddingBottom:"calc(12px + env(safe-area-inset-bottom,0px))",background:"rgba(248,250,252,0.97)",backdropFilter:"blur(16px)",borderTop:"1px solid #F1F5F9" }}>
        <div style={{ textAlign:"center",marginBottom:10 }}>
          <span style={{ fontSize:12,color:C.muted }}>{plan==="yearly"?`${price} FCFA/mois · facturé annuellement`:`${price} FCFA/mois · sans engagement`}</span>
          {plan==="yearly" && <span style={{ marginLeft:6,background:"#DCFCE7",color:"var(--bp-primary-dark)",fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:8 }}>-20%</span>}
        </div>
        <button onClick={subscribe} disabled={loading} style={{ width:"100%",padding:"16px",borderRadius:18,background:loading?"#BBF7D0":"linear-gradient(135deg,#FBBF24,#F4C542,#D97706)",border:"none",color:"#1C1917",fontWeight:800,fontSize:16,cursor:loading?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10,boxShadow:"0 8px 24px rgba(244,197,66,0.45)",transition:"all 300ms" }}>
          {loading
            ? <><div style={{ width:20,height:20,borderRadius:"50%",border:"2.5px solid rgba(28,25,23,0.3)",borderTopColor:"#1C1917",animation:"spin 0.7s linear infinite" }}/> Traitement…</>
            : <><svg width="20" height="20" viewBox="0 0 24 24"><path d="M2 19h20v2H2v-2zM4 16l-2-9 5.5 4L12 3l4.5 8L22 7l-2 9H4z" fill="#1C1917"/></svg>Passer à Premium · {price} FCFA/mois</>}
        </button>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
