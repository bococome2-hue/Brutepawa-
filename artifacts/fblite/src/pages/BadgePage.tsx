import { useState } from "react";
import { useNavigate } from "../router";

const C = { bg:"#F8FAFC", card:"#FFFFFF", primary:"var(--bp-primary)", primaryDark:"var(--bp-primary-dark)", text:"#111827", secondary:"#64748B", muted:"#9CA3AF", border:"#F1F5F9", shadow:"0 8px 30px rgba(0,0,0,0.05)" };

function SubHeader({ title, onBack }:{title:string;onBack:()=>void}) {
  return (
    <div style={{ background:"#fff", borderBottom:"1px solid #F1F5F9", height:56, display:"flex", alignItems:"center", padding:"0 6px", position:"sticky", top:0, zIndex:30, boxShadow:"0 1px 8px rgba(0,0,0,0.04)" }}>
      <button onClick={onBack} style={{ width:44,height:44,borderRadius:"50%",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2.2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
      </button>
      <h1 style={{ flex:1, fontWeight:700, fontSize:17, color:C.text, margin:0, letterSpacing:"-0.3px", textAlign:"center" }}>{title}</h1>
      <button style={{ width:44,height:44,borderRadius:"50%",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="5" r="1.5" fill={C.muted}/><circle cx="12" cy="12" r="1.5" fill={C.muted}/><circle cx="12" cy="19" r="1.5" fill={C.muted}/></svg>
      </button>
    </div>
  );
}

const BENEFITS = [
  { icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>, title:"Profil vérifié", sub:"Plus de crédibilité" },
  { icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>, title:"Priorité dans la recherche", sub:"Soyez plus visible" },
  { icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>, title:"Confiance de la communauté", sub:"Montrez votre authenticité" },
  { icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>, title:"Protection renforcée", sub:"Sécurité avancée" },
];

export default function BadgePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const pay = async () => {
    setLoading(true);
    await new Promise(r=>setTimeout(r,1600));
    setLoading(false); setSuccess(true);
  };

  return (
    <div style={{ background:C.bg, minHeight:"100dvh", fontFamily:"Inter,-apple-system,BlinkMacSystemFont,sans-serif" }}>
      <SubHeader title="Badge vérifié" onBack={()=>navigate("/settings")}/>

      <div style={{ padding:"28px 14px 110px" }}>
        {/* Premium badge illustration with halo */}
        <div style={{ display:"flex", justifyContent:"center", marginBottom:24 }}>
          <div style={{ position:"relative" }}>
            {/* Outer halo ring */}
            <div style={{ position:"absolute", inset:-16, borderRadius:"50%", background:"radial-gradient(circle,rgba(59,130,246,0.12) 0%,transparent 70%)", animation:"pulse 2s ease-in-out infinite" }}/>
            {/* Inner glow */}
            <div style={{ width:120,height:120,borderRadius:"50%",background:"radial-gradient(circle at 40% 35%,#DCFCE7,#DCFCE7)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 0 10px rgba(59,130,246,0.08),0 0 0 20px rgba(59,130,246,0.04),0 12px 40px rgba(59,130,246,0.25)" }}>
              <svg width="68" height="68" viewBox="0 0 24 24">
                {/* Blue badge shape */}
                <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" fill="#0EA5E9"/>
                <path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            {/* Sparkles */}
            <div style={{ position:"absolute",top:-4,right:-4,width:14,height:14,borderRadius:"50%",background:"#FBBF24",animation:"sparkle 1.5s ease-in-out infinite" }}/>
            <div style={{ position:"absolute",bottom:6,left:-10,width:9,height:9,borderRadius:"50%",background:"#0EA5E9",animation:"sparkle 1.5s 0.5s ease-in-out infinite" }}/>
            <div style={{ position:"absolute",top:16,left:-12,width:7,height:7,borderRadius:"50%",background:"#6366F1",animation:"sparkle 1.5s 1s ease-in-out infinite" }}/>
          </div>
        </div>

        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ fontWeight:800, fontSize:22, color:C.text, letterSpacing:"-0.5px", marginBottom:6 }}>Obtenez votre badge</div>
          <div style={{ fontSize:14, color:C.secondary, lineHeight:1.6 }}>Montrez que vous êtes authentique.</div>
        </div>

        {/* Comparatif sans/avec */}
        <div style={{ display:"flex", gap:10, marginBottom:20 }}>
          <div style={{ flex:1, background:"#F8FAFC", borderRadius:20, padding:"14px", border:"1.5px solid #E5E7EB", textAlign:"center" }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.muted, marginBottom:8 }}>Sans badge</div>
            <div style={{ width:48,height:48,borderRadius:"50%",background:"#E5E7EB",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 8px" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            </div>
            <div style={{ fontSize:12, color:C.muted }}>Profil ordinaire</div>
          </div>
          <div style={{ flex:1, background:"linear-gradient(135deg,#DCFCE7,#DCFCE7)", borderRadius:20, padding:"14px", border:"1.5px solid #DCFCE7", textAlign:"center" }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#0EA5E9", marginBottom:8 }}>Avec badge ✓</div>
            <div style={{ width:48,height:48,borderRadius:"50%",background:"linear-gradient(135deg,#DCFCE7,#DCFCE7)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 8px",boxShadow:"0 2px 8px rgba(59,130,246,0.25)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" fill="#0EA5E9"/>
                <path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div style={{ fontSize:12, color:"#0EA5E9", fontWeight:600 }}>Profil vérifié</div>
          </div>
        </div>

        {/* Benefits */}
        <div style={{ background:C.card, borderRadius:24, boxShadow:C.shadow, overflow:"hidden" }}>
          {BENEFITS.map((b,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 18px", borderBottom:i<BENEFITS.length-1?"1px solid #F1F5F9":"none" }}>
              <div style={{ width:44,height:44,borderRadius:"50%",background:"linear-gradient(135deg,#DCFCE7,#DCFCE7)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:"0 2px 8px rgba(59,130,246,0.15)" }}>
                {b.icon}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:15, color:C.text }}>{b.title}</div>
                <div style={{ fontSize:13, color:C.secondary, marginTop:2 }}>{b.sub}</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="#CBD5E1" strokeWidth="2.2" strokeLinecap="round"/></svg>
            </div>
          ))}
        </div>
      </div>

      {/* Fixed CTA */}
      <div className="sc-fixed-escape" style={{ position:"fixed", bottom:0, left:0, right:0, padding:"12px 14px", paddingBottom:"calc(12px + env(safe-area-inset-bottom,0px))", background:"rgba(248,250,252,0.95)", backdropFilter:"blur(12px)", borderTop:"1px solid #F1F5F9" }}>
        <div style={{ textAlign:"center", marginBottom:8 }}>
          <span style={{ fontSize:12, color:C.muted }}>Paiement unique · Vérification en 24h</span>
        </div>
        {success ? (
          <div style={{ background:"linear-gradient(135deg,#DCFCE7,#BBF7D0)", borderRadius:16, padding:"16px", display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--bp-primary-dark)" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
            <span style={{ fontWeight:700, fontSize:15, color:"var(--bp-primary-dark)" }}>Badge vérifié activé !</span>
          </div>
        ) : (
          <button onClick={pay} disabled={loading} style={{ width:"100%", padding:"16px", borderRadius:18, background:loading?"#BBF7D0":"linear-gradient(135deg,var(--bp-primary-dark),var(--bp-primary))", border:"none", color:"#fff", fontWeight:700, fontSize:16, cursor:loading?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, boxShadow:"0 8px 24px rgba(34,197,94,0.35)", transition:"all 300ms" }}>
            {loading ? <><div style={{ width:20,height:20,borderRadius:"50%",border:"2px solid rgba(255,255,255,0.4)",borderTopColor:"#fff",animation:"spin 0.7s linear infinite" }}/> Traitement…</> : "Obtenir pour 2 500 FCFA"}
          </button>
        )}
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100%{opacity:.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.05)} }
        @keyframes sparkle { 0%,100%{opacity:.4;transform:scale(0.8)} 50%{opacity:1;transform:scale(1.2)} }
      `}</style>
    </div>
  );
}
