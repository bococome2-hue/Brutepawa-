import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "../router";
import {
  apiGetUsersWithStatus, apiGetFriends, apiGetFriendRequests,
  apiSendFriendRequest, apiAcceptFriendRequest, apiRejectFriendRequest,
  apiGetGroups, apiJoinGroup, apiLeaveGroup, apiGetChatGroups,
  apiGetPages, apiFollowPage, apiUnfollowPage,
  PublicUser, PublicUserWithStatus, FriendRequest, ApiGroup, ApiChatGroup, ApiPage,
} from "../lib/api";

const BP_GREEN = "var(--bp-primary)";

/* ─── Types ────────────────────────────────────────────────── */
type SubTab = "personnes"|"amis"|"abonnes"|"groupes"|"pages"|"entreprises"|"messagerie";

/* ─── Helpers ──────────────────────────────────────────────── */
const AV_COLORS = ["var(--bp-primary)","#E91E63","#9C27B0","#FF9800",BP_GREEN,"#0EA5E9","#D32F2F","#00838F"];
function avColor(id: number) { return AV_COLORS[id % AV_COLORS.length]; }
function fullName(u: { firstName: string; lastName: string }) { return `${u.firstName} ${u.lastName}`.trim(); }
function initials(u: { firstName: string; lastName: string }) {
  return ((u.firstName?.[0]??"") + (u.lastName?.[0]??"")).toUpperCase() || "?";
}
function bpScore(id: number) { return 50 + (id * 17) % 50; }
function mutualCount(id: number, total: number) { return Math.min(total, 5 + (id * 7) % 30); }
function relTime(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (d < 60)    return "À l'instant";
  if (d < 3600)  return `Il y a ${Math.floor(d/60)} min`;
  if (d < 86400) return `Il y a ${Math.floor(d/3600)} h`;
  return `Il y a ${Math.floor(d/86400)} j`;
}
const COUNTRY_FLAGS: Record<string, string> = {
  "Côte d'Ivoire":"🇨🇮","Sénégal":"🇸🇳","Cameroun":"🇨🇲","Mali":"🇲🇱",
  "Bénin":"🇧🇯","Burkina Faso":"🇧🇫","Guinée":"🇬🇳","Niger":"🇳🇪",
  "Togo":"🇹🇬","Gabon":"🇬🇦","R.D. Congo":"🇨🇩",
};
function countryFlag(country?: string|null) {
  if (!country) return "🌍";
  for (const [k,v] of Object.entries(COUNTRY_FLAGS)) if (country.includes(k)) return v;
  return "🌍";
}

const COUNTRY_FILTERS = ["Tous","Côte d'Ivoire","Sénégal","Cameroun","Mali","Bénin","Burkina Faso","Niger"];

