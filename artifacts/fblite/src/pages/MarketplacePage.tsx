import { useState, useRef, useEffect } from "react";
import { useNavigate } from "../router";
import { COUNTRIES } from "../data/mock";
import { useCurrentUser } from "../hooks/useCurrentUser";
import ServiceFilterSheet, { type ServiceFilters } from "../components/ServiceFilterSheet";
import {
  apiGetProducts, apiGetJobs, apiGetMarketplaceServices, apiToggleMarketplaceFavorite, apiGetMarketplaceFavorites,
  apiCreateMarketplaceService, apiGetServiceProviders,
  type ApiProduct, type ApiJob, type ApiMarketplaceService, type ApiServiceProvider,
} from "../lib/api";
import { useR2Upload } from "../hooks/useR2Upload";

/* ─── Design tokens ────────────────────────────────────────── */
const G  = "var(--bp-primary)";
const GD = "var(--bp-primary-dark)";
const BG = "#F8FAFC";

/* ─── Helpers ──────────────────────────────────────────────── */
function fmtNum(n: number) { return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n); }
function fmtPrice(n: number) { return n.toLocaleString("fr-FR") + " FCFA"; }
function timeAgo(iso: string) {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return "À l'instant";
  if (m < 60) return `Il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Il y a ${h} h`;
  return `Il y a ${Math.floor(h / 24)} j`;
}

/* ─── SVG Icons ────────────────────────────────────────────── */
const IcoSearch = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>;
const IcoFilter = () => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>;
const IcoHeart = ({ on }: { on: boolean }) => <svg viewBox="0 0 24 24" width="15" height="15" fill={on?"#F43F5E":"none"} stroke={on?"#F43F5E":"#9CA3AF"} strokeWidth="2" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
const IcoPin = () => <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const IcoEye = () => <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const IcoStar = () => <svg viewBox="0 0 24 24" width="12" height="12" fill="#FBBF24" stroke="#FBBF24" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const IcoCheck = () => <svg viewBox="0 0 20 20" width="13" height="13" fill={G}><path d="M10 0C4.477 0 0 4.477 0 10s4.477 10 10 10 10-4.477 10-10S15.523 0 10 0zm-1 14.414L4.293 9.707l1.414-1.414L9 12.586l5.293-5.293 1.414 1.414L9 14.414z"/></svg>;
const IcoBookmark = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>;
const IcoBag = () => <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>;
const IcoTag = () => <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>;
const IcoWrench = () => <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>;
const IcoBriefcase = () => <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>;
const IcoPlus = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IcoCamera = () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>;
const IcoPhone = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6.07 6.07l.98-.98a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;

/* ─── Mock fallback data ────────────────────────────────────── */
const CATEGORIES = ["Tous", "Mode", "Électronique", "Beauté", "Maison", "Auto"];

