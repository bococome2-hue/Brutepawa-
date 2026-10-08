import { useState } from "react";
import { useNavigate } from "../router";

const C = { bg:"#F8FAFC",card:"#FFFFFF",primary:"var(--bp-primary)",text:"#111827",secondary:"#64748B",muted:"#9CA3AF",border:"#E5E7EB",shadow:"0 2px 16px rgba(0,0,0,0.05)" };

const SLabel = ({ t }:{t:string}) => (
  <div style={{ fontSize:12,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.8px",padding:"20px 4px 10px" }}>{t}</div>
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

type MediaVal = "Désactivé"|"Tous les médias"|"Photos seulement"|"Vidéos seulement";

function MediaRow({ icon,label,value,onChange,last=false }:{icon:React.ReactNode;label:string;value:MediaVal;onChange:(v:MediaVal)=>void;last?:boolean}) {
  const [open,setOpen] = useState(false);
  const OPTIONS:MediaVal[] = ["Désactivé","Tous les médias","Photos seulement","Vidéos seulement"];
  return (
    <>
      <button onClick={()=>setOpen(!open)} style={{ display:"flex",alignItems:"center",gap:14,padding:"13px 18px",background:"none",border:"none",cursor:"pointer",width:"100%",textAlign:"left",borderBottom:open||last?"none":"1px solid #F8FAFC" }}>
        <div style={{ width:42,height:42,borderRadius:"50%",background:"#F8FAFC",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>{icon}</div>
        <span style={{ flex:1,fontWeight:500,fontSize:14,color:C.text }}>{label}</span>
        <span style={{ fontSize:13,color:C.secondary,marginRight:4 }}>{value}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ transform:open?"rotate(90deg)":"none",transition:"transform 200ms" }}>
          <path d="M9 18l6-6-6-6" stroke="#CBD5E1" strokeWidth="2.2" strokeLinecap="round"/>
        </svg>
      </button>
      {open && (
        <div style={{ background:"#F8FAFC",borderBottom:last?"none":"1px solid "+C.border }}>
          {OPTIONS.map(o=>(
            <button key={o} onClick={()=>{onChange(o);setOpen(false);}}
              style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 18px 11px 62px",width:"100%",background:"none",border:"none",cursor:"pointer",borderBottom:"1px solid #F1F5F9" }}>
              <span style={{ fontSize:14,color:C.text,fontWeight:value===o?700:400 }}>{o}</span>
              {value===o && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

const icons = {
  photo: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.secondary} strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>,
  audio: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.secondary} strokeWidth="1.8" strokeLinecap="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>,
  video: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.secondary} strokeWidth="1.8" strokeLinecap="round"><polygon points="23,7 16,12 23,17"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>,
  file:  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.secondary} strokeWidth="1.8" strokeLinecap="round"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13,2 13,9 20,9"/></svg>,
};

export default function AutoDownloadPage() {
  const navigate = useNavigate();
  const [mPhoto,setMPhoto] = useState<MediaVal>("Désactivé");
  const [mAudio,setMAudio] = useState<MediaVal>("Désactivé");
  const [mVideo,setMVideo] = useState<MediaVal>("Désactivé");
  const [mFile,setMFile]   = useState<MediaVal>("Désactivé");
  const [wPhoto,setWPhoto] = useState<MediaVal>("Tous les médias");
  const [wAudio,setWAudio] = useState<MediaVal>("Tous les médias");
  const [wVideo,setWVideo] = useState<MediaVal>("Tous les médias");
  const [wFile,setWFile]   = useState<MediaVal>("Tous les médias");

  return (
    <div style={{ background:C.bg,minHeight:"100dvh",fontFamily:"Inter,-apple-system,BlinkMacSystemFont,sans-serif" }}>
      <div style={{ background:"#fff",borderBottom:"1px solid "+C.border,height:56,display:"flex",alignItems:"center",padding:"0 6px",position:"sticky",top:0,zIndex:30 }}>
        <button onClick={()=>navigate("/settings/messaging")} style={{ width:44,height:44,borderRadius:"50%",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2.2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <h1 style={{ flex:1,fontWeight:700,fontSize:17,color:C.text,margin:0,textAlign:"center",letterSpacing:"-0.3px" }}>Téléchargement automatique</h1>
        <div style={{ width:44 }}/>
      </div>

      <div style={{ padding:"0 14px 32px" }}>
        <SLabel t="Quand utiliser les données mobiles"/>
        <div style={{ background:C.card,borderRadius:24,boxShadow:C.shadow,overflow:"hidden" }}>
          <MediaRow icon={icons.photo} label="Photos" value={mPhoto} onChange={setMPhoto}/>
          <MediaRow icon={icons.audio} label="Audio"  value={mAudio} onChange={setMAudio}/>
          <MediaRow icon={icons.video} label="Vidéos" value={mVideo} onChange={setMVideo}/>
          <MediaRow icon={icons.file}  label="Fichiers" value={mFile} onChange={setMFile} last/>
        </div>

        <SLabel t="Quand connecté en Wi-Fi"/>
        <div style={{ background:C.card,borderRadius:24,boxShadow:C.shadow,overflow:"hidden" }}>
          <MediaRow icon={icons.photo} label="Photos"  value={wPhoto} onChange={setWPhoto}/>
          <MediaRow icon={icons.audio} label="Audio"   value={wAudio} onChange={setWAudio}/>
          <MediaRow icon={icons.video} label="Vidéos"  value={wVideo} onChange={setWVideo}/>
          <MediaRow icon={icons.file}  label="Fichiers" value={wFile} onChange={setWFile} last/>
        </div>

        {/* Note */}
        <div style={{ background:"linear-gradient(135deg,#FEF9C3,#FEF08A)",borderRadius:20,padding:"14px 16px",marginTop:16,display:"flex",gap:10,border:"1px solid #FEF3C7" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" style={{ flexShrink:0,marginTop:1 }}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <p style={{ fontSize:13,color:"#D97706",margin:0,lineHeight:1.6 }}><strong>Astuce :</strong> les paramètres ne s'appliquent pas aux appels.</p>
        </div>
      </div>
      <Footer/>
    </div>
  );
}
