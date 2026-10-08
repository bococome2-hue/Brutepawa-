import { useState, useEffect } from "react";
import { useNavigate } from "../router";
import { apiGetProduct, apiGetProducts, type ApiProduct } from "../lib/api";
import { getFavorites, toggleFavorite } from "../lib/store";

interface Props { id: number; }

const CATEGORY_EMOJI: Record<string, string> = {
  "Mode": "👗", "Électronique": "📱", "Bijoux": "💍", "Artisanat": "🎨",
  "Alimentation": "🍽️", "Auto/Moto": "🚗", "Beauté": "💄", "Maison": "🏠",
  "Tech": "💻",
};

export default function ProductDetail({ id }: Props) {
  const navigate = useNavigate();
  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [related, setRelated] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [favs, setFavs] = useState(getFavorites());
  const [showContact, setShowContact] = useState(false);
  const [msgSent, setMsgSent] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([apiGetProduct(id), apiGetProducts()]).then(([p, all]) => {
      setProduct(p);
      if (p) {
        setMessage(`Bonjour, je suis intéressé(e) par "${p.title}". Est-il encore disponible ?`);
        setRelated(all.filter(x => x.category === p.category && x.id !== p.id).slice(0, 3));
      }
    }).finally(() => setLoading(false));
  }, [id]);

  const isFav = product ? favs.includes(product.id) : false;
  const handleToggleFav = () => { if (product) setFavs(toggleFavorite(product.id)); };
  const handleSendMsg = () => {
    setMsgSent(true);
    setTimeout(() => { setMsgSent(false); setShowContact(false); }, 2500);
  };

  if (loading) return (
    <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center", padding: 60 }}>
      <div style={{ fontSize: 40 }}>⏳</div>
      <div style={{ marginTop: 12, color: "var(--fb-text-secondary)" }}>Chargement…</div>
    </div>
  );

  if (!product) return (
    <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center", padding: 60 }}>
      <div style={{ fontSize: 40 }}>❌</div>
      <div style={{ marginTop: 12, fontWeight: 700 }}>Produit introuvable</div>
      <button onClick={() => navigate("/marketplace")} style={{ marginTop: 16, background: "var(--bp-primary)", color: "#fff", border: "none", borderRadius: 20, padding: "10px 24px", cursor: "pointer", fontWeight: 700 }}>← Retour</button>
    </div>
  );

  const emoji = CATEGORY_EMOJI[product.category] ?? "🛍️";

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      {/* Back + actions header */}
      <div style={{ background: "var(--fb-white)", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 60, zIndex: 10, borderBottom: "1px solid var(--fb-divider)" }}>
        <button onClick={() => navigate("/marketplace")} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer" }}>←</button>
        <div style={{ fontWeight: 800, fontSize: 16 }}>Détail produit</div>
        <button onClick={handleToggleFav} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer" }}>
          {isFav ? "❤️" : "🤍"}
        </button>
      </div>

      {/* Product image */}
      <div style={{ background: "var(--fb-bg)", height: 240, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 100, position: "relative", overflow: "hidden" }}>
        {product.imageUrl
          ? <img src={product.imageUrl} alt={product.title} style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} />
          : emoji}
      </div>

      {/* Product info */}
      <div style={{ background: "var(--fb-white)", padding: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, flex: 1 }}>{product.title}</h1>
          <span style={{ background: "#DCFCE7", color: "var(--bp-primary)", fontWeight: 700, fontSize: 12, padding: "3px 10px", borderRadius: 12, flexShrink: 0 }}>
            {product.category}
          </span>
        </div>
        <div style={{ fontSize: 28, fontWeight: 900, color: "var(--bp-primary)", marginBottom: 8 }}>
          {product.price.toLocaleString()} {product.currency}
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 13, color: "var(--fb-text-secondary)", marginBottom: 12 }}>
          {product.location && <span>📍 {product.location}</span>}
        </div>

        {/* Description */}
        <div style={{ background: "var(--fb-bg)", borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>📝 Description</div>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: "var(--fb-text)" }}>
            {product.description || `${product.title}. Catégorie : ${product.category}. Livraison possible dans toute la région. N'hésitez pas à me contacter pour plus d'informations.`}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setShowContact(true)} style={{
            flex: 2, background: "var(--bp-primary)", color: "#fff", border: "none",
            borderRadius: 12, padding: "14px", fontWeight: 800, fontSize: 15, cursor: "pointer"
          }}>💬 Contacter le vendeur</button>
          <button onClick={handleToggleFav} style={{
            flex: 1, background: isFav ? "#FEE2E2" : "var(--fb-bg)", color: isFav ? "#EF4444" : "var(--fb-text)",
            border: "none", borderRadius: 12, padding: "14px", fontWeight: 700, fontSize: 15, cursor: "pointer"
          }}>{isFav ? "❤️ Favori" : "🤍 Sauver"}</button>
        </div>
      </div>

      {/* Seller card */}
      <div style={{ background: "var(--fb-white)", marginTop: 4, padding: "16px" }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>👤 Vendeur</div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--bp-primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18 }}>
            👤
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 15, display: "flex", alignItems: "center", gap: 6 }}>
              Vendeur
              <span style={{ color: "var(--bp-primary)", fontSize: 14 }}>✔️</span>
            </div>
            <div style={{ fontSize: 13, color: "var(--fb-text-secondary)" }}>{product.category}</div>
            {product.location && <div style={{ fontSize: 12, color: "var(--fb-text-secondary)" }}>📍 {product.location}</div>}
          </div>
          <button onClick={() => navigate("/messages")} style={{ background: "var(--fb-bg)", border: "none", borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            Voir profil
          </button>
        </div>
      </div>

      {/* Related products */}
      {related.length > 0 && (
        <div style={{ background: "var(--fb-white)", marginTop: 4, padding: "16px" }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>🛍️ Produits similaires</div>
          {related.map(p => (
            <div key={p.id} onClick={() => navigate(`/marketplace/${p.id}`)} style={{
              display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--fb-divider)", cursor: "pointer", alignItems: "center"
            }}>
              <div style={{ width: 48, height: 48, background: "var(--fb-bg)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, overflow: "hidden", position: "relative" }}>
                {p.imageUrl ? <img src={p.imageUrl} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} /> : (CATEGORY_EMOJI[p.category] ?? "🛍️")}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{p.title}</div>
                <div style={{ fontSize: 13, color: "var(--fb-text-secondary)" }}>📍 {p.location}</div>
              </div>
              <div style={{ fontWeight: 800, color: "var(--bp-primary)", fontSize: 14 }}>{p.price.toLocaleString()} FCFA</div>
            </div>
          ))}
        </div>
      )}

      {/* Contact modal */}
      {showContact && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "flex-end" }}>
          <div style={{ background: "var(--fb-white)", borderRadius: "20px 20px 0 0", padding: 20, width: "100%", maxWidth: 600, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 17 }}>💬 Contacter le vendeur</h3>
              <button onClick={() => setShowContact(false)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer" }}>✕</button>
            </div>
            {msgSent ? (
              <div style={{ textAlign: "center", padding: "20px 0", color: "var(--bp-primary)", fontWeight: 800, fontSize: 15 }}>
                ✅ Message envoyé ! Le vendeur vous répondra bientôt.
              </div>
            ) : (
              <>
                <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} style={{
                  width: "100%", background: "var(--fb-bg)", border: "none", borderRadius: 12,
                  padding: "12px 14px", fontSize: 14, resize: "none", marginBottom: 12, boxSizing: "border-box"
                }} />
                <button onClick={handleSendMsg} style={{
                  width: "100%", background: "var(--bp-primary)", color: "#fff", border: "none",
                  borderRadius: 12, padding: "14px", fontWeight: 800, fontSize: 15, cursor: "pointer"
                }}>Envoyer le message</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
