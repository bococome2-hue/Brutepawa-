import { useNavigate } from "../router";
import { useCurrentUser } from "../hooks/useCurrentUser";

const C = { bg:"#F8FAFC",card:"#FFFFFF",primary:"var(--bp-primary)",text:"#111827",secondary:"#64748B",muted:"#9CA3AF",border:"#E5E7EB",shadow:"0 2px 16px rgba(0,0,0,0.05)" };

const Back = ({onBack}:{onBack:()=>void}) => (
  <div style={{ background:"#fff",borderBottom:"1px solid "+C.border,height:56,display:"flex",alignItems:"center",padding:"0 6px",position:"sticky",top:0,zIndex:30 }}>
    <button onClick={onBack} style={{ width:44,height:44,borderRadius:"50%",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2.2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
    </button>
    <h1 style={{ flex:1,fontWeight:700,fontSize:17,color:C.text,margin:0,textAlign:"center",letterSpacing:"-0.3px" }}>Paramètres de messagerie</h1>
    <div style={{ width:44 }}/>
  </div>
);

const Row = ({ bg,icon,title,sub,right,last=false,onClick }:{bg:string;icon:React.ReactNode;title:string;sub?:string;right?:React.ReactNode;last?:boolean;onClick?:()=>void}) => (
  <button onClick={onClick} style={{ display:"flex",alignItems:"center",gap:14,padding:"13px 18px",background:"none",border:"none",cursor:"pointer",width:"100%",textAlign:"left",borderBottom:last?"none":"1px solid #F8FAFC",transition:"background 150ms" }}
    onPointerDown={e=>(e.currentTarget.style.background="#F8FAFC")} onPointerUp={e=>(e.currentTarget.style.background="none")} onPointerLeave={e=>(e.currentTarget.style.background="none")}>
    <div style={{ width:44,height:44,borderRadius:"50%",background:bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:"0 2px 8px rgba(0,0,0,0.1)" }}>{icon}</div>
    <div style={{ flex:1 }}>
      <div style={{ fontWeight:600,fontSize:15,color:C.text }}>{title}</div>
      {sub && <div style={{ fontSize:13,color:C.secondary,marginTop:2 }}>{sub}</div>}
    </div>
    {right ?? <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="#CBD5E1" strokeWidth="2.2" strokeLinecap="round"/></svg>}
  </button>
);

const Footer = () => (
  <div style={{ textAlign:"center",padding:"20px 0 32px" }}>
    <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:7,marginBottom:4 }}>
      <div style={{ width:24,height:24,borderRadius:7,background:C.primary,display:"flex",alignItems:"center",justifyContent:"center" }}><span style={{ color:"#fff",fontWeight:900,fontSize:14,fontFamily:"Arial,sans-serif" }}>b</span></div>
      <span style={{ fontWeight:700,fontSize:15,color:C.text }}>BrutePawa</span>
    </div>
    <div style={{ fontSize:12,color:C.secondary }}>Connecter · Partager · Créer</div>
  </div>
);

const sv = { stroke:"#fff",fill:"none",strokeWidth:2,strokeLinecap:"round" as const };

