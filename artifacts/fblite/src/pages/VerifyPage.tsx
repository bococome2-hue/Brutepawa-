import { useState, useRef, useEffect } from "react";
import { useNavigate } from "../router";

const C = { bg:"#F8FAFC", card:"#FFFFFF", primary:"var(--bp-primary)", primaryDark:"var(--bp-primary-dark)", text:"#111827", secondary:"#64748B", muted:"#9CA3AF", shadow:"0 8px 30px rgba(0,0,0,0.05)", danger:"#EF4444" };
type Step = "intro"|"phone"|"otp"|"done";

function SubHeader({ title, onBack }:{title:string;onBack:()=>void}) {
  return (
    <div style={{ background:"#fff", borderBottom:"1px solid #F1F5F9", height:56, display:"flex", alignItems:"center", padding:"0 6px", position:"sticky", top:0, zIndex:30, boxShadow:"0 1px 8px rgba(0,0,0,0.04)" }}>
      <button onClick={onBack} style={{ width:44,height:44,borderRadius:"50%",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2.2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
      </button>
      <h1 style={{ flex:1,fontWeight:700,fontSize:17,color:C.text,margin:0,letterSpacing:"-0.3px",textAlign:"center" }}>{title}</h1>
      <div style={{ width:44 }}/>
    </div>
  );
}

function ProgressBar({ step }:{step:Step}) {
  const pct = step==="intro"?25:step==="phone"?50:step==="otp"?75:100;
  return (
    <div style={{ padding:"12px 14px 0" }}>
      <div style={{ height:4,background:"#E5E7EB",borderRadius:999,overflow:"hidden" }}>
        <div style={{ height:"100%",width:`${pct}%`,background:"linear-gradient(90deg,var(--bp-primary-dark),var(--bp-primary))",borderRadius:999,transition:"width 400ms ease" }}/>
      </div>
      <div style={{ display:"flex",justifyContent:"space-between",marginTop:6 }}>
        <span style={{ fontSize:11,color:C.muted }}>Étape {pct===25?1:pct===50?2:pct===75?3:4} / 4</span>
        <span style={{ fontSize:11,color:C.primary,fontWeight:600 }}>{pct}%</span>
      </div>
    </div>
  );
}

/* Intro step */
function IntroStep({ onNext }:{onNext:()=>void}) {
  return (
    <div style={{ padding:"32px 20px 40px", display:"flex", flexDirection:"column", alignItems:"center" }}>
      {/* Shield illustration */}
      <div style={{ position:"relative",marginBottom:28 }}>
        <div style={{ width:120,height:120,borderRadius:"50%",background:"radial-gradient(circle at 40% 35%,#DCFCE7,#DCFCE7)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 0 12px rgba(59,130,246,0.07),0 0 0 24px rgba(59,130,246,0.03),0 12px 40px rgba(59,130,246,0.2)" }}>
          <svg width="68" height="68" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7L12 2z" fill="#0EA5E9" opacity=".15"/>
            <path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7L12 2z" stroke="var(--bp-primary)" strokeWidth="1.8" fill="none"/>
            <path d="M9 12l2 2 4-4" stroke="var(--bp-primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div style={{ position:"absolute",top:4,right:-4,width:14,height:14,borderRadius:"50%",background:"#FBBF24",opacity:.9 }}/>
        <div style={{ position:"absolute",bottom:6,left:-8,width:9,height:9,borderRadius:"50%",background:"#0EA5E9",opacity:.8 }}/>
      </div>

      <h2 style={{ fontWeight:800,fontSize:22,color:C.text,marginBottom:10,letterSpacing:"-0.5px",textAlign:"center" }}>Vérification du compte</h2>
      <p style={{ fontSize:14,color:C.secondary,lineHeight:1.7,textAlign:"center",marginBottom:28,maxWidth:260 }}>
        Ajoutez votre numéro de téléphone pour sécuriser votre compte et accéder à toutes les fonctionnalités.
      </p>

      {/* Benefits */}
      <div style={{ width:"100%",background:C.card,borderRadius:20,boxShadow:C.shadow,overflow:"hidden",marginBottom:28 }}>
        {[
          { t:"Sécurité renforcée", s:"Protégez l'accès à votre compte" },
          { t:"Récupération facile", s:"Retrouvez votre compte si nécessaire" },
          { t:"Fonctionnalités complètes", s:"Accès à toutes les options premium" },
        ].map((b,i,a)=>(
          <div key={i} style={{ display:"flex",alignItems:"center",gap:12,padding:"13px 16px",borderBottom:i<a.length-1?"1px solid #F1F5F9":"none" }}>
            <div style={{ width:36,height:36,borderRadius:"50%",background:"linear-gradient(135deg,#DCFCE7,#DCFCE7)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
            </div>
            <div>
              <div style={{ fontWeight:600,fontSize:14,color:C.text }}>{b.t}</div>
              <div style={{ fontSize:12,color:C.muted,marginTop:1 }}>{b.s}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontSize:11,color:C.muted,marginBottom:16,textAlign:"center" }}>Durée estimée : environ 2 minutes</div>

      <button onClick={onNext} style={{ width:"100%",padding:"16px",borderRadius:18,background:"linear-gradient(135deg,#0EA5E9,#0EA5E9)",border:"none",color:"#fff",fontWeight:700,fontSize:16,cursor:"pointer",boxShadow:"0 8px 24px rgba(59,130,246,0.35)" }}>
        Commencer la vérification
      </button>
    </div>
  );
}

/* Phone step */
function PhoneStep({ onNext }:{onNext:(phone:string)=>void}) {
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("+223");
  const valid = phone.replace(/\D/g,"").length >= 8;
  return (
    <div style={{ padding:"32px 20px 40px" }}>
      <div style={{ display:"flex",justifyContent:"center",marginBottom:24 }}>
        <div style={{ width:80,height:80,borderRadius:"50%",background:"linear-gradient(135deg,#DCFCE7,#DCFCE7)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 8px 24px rgba(59,130,246,0.18)" }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--bp-primary)" strokeWidth="1.8" strokeLinecap="round">
            <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
          </svg>
        </div>
      </div>
      <h2 style={{ fontWeight:800,fontSize:20,color:C.text,marginBottom:8,textAlign:"center" }}>Votre numéro</h2>
      <p style={{ fontSize:14,color:C.secondary,textAlign:"center",marginBottom:24 }}>Nous vous enverrons un code de vérification.</p>

      <div style={{ background:C.card,borderRadius:20,boxShadow:C.shadow,overflow:"hidden",marginBottom:16 }}>
        <div style={{ padding:"4px 0 0" }}>
          <select value={country} onChange={e=>setCountry(e.target.value)} style={{ width:"100%",padding:"14px 16px",border:"none",borderBottom:"1px solid #F1F5F9",background:"none",fontSize:14,color:C.text,fontFamily:"inherit",outline:"none",cursor:"pointer" }}>
            <option value="+223">🇲🇱 Mali (+223)</option>
            <option value="+221">🇸🇳 Sénégal (+221)</option>
            <option value="+225">🇨🇮 Côte d'Ivoire (+225)</option>
            <option value="+226">🇧🇫 Burkina Faso (+226)</option>
            <option value="+224">🇬🇳 Guinée (+224)</option>
            <option value="+234">🇳🇬 Nigeria (+234)</option>
          </select>
        </div>
        <div style={{ display:"flex",alignItems:"center",padding:"14px 16px",gap:10 }}>
          <span style={{ fontWeight:700,fontSize:15,color:C.secondary,flexShrink:0 }}>{country}</span>
          <div style={{ width:1,height:22,background:"#E5E7EB" }}/>
          <input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Numéro de téléphone" style={{ flex:1,border:"none",outline:"none",fontSize:15,color:C.text,fontFamily:"inherit",background:"none",letterSpacing:"0.5px" }}/>
        </div>
      </div>

      <button onClick={()=>valid&&onNext(country+phone.replace(/\D/g,""))} disabled={!valid} style={{ width:"100%",padding:"16px",borderRadius:18,background:valid?"linear-gradient(135deg,#0EA5E9,#0EA5E9)":"#E5E7EB",border:"none",color:valid?"#fff":C.muted,fontWeight:700,fontSize:16,cursor:valid?"pointer":"not-allowed",boxShadow:valid?"0 8px 24px rgba(59,130,246,0.35)":"none",transition:"all 250ms" }}>
        Envoyer le code
      </button>
    </div>
  );
}

/* OTP step */
function OtpStep({ phone, onNext }:{phone:string;onNext:()=>void}) {
  const [code, setCode] = useState(["","","","","",""]);
  const r0=useRef<HTMLInputElement>(null), r1=useRef<HTMLInputElement>(null), r2=useRef<HTMLInputElement>(null);
  const r3=useRef<HTMLInputElement>(null), r4=useRef<HTMLInputElement>(null), r5=useRef<HTMLInputElement>(null);
  const refs = [r0,r1,r2,r3,r4,r5];
  const valid = code.every(c=>c!=="");

  const handleInput = (i:number, v:string) => {
    if(!/^\d?$/.test(v)) return;
    const n=[...code]; n[i]=v; setCode(n);
    if(v&&i<5) refs[i+1].current?.focus();
  };
  const handleKey = (i:number, e:React.KeyboardEvent) => {
    if(e.key==="Backspace"&&!code[i]&&i>0) refs[i-1].current?.focus();
  };

  return (
    <div style={{ padding:"32px 20px 40px" }}>
      <div style={{ display:"flex",justifyContent:"center",marginBottom:24 }}>
        <div style={{ width:80,height:80,borderRadius:"50%",background:"linear-gradient(135deg,#DCFCE7,#DCFCE7)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 8px 24px rgba(59,130,246,0.18)" }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--bp-primary)" strokeWidth="1.8" strokeLinecap="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            <line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="13" y2="14"/>
          </svg>
        </div>
      </div>
      <h2 style={{ fontWeight:800,fontSize:20,color:C.text,marginBottom:8,textAlign:"center" }}>Code de vérification</h2>
      <p style={{ fontSize:14,color:C.secondary,textAlign:"center",marginBottom:28 }}>Code envoyé au <strong>{phone.slice(0,6)}···{phone.slice(-2)}</strong></p>

      <div style={{ display:"flex",gap:10,justifyContent:"center",marginBottom:28 }}>
        {code.map((d,i)=>(
          <input key={i} ref={refs[i]} maxLength={1} value={d}
            onChange={e=>handleInput(i,e.target.value)} onKeyDown={e=>handleKey(i,e)}
            style={{ width:48,height:58,borderRadius:16,border:d?"2px solid "+C.primary:"2px solid #E5E7EB",background:d?"#F0FDF4":"#fff",textAlign:"center",fontSize:22,fontWeight:800,color:C.text,outline:"none",transition:"all 200ms",fontFamily:"inherit",boxShadow:d?"0 0 0 4px rgba(34,197,94,0.1)":"none" }}/>
        ))}
      </div>

      <button onClick={()=>valid&&onNext()} disabled={!valid} style={{ width:"100%",padding:"16px",borderRadius:18,background:valid?"linear-gradient(135deg,#0EA5E9,#0EA5E9)":"#E5E7EB",border:"none",color:valid?"#fff":C.muted,fontWeight:700,fontSize:16,cursor:valid?"pointer":"not-allowed",boxShadow:valid?"0 8px 24px rgba(59,130,246,0.35)":"none",transition:"all 250ms",marginBottom:14 }}>
        Vérifier le code
      </button>
      <button style={{ width:"100%",padding:"12px",background:"none",border:"none",color:C.primary,fontWeight:600,fontSize:14,cursor:"pointer" }}>
        Renvoyer le code dans 59s
      </button>
    </div>
  );
}

/* Done step */
function DoneStep({ onClose }:{onClose:()=>void}) {
  return (
    <div style={{ padding:"48px 24px 40px",display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center" }}>
      <div style={{ width:120,height:120,borderRadius:"50%",background:"radial-gradient(circle at 40% 35%,#DCFCE7,#BBF7D0)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 0 12px rgba(34,197,94,0.08),0 0 0 24px rgba(34,197,94,0.04),0 12px 40px rgba(34,197,94,0.25)",marginBottom:28,animation:"popIn 400ms cubic-bezier(0.34,1.56,0.64,1)" }}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--bp-primary-dark)" strokeWidth="2.2" strokeLinecap="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <path d="M9 12l2 2 4-4"/>
        </svg>
      </div>
      <h2 style={{ fontWeight:800,fontSize:24,color:C.text,marginBottom:10,letterSpacing:"-0.5px" }}>Compte vérifié !</h2>
      <p style={{ fontSize:15,color:C.secondary,lineHeight:1.7,marginBottom:32,maxWidth:260 }}>Votre identité a été confirmée avec succès. Profitez de toutes les fonctionnalités BrutePawa.</p>
      <div style={{ display:"flex",gap:10,width:"100%" }}>
        <div style={{ flex:1,background:"#F0FDF4",borderRadius:18,padding:"14px",textAlign:"center",border:"1px solid #BBF7D0" }}>
          <div style={{ fontSize:11,color:C.muted }}>Badge</div>
          <div style={{ fontWeight:700,fontSize:13,color:C.primary,marginTop:2 }}>Activé</div>
        </div>
        <div style={{ flex:1,background:"#F0FDF4",borderRadius:18,padding:"14px",textAlign:"center",border:"1px solid #BBF7D0" }}>
          <div style={{ fontSize:11,color:C.muted }}>Statut</div>
          <div style={{ fontWeight:700,fontSize:13,color:C.primary,marginTop:2 }}>Vérifié</div>
        </div>
      </div>
      <button onClick={onClose} style={{ width:"100%",marginTop:20,padding:"16px",borderRadius:18,background:"linear-gradient(135deg,var(--bp-primary-dark),var(--bp-primary))",border:"none",color:"#fff",fontWeight:700,fontSize:16,cursor:"pointer",boxShadow:"0 8px 24px rgba(34,197,94,0.35)" }}>
        Revenir aux paramètres
      </button>
      <style>{`@keyframes popIn{from{transform:scale(0.6);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
    </div>
  );
}

export default function VerifyPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("intro");
  const [phone, setPhone] = useState("");

  return (
    <div style={{ background:C.bg, minHeight:"100dvh", fontFamily:"Inter,-apple-system,BlinkMacSystemFont,sans-serif" }}>
      <SubHeader title="Vérification du compte" onBack={()=>navigate("/settings")}/>
      <ProgressBar step={step}/>

      <div style={{ animation:"fadeIn 300ms ease" }}>
        {step==="intro" && <IntroStep onNext={()=>setStep("phone")}/>}
        {step==="phone" && <PhoneStep onNext={p=>{setPhone(p);setStep("otp");}}/>}
        {step==="otp"   && <OtpStep phone={phone} onNext={()=>setStep("done")}/>}
        {step==="done"  && <DoneStep onClose={()=>navigate("/settings")}/>}
      </div>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}
