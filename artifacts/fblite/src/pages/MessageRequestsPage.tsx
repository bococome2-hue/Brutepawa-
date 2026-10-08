import { useState } from "react";
import { useNavigate } from "../router";

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

function EnvelopeIllustration() {
  return (
    <svg width="160" height="140" viewBox="0 0 160 140" fill="none">
      <ellipse cx="80" cy="134" rx="50" ry="6" fill="#111827" opacity=".05"/>
      {/* Envelope body */}
      <rect x="14" y="38" width="132" height="88" rx="10" fill="var(--bp-primary)" opacity=".12"/>
      <rect x="14" y="38" width="132" height="88" rx="10" stroke="var(--bp-primary)" strokeWidth="2" fill="none"/>
      {/* Envelope flap */}
      <path d="M14 48l66 44 66-44" stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Envelope lines */}
      <line x1="30" y1="90" x2="70" y2="90" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round" opacity=".4"/>
      <line x1="30" y1="100" x2="55" y2="100" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round" opacity=".3"/>
      {/* Plus badge */}
      <circle cx="122" cy="42" r="22" fill="#DCFCE7" stroke="var(--bp-primary)" strokeWidth="2"/>
      <path d="M122 34v16M114 42h16" stroke="var(--bp-primary-dark)" strokeWidth="3" strokeLinecap="round"/>
      {/* Small dots */}
      <circle cx="30" cy="38" r="6" fill="var(--bp-primary)" opacity=".3"/>
      <circle cx="130" cy="126" r="5" fill="var(--bp-primary)" opacity=".2"/>
    </svg>
  );
}

export default function MessageRequestsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"maybe"|"spam">("maybe");

  return (
    <div style={{ background:C.bg,minHeight:"100dvh",fontFamily:"Inter,-apple-system,BlinkMacSystemFont,sans-serif" }}>
      <div style={{ background:"#fff",borderBottom:"1px solid "+C.border,height:56,display:"flex",alignItems:"center",padding:"0 6px",position:"sticky",top:0,zIndex:30 }}>
        <button onClick={()=>navigate("/settings/messaging")} style={{ width:44,height:44,borderRadius:"50%",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2.2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <h1 style={{ flex:1,fontWeight:700,fontSize:17,color:C.text,margin:0,textAlign:"center",letterSpacing:"-0.3px" }}>Invitations par message</h1>
        <div style={{ width:44 }}/>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex",background:"#fff",borderBottom:"1px solid "+C.border }}>
        {([["maybe","Vous connaissez peut-être"],["spam","Spam"]] as const).map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{ flex:1,padding:"12px 8px",border:"none",background:"none",cursor:"pointer",fontWeight:tab===k?700:500,fontSize:14,color:tab===k?C.primary:C.secondary,borderBottom:tab===k?"2.5px solid "+C.primary:"2.5px solid transparent",transition:"all 200ms" }}>
            {l}
          </button>
        ))}
      </div>

      {/* Empty state */}
      <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 24px 24px",textAlign:"center" }}>
        <EnvelopeIllustration/>
        <div style={{ fontWeight:700,fontSize:18,color:C.text,marginTop:20,marginBottom:8,letterSpacing:"-0.3px" }}>Aucune invitation en attente</div>
        <div style={{ fontSize:14,color:C.secondary,lineHeight:1.65,maxWidth:260,marginBottom:32 }}>
          Les invitations que vous recevrez apparaîtront ici.
        </div>
      </div>

      {/* Bottom info card */}
      <div style={{ padding:"0 14px 24px" }}>
        <button onClick={()=>navigate("/settings/messaging")} style={{ width:"100%",background:C.card,borderRadius:24,boxShadow:C.shadow,padding:"16px 18px",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:14,textAlign:"left" }}>
          <div style={{ width:48,height:48,borderRadius:"50%",background:"linear-gradient(135deg,#F0FDF4,#DCFCE7)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:600,fontSize:15,color:C.text }}>Contrôlez vos invitations</div>
            <div style={{ fontSize:13,color:C.secondary,marginTop:2 }}>Paramètres de messagerie</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="#CBD5E1" strokeWidth="2.2" strokeLinecap="round"/></svg>
        </button>
      </div>

      <Footer/>
    </div>
  );
}
