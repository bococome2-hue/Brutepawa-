import { useState } from "react";
import { useNavigate } from "../router";

const C = { bg:"#F8FAFC", card:"#FFFFFF", primary:"var(--bp-primary)", primaryDark:"var(--bp-primary-dark)", text:"#111827", secondary:"#64748B", muted:"#9CA3AF", shadow:"0 8px 30px rgba(0,0,0,0.05)" };

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

const LANGS = [
  { code:"fr", label:"Français", native:"Français" },
  { code:"en", label:"Anglais",  native:"English"  },
  { code:"bm", label:"Bambara",  native:"Bamanankan"},
  { code:"ha", label:"Haoussa",  native:"Hausa"    },
  { code:"sw", label:"Swahili",  native:"Kiswahili" },
  { code:"wo", label:"Wolof",    native:"Wolof"    },
];

const REGIONS = [
  { code:"ML", label:"Mali" },
  { code:"SN", label:"Sénégal" },
  { code:"CI", label:"Côte d'Ivoire" },
  { code:"BF", label:"Burkina Faso" },
  { code:"GN", label:"Guinée" },
  { code:"NG", label:"Nigeria" },
  { code:"GH", label:"Ghana" },
  { code:"CM", label:"Cameroun" },
];

function SelectRow({ label, sub, selected, onSelect, last=false }:{label:string;sub?:string;selected:boolean;onSelect:()=>void;last?:boolean}) {
  const [pressed, setPressed] = useState(false);
  return (
    <button onClick={onSelect} onPointerDown={()=>setPressed(true)} onPointerUp={()=>setPressed(false)} onPointerLeave={()=>setPressed(false)}
      style={{ display:"flex",alignItems:"center",padding:"14px 18px",background:pressed?"#F8FAFC":"none",border:"none",cursor:"pointer",width:"100%",textAlign:"left",borderBottom:last?"none":"1px solid #F1F5F9",transition:"background 150ms" }}>
      <div style={{ flex:1 }}>
        <div style={{ fontWeight:selected?700:500,fontSize:15,color:selected?C.primary:C.text }}>{label}</div>
        {sub && <div style={{ fontSize:12,color:C.muted,marginTop:1 }}>{sub}</div>}
      </div>
      {selected && (
        <div style={{ width:26,height:26,borderRadius:"50%",background:C.primary,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 8px rgba(34,197,94,0.35)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
        </div>
      )}
    </button>
  );
}

export default function LanguagePage() {
  const navigate = useNavigate();
  const [lang, setLang] = useState("fr");
  const [region, setRegion] = useState("ML");

  return (
    <div style={{ background:C.bg, minHeight:"100dvh", fontFamily:"Inter,-apple-system,BlinkMacSystemFont,sans-serif" }}>
      <SubHeader title="Langue & région" onBack={()=>navigate("/settings")}/>

      <div style={{ padding:"24px 14px 40px" }}>
        {/* Globe illustration */}
        <div style={{ display:"flex",justifyContent:"center",marginBottom:28 }}>
          <div style={{ width:110,height:110,borderRadius:"50%",background:"radial-gradient(circle at 40% 35%,#DCFCE7,#DCFCE7)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 0 12px #DCFCE7,0 8px 30px rgba(14,165,233,0.2)" }}>
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9.5" fill="#0EA5E9" opacity=".12"/>
              <circle cx="12" cy="12" r="9.5" stroke="#0EA5E9" strokeWidth="1.5"/>
              <ellipse cx="12" cy="12" rx="4.5" ry="9.5" stroke="#0EA5E9" strokeWidth="1.2"/>
              <line x1="2.5" y1="12" x2="21.5" y2="12" stroke="#0EA5E9" strokeWidth="1.2"/>
              <line x1="4" y1="7" x2="20" y2="7" stroke="#0EA5E9" strokeWidth="1" opacity=".5"/>
              <line x1="4" y1="17" x2="20" y2="17" stroke="#0EA5E9" strokeWidth="1" opacity=".5"/>
              {/* Africa silhouette dot */}
              <ellipse cx="12" cy="13" rx="2.5" ry="3.5" fill="#0EA5E9" opacity=".3"/>
            </svg>
          </div>
        </div>

        {/* Langue */}
        <div style={{ marginBottom:8 }}>
          <div style={{ fontWeight:700,fontSize:13,color:C.muted,textTransform:"uppercase",letterSpacing:"0.8px",padding:"0 4px 10px" }}>Langue</div>
          <div style={{ background:C.card,borderRadius:24,boxShadow:C.shadow,overflow:"hidden" }}>
            {LANGS.map((l,i)=>(
              <SelectRow key={l.code} label={l.native} sub={l.label!==l.native?l.label:undefined} selected={lang===l.code} onSelect={()=>setLang(l.code)} last={i===LANGS.length-1}/>
            ))}
          </div>
        </div>

        {/* Région */}
        <div>
          <div style={{ fontWeight:700,fontSize:13,color:C.muted,textTransform:"uppercase",letterSpacing:"0.8px",padding:"16px 4px 10px" }}>Région</div>
          <div style={{ background:C.card,borderRadius:24,boxShadow:C.shadow,overflow:"hidden" }}>
            {REGIONS.map((r,i)=>(
              <SelectRow key={r.code} label={r.label} sub={r.code} selected={region===r.code} onSelect={()=>setRegion(r.code)} last={i===REGIONS.length-1}/>
            ))}
          </div>
        </div>

        {/* Save button */}
        <button style={{ width:"100%",marginTop:24,padding:"16px",borderRadius:18,background:"linear-gradient(135deg,var(--bp-primary-dark),var(--bp-primary))",border:"none",color:"#fff",fontWeight:700,fontSize:16,cursor:"pointer",boxShadow:"0 8px 24px rgba(34,197,94,0.3)",transition:"opacity 200ms" }}>
          Enregistrer les préférences
        </button>
      </div>
    </div>
  );
}