export default function MessagingSettingsPage() {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const name = [user.firstName,user.lastName].filter(Boolean).join(" ") || user.name || "Junior Omar";

  const ROWS = [
    { bg:"linear-gradient(135deg,#D97706,#F59E0B)", icon:<svg width="20" height="20" viewBox="0 0 24 24" {...sv}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>, title:"Notifications de messages", sub:"Personnalisez vos notifications", path:"/settings/messaging/notifications" },
    { bg:"linear-gradient(135deg,#0EA5E9,#06B6D4)", icon:<svg width="20" height="20" viewBox="0 0 24 24" {...sv}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>, title:"Invitations", sub:"Gérez vos invitations reçues", path:"/settings/messaging/requests" },
    { bg:"linear-gradient(135deg,var(--bp-primary-dark),var(--bp-primary))", icon:<svg width="20" height="20" viewBox="0 0 24 24" {...sv}><polyline points="21,8 21,21 3,21 3,8"/><rect x="1" y="3" width="22" height="5"/></svg>, title:"Archive", sub:"Gérez vos conversations archivées", path:"/settings/messaging/archive" },
    { bg:"linear-gradient(135deg,#7C3AED,#8B5CF6)", icon:<svg width="20" height="20" viewBox="0 0 24 24" {...sv}><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-1"/><polygon points="12,15 7,10 17,10"/></svg>, title:"Discussions épinglées", sub:"Gérez vos discussions favorites", path:"/settings/messaging/pinned" },
    { bg:"linear-gradient(135deg,#0EA5E9,#3B82F6)", icon:<svg width="20" height="20" viewBox="0 0 24 24" {...sv}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>, title:"Téléchargement automatique", sub:"Photos, vidéos, fichiers", path:"/settings/messaging/download" },
    { bg:"linear-gradient(135deg,#EC4899,#F472B6)", icon:<svg width="20" height="20" viewBox="0 0 24 24" {...sv}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>, title:"Qualité des médias", sub:"Qualité standard", path:"/settings/messaging/quality" },
    { bg:"linear-gradient(135deg,#047857,#10B981)", icon:<svg width="20" height="20" viewBox="0 0 24 24" {...sv}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>, title:"Sauvegarde des discussions", sub:"Sauvegardez votre historique", path:"/settings/messaging/backup" },
    { bg:"linear-gradient(135deg,#64748B,#64748B)", icon:<svg width="20" height="20" viewBox="0 0 24 24" {...sv}><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M5.34 17.66l-1.41 1.41M2 12H3M21 12h1M17.66 5.34l1.41 1.41M4.93 19.07l1.41 1.41M12 2v1M12 21v1"/></svg>, title:"Paramètres avancés", sub:"Plus d'options de messagerie", path:"/settings/messaging/advanced" },
  ];

  return (
    <div style={{ background:C.bg,minHeight:"100dvh",fontFamily:"Inter,-apple-system,BlinkMacSystemFont,sans-serif" }}>
      <Back onBack={()=>navigate("/settings")}/>

      <div style={{ padding:"14px 14px 0" }}>
        {/* User card */}
        <div style={{ background:C.card,borderRadius:24,boxShadow:C.shadow,padding:"16px",display:"flex",alignItems:"center",gap:14,marginBottom:12 }}>
          {user.avatarUrl
            ? <img src={user.avatarUrl} alt="" style={{ width:60,height:60,borderRadius:"50%",objectFit:"cover",border:"2px solid #fff",boxShadow:"0 2px 8px rgba(0,0,0,0.15)",flexShrink:0 }}/>
            : <div style={{ width:60,height:60,borderRadius:"50%",background:"linear-gradient(135deg,var(--bp-primary),var(--bp-primary-dark))",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,border:"2px solid #fff",boxShadow:"0 2px 8px rgba(34,197,94,0.3)" }}><span style={{ fontSize:24,fontWeight:800,color:"#fff" }}>{name.charAt(0).toUpperCase()}</span></div>}
          <div style={{ flex:1 }}>
            <div style={{ display:"flex",alignItems:"center",gap:6,flexWrap:"wrap" }}>
              <span style={{ fontWeight:700,fontSize:16,color:C.text }}>{name}</span>
              <svg width="16" height="16" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" fill="#0EA5E9"/><path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
              <span style={{ background:"linear-gradient(135deg,#FBBF24,#F4C542)",color:"#1C1917",fontSize:10,fontWeight:800,padding:"2px 8px",borderRadius:10 }}>Premium</span>
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:5,marginTop:3 }}>
              <div style={{ width:7,height:7,borderRadius:"50%",background:C.primary }}/>
              <span style={{ fontSize:13,color:C.secondary }}>En ligne · Disponible pour discuter</span>
            </div>
          </div>
        </div>

        {/* Settings list */}
        <div style={{ background:C.card,borderRadius:24,boxShadow:C.shadow,overflow:"hidden" }}>
          {ROWS.map((r,i)=>(
            <Row key={i} bg={r.bg} icon={r.icon} title={r.title} sub={r.sub} last={i===ROWS.length-1} onClick={()=>navigate(r.path)}/>
          ))}
        </div>
      </div>

      <Footer/>
    </div>
  );
}
