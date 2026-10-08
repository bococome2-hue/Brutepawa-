import { useState } from "react";
import { useNavigate } from "../router";

type Tab = "stories"|"publications"|"corbeille";
const C = { bg:"#F8FAFC", card:"#FFFFFF", primary:"var(--bp-primary)", primaryDark:"var(--bp-primary-dark)", text:"#111827", secondary:"#64748B", muted:"#9CA3AF", shadow:"0 8px 30px rgba(0,0,0,0.05)", danger:"#EF4444" };

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

/* 3D-ish SVG folder illustration */
function FolderIllustration() {
  return (
    <svg width="160" height="140" viewBox="0 0 160 140" fill="none">
      {/* Shadow */}
      <ellipse cx="80" cy="132" rx="55" ry="7" fill="#111827" opacity=".06"/>
      {/* Back folder */}
      <path d="M18 40a6 6 0 016-6h42l10 12h60a6 6 0 016 6v60a6 6 0 01-6 6H24a6 6 0 01-6-6V40z" fill="#BBF7D0"/>
      {/* Front folder */}
      <path d="M14 52a6 6 0 016-6h44l10 12h66a6 6 0 016 6v58a6 6 0 01-6 6H20a6 6 0 01-6-6V52z" fill="var(--bp-primary)"/>
      {/* Folder highlight */}
      <path d="M14 52a6 6 0 016-6h44l10 12h66a6 6 0 016 6v10H14V52z" fill="var(--bp-primary)" opacity=".4"/>
      {/* Tab */}
      <path d="M58 46h22l10 12H68L58 46z" fill="var(--bp-primary-dark)"/>
      {/* Document 1 */}
      <rect x="50" y="70" width="44" height="52" rx="6" fill="#fff" transform="rotate(-8 50 70)"/>
      <line x1="58" y1="90" x2="86" y2="86" stroke="#E5E7EB" strokeWidth="3" strokeLinecap="round"/>
      <line x1="58" y1="97" x2="82" y2="94" stroke="#E5E7EB" strokeWidth="3" strokeLinecap="round"/>
      <line x1="58" y1="104" x2="79" y2="101" stroke="#E5E7EB" strokeWidth="3" strokeLinecap="round"/>
      {/* Document 2 */}
      <rect x="68" y="65" width="44" height="52" rx="6" fill="#fff" transform="rotate(6 68 65)"/>
      <line x1="76" y1="85" x2="102" y2="86" stroke="#E5E7EB" strokeWidth="3" strokeLinecap="round"/>
      <line x1="76" y1="92" x2="98" y2="93" stroke="#E5E7EB" strokeWidth="3" strokeLinecap="round"/>
      {/* Star badge */}
      <circle cx="125" cy="38" r="16" fill="#FEF9C3" stroke="#FBBF24" strokeWidth="2"/>
      <text x="125" y="44" textAnchor="middle" fontSize="16">⭐</text>
      {/* Photo badge */}
      <circle cx="38" cy="72" r="14" fill="#DCFCE7" stroke="#DCFCE7" strokeWidth="2"/>
      <text x="38" y="78" textAnchor="middle" fontSize="14">📷</text>
      {/* Play badge */}
      <circle cx="130" cy="95" r="13" fill="#FEF3C7" stroke="#FCD34D" strokeWidth="2"/>
      <text x="130" y="101" textAnchor="middle" fontSize="13">▶</text>
    </svg>
  );
}

export default function ArchivePage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("publications");
  const [items, setItems] = useState<string[]>([]);

  const TABS: { key:Tab; label:string; icon:React.ReactNode }[] = [
    { key:"stories",      label:"Stories",      icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none"/></svg> },
    { key:"publications", label:"Publications",  icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg> },
    { key:"corbeille",   label:"Corbeille",     icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg> },
  ];

  return (
    <div style={{ background:C.bg, minHeight:"100dvh", fontFamily:"Inter,-apple-system,BlinkMacSystemFont,sans-serif" }}>
      <SubHeader title="Archive" onBack={()=>navigate("/settings")}/>

      {/* Banner card */}
      <div style={{ margin:"14px 14px 0", background:"linear-gradient(135deg,#F0FDF4,#DCFCE7)", borderRadius:24, padding:"16px 18px", display:"flex", alignItems:"center", gap:14, boxShadow:C.shadow, border:"1px solid #BBF7D0" }}>
        <div style={{ width:52,height:52,borderRadius:16,background:"linear-gradient(135deg,var(--bp-primary-dark),var(--bp-primary))",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:"0 4px 12px rgba(34,197,94,0.3)" }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
            <polyline points="21,8 21,21 3,21 3,8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>
          </svg>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700,fontSize:15,color:"var(--bp-primary-dark)",letterSpacing:"-0.2px" }}>Conservez ce qui compte pour vous</div>
          <div style={{ fontSize:13,color:"var(--bp-primary-dark)",marginTop:2,opacity:.8 }}>Archivez ou restaurez vos publications à tout moment.</div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display:"flex",gap:0,padding:"14px 14px 0",overflowX:"auto" }}>
        {TABS.map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)} style={{ display:"flex",alignItems:"center",gap:6,padding:"9px 14px",borderRadius:20,border:"none",cursor:"pointer",background:tab===t.key?C.primary:"transparent",color:tab===t.key?"#fff":C.secondary,fontWeight:tab===t.key?700:500,fontSize:13,transition:"all 200ms",whiteSpace:"nowrap",flexShrink:0 }}>
            {t.icon}{t.label}
          </button>
        ))}
        {/* Filtres pseudo-tab */}
        <button style={{ display:"flex",alignItems:"center",gap:6,padding:"9px 14px",borderRadius:20,border:"none",cursor:"pointer",background:"transparent",color:C.secondary,fontWeight:500,fontSize:13,marginLeft:"auto",flexShrink:0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
          Filtres
        </button>
      </div>

      {/* Empty state */}
      <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"28px 24px 120px",textAlign:"center" }}>
        <FolderIllustration/>
        <div style={{ fontWeight:700,fontSize:18,color:C.text,marginTop:20,marginBottom:8,letterSpacing:"-0.3px" }}>Aucun élément archivé</div>
        <div style={{ fontSize:14,color:C.secondary,lineHeight:1.6,maxWidth:240 }}>Vos éléments archivés apparaîtront ici.</div>
      </div>

      {/* Bottom action bar */}
      <div className="sc-fixed-escape" style={{ position:"fixed",bottom:0,left:0,right:0,padding:"12px 14px",paddingBottom:"calc(12px + env(safe-area-inset-bottom,0px))",background:"rgba(248,250,252,0.97)",backdropFilter:"blur(16px)",borderTop:"1px solid #F1F5F9",display:"flex",gap:10 }}>
        <button style={{ flex:1,padding:"14px",borderRadius:16,border:"2px solid "+C.primary,background:"#F0FDF4",color:C.primary,fontWeight:700,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2.2" strokeLinecap="round"><path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
          Restaurer
        </button>
        <button style={{ flex:1,padding:"14px",borderRadius:16,border:"2px solid #EF4444",background:"#FEF2F2",color:"#EF4444",fontWeight:700,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.2" strokeLinecap="round"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
          Supprimer
        </button>
      </div>
    </div>
  );
}
