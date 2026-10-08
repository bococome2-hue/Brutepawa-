import { useState, useEffect, useRef } from "react";
import SearchSuggestionsDropdown from "./SearchSuggestionsDropdown";

interface Props {
  onClose: () => void;
  navigate: (path: string) => void;
  recentSearches: string[];
  onSelectRecent: (q: string) => void;
  onRemoveRecent: (q: string) => void;
  onCommitSearch?: (q: string) => void;
}

export default function MobileSearchOverlay({
  onClose,
  navigate,
  recentSearches,
  onSelectRecent,
  onRemoveRecent,
  onCommitSearch,
}: Props) {
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleCommit = () => {
    if (!query.trim()) return;
    onCommitSearch?.(query.trim());
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="mobile-search-overlay">
      <div className="mobile-search-overlay-header">
        <button className="mobile-search-back-btn" onClick={onClose} aria-label="Fermer">
          ←
        </button>
        <input
          ref={inputRef}
          className="mobile-search-input"
          placeholder="Rechercher sur Brute Pawa"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={e => {
            if (e.key === "Enter") handleCommit();
            if (e.key === "Escape") onClose();
          }}
        />
        {query.length > 0 && (
          <button
            className="mobile-search-clear-btn"
            onClick={() => setQuery("")}
            aria-label="Effacer"
          >
            ×
          </button>
        )}
      </div>

      <div className="mobile-search-overlay-body">
        {showSuggestions && (query.length >= 2 || recentSearches.length > 0) && (
          <SearchSuggestionsDropdown
            query={query}
            onClose={onClose}
            navigate={navigate}
            recentSearches={recentSearches}
            onSelectRecent={q => {
              setQuery(q);
              onSelectRecent(q);
              setShowSuggestions(true);
            }}
            onRemoveRecent={onRemoveRecent}
            onCommitSearch={onCommitSearch}
          />
        )}
      </div>
    </div>
  );
}
