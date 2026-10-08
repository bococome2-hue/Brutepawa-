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

function ArchiveIllustration() {
  return (
    <svg width="160" height="140" viewBox="0 0 160 140" fill="none">
      <ellipse cx="80" cy="132" rx="52" ry="7" fill="#111827" opacity=".05"/>
      {/* Back folder */}
      <path d="M20 42a6 6 0 016-6h40l9 11h59a6 6 0 016 6v57a6 6 0 01-6 6H26a6 6 0 01-6-6V42z" fill="#BBF7D0"/>
      {/* Front folder */}
      <path d="M16 54a6 6 0 016-6h42l9 11h63a6 6 0 016 6v55a6 6 0 01-6 6H22a6 6 0 01-6-6V54z" fill="var(--bp-primary)"/>
      <path d="M16 54a6 6 0 016-6h42l9 11h63a6 6 0 016 6v12H16V54z" fill="var(--bp-primary)" opacity=".4"/>
      {/* Documents */}
      <rect x="48" y="72" width="40" height="50" rx="5" fill="#fff" transform="rotate(-7 48 72)"/>
      <line x1="56" y1="90" x2="80" y2="87" stroke="#E5E7EB" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="56" y1="97" x2="76" y2="95" stroke="#E5E7EB" strokeWidth="2.5" strokeLinecap="round"/>
      <rect x="70" y="68" width="40" height="50" rx="5" fill="#fff" transform="rotate(6 70 68)"/>
      <line x1="78" y1="86" x2="102" y2="87" stroke="#E5E7EB" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Download arrow badge */}
      <circle cx="118" cy="38" r="18" fill="#DCFCE7" stroke="var(--bp-primary)" strokeWidth="2"/>
      <path d="M118 32v8m0 0l-4-4m4 4l4-4M114 44h8" stroke="var(--bp-primary-dark)" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export default function MessagingArchivePage() {
  const navigate = useNavigate();
  return (
    <div style={{ background:C.bg,minHeight:"100dvh",fontFamily:"Inter,-apple-system,BlinkMacSystemFont,sans-serif",display:"flex",flexDirection:"column" }}>
      <div style={{ background:"#fff",borderBottom:"1px solid "+C.border,height:56,display:"flex",alignItems:"center",padding:"0 6px",position:"sticky",top:0,zIndex:30 }}>
        <button onClick={()=>navigate("/settings/messaging")} style={{ width:44,height:44,borderRadius:"50%",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2.2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <h1 style={{ flex:1,fontWeight:700,fontSize:17,color:C.text,margin:0,textAlign:"center",letterSpacing:"-0.3px" }}>Archive</h1>
        <div style={{ width:44 }}/>
      </div>

      <div style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 24px" }}>
        <ArchiveIllustration/>
        <div style={{ fontWeight:700,fontSize:20,color:C.text,marginTop:20,marginBottom:10,textAlign:"center",letterSpacing:"-0.4px" }}>Aucune discussion archivée</div>
        <div style={{ fontSize:14,color:C.secondary,textAlign:"center",lineHeight:1.65,maxWidth:280,marginBottom:32 }}>
          Vous pouvez archiver vos discussions pour les retrouver plus tard.
        </div>
        <button style={{ background:"linear-gradient(135deg,var(--bp-primary-dark),var(--bp-primary))",color:"#fff",border:"none",borderRadius:18,padding:"14px 28px",fontWeight:700,fontSize:15,cursor:"pointer",boxShadow:"0 8px 24px rgba(34,197,94,0.3)",width:"100%",maxWidth:300 }}>
          Archiver une discussion
        </button>
      </div>

      <Footer/>
    </div>
  );
}