/* ─── SVG Icons ─────────────────────────────────────────────── */
const Ico = {
  search: <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#9CA3AF" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  filter: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>,
  addFriend: <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>,
  message: <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  check: <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
  checkBlue: <svg viewBox="0 0 24 24" width="14" height="14" fill="var(--bp-primary)"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5l-3.5-3.5 1.41-1.41L10 13.67l6.09-6.09 1.41 1.41L10 16.5z"/></svg>,
  more: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="5" r="1" fill="#9CA3AF"/><circle cx="12" cy="12" r="1" fill="#9CA3AF"/><circle cx="12" cy="19" r="1" fill="#9CA3AF"/></svg>,
  people: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  shield: <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke={BP_GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  send: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  arrowR: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={BP_GREEN} strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  groupIcon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  loc: <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
};

/* ─── Avatar ────────────────────────────────────────────────── */
function Avatar({ user, size=52, online=false }: {
  user: { id:number; firstName:string; lastName:string; avatarUrl?:string|null };
  size?: number; online?: boolean;
}) {
  return (
    <div style={{ position:"relative", flexShrink:0, width:size, height:size }}>
      <div style={{ width:size, height:size, borderRadius:"50%", background:avColor(user.id), overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center" }}>
        {user.avatarUrl
          ? <img src={user.avatarUrl} alt={fullName(user)} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
          : <span style={{ color:"#fff", fontWeight:800, fontSize:size*0.35 }}>{initials(user)}</span>
        }
      </div>
      {online && (
        <div style={{ position:"absolute", bottom:1, right:1, width:13, height:13, borderRadius:"50%", background:BP_GREEN, border:"2.5px solid #fff" }} />
      )}
    </div>
  );
}

/* ─── Sub-tab config ─────────────────────────────────────────── */
const SUB_TABS: { id:SubTab; label:string; icon:JSX.Element }[] = [
  { id:"personnes",   label:"Personnes",   icon:<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> },
  { id:"amis",        label:"Amis",        icon:<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { id:"abonnes",     label:"Abonnés",     icon:<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> },
  { id:"groupes",     label:"Groupes",     icon:<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
  { id:"pages",       label:"Pages",       icon:<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.414-9.414a2 2 0 1 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg> },
  { id:"entreprises", label:"Entreprises", icon:<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg> },
  { id:"messagerie",  label:"Messages",    icon:<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
];

/* ═══════════════════════════════════════════════════════════════ */
export default function Community() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SubTab>(() => {
    const t = new URLSearchParams(window.location.search).get("tab") as SubTab | null;
    return (t && ["personnes","amis","abonnes","groupes","pages","entreprises","messagerie"].includes(t)) ? t : "personnes";
  });
  const [search, setSearch]       = useState("");
  const [country, setCountry]     = useState("Tous");

  const [users,   setUsers]   = useState<PublicUserWithStatus[]>([]);
  const [friends, setFriends] = useState<PublicUser[]>([]);
  const [requests,setRequests]= useState<FriendRequest[]>([]);
  const [groups,  setGroups]  = useState<ApiGroup[]>([]);
  const [chatGroups, setChatGroups] = useState<ApiChatGroup[]>([]);
  const [groupSearch, setGroupSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading]   = useState<Record<number,boolean>>({});
  const [groupActionLoading, setGroupActionLoading] = useState<Record<number,boolean>>({});
  const [communityPages, setCommunityPages] = useState<ApiPage[]>([]);
  const [pagesLoaded, setPagesLoaded] = useState(false);
  const [pageActionLoading, setPageActionLoading] = useState<Record<number,boolean>>({});;

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [u,f,r,g,cg] = await Promise.all([
        apiGetUsersWithStatus(), apiGetFriends(),
        apiGetFriendRequests(),  apiGetGroups(), apiGetChatGroups(),
      ]);
      setUsers(u); setFriends(f); setRequests(r); setGroups(g); setChatGroups(cg);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    if (activeTab === "pages" && !pagesLoaded) {
      setPagesLoaded(true);
      apiGetPages("all").then(p => setCommunityPages(p as ApiPage[])).catch(()=>{});
    }
  }, [activeTab, pagesLoaded]);

  const setLoader = (id:number, v:boolean) => setActionLoading(p=>({...p,[id]:v}));

  const handleSendRequest = async (userId:number) => {
    setLoader(userId,true);
    try {
      await apiSendFriendRequest(userId);
      setUsers(p=>p.map(u=>u.id===userId?{...u,friendshipStatus:"pending_sent"}:u));
    } catch { /* ignore */ }
    setLoader(userId,false);
  };

  const handleAccept = async (req:FriendRequest) => {
    setLoader(req.id,true);
    try {
      await apiAcceptFriendRequest(req.id);
      setRequests(p=>p.filter(r=>r.id!==req.id));
      setFriends(p=>[...p,req.fromUser]);
      setUsers(p=>p.map(u=>u.id===req.fromUser.id?{...u,friendshipStatus:"friends"}:u));
    } catch { /* ignore */ }
    setLoader(req.id,false);
  };

  const handleReject = async (req:FriendRequest) => {
    setLoader(req.id,true);
    try {
      await apiRejectFriendRequest(req.id);
      setRequests(p=>p.filter(r=>r.id!==req.id));
      setUsers(p=>p.map(u=>u.id===req.fromUser.id?{...u,friendshipStatus:"none",requestId:undefined}:u));
    } catch { /* ignore */ }
    setLoader(req.id,false);
  };

  const handleCancelRequest = async (user:PublicUserWithStatus) => {
    if (!user.requestId) return;
    setLoader(user.id,true);
    try {
      await apiRejectFriendRequest(user.requestId);
      setUsers(p=>p.map(u=>u.id===user.id?{...u,friendshipStatus:"none",requestId:undefined}:u));
    } catch { /* ignore */ }
    setLoader(user.id,false);
  };

  const filtered = users.filter(u => {
    const nm = fullName(u).toLowerCase();
    const matchSearch = nm.includes(search.toLowerCase()) || (u.country??"").toLowerCase().includes(search.toLowerCase());
    const matchCountry = country==="Tous" || (u.country??"").includes(country);
    return matchSearch && matchCountry;
  });

  const pendingCount = requests.length;
  const popularUsers = [...users].sort((a,b) => bpScore(b.id)-bpScore(a.id)).slice(0,6);
  const newMembers   = [...users].sort((a,b) => b.id-a.id).slice(0,6);

  /* ─── User action button ─────────────────────────────────── */
  function ActionBtn({ user }: { user: PublicUserWithStatus }) {
    const busy = actionLoading[user.id];
    if (user.friendshipStatus === "friends") {
      return (
        <button onClick={()=>navigate(`/messages?userId=${user.id}`)} style={btnOutline}>
          <span style={{ color:BP_GREEN }}>{Ico.message}</span>
          <span>Message</span>
        </button>
      );
    }
    if (user.friendshipStatus === "pending_sent") {
      return (
        <button disabled={busy} onClick={()=>handleCancelRequest(user)} style={{ ...btnOutline, borderColor:"#E5E7EB", color:"#9CA3AF" }}>
          {busy ? "…" : "Envoyée"}
        </button>
      );
    }
    if (user.friendshipStatus === "pending_received") {
      const req = requests.find(r=>r.fromUser.id===user.id);
      return (
        <div style={{ display:"flex", gap:6 }}>
          <button disabled={busy} onClick={()=>req&&handleAccept(req)} style={{ ...btnSolid, padding:"7px 12px", fontSize:12 }}>Confirmer</button>
          <button disabled={busy} onClick={()=>req&&handleReject(req)} style={{ ...btnOutline, fontSize:12, padding:"7px 10px" }}>Refuser</button>
        </div>
      );
    }
    return (
      <button disabled={busy} onClick={()=>handleSendRequest(user.id)} style={btnOutline}>
        <span style={{ color:BP_GREEN }}>{Ico.addFriend}</span>
        <span>{busy?"…":"Ajouter"}</span>
      </button>
    );
  }

  /* ─── Premium user card ──────────────────────────────────── */
  function UserCard({ user }: { user: PublicUserWithStatus }) {
    const score   = bpScore(user.id);
    const mutual  = mutualCount(user.id, friends.length);
    const isOnline = false;
    const flag = countryFlag(user.country);
    const prof = user.bio ?? "Membre BrutePawa";
    return (
      <div style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px", borderBottom:"1px solid #F8FAFC" }}>
        {/* Avatar */}
        <div onClick={()=>navigate(`/profile/${user.id}`)} style={{ cursor:"pointer", flexShrink:0 }}>
          <Avatar user={user} size={58} online={isOnline} />
        </div>
        {/* Info */}
        <div style={{ flex:1, minWidth:0, cursor:"pointer" }} onClick={()=>navigate(`/profile/${user.id}`)}>
          <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:2 }}>
            <span style={{ fontWeight:800, fontSize:15, color:"#111827" }}>{fullName(user)}</span>
            {user.role === "creator" && Ico.checkBlue}
          </div>
          <div style={{ fontSize:12.5, color:"#64748B", marginBottom:4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{prof}</div>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <span style={{ fontSize:12, color:"#9CA3AF", display:"flex", alignItems:"center", gap:3 }}>
              {flag} {user.country ?? "Afrique"}
            </span>
            {mutual > 0 && (
              <span style={{ fontSize:12, color:"#9CA3AF", display:"flex", alignItems:"center", gap:3 }}>
                · {Ico.people} {mutual} amis communs
              </span>
            )}
          </div>
          <div style={{ display:"inline-flex", alignItems:"center", gap:4, background:`${BP_GREEN}12`, borderRadius:20, padding:"2px 9px", marginTop:5 }}>
            {Ico.shield}
            <span style={{ fontSize:11, fontWeight:700, color:BP_GREEN }}>Score BrutePawa</span>
            <span style={{ fontSize:12, fontWeight:800, color:BP_GREEN }}>{score}</span>
          </div>
        </div>
        {/* Actions */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, flexShrink:0 }}>
          <ActionBtn user={user} />
          <button style={{ background:"none", border:"none", cursor:"pointer", padding:2 }}>{Ico.more}</button>
        </div>
      </div>
    );
  }

  /* ─── render ─────────────────────────────────────────────── */
  return (
    <div style={{ background:"#F8FAFC", minHeight:"100vh", maxWidth:640, margin:"0 auto" }}>

      {/* ══ 1. CATEGORY TABS ════════════════════════════════ */}
      <div style={{ background:"#fff", borderBottom:"1px solid #F1F5F9", overflowX:"auto", scrollbarWidth:"none", display:"flex", padding:"8px 12px", gap:8 }}>
        {SUB_TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={()=>{ setActiveTab(tab.id); if(tab.id!=="personnes"){ setSearch(""); setCountry("Tous"); } }} style={{
              flex:"0 0 auto", display:"flex", alignItems:"center", gap:6,
              padding:"8px 14px", borderRadius:999, border:"none", cursor:"pointer",
              background: active ? BP_GREEN : "#F1F5F9",
              color: active ? "#fff" : "#64748B",
              fontWeight: active ? 700 : 500, fontSize:13, transition:"all .15s",
              position:"relative",
            }}>
              <span style={{ opacity: active?1:0.7 }}>{tab.icon}</span>
              {tab.label}
              {tab.id==="amis" && pendingCount>0 && (
                <span style={{ background:"#EF4444", color:"#fff", borderRadius:"50%", width:16, height:16, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:800, position:"absolute", top:-3, right:-3 }}>{pendingCount}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ══ 3. PERSONNES TAB ════════════════════════════════ */}
      {activeTab==="personnes" && (
        <div>
          {/* Search bar + country chips */}
          <div style={{ background:"#fff", padding:"12px 14px 0" }}>
            <div className="bp-search">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                autoFocus
                value={search}
                onChange={e=>setSearch(e.target.value)}
                placeholder="Rechercher des personnes, métiers..."
              />
              {search && (
                <button onClick={()=>setSearch("")} style={{ background:"none", border:"none", cursor:"pointer", padding:0, display:"flex", alignItems:"center", color:"#9CA3AF", flexShrink:0 }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              )}
            </div>
            {/* Country chips */}
            <div style={{ display:"flex", gap:8, overflowX:"auto", scrollbarWidth:"none", padding:"10px 0 14px" }}>
              {COUNTRY_FILTERS.map(c => {
                const active = country===c;
                return (
                  <button key={c} onClick={()=>setCountry(c)} style={{
                    flex:"0 0 auto", padding:"7px 14px", borderRadius:999,
                    border:`1.5px solid ${active?BP_GREEN:"#E5E7EB"}`,
                    background: active?BP_GREEN:"#fff",
                    color: active?"#fff":"#64748B",
                    fontSize:13, fontWeight: active?700:500, cursor:"pointer", transition:"all .15s",
                    display:"flex", alignItems:"center", gap:5,
                  }}>
                    {c!=="Tous" && <span>{countryFlag(c)}</span>}
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign:"center", padding:"48px 20px" }}>
              <div style={{ width:32, height:32, border:`3px solid #E5E7EB`, borderTopColor:BP_GREEN, borderRadius:"50%", animation:"bp-spin .7s linear infinite", margin:"0 auto 12px" }} />
              <div style={{ color:"#9CA3AF", fontSize:14 }}>Chargement…</div>
              <style>{`@keyframes bp-spin { to { transform:rotate(360deg); } }`}</style>
            </div>
          ) : (
            <>
              {/* Suggestions pour vous */}
              {filtered.length > 0 && (
                <div style={{ background:"#fff", borderRadius:20, margin:"10px 12px 0", boxShadow:"0 2px 10px rgba(0,0,0,0.05)", overflow:"hidden" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 16px 4px" }}>
                    <span style={{ fontWeight:700, fontSize:15, color:"#111827" }}>Suggestions pour vous</span>
                    <button style={{ background:"none", border:"none", color:BP_GREEN, fontWeight:700, fontSize:12.5, cursor:"pointer" }}>Voir tout</button>
                  </div>
                  {filtered.slice(0,6).map(u => <UserCard key={u.id} user={u} />)}
                </div>
              )}

              {filtered.length===0 && (
                <div style={{ background:"#fff", borderRadius:20, margin:"10px 12px 0", padding:"40px 20px", textAlign:"center", boxShadow:"0 2px 10px rgba(0,0,0,0.05)" }}>
                  <div style={{ width:56, height:56, borderRadius:18, background:`${BP_GREEN}15`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px" }}>
                    {Ico.groupIcon}
                  </div>
                  <div style={{ fontWeight:700, fontSize:15, color:"#111827", marginBottom:6 }}>Aucune personne trouvée</div>
                  <div style={{ fontSize:13, color:"#9CA3AF" }}>Modifiez votre recherche ou invitez des amis.</div>
                </div>
              )}

              {/* Invite banner */}
              <div style={{ background:"#fff", borderRadius:20, margin:"10px 12px 0", padding:"16px", boxShadow:"0 2px 10px rgba(0,0,0,0.05)", display:"flex", alignItems:"center", gap:14 }}>
                <div style={{ width:48, height:48, borderRadius:16, background:`${BP_GREEN}15`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke={BP_GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:14, color:"#111827" }}>Invitez vos amis sur BrutePawa</div>
                  <div style={{ fontSize:12, color:"#9CA3AF", marginTop:2 }}>Plus vous êtes nombreux, plus l'expérience est enrichissante.</div>
                </div>
                <button style={{ flexShrink:0, display:"flex", alignItems:"center", gap:6, background:BP_GREEN, color:"#fff", border:"none", borderRadius:12, padding:"9px 14px", fontWeight:700, fontSize:13, cursor:"pointer", boxShadow:`0 3px 12px ${BP_GREEN}40` }}>
                  {Ico.send}
                  Inviter
                </button>
              </div>

              {/* Two-column bottom sections */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, margin:"10px 12px 20px" }}>
                {/* Personnes populaires */}
                <div style={{ background:"#fff", borderRadius:20, padding:"14px 12px", boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                    <span style={{ fontWeight:700, fontSize:13, color:"#111827" }}>Personnes populaires</span>
                    <button style={{ background:"none", border:"none", color:BP_GREEN, fontSize:10.5, fontWeight:700, cursor:"pointer" }}>Voir tout</button>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {popularUsers.slice(0,4).map(u => (
                      <div key={u.id} onClick={()=>navigate(`/profile/${u.id}`)} style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer" }}>
                        <div style={{ position:"relative", flexShrink:0 }}>
                          <Avatar user={u} size={36} />
                        </div>
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontWeight:700, fontSize:11.5, color:"#111827", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.firstName} {u.lastName.charAt(0)}.</div>
                          <div style={{ fontSize:10, color:"#9CA3AF", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.bio?.split(" ").slice(0,2).join(" ") ?? "Membre BP"}</div>
                        </div>
                      </div>
                    ))}
                    {popularUsers.length===0 && <div style={{ fontSize:12, color:"#9CA3AF", textAlign:"center", padding:"12px 0" }}>Aucun membre</div>}
                  </div>
                </div>

                {/* Nouveaux membres */}
                <div style={{ background:"#fff", borderRadius:20, padding:"14px 12px", boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                    <span style={{ fontWeight:700, fontSize:13, color:"#111827" }}>Nouveaux membres</span>
                    <button style={{ background:"none", border:"none", color:BP_GREEN, fontSize:10.5, fontWeight:700, cursor:"pointer" }}>Voir tout</button>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {newMembers.slice(0,4).map(u => (
                      <div key={u.id} onClick={()=>navigate(`/profile/${u.id}`)} style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer" }}>
                        <div style={{ position:"relative", flexShrink:0 }}>
                          <Avatar user={u} size={36} />
                          <div style={{ position:"absolute", top:-3, right:-3, background:BP_GREEN, color:"#fff", fontSize:7, fontWeight:800, borderRadius:6, padding:"1px 4px", border:"1.5px solid #fff", whiteSpace:"nowrap" }}>Nouveau</div>
                        </div>
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontWeight:700, fontSize:11.5, color:"#111827", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.firstName} {u.lastName.charAt(0)}.</div>
                          <div style={{ fontSize:10, color:"#9CA3AF", display:"flex", alignItems:"center", gap:2 }}>
                            {countryFlag(u.country)} {u.country?.split(",")[0] ?? "Afrique"}
                          </div>
                        </div>
                      </div>
                    ))}
                    {newMembers.length===0 && <div style={{ fontSize:12, color:"#9CA3AF", textAlign:"center", padding:"12px 0" }}>Aucun membre</div>}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══ 4. AMI(E)S TAB ══════════════════════════════════ */}
      {activeTab==="amis" && (
        <div style={{ padding:"12px" }}>
          {/* Invitations */}
          {requests.length > 0 && (
            <div style={{ background:"#fff", borderRadius:20, marginBottom:12, overflow:"hidden", boxShadow:"0 2px 10px rgba(0,0,0,0.05)" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 16px 8px" }}>
                <span style={{ fontWeight:700, fontSize:14.5, color:"#111827" }}>Invitations reçues</span>
                <span style={{ background:"#EF4444", color:"#fff", borderRadius:20, padding:"2px 9px", fontSize:11, fontWeight:800 }}>{requests.length}</span>
              </div>
              {requests.map(req => (
                <div key={req.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderTop:"1px solid #F8FAFC" }}>
                  <div onClick={()=>navigate(`/profile/${req.fromUser.id}`)} style={{ cursor:"pointer", flexShrink:0 }}>
                    <Avatar user={req.fromUser} size={50} />
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:14, color:"#111827" }}>{fullName(req.fromUser)}</div>
                    {req.fromUser.country && <div style={{ fontSize:12, color:"#9CA3AF" }}>{countryFlag(req.fromUser.country)} {req.fromUser.country}</div>}
                    <div style={{ fontSize:11.5, color:"#9CA3AF", marginTop:2 }}>{relTime(req.createdAt)}</div>
                  </div>
                  <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                    <button disabled={actionLoading[req.id]} onClick={()=>handleAccept(req)} style={btnSolid}>{actionLoading[req.id]?"…":"Confirmer"}</button>
                    <button disabled={actionLoading[req.id]} onClick={()=>handleReject(req)} style={btnOutline}>{actionLoading[req.id]?"…":"Refuser"}</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Friends list */}
          <div style={{ background:"#fff", borderRadius:20, overflow:"hidden", boxShadow:"0 2px 10px rgba(0,0,0,0.05)" }}>
            <div style={{ padding:"14px 16px 8px", display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontWeight:700, fontSize:14.5, color:"#111827" }}>Vos amis</span>
              {friends.length>0 && <span style={{ background:"#F1F5F9", color:"#64748B", borderRadius:20, padding:"2px 9px", fontSize:11, fontWeight:700 }}>{friends.length}</span>}
            </div>
            {loading ? (
              <div style={{ textAlign:"center", padding:"32px", color:"#9CA3AF", fontSize:14 }}>Chargement…</div>
            ) : friends.length===0 ? (
              <div style={{ textAlign:"center", padding:"40px 20px" }}>
                <div style={{ width:56, height:56, borderRadius:18, background:`${BP_GREEN}15`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px" }}>{Ico.groupIcon}</div>
                <div style={{ fontWeight:700, fontSize:15, color:"#111827", marginBottom:4 }}>Aucun ami pour l'instant</div>
                <div style={{ fontSize:13, color:"#9CA3AF" }}>Ajoutez des personnes depuis l'onglet Personnes.</div>
              </div>
            ) : (
              friends.map(friend => (
                <div key={friend.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderTop:"1px solid #F8FAFC" }}>
                  <div onClick={()=>navigate(`/profile/${friend.id}`)} style={{ cursor:"pointer", flexShrink:0 }}>
                    <Avatar user={friend} size={50} online={false} />
                  </div>
                  <div style={{ flex:1, cursor:"pointer", minWidth:0 }} onClick={()=>navigate(`/profile/${friend.id}`)}>
                    <div style={{ fontWeight:700, fontSize:14.5, color:"#111827" }}>{fullName(friend)}</div>
                    {friend.country && <div style={{ fontSize:12, color:"#9CA3AF", marginTop:2 }}>{countryFlag(friend.country)} {friend.country}</div>}
                    {friend.bio && <div style={{ fontSize:12, color:"#64748B", marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{friend.bio}</div>}
                  </div>
                  <button onClick={()=>navigate(`/messages?userId=${friend.id}`)} style={{ ...btnOutline, flexShrink:0 }}>
                    <span style={{ color:BP_GREEN }}>{Ico.message}</span> Message
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ══ 5. ABONNÉS TAB ══════════════════════════════════ */}
      {activeTab==="abonnes" && (
        <EmptyPlaceholder icon={<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke={BP_GREEN} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>} title="Aucun abonnement" sub="Commencez à suivre des personnes depuis l'onglet Personnes." />
      )}

      {/* ══ 6. GROUPES TAB ══════════════════════════════════ */}
      {activeTab==="groupes" && (
        <div style={{ padding:"12px" }}>
          <div className="bp-search" style={{ marginBottom:12 }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              value={groupSearch}
              onChange={e=>setGroupSearch(e.target.value)}
              placeholder="Rechercher des groupes..."
            />
          </div>
          {loading ? (
            <div style={{ textAlign:"center", padding:"32px", color:"#9CA3AF" }}>Chargement…</div>
          ) : (() => {
            const q = groupSearch.toLowerCase().trim();
            const fg = q ? groups.filter(g=>g.name.toLowerCase().includes(q)||(g.description??"").toLowerCase().includes(q)) : groups;
            const fcg = chatGroups.filter(g=> !q || g.name.toLowerCase().includes(q));
            const hasAny = fg.length > 0 || fcg.length > 0;

            if (!hasAny) return <EmptyPlaceholder icon={<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke={BP_GREEN} strokeWidth="1.8" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>} title={q?"Aucun groupe trouvé":"Aucun groupe disponible"} sub="Créez votre premier groupe depuis Messages." />;

            return (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>

                {/* ── Groupes de discussion (chat groups) ── */}
                {fcg.length > 0 && (
                  <>
                    <div style={{ fontSize:12, fontWeight:700, color:"#9CA3AF", letterSpacing:0.5, padding:"4px 4px 2px", textTransform:"uppercase" }}>
                      Groupes de discussion
                    </div>
                    {fcg.map(cg => {
                      const WIZ_COLORS = ["#EC4899","#8B5CF6","#F97316","var(--bp-primary)","#0EA5E9","#EF4444","#3B82F6","#F59E0B","#6366F1","#8B5CF6"];
                      const col = WIZ_COLORS[cg.id % WIZ_COLORS.length];
                      const initials = cg.name.split(" ").map((w:string)=>w[0]).join("").toUpperCase().slice(0,2);
                      return (
                        <div key={`cg-${cg.id}`}
                          onClick={()=>navigate(`/messages?groupId=${cg.id}`)}
                          style={{ background:"#fff", borderRadius:16, padding:"12px 14px", display:"flex", alignItems:"center", gap:12, cursor:"pointer", boxShadow:"0 1px 6px rgba(0,0,0,0.05)" }}>
                          <div style={{ width:48, height:48, borderRadius:"50%", background:col, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:17, flexShrink:0 }}>
                            {cg.avatarUrl
                              ? <img src={cg.avatarUrl} style={{ width:48, height:48, borderRadius:"50%", objectFit:"cover" }} alt={cg.name} />
                              : initials
                            }
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontWeight:700, fontSize:14.5, color:"#111827", marginBottom:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{cg.name}</div>
                            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                              <span style={{ fontSize:12, color:"#9CA3AF" }}>{Ico.people} {cg.membersCount} membre{cg.membersCount!==1?"s":""}</span>
                              <span style={{ fontSize:11, background:`${BP_GREEN}18`, color:BP_GREEN, borderRadius:8, padding:"1px 7px", fontWeight:600 }}>
                                {cg.type==="channel"?"Canal":"Discussion"}
                              </span>
                            </div>
                            {cg.lastMessage && <div style={{ fontSize:12, color:"#64748B", marginTop:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{cg.lastMessage}</div>}
                          </div>
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#E5E7EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                        </div>
                      );
                    })}
                  </>
                )}

                {/* ── Communautés ── */}
                {fg.length > 0 && (
                  <>
                    {fcg.length > 0 && (
                      <div style={{ fontSize:12, fontWeight:700, color:"#9CA3AF", letterSpacing:0.5, padding:"8px 4px 2px", textTransform:"uppercase" }}>
                        Communautés
                      </div>
                    )}
                    {fg.map(group => (
                      <div key={group.id} style={{ background:"#fff", borderRadius:20, overflow:"hidden", boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}>
                        <div onClick={()=>navigate(`/groups/${group.id}`)} style={{ height:72, background:group.coverUrl?`url(${group.coverUrl}) center/cover no-repeat`:`linear-gradient(135deg, ${BP_GREEN}80 0%, ${BP_GREEN} 100%)`, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:32 }}>
                          {!group.coverUrl && <span style={{ opacity:0.6, fontSize:28 }}>🏘</span>}
                        </div>
                        <div style={{ padding:"12px 14px", display:"flex", alignItems:"center", gap:12 }}>
                          <div style={{ flex:1, cursor:"pointer", minWidth:0 }} onClick={()=>navigate(`/groups/${group.id}`)}>
                            <div style={{ fontWeight:700, fontSize:14.5, color:"#111827", marginBottom:3 }}>{group.name}</div>
                            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                              <span style={{ fontSize:12, color:"#9CA3AF" }}>{Ico.people} {group.membersCount.toLocaleString()} membres</span>
                              <span style={{ fontSize:12, color:"#9CA3AF" }}>{group.privacy==="public"?"Public":"Privé"}</span>
                              {group.country && <span style={{ fontSize:12, color:"#9CA3AF" }}>{countryFlag(group.country)} {group.country}</span>}
                            </div>
                            {group.description && <div style={{ fontSize:12, color:"#64748B", marginTop:4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{group.description}</div>}
                          </div>
                          {group.isMember ? (
                            <button disabled={groupActionLoading[group.id]} onClick={async()=>{ setGroupActionLoading(p=>({...p,[group.id]:true})); try { await apiLeaveGroup(group.id); setGroups(p=>p.map(g=>g.id===group.id?{...g,isMember:false,membersCount:Math.max(0,g.membersCount-1)}:g)); } catch{} setGroupActionLoading(p=>({...p,[group.id]:false})); }} style={{ ...btnOutline, borderColor: BP_GREEN, color:BP_GREEN }}>
                              {groupActionLoading[group.id]?"…":"Membre"}
                            </button>
                          ) : (
                            <button disabled={groupActionLoading[group.id]} onClick={async()=>{ setGroupActionLoading(p=>({...p,[group.id]:true})); try { await apiJoinGroup(group.id); setGroups(p=>p.map(g=>g.id===group.id?{...g,isMember:true,membersCount:g.membersCount+1}:g)); } catch{} setGroupActionLoading(p=>({...p,[group.id]:false})); }} style={btnSolid}>
                              {groupActionLoading[group.id]?"…":"Rejoindre"}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* ══ 7. PAGES TAB ════════════════════════════════════ */}
      {activeTab==="pages" && (
        <div style={{ padding:"12px" }}>
          <div style={{ display:"flex", gap:8, marginBottom:12 }}>
            <button onClick={()=>navigate("/pages")} style={{ ...btnSolid, flex:1 }}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Créer une page
            </button>
            <button onClick={()=>navigate("/pages")} style={{ ...btnOutline, borderColor:BP_GREEN, color:BP_GREEN, paddingLeft:12, paddingRight:12 }}>
              Toutes les pages
            </button>
          </div>
          {communityPages.length === 0 ? (
            <EmptyPlaceholder
              icon={<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke={BP_GREEN} strokeWidth="1.8" strokeLinecap="round"><path d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.414-9.414a2 2 0 1 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>}
              title="Aucune page disponible"
              sub="Soyez le premier à créer une page sur BrutePawa !"
            />
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {communityPages.slice(0,10).map(page => (
                <div key={page.id} onClick={()=>navigate("/pages")}
                  style={{ background:"#fff", borderRadius:16, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,.07)", cursor:"pointer" }}>
                  <div style={{ height:60, background:page.coverUrl?`url(${page.coverUrl}) center/cover`:`linear-gradient(135deg,${BP_GREEN},var(--bp-primary-dark))`, position:"relative" }}>
                    <div style={{ position:"absolute", bottom:-20, left:12 }}>
                      <div style={{ width:44, height:44, borderRadius:"50%", border:"3px solid #fff", background:BP_GREEN, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
                        {page.avatarUrl?<img src={page.avatarUrl} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>:<span style={{ fontSize:18 }}>{page.emoji}</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ padding:"26px 12px 12px", display:"flex", alignItems:"flex-end", justifyContent:"space-between" }}>
                    <div style={{ minWidth:0 }}>
                      <p style={{ margin:0, fontWeight:700, fontSize:14, color:"#111827" }}>{page.name}</p>
                      <p style={{ margin:0, fontSize:12, color:"#6B7280" }}>{page.category} · {page.followersCount.toLocaleString()} abonnés</p>
                    </div>
                    <button onClick={async e=>{ e.stopPropagation(); setPageActionLoading(p=>({...p,[page.id]:true}));
                      try {
                        if(page.isFollowed){ await apiUnfollowPage(page.id); setCommunityPages(prev=>prev.map(p=>p.id===page.id?{...p,isFollowed:false,followersCount:p.followersCount-1}:p)); }
                        else { await apiFollowPage(page.id); setCommunityPages(prev=>prev.map(p=>p.id===page.id?{...p,isFollowed:true,followersCount:p.followersCount+1}:p)); }
                      } catch{} setPageActionLoading(p=>({...p,[page.id]:false}));
                    }} disabled={pageActionLoading[page.id]}
                    style={{ ...btnSolid, fontSize:12, padding:"6px 12px", background:page.isFollowed?"#F3F4F6":"var(--bp-primary)", color:page.isFollowed?"#374151":"#fff", boxShadow:"none" }}>
                      {page.isFollowed?"Abonné":"S'abonner"}
                    </button>
                  </div>
                </div>
              ))}
              {communityPages.length > 10 && (
                <button onClick={()=>navigate("/pages")} style={{ ...btnOutline, borderColor:BP_GREEN, color:BP_GREEN, width:"100%" }}>
                  Voir toutes les pages ({communityPages.length})
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══ 8. ENTREPRISES TAB ══════════════════════════════ */}
      {activeTab==="entreprises" && (
        <EmptyPlaceholder icon={<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke={BP_GREEN} strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>} title="Annuaire des entreprises" sub="Réseau professionnel B2B — Afrique francophone. Bientôt disponible." />
      )}

      {/* ══ 9. MESSAGERIE TAB ═══════════════════════════════ */}
      {activeTab==="messagerie" && (
        <div onClick={()=>navigate("/messages")} style={{ padding:"12px" }}>
          <EmptyPlaceholder icon={<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke={BP_GREEN} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>} title="Accéder à la messagerie" sub="Vos conversations privées sont dans Messagerie. Appuyez pour y accéder." />
        </div>
      )}

    </div>
  );
}

/* ─── Shared styles ─────────────────────────────────────────── */
const btnSolid: React.CSSProperties = {
  display:"flex", alignItems:"center", justifyContent:"center", gap:5,
  background:BP_GREEN, color:"#fff", border:"none", borderRadius:12,
  padding:"8px 14px", fontWeight:700, fontSize:13, cursor:"pointer",
  boxShadow:`0 2px 8px ${BP_GREEN}40`, whiteSpace:"nowrap",
};
const btnOutline: React.CSSProperties = {
  display:"flex", alignItems:"center", justifyContent:"center", gap:5,
  background:"#fff", color:"#64748B", border:`1.5px solid ${BP_GREEN}`,
  borderRadius:12, padding:"7px 13px", fontWeight:700, fontSize:13, cursor:"pointer",
  whiteSpace:"nowrap",
};

/* ─── Empty state component ─────────────────────────────────── */
function EmptyPlaceholder({ icon, title, sub }: { icon:React.ReactNode; title:string; sub:string }) {
  return (
    <div style={{ textAlign:"center", padding:"48px 20px", margin:"12px" }}>
      <div style={{ width:64, height:64, borderRadius:20, background:`${BP_GREEN}15`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>{icon}</div>
      <div style={{ fontWeight:700, fontSize:15, color:"#111827", marginBottom:6 }}>{title}</div>
      <div style={{ fontSize:13, color:"#9CA3AF", lineHeight:1.5 }}>{sub}</div>
    </div>
  );
}
