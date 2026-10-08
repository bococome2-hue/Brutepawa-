import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "../router";
import { apiFetch, getBpToken } from "../lib/api";
import { useCurrentUser } from "../hooks/useCurrentUser";

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface PersonUser {
  id: number; fullname: string; username: string; avatar: string | null;
  country: string; flag: string; bio: string | null; role: string;
  score: number; verified: boolean; followersCount: number;
  followingCount: number; friendsCount: number; mutualFriends: number;
  isFollowing?: boolean; createdAt: string;
}
interface FriendRequest { requestId: number; id: number; fullname: string; username: string;
  avatar: string|null; country: string; flag: string; score: number; verified: boolean;
  mutualFriends: number; createdAt: string; role: string; bio: string|null;
  followersCount: number; followingCount: number; friendsCount: number; }

const FLAG: Record<string,string> = {
  BJ:"🇧🇯",TG:"🇹🇬",SN:"🇸🇳",CI:"🇨🇮",BF:"🇧🇫",NE:"🇳🇪",ML:"🇲🇱",CM:"🇨🇲",GH:"🇬🇭",NG:"🇳🇬",
};
const f = (code: string) => FLAG[code] ?? "🌍";

const COUNTRIES = [
  { code:"",   name:"Tous" },
  { code:"CI", name:"Côte d'Ivoire" },
  { code:"SN", name:"Sénégal" },
  { code:"CM", name:"Cameroun" },
  { code:"BJ", name:"Bénin" },
  { code:"BF", name:"Burkina Faso" },
  { code:"NE", name:"Niger" },
  { code:"ML", name:"Mali" },
  { code:"GH", name:"Ghana" },
  { code:"NG", name:"Nigeria" },
  { code:"TG", name:"Togo" },
];

/* ─── Avatar ─────────────────────────────────────────────────────────────── */
const COLORS = ["var(--bp-primary)","var(--bp-primary-dark)","var(--bp-primary-dark)","var(--bp-primary)","#BBF7D0"];
function Avatar({ user, size=52 }: { user: Pick<PersonUser,"id"|"fullname"|"avatar">, size?: number }) {
  const initials = user.fullname.split(" ").map(p=>p[0]).join("").slice(0,2).toUpperCase();
  const color = COLORS[user.id % COLORS.length];
  if (user.avatar) return (
    <img src={user.avatar} alt={user.fullname} loading="lazy"
      style={{ width:size,height:size,borderRadius:"50%",objectFit:"cover",display:"block",flexShrink:0 }} />
  );
  return (
    <div style={{ width:size,height:size,borderRadius:"50%",background:color,display:"flex",
      alignItems:"center",justifyContent:"center",fontSize:size*0.35,fontWeight:700,
      color:"#fff",flexShrink:0,fontFamily:"Inter,sans-serif" }}>
      {initials}
    </div>
  );
}

/* ─── Score Badge ────────────────────────────────────────────────────────── */
function ScoreBadge({ score }: { score: number }) {
  return (
    <div style={{ display:"inline-flex",alignItems:"center",gap:4,background:"#DCFCE7",
      borderRadius:99,padding:"3px 8px" }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
      <span style={{ fontSize:11,fontWeight:700,color:"var(--bp-primary)",fontFamily:"Inter,sans-serif" }}>
        Score BrutePawa {score}
      </span>
    </div>
  );
}

/* ─── Verified Check ─────────────────────────────────────────────────────── */
function Verified() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink:0 }}>
      <circle cx="12" cy="12" r="12" fill="#1D9BF0"/>
      <path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ─── User Card (Suggestions) ────────────────────────────────────────────── */