const MOCK_PRODUCTS = [
  { id: 101, title: "Basket Nike Air Force 1", price: 35000, imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80", location: "Abidjan, Cocody",  views: 1200, discountPct: 15,   category: "Mode",         isVerified: true, city: "Abidjan" },
  { id: 102, title: "Sac à main Luxe",         price: 25000, imageUrl: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80", location: "Dakar, Almadies",  views: 890,  discountPct: null, category: "Mode",         isVerified: true, city: "Dakar"   },
  { id: 103, title: "iPhone 14 Pro Max",        price: 750000, imageUrl: "https://images.unsplash.com/photo-1663499482523-1c0c1bae4ce1?w=600&q=80", location: "Paris, France",    views: 2300, discountPct: null, category: "Électronique", isVerified: true, city: "Paris"   },
  { id: 104, title: "Canapé 3 places",          price: 120000, imageUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80", location: "Abidjan, Marcory", views: 564,  discountPct: null, category: "Maison",       isVerified: true, city: "Abidjan" },
];

const MOCK_SERVICES: ApiMarketplaceService[] = [
  { id: 1, userId: 1, name: "Martin D.",  profession: "Plombier",        rating: 4.8, reviewsCount: 124, avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80", coverColor: "var(--bp-primary)", isVerified: true, status: "active", city: "Abidjan", country: "CI", description: null, price: null, currency: "XOF", createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 2, userId: 1, name: "Aminata C.", profession: "Femme de ménage", rating: 4.9, reviewsCount: 98,  avatarUrl: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&q=80", coverColor: "#F97316", isVerified: true, status: "active", city: "Dakar",   country: "SN", description: null, price: null, currency: "XOF", createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: 3, userId: 1, name: "Yacine B.",  profession: "Électricien",     rating: 4.7, reviewsCount: 76,  avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80", coverColor: "#6366F1", isVerified: true, status: "active", city: "Abidjan", country: "CI", description: null, price: null, currency: "XOF", createdAt: new Date(Date.now() - 10800000).toISOString() },
  { id: 4, userId: 1, name: "Sophie K.",  profession: "Coiffeuse",       rating: 4.7, reviewsCount: 112, avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80", coverColor: "#EC4899", isVerified: true, status: "active", city: "Lomé",    country: "TG", description: null, price: null, currency: "XOF", createdAt: new Date(Date.now() - 14400000).toISOString() },
];

const MOCK_JOBS = [
  { id: 1, title: "Développeur Mobile",   company: "Brutepawa SAS", verified: true, city: "Abidjan, Côte d'Ivoire", salary: "500 000 – 800 000 FCFA", logoColor: G,        logoText: "BP", createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: 2, title: "Community Manager",    company: "Jumia CI",       verified: true, city: "Abidjan, Côte d'Ivoire", salary: "350 000 – 500 000 FCFA", logoColor: "#F97316", logoText: "JU", createdAt: new Date(Date.now() - 18000000).toISOString() },
  { id: 3, title: "Agent Support Client", company: "Wave Mobile",    verified: true, city: "Dakar, Sénégal",          salary: "250 000 – 350 000 FCFA", logoColor: "#0EA5E9", logoText: "WA", createdAt: new Date(Date.now() - 28800000).toISOString() },
];

type MarketTab = "marketplace" | "produits" | "services" | "emplois";
type ListingType = "produit" | "service" | "emploi";

const TABS: { id: MarketTab; label: string; icon: React.ReactNode }[] = [
  { id: "marketplace", label: "Marketplace", icon: <IcoBag /> },
  { id: "produits",    label: "Produits",    icon: <IcoTag /> },
  { id: "services",    label: "Services",    icon: <IcoWrench /> },
  { id: "emplois",     label: "Emplois",     icon: <IcoBriefcase /> },
];

/* ═══════════════════════════════════════════════════════════ */
export default function MarketplacePage() {
  const navigate = useNavigate();
  const fbUser   = useCurrentUser();

  const [activeTab,     setActiveTab]     = useState<MarketTab>("marketplace");
  const [search,        setSearch]        = useState("");
  const [activeCategory, setActiveCategory] = useState("Tous");
  const [favorites,     setFavorites]     = useState<Set<string>>(new Set());
  const [apiProducts,   setApiProducts]   = useState<ApiProduct[]>([]);
  const [apiServices,   setApiServices]   = useState<ApiMarketplaceService[]>([]);
  const [apiJobs,       setApiJobs]       = useState<ApiJob[]>([]);
  const [providers,     setProviders]     = useState<ApiServiceProvider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [loading,       setLoading]       = useState(true);
  const [showCreate,    setShowCreate]    = useState(false);
  const [createType,    setCreateType]    = useState<ListingType>("service");
  const [dotIdx,        setDotIdx]        = useState(0);
  const [showFilter,    setShowFilter]    = useState(false);
  const [serviceFilters, setServiceFilters] = useState<ServiceFilters | null>(null);

  /* Forms */
  const [prodForm,    setProdForm]    = useState({ title: "", price: "", category: "Mode", description: "", country: fbUser.countryCode ?? "CI", condition: "Neuf" });
  const [svcForm,     setSvcForm]     = useState({ name: "", profession: "", description: "", price: "" });
  const [jobForm,     setJobForm]     = useState({ title: "", company: "", salaryMin: "", salaryMax: "", city: "", description: "" });
  const [uploadedImgs, setUploadedImgs] = useState<string[]>([]);
  const [uploading,   setUploading]   = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const mediaRef = useRef<HTMLInputElement>(null);
  const { upload, progress } = useR2Upload();

  /* Load data */
  useEffect(() => {
    setLoading(true);
    setLoadingProviders(true);
    Promise.all([apiGetProducts(), apiGetMarketplaceServices(), apiGetJobs(), apiGetMarketplaceFavorites(), apiGetServiceProviders()])
      .then(([p, s, j, favs, prov]) => {
        setApiProducts(p);
        setApiServices(s);
        setApiJobs(j);
        setProviders(prov);
        const favSet = new Set(favs.map(f => `${f.itemType}:${f.itemId}`));
        setFavorites(favSet);
      })
      .catch(() => {})
      .finally(() => { setLoading(false); setLoadingProviders(false); });
  }, []);

  /* Poll for new listings every 30s */
  useEffect(() => {
    const id = setInterval(() => {
      Promise.all([apiGetProducts(), apiGetMarketplaceServices(), apiGetJobs(), apiGetServiceProviders()]).then(([p, s, j, prov]) => {
        if (p.length > 0) setApiProducts(p);
        if (s.length > 0) setApiServices(s);
        if (j.length > 0) setApiJobs(j);
        if (prov.length > 0) setProviders(prov);
      }).catch(() => {});
    }, 30000);
    return () => clearInterval(id);
  }, []);

  /* Rotate dots */
  useEffect(() => {
    const id = setInterval(() => setDotIdx(i => (i + 1) % 3), 3000);
    return () => clearInterval(id);
  }, []);

  /* Merge api + mock products */
  const allProducts = apiProducts.length > 0
    ? apiProducts.map(p => ({
        id: p.id, title: p.title, price: p.price,
        imageUrl: p.imageUrl, location: p.location ?? "",
        views: p.viewsCount ?? 0, discountPct: p.discountPct ?? null,
        category: p.category, isVerified: p.isVerified ?? false, city: p.city ?? "",
      }))
    : MOCK_PRODUCTS;

  const filteredProducts = allProducts.filter(p => {
    const matchCat = activeCategory === "Tous" || p.category === activeCategory;
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.location.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const displayServices = apiServices.length > 0 ? apiServices : MOCK_SERVICES;

  const displayJobs = apiJobs.length > 0
    ? apiJobs.map((j, i) => ({
        id: j.id, title: j.title, company: j.company, verified: true,
        city: j.location ?? "", salary: j.salary != null ? fmtPrice(j.salary) : "",
        logoColor: [G, "#F97316", "#0EA5E9"][i % 3], logoText: j.company.slice(0, 2).toUpperCase(),
        createdAt: j.createdAt,
      }))
    : MOCK_JOBS;

  const filteredServices = displayServices.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.profession.toLowerCase().includes(search.toLowerCase())
  );

  const filteredJobs = displayJobs.filter(j =>
    !search || j.title.toLowerCase().includes(search.toLowerCase()) || j.company.toLowerCase().includes(search.toLowerCase())
  );

  /* Favorite toggle */
  const toggleFav = (type: string, id: number) => {
    const key = `${type}:${id}`;
    setFavorites(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
    apiToggleMarketplaceFavorite(type, id).catch(() => {});
  };

  /* Upload */
  const handleMedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      const r = await upload(file);
      if (r) setUploadedImgs(prev => [...prev, r.url]);
    }
    setUploading(false);
    e.target.value = "";
  };

  /* Publish */
  const handlePublish = async () => {
    setSubmitting(true);
    try {
      if (createType === "produit") {
        if (!prodForm.title || !prodForm.price) return;
        const { apiCreateProduct } = await import("../lib/api");
        const p = await apiCreateProduct({
          title: prodForm.title, price: parseInt(prodForm.price),
          category: prodForm.category, imageUrl: uploadedImgs[0],
          location: "", description: prodForm.description || undefined,
        });
        setApiProducts(prev => [{ ...p, viewsCount: 0, condition: prodForm.condition, isVerified: false, discountPct: null, city: null, countryCode: prodForm.country }, ...prev]);
      } else if (createType === "service") {
        if (!svcForm.name || !svcForm.profession) return;
        const s = await apiCreateMarketplaceService({
          name: svcForm.name, profession: svcForm.profession,
          description: svcForm.description || undefined,
          price: svcForm.price ? parseInt(svcForm.price) : undefined,
        });
        setApiServices(prev => [s, ...prev]);
      }
      setShowCreate(false);
      setProdForm({ title: "", price: "", category: "Mode", description: "", country: fbUser.countryCode ?? "CI", condition: "Neuf" });
      setSvcForm({ name: "", profession: "", description: "", price: "" });
      setJobForm({ title: "", company: "", salaryMin: "", salaryMax: "", city: "", description: "" });
      setUploadedImgs([]);
      setActiveTab(createType === "produit" ? "produits" : createType === "service" ? "services" : "emplois");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ background: BG, minHeight: "100vh", paddingBottom: 90,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      overflowX: "hidden", boxSizing: "border-box", width: "100%", maxWidth: "100vw" }}>
      <input ref={mediaRef} type="file" accept="image/*,video/*" multiple style={{ display: "none" }} onChange={handleMedia} />

      {/* ── Tab bar ─────────────────────────────────────────── */}
      <div style={{
        background: "var(--theme-surface)", borderBottom: "1px solid #E5E7EB",
        display: "flex", padding: "0 4px", position: "sticky", top: 0, zIndex: 20,
        overflowX: "auto", scrollbarWidth: "none", WebkitOverflowScrolling: "touch" as any,
        width: "100%", boxSizing: "border-box",
      }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex: "0 0 auto", display: "flex", alignItems: "center", gap: 5, padding: "12px 14px",
            background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap",
            borderBottom: activeTab === tab.id ? `2.5px solid ${G}` : "2.5px solid transparent",
            color: activeTab === tab.id ? G : "#64748B",
            fontWeight: activeTab === tab.id ? 700 : 500, fontSize: 13,
            fontFamily: "inherit", transition: "color .15s",
          }}>
            <span style={{ opacity: activeTab === tab.id ? 1 : 0.7 }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "16px 14px 0", boxSizing: "border-box", width: "100%", overflowX: "hidden" }}>

        {/* ── Search + Filtres ─────────────────────────────── */}
        <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center" }}>
          <div style={{
            flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8,
            background: "var(--theme-surface)", border: "1px solid #E5E7EB", borderRadius: 24, height: 44, padding: "0 14px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}>
            <IcoSearch />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un produit, service..."
              style={{ flex: 1, border: "none", outline: "none", background: "none", fontSize: 14, color: "var(--theme-text)", fontFamily: "inherit" }}
            />
          </div>
          <button
            onClick={() => setShowFilter(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: showFilter || serviceFilters ? G : "#fff",
              border: `1px solid ${showFilter || serviceFilters ? G : "#E5E7EB"}`,
              borderRadius: 24, padding: "0 16px", height: 44,
              color: showFilter || serviceFilters ? "#fff" : "#64748B",
              fontWeight: 600, fontSize: 13, cursor: "pointer",
              whiteSpace: "nowrap", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", fontFamily: "inherit",
              transition: "all 200ms ease-out",
            }}
          >
            <IcoFilter />
            Filtres
          </button>
        </div>

        {/* ── Category pills ───────────────────────────────── */}
        {(activeTab === "marketplace" || activeTab === "produits") && (
          <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none", marginBottom: 20, paddingBottom: 2, alignItems: "center" }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                flex: "0 0 auto", padding: "7px 18px", borderRadius: 999,
                border: "1.5px solid",
                borderColor: activeCategory === cat ? G : "#E5E7EB",
                background: activeCategory === cat ? G : "#fff",
                color: activeCategory === cat ? "#fff" : "#64748B",
                fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                transition: "all .15s",
              }}>
                {cat}
              </button>
            ))}
            <span style={{ color: "#9CA3AF", fontSize: 16, flexShrink: 0, paddingRight: 4 }}>›</span>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════ */}
        {/* MARKETPLACE TAB                                    */}
        {/* ═══════════════════════════════════════════════════ */}
        {activeTab === "marketplace" && (
          <>
            {/* Produits populaires */}
            <SectionHeader icon="products" title="Produits populaires" onSeeAll={() => setActiveTab("produits")} />
            {loading ? <ProdSkeleton /> : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                  {filteredProducts.slice(0, 4).map(p => (
                    <ProductCard
                      key={p.id} product={p}
                      isFav={favorites.has(`product:${p.id}`)}
                      onFav={() => toggleFav("product", p.id)}
                      onClick={() => navigate(`/marketplace/${p.id}`)}
                    />
                  ))}
                </div>
                {/* Pagination dots */}
                <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 28 }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{
                      width: i === dotIdx ? 18 : 7, height: 7, borderRadius: 4,
                      background: i === dotIdx ? G : "#E5E7EB",
                      transition: "all .4s ease",
                    }} />
                  ))}
                </div>
              </>
            )}

            {/* Services recommandés — données réelles */}
            <SectionHeader icon="services" title="Services recommandés" onSeeAll={() => setActiveTab("services")} />
            {loadingProviders ? (
              <div style={{ display: "flex", gap: 12, overflowX: "auto", scrollbarWidth: "none", marginBottom: 28, paddingBottom: 4 }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ flex: "0 0 140px", background: "var(--theme-surface)", borderRadius: 16, padding: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
                    <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#F1F5F9", margin: "0 auto 10px" }} />
                    <div style={{ height: 12, background: "#F1F5F9", borderRadius: 6, marginBottom: 6 }} />
                    <div style={{ height: 10, background: "#F1F5F9", borderRadius: 6, width: "70%", margin: "0 auto 10px" }} />
                    <div style={{ height: 32, background: "#F1F5F9", borderRadius: 8 }} />
                  </div>
                ))}
              </div>
            ) : providers.length === 0 ? (
              <div style={{ textAlign: "center", padding: "28px 0 36px", color: "#94A3B8" }}>
                <svg viewBox="0 0 64 64" width="52" height="52" fill="none" style={{ margin: "0 auto 12px", display: "block" }}>
                  <circle cx="32" cy="32" r="30" fill="#F1F5F9"/>
                  <path d="M20 42c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round"/>
                  <circle cx="32" cy="24" r="7" stroke="#CBD5E1" strokeWidth="2.5"/>
                </svg>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#64748B" }}>Aucun prestataire disponible</p>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94A3B8" }}>Proposez votre service en premier !</p>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 12, overflowX: "auto", scrollbarWidth: "none", marginBottom: 28, paddingBottom: 4, WebkitOverflowScrolling: "touch" as any }}>
                {providers.map(p => (
                  <ProviderCard key={p.userId} provider={p} onContact={() => navigate(`/messages?userId=${p.userId}`)} />
                ))}
              </div>
            )}

            {/* Emplois récents */}
            <SectionHeader icon="jobs" title="Emplois récents" onSeeAll={() => setActiveTab("emplois")} />
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
              {displayJobs.slice(0, 3).map(j => (
                <JobCard key={j.id} job={j} />
              ))}
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════ */}
        {/* PRODUITS TAB                                        */}
        {/* ═══════════════════════════════════════════════════ */}
        {activeTab === "produits" && (
          <>
            <button onClick={() => navigate("/marketplace/create")} style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              background: G, color: "#fff", border: "none", borderRadius: 14,
              padding: "13px 0", fontWeight: 700, fontSize: 15, cursor: "pointer",
              marginBottom: 16, boxShadow: `0 4px 14px ${G}50`, fontFamily: "inherit",
            }}>
              <IcoPlus />
              Déposer une annonce
            </button>

            <div style={{ fontWeight: 700, fontSize: 14, color: "#64748B", marginBottom: 12 }}>
              {filteredProducts.length} article{filteredProducts.length !== 1 ? "s" : ""} disponible{filteredProducts.length !== 1 ? "s" : ""}
            </div>

            {loading ? <ProdSkeleton /> : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {filteredProducts.map(p => (
                  <ProductCard key={p.id} product={p} isFav={favorites.has(`product:${p.id}`)} onFav={() => toggleFav("product", p.id)} onClick={() => navigate(`/marketplace/${p.id}`)} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════════════ */}
        {/* SERVICES TAB                                        */}
        {/* ═══════════════════════════════════════════════════ */}
        {activeTab === "services" && (
          <>
            <button onClick={() => { setCreateType("service"); setShowCreate(true); }} style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              background: G, color: "#fff", border: "none", borderRadius: 14,
              padding: "13px 0", fontWeight: 700, fontSize: 15, cursor: "pointer",
              marginBottom: 20, boxShadow: `0 4px 14px ${G}50`, fontFamily: "inherit",
            }}>
              <IcoPlus />
              Proposer un service
            </button>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {filteredServices.map(s => (
                <ServiceCardGrid key={s.id} service={s} />
              ))}
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════ */}
        {/* EMPLOIS TAB                                         */}
        {/* ═══════════════════════════════════════════════════ */}
        {activeTab === "emplois" && (
          <>
            <button onClick={() => { setCreateType("emploi"); setShowCreate(true); }} style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              background: G, color: "#fff", border: "none", borderRadius: 14,
              padding: "13px 0", fontWeight: 700, fontSize: 15, cursor: "pointer",
              marginBottom: 20, boxShadow: `0 4px 14px ${G}50`, fontFamily: "inherit",
            }}>
              <IcoPlus />
              Publier un emploi
            </button>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredJobs.map(j => (
                <JobCard key={j.id} job={j} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── FAB ─────────────────────────────────────────────── */}
      <button
        onClick={() => navigate("/marketplace/create")}
        style={{
          position: "fixed", bottom: 88, right: 20, zIndex: 30,
          width: 56, height: 56, borderRadius: "50%",
          background: G, border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 4px 16px ${G}60`,
        }}
      >
        <IcoPlus />
      </button>

      {/* ── Create modal ───────────────────────────────────── */}
      {showCreate && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 400, display: "flex", alignItems: "flex-end" }}
          onClick={() => setShowCreate(false)}
        >
          <div
            style={{ background: "var(--theme-surface)", borderRadius: "24px 24px 0 0", width: "100%", maxHeight: "92vh", overflowY: "auto", padding: "0 16px 40px" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div style={{ width: 36, height: 4, background: "#E5E7EB", borderRadius: 2, margin: "14px auto 0" }} />

            {/* Type selector */}
            <div style={{ display: "flex", gap: 8, margin: "16px 0 20px" }}>
              {(["service","emploi"] as ListingType[]).map(t => (
                <button key={t} onClick={() => setCreateType(t)} style={{
                  flex: 1, padding: "8px 0", border: "1.5px solid", borderRadius: 12,
                  borderColor: createType === t ? G : "#E5E7EB",
                  background: createType === t ? `${G}12` : "#fff",
                  color: createType === t ? G : "#64748B",
                  fontWeight: createType === t ? 700 : 500, fontSize: 13, cursor: "pointer",
                  fontFamily: "inherit", textTransform: "capitalize",
                }}>
                  {t === "service" ? "Service" : "Emploi"}
                </button>
              ))}
            </div>

            <div style={{ fontWeight: 800, fontSize: 18, color: "var(--theme-text)", marginBottom: 18 }}>
              {createType === "service" ? "Proposer un service" : "Publier un emploi"}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {createType === "service" && (
                <>
                  <FInput placeholder="Votre nom *" value={svcForm.name} onChange={v => setSvcForm(f => ({ ...f, name: v }))} />
                  <FInput placeholder="Profession *" value={svcForm.profession} onChange={v => setSvcForm(f => ({ ...f, profession: v }))} />
                  <FInput placeholder="Tarif (FCFA)" type="number" value={svcForm.price} onChange={v => setSvcForm(f => ({ ...f, price: v }))} />
                  <textarea placeholder="Description de votre service..." value={svcForm.description} onChange={e => setSvcForm(f => ({ ...f, description: e.target.value }))}
                    style={taStyle} />
                </>
              )}

              {createType === "emploi" && (
                <>
                  <FInput placeholder="Titre du poste *" value={jobForm.title} onChange={v => setJobForm(f => ({ ...f, title: v }))} />
                  <FInput placeholder="Nom de l'entreprise *" value={jobForm.company} onChange={v => setJobForm(f => ({ ...f, company: v }))} />
                  <div style={{ display: "flex", gap: 10 }}>
                    <FInput placeholder="Salaire min" type="number" value={jobForm.salaryMin} onChange={v => setJobForm(f => ({ ...f, salaryMin: v }))} />
                    <FInput placeholder="Salaire max" type="number" value={jobForm.salaryMax} onChange={v => setJobForm(f => ({ ...f, salaryMax: v }))} />
                  </div>
                  <FInput placeholder="Ville" value={jobForm.city} onChange={v => setJobForm(f => ({ ...f, city: v }))} />
                  <textarea placeholder="Description du poste..." value={jobForm.description} onChange={e => setJobForm(f => ({ ...f, description: e.target.value }))}
                    style={taStyle} />
                </>
              )}

              <button
                onClick={handlePublish}
                disabled={submitting}
                style={{
                  background: submitting ? "#E5E7EB" : G, color: "#fff", border: "none",
                  borderRadius: 14, padding: "14px 0", fontWeight: 700, fontSize: 15,
                  cursor: submitting ? "not-allowed" : "pointer", fontFamily: "inherit",
                  boxShadow: submitting ? "none" : `0 4px 14px ${G}50`,
                }}
              >
                {submitting ? "Publication..." : "Publier"}
              </button>
              <button onClick={() => setShowCreate(false)} style={{
                background: "#F1F5F9", color: "#64748B", border: "none", borderRadius: 14,
                padding: "13px 0", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
              }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Service Filter Sheet ─────────────────────────────── */}
      <ServiceFilterSheet
        open={showFilter}
        onClose={() => setShowFilter(false)}
        onApply={(f) => { setServiceFilters(f); setActiveTab("services"); }}
        resultCount={128}
      />

      <style>{`
        input::placeholder { color: #9CA3AF; }
        textarea::placeholder { color: #9CA3AF; }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

/* ─── Section header ───────────────────────────────────────── */
function SectionIcon({ type }: { type: "products" | "services" | "jobs" }) {
  const icons: Record<string, React.ReactNode> = {
    products: (
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
        <line x1="7" y1="7" x2="7.01" y2="7"/>
      </svg>
    ),
    services: (
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    jobs: (
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
        <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
      </svg>
    ),
  };
  return (
    <div style={{ width: 26, height: 26, borderRadius: "50%", background: G, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {icons[type]}
    </div>
  );
}

function SectionHeader({ icon, title, onSeeAll }: { icon: "products"|"services"|"jobs"; title: string; onSeeAll: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <SectionIcon type={icon} />
        <span style={{ fontWeight: 800, fontSize: 15.5, color: "var(--theme-text)" }}>{title}</span>
      </div>
      <button onClick={onSeeAll} style={{ background: "none", border: "none", color: G, fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 2, fontFamily: "inherit", whiteSpace: "nowrap" }}>
        Voir tout <span style={{ fontSize: 15 }}>›</span>
      </button>
    </div>
  );
}

/* ─── Product card ─────────────────────────────────────────── */
function ProductCard({ product, isFav, onFav, onClick }: {
  product: { id: number; title: string; price: number; imageUrl: string | null; location: string; views: number; discountPct: number | null; isVerified: boolean };
  isFav: boolean; onFav: () => void; onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{ background: "var(--theme-surface)", borderRadius: 16, overflow: "hidden", cursor: "pointer", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", position: "relative" }}
    >
      {/* Discount badge */}
      {product.discountPct && (
        <div style={{ position: "absolute", top: 9, left: 9, background: "#EF4444", color: "#fff", fontWeight: 700, fontSize: 11, padding: "3px 8px", borderRadius: 20, zIndex: 2, letterSpacing: -0.3 }}>
          -{product.discountPct}%
        </div>
      )}
      {/* Heart */}
      <button
        onClick={e => { e.stopPropagation(); onFav(); }}
        style={{ position: "absolute", top: 9, right: 9, background: "var(--theme-surface)", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 6px rgba(0,0,0,0.15)" }}
      >
        <IcoHeart on={isFav} />
      </button>
      {/* Image */}
      <div style={{ height: 136, background: "#F1F5F9", overflow: "hidden" }}>
        {product.imageUrl
          ? <img src={product.imageUrl} alt={product.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🛍️</div>
        }
      </div>
      {/* Info */}
      <div style={{ padding: "10px 11px 12px" }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--theme-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 4 }}>{product.title}</div>
        <div style={{ fontWeight: 800, color: G, fontSize: 14, marginBottom: 5 }}>{fmtPrice(product.price)}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
          <IcoPin />
          <span style={{ fontSize: 11, color: "#9CA3AF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{product.location}</span>
        </div>
        {product.views > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 5 }}>
            <IcoEye />
            <span style={{ fontSize: 11, color: "#9CA3AF" }}>{fmtNum(product.views)} vues</span>
          </div>
        )}
        {product.isVerified && (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <IcoCheck />
            <span style={{ fontSize: 11, color: G, fontWeight: 600 }}>Vendeur vérifié</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Service card (horizontal scroll) ─────────────────────── */
function ServiceCard({ service }: { service: ApiMarketplaceService }) {
  return (
    <div style={{
      background: "var(--theme-surface)", borderRadius: 16, padding: "14px 12px", flexShrink: 0,
      width: 106, display: "flex", flexDirection: "column", alignItems: "center", gap: 7,
      boxShadow: "0 2px 10px rgba(0,0,0,0.07)",
    }}>
      {/* Avatar */}
      <div style={{ position: "relative" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", overflow: "hidden", background: service.coverColor }}>
          {service.avatarUrl
            ? <img src={service.avatarUrl} alt={service.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 20 }}>{service.name[0]}</div>
          }
        </div>
        {service.isVerified && (
          <div style={{
            position: "absolute", bottom: 0, right: 0,
            width: 16, height: 16, borderRadius: "50%",
            background: G, border: "2px solid #fff",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg viewBox="0 0 10 10" width="8" height="8" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round">
              <path d="M2 5l2 2 4-4"/>
            </svg>
          </div>
        )}
      </div>
      {/* Text */}
      <div style={{ textAlign: "center", width: "100%" }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: "var(--theme-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{service.name}</div>
        <div style={{ fontSize: 10.5, color: "#64748B", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{service.profession}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3, marginTop: 5 }}>
          <IcoStar />
          <span style={{ fontWeight: 700, fontSize: 11, color: "var(--theme-text)" }}>{service.rating.toFixed(1)}</span>
          <span style={{ fontSize: 10, color: "#9CA3AF" }}>({service.reviewsCount})</span>
        </div>
      </div>
      {/* Button */}
      <button style={{
        background: G, color: "#fff", border: "none", borderRadius: 10,
        padding: "7px 0", fontWeight: 700, fontSize: 11, cursor: "pointer",
        width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
        boxShadow: `0 3px 10px ${G}40`, fontFamily: "inherit",
      }}>
        <IcoPhone />
        Contacter
      </button>
    </div>
  );
}

/* ─── Provider card (real data, with Contacter button) ─────── */
function ProviderCard({ provider, onContact }: { provider: ApiServiceProvider; onContact: () => void }) {
  const initials = provider.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{
      background: "var(--theme-surface)", borderRadius: 16, padding: "16px 12px", flexShrink: 0,
      width: 136, display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
      boxShadow: "0 2px 12px rgba(0,0,0,0.08)", border: "1px solid #F1F5F9",
    }}>
      {/* Avatar */}
      <div style={{ position: "relative" }}>
        <div style={{
          width: 60, height: 60, borderRadius: "50%", overflow: "hidden",
          background: provider.coverColor || G,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {provider.avatarUrl
            ? <img src={provider.avatarUrl} alt={provider.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            : <span style={{ color: "#fff", fontWeight: 700, fontSize: 22 }}>{initials}</span>
          }
        </div>
        {provider.isVerified && (
          <div style={{
            position: "absolute", bottom: 1, right: 1,
            width: 18, height: 18, borderRadius: "50%",
            background: G, border: "2.5px solid #fff",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg viewBox="0 0 10 10" width="9" height="9" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round">
              <path d="M2 5l2 2 4-4"/>
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ textAlign: "center", width: "100%" }}>
        <div style={{ fontWeight: 700, fontSize: 12.5, color: "var(--theme-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{provider.name}</div>
        <div style={{ fontSize: 11, color: "#64748B", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{provider.profession}</div>

        {/* Rating */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3, marginTop: 6 }}>
          <IcoStar />
          <span style={{ fontWeight: 700, fontSize: 11.5, color: "var(--theme-text)" }}>{provider.rating.toFixed(1)}</span>
          <span style={{ fontSize: 10, color: "#9CA3AF" }}>({provider.reviewsCount})</span>
        </div>

        {/* Services count */}
        {provider.servicesCount > 1 && (
          <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 3 }}>
            {provider.servicesCount} service{provider.servicesCount > 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Contact button */}
      <button
        onClick={onContact}
        style={{
          background: G, color: "#fff", border: "none", borderRadius: 10,
          padding: "8px 0", fontWeight: 700, fontSize: 11.5, cursor: "pointer",
          width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
          boxShadow: `0 3px 10px ${G}40`, fontFamily: "inherit",
          transition: "opacity .15s",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.85"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
      >
        <IcoPhone />
        Contacter
      </button>
    </div>
  );
}

/* ─── Service card grid (services tab) ─────────────────────── */
function ServiceCardGrid({ service }: { service: ApiMarketplaceService }) {
  return (
    <div style={{ background: "var(--theme-surface)", borderRadius: 18, padding: 14, boxShadow: "0 2px 10px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ position: "relative" }}>
        <div style={{ width: 62, height: 62, borderRadius: "50%", overflow: "hidden", background: service.coverColor }}>
          {service.avatarUrl
            ? <img src={service.avatarUrl} alt={service.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 22 }}>{service.name[0]}</div>
          }
        </div>
        {service.isVerified && (
          <div style={{ position: "absolute", bottom: 1, right: 1, width: 18, height: 18, borderRadius: "50%", background: G, border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg viewBox="0 0 10 10" width="9" height="9" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"><path d="M2 5l2 2 4-4"/></svg>
          </div>
        )}
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "var(--theme-text)" }}>{service.name}</div>
        <div style={{ fontSize: 12, color: "#64748B", marginTop: 1 }}>{service.profession}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 6 }}>
          <IcoStar />
          <span style={{ fontWeight: 700, fontSize: 13, color: "var(--theme-text)" }}>{service.rating.toFixed(1)}</span>
          <span style={{ fontSize: 11, color: "#9CA3AF" }}>({service.reviewsCount})</span>
        </div>
      </div>
      <button style={{ background: G, color: "#fff", border: "none", borderRadius: 10, padding: "9px 0", fontWeight: 700, fontSize: 13, cursor: "pointer", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: `0 3px 10px ${G}40`, fontFamily: "inherit" }}>
        <IcoPhone />
        Contacter
      </button>
    </div>
  );
}

/* ─── Job card ─────────────────────────────────────────────── */
function JobCard({ job }: {
  job: { id: number; title: string; company: string; verified: boolean; city: string; salary: string; logoColor: string; logoText: string; createdAt: string };
}) {
  const isNew = Date.now() - new Date(job.createdAt).getTime() < 24 * 60 * 60 * 1000;
  return (
    <div style={{ background: "var(--theme-surface)", borderRadius: 16, padding: "13px 14px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 12 }}>
      {/* Logo */}
      <div style={{ width: 44, height: 44, borderRadius: 12, background: job.logoColor, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 14, flexShrink: 0, letterSpacing: -0.5 }}>
        {job.logoText}
      </div>
      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "var(--theme-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job.title}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
          <span style={{ fontSize: 12, color: "#64748B", fontWeight: 500 }}>{job.company}</span>
          {job.verified && (
            <svg viewBox="0 0 16 16" width="14" height="14" fill={G}>
              <circle cx="8" cy="8" r="8"/>
              <path d="M4.5 8.5l2.2 2.2 4.5-5" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
          <IcoPin />
          <span style={{ fontSize: 11, color: "#9CA3AF" }}>{job.city}</span>
        </div>
        <div style={{ fontSize: 12.5, color: G, fontWeight: 700, marginTop: 3 }}>{job.salary}</div>
      </div>
      {/* Right */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
        <button style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
          <IcoBookmark />
        </button>
        {isNew && (
          <div style={{ background: `${G}18`, color: G, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 10, whiteSpace: "nowrap" }}>
            Nouveau
          </div>
        )}
        <span style={{ fontSize: 10, color: "#9CA3AF", whiteSpace: "nowrap" }}>{timeAgo(job.createdAt)}</span>
      </div>
    </div>
  );
}

/* ─── Skeleton ─────────────────────────────────────────────── */
function ProdSkeleton() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
      {[1,2,3,4].map(i => (
        <div key={i} style={{ background: "var(--theme-surface)", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
          <div style={{ height: 136, background: "linear-gradient(90deg,#F1F5F9 25%,#E5E7EB 50%,#F1F5F9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
          <div style={{ padding: "10px 11px 12px" }}>
            <div style={{ height: 12, background: "#F1F5F9", borderRadius: 6, marginBottom: 8 }} />
            <div style={{ height: 14, background: "#F1F5F9", borderRadius: 6, width: "60%" }} />
          </div>
        </div>
      ))}
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
    </div>
  );
}

/* ─── Form helpers ─────────────────────────────────────────── */
const inputStyle: React.CSSProperties = { border: "1.5px solid #E5E7EB", borderRadius: 12, padding: "13px 14px", fontSize: 14, fontFamily: "inherit", outline: "none", color: "var(--theme-text)", background: "var(--theme-surface)", width: "100%", boxSizing: "border-box" };
const taStyle: React.CSSProperties = { ...inputStyle, resize: "none", height: 80 };
const uploadBtnStyle: React.CSSProperties = { border: "2px dashed #E5E7EB", background: "#F8FAFC", borderRadius: 14, padding: "16px 0", cursor: "pointer", color: "#9CA3AF", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontFamily: "inherit" };

function FInput({ placeholder, value, onChange, type = "text" }: { placeholder: string; value: string; onChange: (v: string) => void; type?: string }) {
  return <input type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} style={inputStyle} />;
}
function FSel({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return <select value={value} onChange={e => onChange(e.target.value)} style={{ ...inputStyle, flex: 1 }}>{children}</select>;
}
