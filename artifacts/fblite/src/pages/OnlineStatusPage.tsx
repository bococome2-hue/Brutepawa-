import { useState, useEffect } from "react";
import { useNavigate } from "../router";
import { apiFetch, getBpToken } from "../lib/api";

const C = { bg:"#F8FAFC",card:"#FFFFFF",primary:"var(--bp-primary)",text:"#111827",secondary:"#64748B",muted:"#9CA3AF",border:"#E5E7EB",shadow:"0 2px 16px rgba(0,0,0,0.05)" };

const Toggle = ({ on,onChange }:{on:boolean;onChange:(v:boolean)=>void}) => (
  <div onClick={()=>onChange(!on)} style={{ width:52,height:30,borderRadius:15,background:on?C.primary:"#E5E7EB",position:"relative",cursor:"pointer",transition:"background 250ms ease",flexShrink:0,boxShadow:on?"0 2px 10px rgba(34,197,94,0.35)":"inset 0 1px 3px rgba(0,0,0,0.08)" }}>
    <div style={{ position:"absolute",top:3,left:on?"calc(100% - 27px)":3,width:24,height:24,borderRadius:"50%",background:"#fff",boxShadow:"0 2px 6px rgba(0,0,0,0.2)",transition:"left 250ms cubic-bezier(0.34,1.56,0.64,1)" }}/>
  </div>
);

const Footer = () => (
  <div style={{ textAlign:"center",padding:"24px 0 32px" }}>
    <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:7,marginBottom:4 }}>
      <div style={{ width:24,height:24,borderRadius:7,background:C.primary,display:"flex",alignItems:"center",justifyContent:"center" }}><span style={{ color:"#fff",fontWeight:900,fontSize:14,fontFamily:"Arial,sans-serif" }}>b</span></div>
      <span style={{ fontWeight:700,fontSize:15,color:C.text }}>BrutePawa</span>
    </div>
    <div style={{ fontSize:12,color:C.secondary }}>Connecter · Partager · Créer</div>
  </div>
);

export default function OnlineStatusPage() {
  const navigate = useNavigate();
  const [online, setOnline] = useState(true);
  const [loading, setLoading] = useState(true);
  const isLoggedIn = !!getBpToken();

  useEffect(() => {
    if (!isLoggedIn) { setLoading(false); return; }
    apiFetch("/messaging/online-status")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setOnline(d.online); })
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (v: boolean) => {
    setOnline(v);
    if (!isLoggedIn) return;
    await apiFetch("/messaging/online-status", {
      method:"PATCH", body: JSON.stringify({ online: v }),
    });
  };

  return (
    <div style={{ background:C.bg,minHeight:"100dvh",fontFamily:"Inter,-apple-system,BlinkMacSystemFont,sans-serif" }}>
      <div style={{ background:"#fff",borderBottom:"1px solid "+C.border,height:56,display:"flex",alignItems:"center",padding:"0 6px",position:"sticky",top:0,zIndex:30 }}>
        <button onClick={()=>navigate("/settings/messaging")} style={{ width:44,height:44,borderRadius:"50%",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2.2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <h1 style={{ flex:1,fontWeight:700,fontSize:17,color:C.text,margin:0,textAlign:"center",letterSpacing:"-0.3px" }}>Statut En Ligne</h1>
        <div style={{ width:44 }}/>
      </div>

      <div style={{ padding:"16px 14px 0" }}>
        <div style={{ background:C.card,borderRadius:24,boxShadow:C.shadow,overflow:"hidden",marginBottom:12 }}>
          <div style={{ display:"flex",alignItems:"center",gap:14,padding:"16px 18px" }}>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:600,fontSize:15,color:C.text }}>Indiquer si vous êtes en ligne</div>
              <div style={{ fontSize:13,color:C.secondary,marginTop:2 }}>Les autres peuvent vous voir quand vous êtes en ligne.</div>
            </div>
            {loading ? <div style={{ width:52,height:30,borderRadius:15,background:"#E5E7EB" }}/> : <Toggle on={online} onChange={handleToggle}/>}
          </div>
        </div>

        <div style={{ background:"linear-gradient(135deg,#DCFCE7,#DCFCE7)",borderRadius:24,padding:"16px 18px",display:"flex",gap:12,marginBottom:12,border:"1px solid #DCFCE7" }}>
          <div style={{ width:36,height:36,borderRadius:"50%",background:"#DCFCE7",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
          </div>
          <p style={{ fontSize:13,color:"#0EA5E9",lineHeight:1.6,margin:0 }}>
            Lorsque ce paramètre est activé, votre Statut En Ligne est visible par les personnes qui vous ont dans leur liste de contacts sur <strong>BrutePawa</strong>, et par celles auxquelles vous avez envoyé une invitation. Vous ne pouvez pas voir le statut En ligne des autres si le vôtre est activé.
          </p>
        </div>

        <div style={{ background:C.card,borderRadius:24,boxShadow:C.shadow,padding:"16px 18px",marginBottom:12 }}>
          <div style={{ display:"flex",gap:12 }}>
            <div style={{ width:36,height:36,borderRadius:"50%",background:"#F0FDF4",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div>
              <p style={{ fontSize:13,color:C.secondary,lineHeight:1.6,margin:"0 0 8px" }}>
                Pour ne plus afficher votre Statut En Ligne, désactivez-le si vous ne vous utilisez pas.
              </p>
              <button style={{ background:"none",border:"none",color:C.primary,fontWeight:700,fontSize:13,cursor:"pointer",padding:0 }}>BrutePawa · En savoir plus</button>
            </div>
          </div>
        </div>
      </div>
      <Footer/>
    </div>
  );
}
