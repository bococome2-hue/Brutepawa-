import { useState, useEffect } from "react";
import { apiGetGiphy, type GiphyItem } from "../lib/api";
import "./EmojiPicker.css";

const CHAT_EMOJIS = {
  Tous: [],
  Smileys: ["😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇","🙂","🙃","😉","😌","😍","🥰","😘","😋","😛","😜","🤪","🤨","🧐","🤓","😎","🥳","😏","😒","😔","😢","😭","😤","😡","🤯","😳","🥺","😴","🤗","🤔","🤭","🫢","🫣","🫡","🤫","😶","🙄","😬"],
  Amour: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💋","😘","😍","🥰"],
  Réactions: ["🎉","🎊","👏","🙌","💯","✨","🔥","👍","👎","👌","🤌","🤏","✌️","🤞","🫰","🤟","🤘"],
  Objets: ["⌚","📱","💻","⌨️","🖥️","🖨️","📷","📹","🎥","📞","☎️","💡","🔦","📚","✏️","📝","🔒","🔑","🔨","🧰","🎁","🎈"],
  Premium: ["👑","🏆","⭐","🌟","✨","💎","💰","💸","💳"],
};

export type PickerMode = "emoji" | "gif" | "sticker" | "avatar" | "symbol" | "flag";

export function EmojiPicker({
  isOpen,
  isClosing,
  onClose,
  onSelectEmoji,
  onSelectMedia,
}: {
  isOpen: boolean;
  isClosing: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
  onSelectMedia: (item: GiphyItem, type: "gif" | "sticker") => void;
}) {
  const [pickerMode, setPickerMode] = useState<PickerMode>("emoji");
  const [search, setSearch] = useState("");
  const [giphyItems, setGiphyItems] = useState<GiphyItem[]>([]);
  const [giphyLoading, setGiphyLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("Tous");

  const recentEmojis = ["❤️","🔥","🚀","🙏","💚","🥰","😂","😍","💯","✨"];
  
  const popularEmojis = [
    "❤️","🧡","💛","💚","💙","💜","🖤","🤍","💔","💕",
    "💘","💖","💗","💓","💝","💋","🌹","🌸","🌻","🍀",
    "☮️","✝️","☪️","🕉️","☯️","♈","♉","♊","♋","♌",
    "♍","♎","♏","♐","♑","♒","♓","⚠️","⛔","❌",
    "✅","⭕","❓","❗","💡","💰","💎","👑","🏆","⭐"
  ];

  const symbols = ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","💔","❣️","💕","💞","💓","💗","💖","💘","💝","☮️","✝️","☪️","🕉️","☯️","♈","♉","♊","♋","⚠️","⛔","❌","⭕","✅","❓","‼️"];
  const avatars = ["👶","🧒","👦","👧","🧑","👨","👩","🧔","👵","👴","👮","👷","💂","🕵️","👩‍⚕️","👨‍🌾","👩‍🍳","👨‍🎓","👩‍🎤","👨‍🏫","👩‍💻","👨‍🚀","🧕","🤵","👰","🤰","🧑‍🍼","🗣️","👤","👥"];
  const flags = ["🏳️‍🌈","🏳️‍⚧️","🏴‍☠️","🏁","🚩","🎌","🇫🇷","🇺🇸","🇬🇧","🇩🇪","🇯🇵","🇮🇹","🇪🇸","🇨🇦","🇨🇳","🇧🇷","🇦🇺","🇮🇳","🇰🇷","🇷🇺","🇿🇦","🇲🇽","🇳🇱","🇸🇪","🇨🇭","🇧🇪","🇦🇹","🇩🇰","🇳🇴","🇫🇮","🇵🇱","🇦🇷"];
  
  const stickers = [
    { id: "ok", label: "OK", image: "/stickers/brutepawa-ok.png", animated: "/stickers/brutepawa-ok-animated.webp?v=2" },
    { id: "cool", label: "COOL", image: "/stickers/brutepawa-cool.png", animated: "/stickers/brutepawa-cool-animated.webp?v=2" },
    { id: "love", label: "AMOUR", image: "/stickers/brutepawa-love.png", animated: "/stickers/brutepawa-love-animated.webp?v=2" },
    { id: "super", label: "SUPER", image: "/stickers/brutepawa-super.png", animated: "/stickers/brutepawa-super-animated.webp?v=2" },
    { id: "bravo", label: "BRAVO", image: "/stickers/brutepawa-bravo.png", animated: "/stickers/brutepawa-bravo-animated.webp?v=2" },
    { id: "merci", label: "MERCI", image: "/stickers/brutepawa-merci.png", animated: "/stickers/brutepawa-merci-animated.webp?v=2" },
    { id: "haha", label: "HAHA", image: "/stickers/brutepawa-haha.png", animated: "/stickers/brutepawa-haha-animated.webp?v=2" },
    { id: "bonjour", label: "BONNE JOURNÉE", image: "/stickers/brutepawa-bonjour.png", animated: "/stickers/brutepawa-bonjour-animated.webp?v=2" }
  ];

  useEffect(() => {
    if (!isOpen || (pickerMode !== "gif" && pickerMode !== "sticker")) return;
    
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setGiphyLoading(true);
      apiGetGiphy(pickerMode === "gif" ? "gifs" : "stickers", search)
        .then(items => { if (!cancelled) setGiphyItems(items); })
        .catch(() => { if (!cancelled) setGiphyItems([]); })
        .finally(() => { if (!cancelled) setGiphyLoading(false); });
    }, search ? 350 : 0);
    
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [isOpen, pickerMode, search]);

  if (!isOpen && !isClosing) return null;

  // Render specific mode grids
  const renderModeGrid = () => {
    let list: string[] = [];
    if (pickerMode === "avatar") list = avatars;
    else if (pickerMode === "symbol") list = symbols;
    else if (pickerMode === "flag") list = flags;

    return (
      <div className="picker-scroll-area">
        <div className="popular-emojis" style={{ marginTop: 12 }}>
          {list.map((emoji, i) => (
            <button key={`mode-${i}`} className="emoji-btn" onClick={() => onSelectEmoji(emoji)} data-testid={`emoji-${pickerMode}-${i}`}>
              {emoji}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const getFilteredEmojis = () => {
    let source: string[] = [];
    if (activeCategory === "Tous") {
      source = popularEmojis;
    } else {
      source = CHAT_EMOJIS[activeCategory as keyof typeof CHAT_EMOJIS] || [];
    }

    if (!search.trim()) return source;
    
    const s = search.toLowerCase();
    
    // Small hardcoded dictionary for common French searches
    const dict: Record<string, string[]> = {
      "coeur": ["❤️", "🤍", "🖤", "💙", "💚", "💛", "🧡", "💜"],
      "amour": ["❤️", "😍", "🥰", "😘"],
      "rire": ["😂", "🤣", "😆"],
      "pleurer": ["😢", "😭"],
      "fleur": ["🌹", "🌸", "🌻", "🌺"],
      "feu": ["🔥"],
      "ok": ["👍", "👌"],
      "non": ["👎", "❌", "⛔"],
      "oui": ["✅", "👍"]
    };
    
    let matches: string[] = [];
    for (const [key, emojis] of Object.entries(dict)) {
      if (key.includes(s) || s.includes(key)) {
        matches.push(...emojis);
      }
    }
    
    if (matches.length > 0) return Array.from(new Set(matches));
    
    return [];
  };

  return (
    <div
      className={`emoji-picker-container ${isClosing ? 'closing' : ''}`}
      data-testid="emoji-picker"
      data-picker-mode={pickerMode}
      aria-hidden={isClosing}
    >
      <div className="picker-handle" onClick={onClose} data-testid="picker-handle" />
      
      <div className="picker-search-bar">
        <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/>
        </svg>
        <input 
          type="text" 
          placeholder={pickerMode === "emoji" ? "Rechercher un emoji..." : `Rechercher des ${pickerMode === "gif" ? "GIF" : "stickers"}...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-testid="picker-search-input"
        />
        <button className="search-sparkle-btn" data-testid="picker-search-sparkle">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.5L14 9.5L21 11.5L14 13.5L12 20.5L10 13.5L3 11.5L10 9.5L12 2.5Z"/>
            <path d="M19.5 3L20.5 5.5L23 6.5L20.5 7.5L19.5 10L18.5 7.5L16 6.5L18.5 5.5L19.5 3Z" opacity="0.8"/>
            <path d="M5.5 18L6.2 20L8.5 20.7L6.2 21.4L5.5 23.5L4.8 21.4L2.5 20.7L4.8 20L5.5 18Z" opacity="0.6"/>
          </svg>
        </button>
      </div>

      {pickerMode === "emoji" ? (
        <div className="picker-content">
          <div className="picker-categories">
            {[
              { id: "Tous", icon: "🤍" },
              { id: "Smileys", icon: "😀" },
              { id: "Amour", icon: "❤️" },
              { id: "Réactions", icon: "🎉" },
              { id: "Objets", icon: "🌎" },
              { id: "Premium", icon: "👑" },
            ].map(cat => (
              <button 
                key={cat.id}
                className={`category-chip ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
                data-testid={`category-${cat.id}`}
              >
                <span className="category-icon">{cat.icon}</span>
                <span className="category-label">{cat.id}</span>
              </button>
            ))}
          </div>

          <div className="picker-scroll-area">
            {activeCategory === "Tous" && !search.trim() && (
              <>
                <div className="section-header">
                  <h3>Récemment utilisés</h3>
                  <button className="see-more">Voir plus &gt;</button>
                </div>
                
                <div className="recent-emojis">
                  {recentEmojis.map((emoji, i) => (
                    <button key={`recent-${i}`} className="emoji-btn" onClick={() => onSelectEmoji(emoji)} data-testid={`recent-emoji-${i}`}>
                      {emoji}
                    </button>
                  ))}
                </div>

                <div className="section-header">
                  <h3>Émojis populaires</h3>
                </div>
              </>
            )}
            
            <div className="popular-emojis">
              {getFilteredEmojis().map((emoji, i) => (
                <button key={`pop-${i}`} className="emoji-btn" onClick={() => onSelectEmoji(emoji)} data-testid={`emoji-${i}`}>
                  {emoji}
                </button>
              ))}
            </div>

            {activeCategory === "Tous" && !search.trim() && (
              <>
                <div className="section-header">
                  <h3>Stickers BrutePawa</h3>
                  <button className="see-more">Voir plus &gt;</button>
                </div>
                
                <div className="brutepawa-stickers">
                  {stickers.map(sticker => (
                    <button
                      key={sticker.id}
                      className="bp-sticker-btn"
                      onClick={() => onSelectMedia({
                        id: `brutepawa-${sticker.id}`,
                        title: sticker.label,
                        previewUrl: sticker.image,
                        url: sticker.animated,
                      }, "sticker")}
                      data-testid={`sticker-${sticker.id}`}
                      aria-label={`Sticker BrutePawa ${sticker.label}`}
                    >
                      <div className="bp-sticker-mock">
                        <div className="bp-sticker-mascot">
                          <img src={sticker.image} alt="" loading="lazy" />
                        </div>
                        <div className="bp-sticker-mock-label">{sticker.label}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      ) : pickerMode === "avatar" || pickerMode === "symbol" || pickerMode === "flag" ? (
        <div className="picker-content">
          {renderModeGrid()}
        </div>
      ) : (
        <div className="picker-content media-content">
          {giphyLoading ? (
            <div className="media-loading">Chargement...</div>
          ) : giphyItems.length > 0 ? (
            <div className="media-grid" data-testid={`${pickerMode}-grid`}>
              {giphyItems.map(item => (
                <button 
                  key={item.id} 
                  className="media-item"
                  onClick={() => onSelectMedia(item, pickerMode as "gif" | "sticker")}
                  data-testid={`media-item-${item.id}`}
                >
                  <img src={item.previewUrl} alt={item.title} loading="lazy" />
                </button>
              ))}
            </div>
          ) : (
            <div className="media-empty">Aucun résultat trouvé</div>
          )}
          <div className="giphy-attribution">POWERED BY GIPHY</div>
        </div>
      )}

      <div className="picker-bottom-nav">
        {[
          { 
            id: "emoji", 
            icon: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>,
            label: "Émojis" 
          },
          { 
            id: "gif", 
            icon: <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 10h10"/><path d="M7 14h10"/></svg>, 
            label: "GIF" 
          },
          { 
            id: "sticker", 
            icon: <svg viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M9.5 12.5a3.5 3.5 0 1 1 5 0"/><path d="M12 16v.01"/></svg>,
            label: "Stickers" 
          },
          { 
            id: "avatar", 
            icon: <svg viewBox="0 0 24 24"><path d="M18 20a6 6 0 0 0-12 0"/><circle cx="12" cy="10" r="4"/><circle cx="12" cy="12" r="10"/></svg>, 
            label: "Avatars" 
          },
          { 
            id: "symbol", 
            icon: <svg viewBox="0 0 24 24"><path d="M3 3h18v18H3zM8 12h8M12 8v8"/></svg>, 
            label: "Symboles" 
          },
          { 
            id: "flag", 
            icon: <svg viewBox="0 0 24 24"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>, 
            label: "Drapeaux" 
          },
        ].map(tab => (
          <button 
            key={tab.id}
            className={`nav-tab ${pickerMode === tab.id ? 'active' : ''}`}
            onClick={() => setPickerMode(tab.id as PickerMode)}
            data-testid={`nav-tab-${tab.id}`}
          >
            <span className="nav-icon">{tab.icon}</span>
            <span className="nav-label">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
