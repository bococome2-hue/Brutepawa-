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

function PinIllustration() {
  return (
    <svg width="160" height="150" viewBox="0 0 160 150" fill="none">
      <ellipse cx="80" cy="140" rx="48" ry="6" fill="#111827" opacity=".05"/>
      {/* Chat bubbles background */}
      <rect x="14" y="55" width="80" height="48" rx="12" fill="#F0FDF4"/>
      <rect x="66" y="30" width="70" height="48" rx="12" fill="#DCFCE7"/>
      {/* Bubble details */}
      <line x1="28" y1="73" x2="80" y2="73" stroke="#BBF7D0" strokeWidth="3" strokeLinecap="round"/>
      <line x1="28" y1="83" x2="68" y2="83" stroke="#BBF7D0" strokeWidth="3" strokeLinecap="round"/>
      <line x1="80" y1="48" x2="122" y2="48" stroke="#BBF7D0" strokeWidth="3" strokeLinecap="round"/>
      <line x1="80" y1="58" x2="114" y2="58" stroke="#BBF7D0" strokeWidth="3" strokeLinecap="round"/>
      {/* Pin */}
      <circle cx="100" cy="95" r="28" fill="var(--bp-primary)" opacity=".15"/>
      <circle cx="100" cy="95" r="20" fill="var(--bp-primary)"/>
      {/* Pin icon */}
      <path d="M106 89v6a6 6 0 01-2 4.47l-3.5 2.83a1 1 0 01-1 0l-3.5-2.83A6 6 0 0194 95v-6a6 6 0 1112 0z" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
      <line x1="100" y1="100" x2="100" y2="108" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
      {/* Sparkles */}
      <circle cx="34" cy="36" r="6" fill="var(--bp-primary)" opacity=".3"/>
      <circle cx="136" cy="115" r="5" fill="var(--bp-primary)" opacity=".2"/>
      <circle cx="22" cy="110" r="4" fill="var(--bp-primary)" opacity=".15"/>
    </svg>
  );
}

export default function PinnedChatsPage() {
  const navigate = useNavigate();
  return (
    <div style={{ background:C.bg,minHeight:"100dvh",fontFamily:"Inter,-apple-system,BlinkMacSystemFont,sans-serif",display:"flex",flexDirection:"column" }}>
      <div style={{ background:"#fff",borderBottom:"1px solid "+C.border,height:56,display:"flex",alignItems:"center",padding:"0 6px",position:"sticky",top:0,zIndex:30 }}>
        <button onClick={()=>navigate("/settings/messaging")} style={{ width:44,height:44,borderRadius:"50%",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2.2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <h1 style={{ flex:1,fontWeight:700,fontSize:17,color:C.text,margin:0,textAlign:"center",letterSpacing:"-0.3px" }}>Discussions épinglées</h1>
        <div style={{ width:44 }}/>
      </div>

      <div style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 24px" }}>
        <PinIllustration/>
        <div style={{ fontWeight:700,fontSize:20,color:C.text,marginTop:20,marginBottom:10,textAlign:"center",letterSpacing:"-0.4px" }}>Aucune discussion épinglée</div>
        <div style={{ fontSize:14,color:C.secondary,textAlign:"center",lineHeight:1.65,maxWidth:280,marginBottom:32 }}>
          Épinglez vos discussions importantes pour les retrouver facilement.
        </div>
        <button style={{ background:"linear-gradient(135deg,var(--bp-primary-dark),var(--bp-primary))",color:"#fff",border:"none",borderRadius:18,padding:"14px 28px",fontWeight:700,fontSize:15,cursor:"pointer",boxShadow:"0 8px 24px rgba(34,197,94,0.3)",width:"100%",maxWidth:300 }}>
          Épingler une discussion
        </button>
      </div>
      <Footer/>
    </div>
  );
}
