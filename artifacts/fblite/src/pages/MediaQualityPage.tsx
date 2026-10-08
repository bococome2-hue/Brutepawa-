import { useState, useEffect } from "react";
import { useNavigate } from "../router";
import { apiFetch, getBpToken } from "../lib/api";

const C = { bg:"#F8FAFC",card:"#FFFFFF",primary:"var(--bp-primary)",text:"#111827",secondary:"#64748B",muted:"#9CA3AF",border:"#E5E7EB",shadow:"0 2px 16px rgba(0,0,0,0.05)" };

const Footer = () => (
  <div style={{ textAlign:"center",padding:"20px 0 32px" }}>
    <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:7,marginBottom:4 }}>
      <div style={{ width:24,height:24,borderRadius:7,background:C.primary,display:"flex",alignItems:"center",justifyContent:"center" }}><span style={{ color:"#fff",fontWeight:900,fontSize:14,fontFamily:"Arial,sans-serif" }}>b</span></div>
      <span style={{ fontWeight:700,fontSize:15,color:C.text }}>BrutePawa</span>
    </div>
    <div style={{ fontSize:12,color:C.secondary }}>Connecter · Partager · Créer</div>
  </div>
);

export default function MediaQualityPage() {
  const navigate = useNavigate();
  const [quality, setQuality] = useState<"standard"|"haute">("standard");
  const isLoggedIn = !!getBpToken();

  useEffect(() => {
    if (!isLoggedIn) return;
    apiFetch("/messaging/media-quality")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.quality) setQuality(d.quality); });
  }, []);

  const handleChange = async (q: "standard"|"haute") => {
    setQuality(q);
    if (!isLoggedIn) return;
    await apiFetch("/messaging/media-quality", { method:"PATCH", body: JSON.stringify({ quality: q }) });
  };

  return (
    <div style={{ background:C.bg,minHeight:"100dvh",fontFamily:"Inter,-apple-system,BlinkMacSystemFont,sans-serif" }}>
      <div style={{ background:"#fff",borderBottom:"1px solid "+C.border,height:56,display:"flex",alignItems:"center",padding:"0 6px",position:"sticky",top:0,zIndex:30 }}>
        <button onClick={()=>navigate("/settings/messaging")} style={{ width:44,height:44,borderRadius:"50%",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2.2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <h1 style={{ flex:1,fontWeight:700,fontSize:17,color:C.text,margin:0,textAlign:"center",letterSpacing:"-0.3px" }}>Qualité des médias</h1>
        <div style={{ width:44 }}/>
      </div>

      <div style={{ padding:"16px 14px 0" }}>
        <div style={{ fontSize:12,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.8px",paddingBottom:10 }}>Choisissez la qualité par défaut</div>

        <div style={{ background:C.card,borderRadius:24,boxShadow:C.shadow,overflow:"hidden" }}>
          {([ ["standard","Qualité standard","Envoi plus rapide, taille plus petite",<svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeWidth="2"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13,2 13,9 20,9"/></svg>],
             ["haute","Qualité haute","Meilleure qualité, taille plus grande",<svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>],
          ] as const).map(([q,title,sub,icon],i,arr)=>(
            <button key={q} onClick={()=>handleChange(q)}
              style={{ display:"flex",alignItems:"center",gap:14,padding:"18px 18px",background:"none",border:"none",cursor:"pointer",width:"100%",textAlign:"left",borderBottom:i<arr.length-1?"1px solid #F8FAFC":"none",transition:"background 150ms" }}
              onPointerDown={e=>(e.currentTarget.style.background="#F8FAFC")} onPointerUp={e=>(e.currentTarget.style.background="none")} onPointerLeave={e=>(e.currentTarget.style.background="none")}>
              <div style={{ width:48,height:48,borderRadius:"50%",background:quality===q?"linear-gradient(135deg,#DCFCE7,#BBF7D0)":"#F8FAFC",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"background 250ms",border:quality===q?"2px solid "+C.primary:"2px solid transparent" }}>
                {icon && <span style={{ color:quality===q?C.primary:C.muted }}>{icon}</span>}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700,fontSize:15,color:C.text }}>{title}</div>
                <div style={{ fontSize:13,color:C.secondary,marginTop:2 }}>{sub}</div>
              </div>
              {quality===q && (
                <div style={{ width:28,height:28,borderRadius:"50%",background:C.primary,display:"flex",alignItems:"center",justifyContent:"center" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                </div>
              )}
            </button>
          ))}
        </div>

        <div style={{ background:C.card,borderRadius:20,boxShadow:C.shadow,padding:"14px 16px",marginTop:12,display:"flex",gap:10,border:"1px solid "+C.border }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2" strokeLinecap="round" style={{ flexShrink:0,marginTop:1 }}><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
          <p style={{ fontSize:13,color:C.secondary,margin:0,lineHeight:1.6 }}>La qualité choisie sera utilisée par défaut lors de l'envoi de photos et vidéos.</p>
        </div>
      </div>
      <Footer/>
    </div>
  );
}
