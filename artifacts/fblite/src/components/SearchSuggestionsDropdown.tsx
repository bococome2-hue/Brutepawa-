import { useState, useEffect, useRef } from "react";
import {
  apiSearchUsers,
  apiGetProducts,
  apiGetJobs,
  apiSearchPosts,
  apiSearchGroups,
  type PublicUserWithStatus,
  type ApiProduct,
  type ApiJob,
  type FeedPost,
  type ApiGroup,
} from "../lib/api";

interface Props {
  query: string;
  onClose: () => void;
  navigate: (path: string) => void;
  recentSearches: string[];
  onSelectRecent: (q: string) => void;
  onRemoveRecent: (q: string) => void;
  onCommitSearch?: (q: string) => void;
}

const AVATAR_COLORS = ["var(--bp-primary)","#E91E63","#9C27B0","#D97706","#388E3C","#D32F2F","#00838F","#5D4037"];
function colorForId(id: number) { return AVATAR_COLORS[id % AVATAR_COLORS.length]; }

function snippet(text: string, maxLen = 80): string {
  return text.length > maxLen ? text.slice(0, maxLen).trimEnd() + "…" : text;
}

export default function SearchSuggestionsDropdown({ query, onClose, navigate, recentSearches, onSelectRecent, onRemoveRecent, onCommitSearch }: Props) {
  const [users, setUsers]       = useState<PublicUserWithStatus[]>([]);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [jobs, setJobs]         = useState<ApiJob[]>([]);
  const [posts, setPosts]       = useState<FeedPost[]>([]);
  const [groups, setGroups]     = useState<ApiGroup[]>([]);
  const [loading, setLoading]   = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (query.length < 2) {
      setUsers([]); setProducts([]); setJobs([]); setPosts([]); setGroups([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      try {
        const [u, p, j, ps, g] = await Promise.all([
          apiSearchUsers(query),
          apiGetProducts({ search: query }),
          apiGetJobs({ search: query }),
          apiSearchPosts(query),
          apiSearchGroups(query),
        ]);
        if (ctrl.signal.aborted) return;
        setUsers(u.slice(0, 4));
        setProducts(p.slice(0, 4));
        setJobs(j.slice(0, 4));
        setPosts(ps.slice(0, 3));
        setGroups(g.slice(0, 3));
      } catch {
        if (ctrl.signal.aborted) return;
        setUsers([]); setProducts([]); setJobs([]); setPosts([]); setGroups([]);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 280);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  const hasResults = users.length > 0 || products.length > 0 || jobs.length > 0 || posts.length > 0 || groups.length > 0;
  const noResults  = !loading && query.length >= 2 && !hasResults;

  const go = (path: string) => {
    onClose();
    navigate(path);
  };

  const goSearch = () => {
    onCommitSearch?.(query.trim());
    onClose();
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const showRecents = query.length < 2 && recentSearches.length > 0;

  return (
    <div className="search-dropdown">

      {/* Recent searches (shown when input is empty / < 2 chars) */}
      {showRecents && (
        <div className="search-dropdown-section">
          <div className="search-dropdown-section-title">🕐 Récentes</div>
          {recentSearches.map(q => (
            <div key={q} className="search-dropdown-recent-row">
              <button
                className="search-dropdown-recent-query"
                onClick={() => onSelectRecent(q)}
              >
                <span className="search-dropdown-recent-icon">🔍</span>
                {q}
              </button>
              <button
                className="search-dropdown-recent-remove"
                title="Supprimer"
                onClick={e => { e.stopPropagation(); onRemoveRecent(q); }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* "See all results" shortcut */}
      {query.length >= 2 && (
        <button className="search-dropdown-see-all" onClick={goSearch}>
          🔍 Voir tous les résultats pour « {query} »
        </button>
      )}

      {loading && (
        <div className="search-dropdown-loading">
          <span className="search-dropdown-spinner" />
          Recherche en cours…
        </div>
      )}

      {!loading && noResults && (
        <div className="search-dropdown-empty">
          Aucun résultat pour « {query} »
        </div>
      )}

      {/* People */}
      {!loading && users.length > 0 && (
        <div className="search-dropdown-section">
          <div className="search-dropdown-section-title">👥 Personnes</div>
          {users.map(u => {
            const name = `${u.firstName} ${u.lastName}`;
            const initials = `${u.firstName[0] ?? ""}${u.lastName[0] ?? ""}`.toUpperCase();
            return (
              <button
                key={u.id}
                className="search-dropdown-item"
                onClick={() => go(`/profile/${u.id}`)}
              >
                <div className="search-dropdown-avatar" style={{ background: colorForId(u.id) }}>
                  {u.avatarUrl
                    ? <img src={u.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span>{initials}</span>
                  }
                </div>
                <div className="search-dropdown-item-info">
                  <div className="search-dropdown-item-name">{name}</div>
                  {u.country && <div className="search-dropdown-item-sub">📍 {u.country}</div>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Posts */}
      {!loading && posts.length > 0 && (
        <div className="search-dropdown-section">
          <div className="search-dropdown-section-title">📝 Publications</div>
          {posts.map(p => (
            <button
              key={p.id}
              className="search-dropdown-item"
              onClick={goSearch}
            >
              <div className="search-dropdown-avatar" style={{ background: "#DCFCE7" }}>
                {p.authorAvatarUrl
                  ? <img src={p.authorAvatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span style={{ fontSize: 18 }}>📝</span>
                }
              </div>
              <div className="search-dropdown-item-info">
                <div className="search-dropdown-item-name" style={{ fontSize: 13 }}>
                  {snippet(p.content)}
                </div>
                <div className="search-dropdown-item-sub">par {p.authorName}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Groups / Communities */}
      {!loading && groups.length > 0 && (
        <div className="search-dropdown-section">
          <div className="search-dropdown-section-title">🏘️ Groupes</div>
          {groups.map(g => (
            <button
              key={g.id}
              className="search-dropdown-item"
              onClick={() => go(`/groups/${g.id}`)}
            >
              <div className="search-dropdown-avatar" style={{ background: "#EDE9FE" }}>
                <span style={{ fontSize: 20 }}>{g.emoji}</span>
              </div>
              <div className="search-dropdown-item-info">
                <div className="search-dropdown-item-name">{g.name}</div>
                <div className="search-dropdown-item-sub">
                  {g.membersCount} membre{g.membersCount !== 1 ? "s" : ""}
                  {g.country ? ` · ${g.country}` : ""}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Products */}
      {!loading && products.length > 0 && (
        <div className="search-dropdown-section">
          <div className="search-dropdown-section-title">🛍️ Articles</div>
          {products.map(p => (
            <button
              key={p.id}
              className="search-dropdown-item"
              onClick={() => go(`/marketplace/${p.id}`)}
            >
              <div className="search-dropdown-avatar search-dropdown-avatar-square" style={{ background: "#F1F5F9" }}>
                {p.imageUrl
                  ? <img src={p.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span style={{ fontSize: 18 }}>🛍️</span>
                }
              </div>
              <div className="search-dropdown-item-info">
                <div className="search-dropdown-item-name">{p.title}</div>
                <div className="search-dropdown-item-sub">
                  {p.price.toLocaleString("fr-FR")} {p.currency}
                  {p.location ? ` · ${p.location}` : ""}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Jobs */}
      {!loading && jobs.length > 0 && (
        <div className="search-dropdown-section">
          <div className="search-dropdown-section-title">💼 Emplois</div>
          {jobs.map(j => (
            <button
              key={j.id}
              className="search-dropdown-item"
              onClick={() => go(`/jobs/${j.id}`)}
            >
              <div className="search-dropdown-avatar" style={{ background: "#DCFCE7" }}>
                <span style={{ fontSize: 18 }}>💼</span>
              </div>
              <div className="search-dropdown-item-info">
                <div className="search-dropdown-item-name">{j.title}</div>
                <div className="search-dropdown-item-sub">{j.company} · {j.location}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