function SuggestionCard({ user, onAdd, onDismiss, pending, added }:{
  user: PersonUser; onAdd: ()=>void; onDismiss: ()=>void; pending: boolean; added: boolean;
}) {
  return (
    <div style={{ display:"flex",alignItems:"flex-start",gap:12,padding:"12px 0",
      borderBottom:"1px solid #F3F4F6" }}>
      <div style={{ position:"relative",flexShrink:0 }}>
        <Avatar user={user} size={54} />
      </div>
      <div style={{ flex:1,minWidth:0 }}>
        <div style={{ display:"flex",alignItems:"center",gap:5,marginBottom:1 }}>
          <span style={{ fontWeight:700,fontSize:15,color:"#111827",fontFamily:"Inter,sans-serif" }}>
            {user.fullname}
          </span>
          {user.verified && <Verified />}
        </div>
        <div style={{ fontSize:12,color:"#64748B",marginBottom:4,fontFamily:"Inter,sans-serif" }}>
          Membre BrutePawa
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:6,fontSize:12,color:"#64748B",marginBottom:6,fontFamily:"Inter,sans-serif" }}>
          <span>{f(user.country)} {user.country}</span>
          <span style={{ color:"#E5E7EB" }}>·</span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
          </svg>
          <span>{user.mutualFriends} amis communs</span>
        </div>
        <ScoreBadge score={user.score} />
      </div>
      <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:8,flexShrink:0 }}>
        <button
          onClick={added ? undefined : onAdd}
          disabled={pending}
          style={{ display:"flex",alignItems:"center",gap:6,background:added?"var(--bp-primary)":"#fff",
            border:"1.5px solid var(--bp-primary)",borderRadius:10,padding:"7px 12px",
            cursor:added?"default":"pointer",fontFamily:"Inter,sans-serif",
            fontWeight:600,fontSize:13,color:added?"#fff":"var(--bp-primary)",
            opacity:pending?0.7:1,transition:"all .15s" }}>
          {added ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/>
              <path d="M20 8v6m-3-3h6"/>
            </svg>
          )}
          {added ? "Demande envoyée" : "Ajouter"}
        </button>
        <button onClick={onDismiss} style={{ background:"none",border:"none",cursor:"pointer",
          padding:4,color:"#9CA3AF",display:"flex",alignItems:"center",justifyContent:"center" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
        </button>
      </div>
    </div>
  );
}

/* ─── Friend Request Card ────────────────────────────────────────────────── */
function FriendReqCard({ req, onAccept, onReject }:{
  req: FriendRequest; onAccept: ()=>void; onReject: ()=>void;
}) {
  return (
    <div style={{ background:"#fff",borderRadius:16,padding:14,boxShadow:"0 1px 3px rgba(0,0,0,0.07)",marginBottom:10 }}>
      <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:10 }}>
        <Avatar user={req} size={52} />
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ display:"flex",alignItems:"center",gap:5,marginBottom:2 }}>
            <span style={{ fontWeight:700,fontSize:14,color:"#111827",fontFamily:"Inter,sans-serif" }}>{req.fullname}</span>
            {req.verified && <Verified />}
          </div>
          <div style={{ fontSize:12,color:"#64748B",fontFamily:"Inter,sans-serif" }}>
            {req.mutualFriends} amis communs · {f(req.country)} {req.country}
          </div>
        </div>
      </div>
      <div style={{ display:"flex",gap:8 }}>
        <button onClick={onAccept} style={{ flex:1,background:"var(--bp-primary)",color:"#fff",border:"none",
          borderRadius:10,padding:"9px 0",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"Inter,sans-serif" }}>
          Confirmer
        </button>
        <button onClick={onReject} style={{ flex:1,background:"#F1F5F9",color:"#64748B",border:"none",
          borderRadius:10,padding:"9px 0",fontWeight:600,fontSize:14,cursor:"pointer",fontFamily:"Inter,sans-serif" }}>
          Supprimer
        </button>
      </div>
    </div>
  );
}

