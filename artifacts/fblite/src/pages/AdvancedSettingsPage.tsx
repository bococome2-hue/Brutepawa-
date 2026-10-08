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

const sv = { fill:"none",strokeWidth:1.8,strokeLinecap:"round" as const };

function NavRow({ bg,icon,title,value,last=false,onClick }:{bg:string;icon:React.ReactNode;title:string;value?:string;last?:boolean;onClick?:()=>void}) {
  return (
    <button onClick={onClick} style={{ display:"flex",alignItems:"center",gap:14,padding:"13px 18px",background:"none",border:"none",cursor:"pointer",width:"100%",textAlign:"left",borderBottom:last?"none":"1px solid #F8FAFC",transition:"background 150ms" }}
      onPointerDown={e=>(e.currentTarget.style.background="#F8FAFC")} onPointerUp={e=>(e.currentTarget.style.background="none")} onPointerLeave={e=>(e.currentTarget.style.background="none")}>
      <div style={{ width:42,height:42,borderRadius:"50%",background:bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>{icon}</div>
      <span style={{ flex:1,fontWeight:500,fontSize:14,color:C.text }}>{title}</span>
      {value && <span style={{ fontSize:13,color:C.secondary,marginRight:4 }}>{value}</span>}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="#CBD5E1" strokeWidth="2.2" strokeLinecap="round"/></svg>
    </button>
  );
}

export default function AdvancedSettingsPage() {
  const navigate = useNavigate();
  return (
    <div style={{ background:C.bg,minHeight:"100dvh",fontFamily:"Inter,-apple-system,BlinkMacSystemFont,sans-serif" }}>
      <div style={{ background:"#fff",borderBottom:"1px solid "+C.border,height:56,display:"flex",alignItems:"center",padding:"0 6px",position:"sticky",top:0,zIndex:30 }}>
        <button onClick={()=>navigate("/settings/messaging")} style={{ width:44,height:44,borderRadius:"50%",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2.2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <h1 style={{ flex:1,fontWeight:700,fontSize:17,color:C.text,margin:0,textAlign:"center",letterSpacing:"-0.3px" }}>Paramètres avancés</h1>
        <div style={{ width:44 }}/>
      </div>

      <div style={{ padding:"16px 14px 0" }}>
        <div style={{ background:C.card,borderRadius:24,boxShadow:C.shadow,overflow:"hidden" }}>
          <NavRow bg="linear-gradient(135deg,#DCFCE7,#DCFCE7)"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" stroke="var(--bp-primary)" {...sv}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>}
            title="Langue" value="Français"/>

          <NavRow bg="linear-gradient(135deg,#FEF3C7,#FEF3C7)"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" stroke="#D97706" {...sv}><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>}
            title="Thème" value="Clair"/>

          <NavRow bg="linear-gradient(135deg,#EDE9FE,#EDE9FE)"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" stroke="#8B5CF6" {...sv}><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>}
            title="Taille du texte" value="Moyenne"/>

          <NavRow bg="linear-gradient(135deg,#FEE2E2,#FCA5A5)"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" stroke="#EF4444" {...sv}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>}
            title="Fond d'écran"/>

          <NavRow bg="linear-gradient(135deg,#DCFCE7,#BBF7D0)"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" stroke="var(--bp-primary)" {...sv}><path d="M15 3h6v6"/><path d="M10 14L21 3"/><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/></svg>}
            title="Raccourcis"/>

          <NavRow bg="linear-gradient(135deg,#FEE2E2,#FCA5A5)"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" stroke="#EF4444" {...sv}><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>}
            title="Nettoyer le cache" value="128 Mo"/>

          <NavRow bg="linear-gradient(135deg,#DCFCE7,#DCFCE7)"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" stroke="var(--bp-primary)" {...sv}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
            title="Aide"/>

          <NavRow bg="linear-gradient(135deg,#F1F5F9,#E5E7EB)"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" stroke="#64748B" {...sv}><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>}
            title="À propos" value="Version 1.0.0" last onClick={()=>navigate("/settings/messaging/about")}/>
        </div>
      </div>
      <Footer/>
    </div>
  );
}