/* ─── Follow Card (popular / new) ────────────────────────────────────────── */
function FollowCard({ user, isNew, onFollow }:{
  user: PersonUser & { isFollowing?: boolean }; isNew: boolean; onFollow: ()=>void;
}) {
  const [following, setFollowing] = useState(user.isFollowing ?? false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const handleFollow = async () => {
    if (loading) return;
    setLoading(true);
    try {
      if (following) {
        await apiFetch(`/follow/${user.id}`, { method:"DELETE" });
        setFollowing(false);
      } else {
        await apiFetch(`/follow/${user.id}`, { method:"POST" });
        setFollowing(true);
        onFollow();
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  };
  return (
    <div style={{ background:"#fff",borderRadius:14,padding:"10px 10px 12px",
      boxShadow:"0 1px 3px rgba(0,0,0,0.07)",display:"flex",flexDirection:"column",gap:8 }}>
      <div style={{ display:"flex",alignItems:"center",gap:8 }}>
        <div style={{ position:"relative",flexShrink:0 }} onClick={()=>navigate(`/profile/${user.id}`)} role="button">
          <Avatar user={user} size={44} />
          {isNew && (
            <span style={{ position:"absolute",top:-4,right:-4,background:"#EF4444",color:"#fff",
              fontSize:8,fontWeight:800,borderRadius:99,padding:"1px 5px",fontFamily:"Inter,sans-serif",
              whiteSpace:"nowrap",border:"1.5px solid #fff" }}>Nouveau</span>
          )}
        </div>
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ display:"flex",alignItems:"center",gap:4 }}>
            <span style={{ fontWeight:700,fontSize:13,color:"#111827",fontFamily:"Inter,sans-serif",
              whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>
              {user.fullname.split(" ")[0]} {user.fullname.split(" ")[1]?.[0]}.
            </span>
            {user.verified && <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="12" fill="#1D9BF0"/><path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </div>
          <div style={{ fontSize:11,color:"#64748B",fontFamily:"Inter,sans-serif" }}>
            {isNew ? `${f(user.country)} ${user.country}` : "Membre BP"}
          </div>
        </div>
      </div>
      <button onClick={handleFollow} disabled={loading}
        style={{ background:following?"#F1F5F9":"#fff",border:"1.5px solid var(--bp-primary)",
          borderRadius:8,padding:"6px 0",fontWeight:600,fontSize:12,cursor:"pointer",
          color:following?"#64748B":"var(--bp-primary)",fontFamily:"Inter,sans-serif",
          width:"100%",opacity:loading?0.7:1,transition:"all .15s" }}>
        {following ? "Abonné" : "Suivre"}
      </button>
    </div>
  );
}

/* ─── Invitation Card ────────────────────────────────────────────────────── */
function InviteCard({ onInvite }: { onInvite: ()=>void }) {
  return (
    <div style={{ background:"linear-gradient(135deg,var(--bp-primary-dark) 0%,#052e16 100%)",borderRadius:20,
      padding:"18px 18px 20px",display:"flex",alignItems:"center",gap:14,
      boxShadow:"0 4px 18px rgba(22,101,52,0.35)",margin:"4px 0" }}>
      <div style={{ width:52,height:52,borderRadius:"50%",background:"rgba(255,255,255,0.18)",
        display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/>
          <path d="M20 8v6m-3-3h6"/>
        </svg>
      </div>
      <div style={{ flex:1,minWidth:0 }}>
        <div style={{ fontWeight:800,fontSize:15,color:"#fff",fontFamily:"Inter,sans-serif",marginBottom:3 }}>
          Invitez vos amis sur BrutePawa
        </div>
        <div style={{ fontSize:12,color:"rgba(255,255,255,0.8)",fontFamily:"Inter,sans-serif",lineHeight:1.4 }}>
          Plus vous êtes nombreux, plus l'expérience est enrichissante.
        </div>
      </div>
      <button onClick={onInvite} style={{ display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,0.18)",
        border:"1.5px solid rgba(255,255,255,0.4)",borderRadius:12,padding:"9px 14px",
        cursor:"pointer",color:"#fff",fontWeight:700,fontSize:13,fontFamily:"Inter,sans-serif",flexShrink:0 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
        Inviter
      </button>
    </div>
  );
}

/* ─── Main PeoplePage ────────────────────────────────────────────────────── */
export default function PeoplePage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"personnes"|"amis"|"abonnes"|"groupes">("personnes");
  const [countryFilter, setCountryFilter] = useState("");
  const [showMoreCountries, setShowMoreCountries] = useState(false);
  const [search, setSearch] = useState("");
  const [searchFocus, setSearchFocus] = useState(false);

  const [suggestions, setSuggestions]   = useState<PersonUser[]>([]);
  const [popular, setPopular]           = useState<(PersonUser&{isFollowing?:boolean})[]>([]);
  const [newMembers, setNewMembers]     = useState<(PersonUser&{isFollowing?:boolean})[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends]           = useState<PersonUser[]>([]);
  const [followers, setFollowers]       = useState<PersonUser[]>([]);
  const [following, setFollowing]       = useState<PersonUser[]>([]);
  const [searchResults, setSearchResults] = useState<PersonUser[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  const [addedIds, setAddedIds]         = useState<Set<number>>(new Set());
  const [pendingAddIds, setPendingAddIds] = useState<Set<number>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading]           = useState(true);
  const [followersTab, setFollowersTab] = useState<"followers"|"following">("followers");
  const [friendsTab, setFriendsTab]     = useState<"requests"|"list">("requests");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const me = useCurrentUser();

  const loadMain = useCallback(async () => {
    setLoading(true);
    try {
      const qs = countryFilter ? `?country=${countryFilter}` : "";
      const [sugg, pop, newM, pending] = await Promise.all([
        apiFetch(`/people/suggestions${qs}`).then(r=>r.json()).catch(()=>[]),
        apiFetch("/people/popular").then(r=>r.json()).catch(()=>[]),
        apiFetch("/people/new").then(r=>r.json()).catch(()=>[]),
        apiFetch("/friends/pending-count").then(r=>r.json()).catch(()=>({count:0})),
      ]);
      setSuggestions(sugg as PersonUser[]);
      setPopular(pop as (PersonUser&{isFollowing?:boolean})[]);
      setNewMembers(newM as (PersonUser&{isFollowing?:boolean})[]);
      setPendingCount((pending as {count:number}).count ?? 0);
    } finally { setLoading(false); }
  }, [countryFilter]);

  const loadAmis = useCallback(async () => {
    const [reqs, friendList] = await Promise.all([
      apiFetch("/friends/requests").then(r=>r.json()).catch(()=>[]),
      apiFetch("/friends/list").then(r=>r.json()).catch(()=>[]),
    ]);
    setFriendRequests(reqs as FriendRequest[]);
    setFriends(friendList as PersonUser[]);
    setPendingCount((reqs as FriendRequest[]).length);
  }, []);

  const loadAbonnes = useCallback(async () => {
    const [foll, folling] = await Promise.all([
      apiFetch("/followers").then(r=>r.json()).catch(()=>[]),
      apiFetch("/following").then(r=>r.json()).catch(()=>[]),
    ]);
    setFollowers(foll as PersonUser[]);
    setFollowing(folling as PersonUser[]);
  }, []);

  useEffect(() => { loadMain(); }, [loadMain]);
  useEffect(() => { if (tab === "amis") loadAmis(); }, [tab, loadAmis]);
  useEffect(() => { if (tab === "abonnes") loadAbonnes(); }, [tab, loadAbonnes]);

  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      const qs = new URLSearchParams({ q: search });
      if (countryFilter) qs.set("country", countryFilter);
      const res = await apiFetch(`/search?${qs}`).then(r=>r.json()).catch(()=>({ users:[] }));
      setSearchResults((res as {users:PersonUser[]}).users ?? []);
    }, 350);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search, countryFilter]);

  const handleAddFriend = async (userId: number) => {
    setPendingAddIds(p => new Set(p).add(userId));
    try {
      await apiFetch(`/friends/request/${userId}`, { method:"POST" });
      setAddedIds(p => new Set(p).add(userId));
    } catch { /* ignore */ } finally {
      setPendingAddIds(p => { const n=new Set(p); n.delete(userId); return n; });
    }
  };

  const handleAccept = async (req: FriendRequest) => {
    try {
      await apiFetch(`/friends/accept/${req.requestId}`, { method:"POST" });
      setFriendRequests(prev => prev.filter(r => r.requestId !== req.requestId));
      setFriends(prev => [req as unknown as PersonUser, ...prev]);
      setPendingCount(p => Math.max(0, p-1));
    } catch { /* ignore */ }
  };

  const handleReject = async (req: FriendRequest) => {
    try {
      await apiFetch(`/friends/reject/${req.requestId}`, { method:"POST" });
      setFriendRequests(prev => prev.filter(r => r.requestId !== req.requestId));
      setPendingCount(p => Math.max(0, p-1));
    } catch { /* ignore */ }
  };

  const handleInvite = async () => {
    const res = await apiFetch("/invite", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({method:"link"}) }).then(r=>r.json()).catch(()=>null);
    if (res?.link) {
      navigator.share?.({ title:"BrutePawa", url:res.link }).catch(()=>{});
      if (!navigator.share) { navigator.clipboard.writeText(res.link).catch(()=>{}); alert("Lien copié !"); }
    }
  };

  const visibleSuggestions = suggestions.filter(u => !dismissedIds.has(u.id));

  /* ── Path helpers ── */
  const path = window.location.pathname;
  const navActive = (p: string) => path === p;

  return (
    <div style={{ position:"fixed",inset:0,background:"#F8FAFC",display:"flex",flexDirection:"column",
      fontFamily:"Inter,sans-serif",overflowY:"hidden" }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{ background:"var(--bp-primary)",padding:"12px 16px 10px",flexShrink:0,
        paddingTop:`calc(12px + env(safe-area-inset-top, 0px))` }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div style={{ display:"flex",alignItems:"center",gap:6 }}>
            <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="10" fill="rgba(255,255,255,0.2)"/>
              <text x="20" y="27" textAnchor="middle" fontSize="20" fontWeight="800" fill="#fff">b</text>
            </svg>
            <span style={{ fontWeight:900,fontSize:18,color:"#fff",letterSpacing:-.3 }}>
              BrutePawa<span style={{ fontSize:14 }}>→</span>
            </span>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:4 }}>
            <button onClick={()=>navigate("/messages")} style={{ background:"rgba(255,255,255,0.18)",border:"none",
              borderRadius:"50%",width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
            </button>
            <button onClick={()=>navigate("/notifications")} style={{ position:"relative",background:"rgba(255,255,255,0.18)",border:"none",
              borderRadius:"50%",width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
              {pendingCount > 0 && (
                <span style={{ position:"absolute",top:2,right:2,background:"#EF4444",color:"#fff",
                  borderRadius:99,minWidth:16,height:16,fontSize:9,fontWeight:800,
                  display:"flex",alignItems:"center",justifyContent:"center",padding:"0 3px",border:"1.5px solid var(--bp-primary)" }}>
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              )}
            </button>
            <button onClick={()=>navigate("/menu")} style={{ background:"rgba(255,255,255,0.18)",border:"none",
              borderRadius:"50%",width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display:"flex",gap:6,marginTop:12,overflowX:"auto",scrollbarWidth:"none" }}>
          {([
            { id:"personnes", label:"Personnes", icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg> },
            { id:"amis",      label:"Amis",      badge:pendingCount, icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6m-3-3h6"/></svg> },
            { id:"abonnes",   label:"Abonnés",   icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg> },
            { id:"groupes",   label:"Groupes",   icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg> },
          ] as const).map(t => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => { setTab(t.id); if (t.id === "groupes") navigate("/community"); }}
                style={{ display:"flex",alignItems:"center",gap:5,background:active?"rgba(255,255,255,0.25)":"rgba(255,255,255,0.1)",
                  border:active?"2px solid rgba(255,255,255,0.5)":"2px solid transparent",
                  borderRadius:99,padding:"6px 14px",cursor:"pointer",color:"#fff",
                  fontWeight:active?700:500,fontSize:13,flexShrink:0,position:"relative",transition:"all .15s" }}>
                {t.icon}{t.label}
                {(t as any).badge > 0 && (
                  <span style={{ background:"#EF4444",color:"#fff",borderRadius:99,minWidth:16,height:16,
                    fontSize:9,fontWeight:800,display:"inline-flex",alignItems:"center",justifyContent:"center",
                    padding:"0 4px",marginLeft:2 }}>{(t as any).badge > 9 ? "9+" : (t as any).badge}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Search + Filters ──────────────────────────────────────────────── */}
      <div style={{ background:"#fff",borderBottom:"1px solid #E5E7EB",padding:"10px 16px 8px",flexShrink:0 }}>
        <div style={{ display:"flex",alignItems:"center",gap:10,background:"#F1F5F9",borderRadius:12,
          padding:"9px 12px",border:`1.5px solid ${searchFocus?"var(--bp-primary)":"transparent"}`,transition:"border .15s" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            onFocus={()=>setSearchFocus(true)} onBlur={()=>setSearchFocus(false)}
            placeholder="Rechercher des personnes, métiers, centres d'intérêt..."
            style={{ flex:1,border:"none",background:"transparent",outline:"none",fontSize:13.5,
              color:"#111827",fontFamily:"Inter,sans-serif" }} />
          {search ? (
            <button onClick={()=>setSearch("")} style={{ background:"none",border:"none",cursor:"pointer",color:"#9CA3AF",padding:0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          ) : (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
            </svg>
          )}
        </div>

        {/* Country filters */}
        <div style={{ display:"flex",gap:7,marginTop:9,overflowX:"auto",scrollbarWidth:"none",paddingBottom:2 }}>
          {(showMoreCountries ? COUNTRIES : COUNTRIES.slice(0,5)).map(c => {
            const active = countryFilter === c.code;
            if (c.code === "" && !showMoreCountries) {
              return (
                <button key="all" onClick={()=>{ setCountryFilter(""); }}
                  style={{ flexShrink:0,background:active?"var(--bp-primary)":"#fff",
                    border:`1.5px solid ${active?"var(--bp-primary)":"#E5E7EB"}`,borderRadius:99,
                    padding:"5px 13px",cursor:"pointer",fontSize:13,fontWeight:active?700:500,
                    color:active?"#fff":"#64748B",fontFamily:"Inter,sans-serif",transition:"all .15s" }}>
                  Tous
                </button>
              );
            }
            return (
              <button key={c.code || "tous"} onClick={()=>{ setCountryFilter(c.code); }}
                style={{ flexShrink:0,display:"flex",alignItems:"center",gap:4,
                  background:active?"var(--bp-primary)":"#fff",
                  border:`1.5px solid ${active?"var(--bp-primary)":"#E5E7EB"}`,borderRadius:99,
                  padding:"5px 11px",cursor:"pointer",fontSize:13,fontWeight:active?700:500,
                  color:active?"#fff":"#64748B",fontFamily:"Inter,sans-serif",transition:"all .15s" }}>
                {c.code ? <>{f(c.code)} {c.name}</> : "Tous"}
              </button>
            );
          })}
          {!showMoreCountries && (
            <button onClick={()=>setShowMoreCountries(true)}
              style={{ flexShrink:0,display:"flex",alignItems:"center",gap:3,background:"#fff",
                border:"1.5px solid #E5E7EB",borderRadius:99,padding:"5px 11px",cursor:"pointer",
                fontSize:13,fontWeight:500,color:"#64748B",fontFamily:"Inter,sans-serif" }}>
              Plus <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div style={{ flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch" as any }}>

        {/* Search Results */}
        {search.trim() && (
          <div style={{ padding:"12px 16px" }}>
            <div style={{ fontWeight:700,fontSize:15,color:"#111827",marginBottom:10 }}>
              Résultats ({searchResults.length})
            </div>
            {searchResults.length === 0 ? (
              <div style={{ textAlign:"center",padding:"40px 0",color:"#9CA3AF",fontSize:14 }}>
                Aucun résultat pour « {search} »
              </div>
            ) : searchResults.map(u => (
              <SuggestionCard key={u.id} user={u}
                added={addedIds.has(u.id)} pending={pendingAddIds.has(u.id)}
                onAdd={()=>handleAddFriend(u.id)}
                onDismiss={()=>setDismissedIds(p=>new Set(p).add(u.id))} />
            ))}
          </div>
        )}

        {/* ── TAB: PERSONNES ── */}
        {!search.trim() && tab === "personnes" && (
          <div style={{ padding:"0 16px 80px" }}>

            {/* Suggestions section */}
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",
              paddingTop:14,marginBottom:4 }}>
              <span style={{ fontWeight:800,fontSize:16,color:"#111827" }}>Suggestions pour vous</span>
              <button style={{ background:"none",border:"none",cursor:"pointer",
                fontSize:13,fontWeight:700,color:"var(--bp-primary)",fontFamily:"Inter,sans-serif" }}>
                Voir tout
              </button>
            </div>

            {loading ? (
              [1,2,3].map(i=>(
                <div key={i} style={{ display:"flex",gap:12,padding:"12px 0",borderBottom:"1px solid #F3F4F6" }}>
                  <div style={{ width:54,height:54,borderRadius:"50%",background:"#E5E7EB",flexShrink:0 }}/>
                  <div style={{ flex:1 }}>
                    <div style={{ height:14,width:"50%",background:"#E5E7EB",borderRadius:7,marginBottom:8 }}/>
                    <div style={{ height:11,width:"70%",background:"#F1F5F9",borderRadius:6 }}/>
                  </div>
                </div>
              ))
            ) : visibleSuggestions.length === 0 ? (
              <div style={{ padding:"32px 0",textAlign:"center",color:"#9CA3AF",fontSize:14 }}>
                Aucune suggestion pour le moment.
              </div>
            ) : visibleSuggestions.map(u => (
              <SuggestionCard key={u.id} user={u}
                added={addedIds.has(u.id)} pending={pendingAddIds.has(u.id)}
                onAdd={()=>handleAddFriend(u.id)}
                onDismiss={()=>setDismissedIds(p=>new Set(p).add(u.id))} />
            ))}

            {/* Invitation Card */}
            <div style={{ marginTop:16 }}>
              <InviteCard onInvite={handleInvite} />
            </div>

            {/* Popular + New Members — 2 column */}
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:16 }}>
              {/* Personnes populaires */}
              <div>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
                  <span style={{ fontWeight:800,fontSize:13.5,color:"#111827" }}>Personnes populaires</span>
                  <button style={{ background:"none",border:"none",cursor:"pointer",fontSize:11,fontWeight:700,color:"var(--bp-primary)",fontFamily:"Inter,sans-serif" }}>Voir tout</button>
                </div>
                <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                  {(loading ? [1,2,3,4] : popular.slice(0,4)).map((item,i)=>
                    loading ? (
                      <div key={i} style={{ borderRadius:14,padding:"10px",height:90,background:"#F1F5F9" }}/>
                    ) : (
                      <FollowCard key={(item as PersonUser).id} user={item as PersonUser&{isFollowing?:boolean}} isNew={false} onFollow={loadMain}/>
                    )
                  )}
                </div>
              </div>

              {/* Nouveaux membres */}
              <div>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
                  <span style={{ fontWeight:800,fontSize:13.5,color:"#111827" }}>Nouveaux membres</span>
                  <button style={{ background:"none",border:"none",cursor:"pointer",fontSize:11,fontWeight:700,color:"var(--bp-primary)",fontFamily:"Inter,sans-serif" }}>Voir tout</button>
                </div>
                <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                  {(loading ? [1,2,3,4] : newMembers.slice(0,4)).map((item,i)=>
                    loading ? (
                      <div key={i} style={{ borderRadius:14,padding:"10px",height:90,background:"#F1F5F9" }}/>
                    ) : (
                      <FollowCard key={(item as PersonUser).id} user={item as PersonUser&{isFollowing?:boolean}} isNew={true} onFollow={loadMain}/>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: AMIS ── */}
        {!search.trim() && tab === "amis" && (
          <div style={{ padding:"12px 16px 80px" }}>
            {/* Sub-tabs */}
            <div style={{ display:"flex",gap:8,marginBottom:16 }}>
              {([{id:"requests",label:"Demandes"},{id:"list",label:"Mes amis"}] as const).map(t=>(
                <button key={t.id} onClick={()=>setFriendsTab(t.id)}
                  style={{ flex:1,background:friendsTab===t.id?"var(--bp-primary)":"#fff",color:friendsTab===t.id?"#fff":"#64748B",
                    border:`1.5px solid ${friendsTab===t.id?"var(--bp-primary)":"#E5E7EB"}`,borderRadius:12,
                    padding:"9px 0",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"Inter,sans-serif",transition:"all .15s" }}>
                  {t.label} {t.id==="requests" && friendRequests.length>0 ? `(${friendRequests.length})` : ""}
                </button>
              ))}
            </div>

            {friendsTab === "requests" && (
              friendRequests.length === 0 ? (
                <div style={{ textAlign:"center",padding:"40px 0" }}>
                  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#E5E7EB" strokeWidth="1.5" strokeLinecap="round" style={{ margin:"0 auto 12px",display:"block" }}>
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                  </svg>
                  <div style={{ fontSize:15,fontWeight:700,color:"#64748B",marginBottom:6 }}>Aucune demande en attente</div>
                  <div style={{ fontSize:13,color:"#9CA3AF" }}>Les nouvelles demandes d'amis apparaîtront ici.</div>
                </div>
              ) : friendRequests.map(req=>(
                <FriendReqCard key={req.requestId} req={req}
                  onAccept={()=>handleAccept(req)} onReject={()=>handleReject(req)} />
              ))
            )}

            {friendsTab === "list" && (
              friends.length === 0 ? (
                <div style={{ textAlign:"center",padding:"40px 0" }}>
                  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#E5E7EB" strokeWidth="1.5" strokeLinecap="round" style={{ margin:"0 auto 12px",display:"block" }}>
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  </svg>
                  <div style={{ fontSize:15,fontWeight:700,color:"#64748B",marginBottom:6 }}>Vous n'avez pas encore d'amis</div>
                  <div style={{ fontSize:13,color:"#9CA3AF" }}>Consultez les suggestions pour commencer.</div>
                  <button onClick={()=>setTab("personnes")} style={{ marginTop:14,background:"var(--bp-primary)",color:"#fff",border:"none",
                    borderRadius:12,padding:"10px 24px",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"Inter,sans-serif" }}>
                    Voir les suggestions
                  </button>
                </div>
              ) : friends.map(u=>(
                <div key={u.id} style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid #F3F4F6" }}>
                  <Avatar user={u} size={50} />
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontWeight:700,fontSize:14,color:"#111827",marginBottom:2 }}>{u.fullname}</div>
                    <div style={{ fontSize:12,color:"#64748B" }}>{f(u.country)} {u.country} · {u.friendsCount} ami(s)</div>
                  </div>
                  <button onClick={()=>navigate(`/profile/${u.id}`)}
                    style={{ background:"#F1F5F9",border:"none",borderRadius:10,padding:"7px 14px",
                      fontWeight:600,fontSize:13,cursor:"pointer",color:"#64748B",fontFamily:"Inter,sans-serif" }}>
                    Profil
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── TAB: ABONNÉS ── */}
        {!search.trim() && tab === "abonnes" && (
          <div style={{ padding:"12px 16px 80px" }}>
            <div style={{ display:"flex",gap:8,marginBottom:16 }}>
              {([{id:"followers",label:"Abonnés"},{id:"following",label:"Abonnements"}] as const).map(t=>(
                <button key={t.id} onClick={()=>setFollowersTab(t.id)}
                  style={{ flex:1,background:followersTab===t.id?"var(--bp-primary)":"#fff",color:followersTab===t.id?"#fff":"#64748B",
                    border:`1.5px solid ${followersTab===t.id?"var(--bp-primary)":"#E5E7EB"}`,borderRadius:12,
                    padding:"9px 0",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"Inter,sans-serif",transition:"all .15s" }}>
                  {t.label}
                </button>
              ))}
            </div>
            {(followersTab === "followers" ? followers : following).map(u=>(
              <div key={u.id} style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid #F3F4F6" }}>
                <div style={{ position:"relative",flexShrink:0 }}>
                  <Avatar user={u} size={50} />
                </div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:4 }}>
                    <span style={{ fontWeight:700,fontSize:14,color:"#111827" }}>{u.fullname}</span>
                    {u.verified && <Verified />}
                  </div>
                  <div style={{ fontSize:12,color:"#64748B" }}>
                    {f(u.country)} {u.country} · <ScoreBadge score={u.score} />
                  </div>
                </div>
                <button onClick={()=>navigate(`/profile/${u.id}`)}
                  style={{ background:"#F1F5F9",border:"none",borderRadius:10,padding:"7px 14px",
                    fontWeight:600,fontSize:13,cursor:"pointer",color:"#64748B",fontFamily:"Inter,sans-serif" }}>
                  Profil
                </button>
              </div>
            ))}
            {(followersTab === "followers" ? followers : following).length === 0 && (
              <div style={{ textAlign:"center",padding:"40px 0",color:"#9CA3AF",fontSize:14 }}>
                {followersTab === "followers" ? "Aucun abonné pour le moment." : "Vous ne suivez personne encore."}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── Bottom Nav ────────────────────────────────────────────────────── */}
      <nav style={{ background:"#fff",borderTop:"1px solid #E5E7EB",display:"flex",alignItems:"stretch",
        height:56,flexShrink:0,paddingBottom:"env(safe-area-inset-bottom,0px)" }}>
        {/* Accueil */}
        <button onClick={()=>navigate("/")} style={{ flex:1,display:"flex",flexDirection:"column",
          alignItems:"center",justifyContent:"center",background:"none",border:"none",cursor:"pointer",gap:3,
          borderTop:"3px solid transparent",padding:0 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="1.9" strokeLinejoin="round"><path d="M3 12L12 3l9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9"/></svg>
          <span style={{ fontSize:10,color:"#64748B",fontWeight:500 }}>Accueil</span>
        </button>
        {/* Amis — active */}
        <button style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",
          justifyContent:"center",background:"none",border:"none",cursor:"pointer",gap:3,
          borderTop:"3px solid var(--bp-primary)",padding:0,position:"relative" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="7" r="3.5" stroke="var(--bp-primary)" strokeWidth="1.8"/><circle cx="17" cy="8" r="2.5" stroke="var(--bp-primary)" strokeWidth="1.8"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6" stroke="var(--bp-primary)" strokeWidth="1.8" strokeLinecap="round"/><path d="M19 14c2.5.5 4 2 4 4.5" stroke="var(--bp-primary)" strokeWidth="1.8" strokeLinecap="round"/></svg>
          <span style={{ fontSize:10,color:"var(--bp-primary)",fontWeight:700 }}>Amis</span>
          {pendingCount > 0 && <span style={{ position:"absolute",top:4,right:"18%",background:"#EF4444",color:"#fff",borderRadius:10,minWidth:14,height:14,fontSize:9,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 3px",border:"1.5px solid #fff" }}>{pendingCount > 9?"9+":pendingCount}</span>}
        </button>
        {/* Créer */}
        <button onClick={()=>navigate("/")} style={{ flex:"0 0 56px",display:"flex",flexDirection:"column",
          alignItems:"center",justifyContent:"center",background:"none",border:"none",cursor:"pointer",padding:0 }}>
          <div style={{ width:46,height:46,borderRadius:"50%",background:"var(--bp-primary)",display:"flex",
            alignItems:"center",justifyContent:"center",boxShadow:"0 4px 14px rgba(34,197,94,0.4)" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
          </div>
        </button>
        {/* Messages */}
        <button onClick={()=>navigate("/messages")} style={{ flex:1,display:"flex",flexDirection:"column",
          alignItems:"center",justifyContent:"center",background:"none",border:"none",cursor:"pointer",gap:3,
          borderTop:"3px solid transparent",padding:0 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          <span style={{ fontSize:10,color:"#64748B",fontWeight:500 }}>Messages</span>
        </button>
        {/* Profil */}
        <button onClick={()=>navigate("/settings")} style={{ flex:1,display:"flex",flexDirection:"column",
          alignItems:"center",justifyContent:"center",background:"none",border:"none",cursor:"pointer",gap:3,
          borderTop:"3px solid transparent",padding:0 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="1.9" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
          <span style={{ fontSize:10,color:"#64748B",fontWeight:500 }}>Profil</span>
        </button>
      </nav>
    </div>
  );
}
