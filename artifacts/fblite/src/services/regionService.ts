import { getLanguageByCode, getPopularLanguages, type Language } from "./languageService";

export interface RegionInfo {
  countryCode: string;
  countryName: string;
  countryFlag: string;
  langCode: string;
  currency: string;
  timezone: string;
  detected: boolean;
  source: string;
}

/* ── Country → language ── */
const COUNTRY_LANG: Record<string, string> = {
  FR:"fr", BE:"fr", CH:"fr", LU:"fr",
  BJ:"fr", SN:"fr", CI:"fr", ML:"fr", BF:"fr", NE:"fr", TG:"fr",
  GN:"fr", CM:"fr", GA:"fr", CG:"fr", CD:"fr", MG:"fr",
  DZ:"fr", MA:"fr", MR:"fr",
  GB:"en", US:"en", AU:"en", NZ:"en", IE:"en", CA:"en",
  NG:"en", GH:"en", ZA:"en", KE:"en", UG:"en", TZ:"en", SL:"en",
  IN:"hi", PK:"ur", BD:"bn", LK:"si", NP:"ne",
  ES:"es", MX:"es", CO:"es", AR:"es", PE:"es", VE:"es",
  CL:"es", EC:"es", BO:"es", PY:"es", UY:"es", GT:"es",
  CU:"es", DO:"es", HN:"es", SV:"es", NI:"es", CR:"es", PA:"es",
  BR:"pt", PT:"pt", AO:"pt", MZ:"pt", CV:"pt", GW:"pt", ST:"pt",
  SA:"ar", EG:"ar", AE:"ar", IQ:"ar", SY:"ar", JO:"ar",
  LB:"ar", KW:"ar", QA:"ar", BH:"ar", OM:"ar", YE:"ar", LY:"ar", SD:"ar",
  TN:"ar",
  CN:"zh", TW:"zh", HK:"zh", MO:"zh", SG:"zh",
  RU:"ru", BY:"ru", KZ:"ru",
  DE:"de", AT:"de",
  TR:"tr", JP:"ja", KR:"ko", IT:"it", NL:"nl", PL:"pl",
  UA:"uk", SE:"sv", NO:"no", DK:"da", FI:"fi",
  CZ:"cs", HU:"hu", RO:"ro", GR:"el", IL:"he", IR:"fa",
  TH:"th", ID:"id", MY:"ms", VN:"vi", PH:"tl",
  UZ:"uz", AZ:"az", GE:"ka", AM:"hy", KH:"km",
};

/* ── Country → currency ── */
const COUNTRY_CURRENCY: Record<string, string> = {
  FR:"EUR", BE:"EUR", DE:"EUR", ES:"EUR", IT:"EUR", PT:"EUR", NL:"EUR",
  US:"USD", GB:"GBP", JP:"JPY", CN:"CNY", KR:"KRW",
  BJ:"XOF", SN:"XOF", CI:"XOF", ML:"XOF", BF:"XOF", NE:"XOF", TG:"XOF",
  GN:"GNF", CM:"XAF", GA:"XAF", CG:"XAF", CD:"CDF",
  BR:"BRL", MX:"MXN", AR:"ARS", CO:"COP",
  IN:"INR", NG:"NGN", ZA:"ZAR", KE:"KES",
  CA:"CAD", AU:"AUD", CH:"CHF", SA:"SAR", AE:"AED",
  TR:"TRY", RU:"RUB", MA:"MAD", DZ:"DZD", TN:"TND", EG:"EGP",
};

/* ── Country flags (for fallback when backend not available) ── */
const COUNTRY_FLAGS: Record<string, string> = {
  BJ:"🇧🇯", TG:"🇹🇬", CI:"🇨🇮", SN:"🇸🇳", BF:"🇧🇫", NE:"🇳🇪", GN:"🇬🇳",
  ML:"🇲🇱", CM:"🇨🇲", GA:"🇬🇦", CG:"🇨🇬", CD:"🇨🇩", MG:"🇲🇬",
  DZ:"🇩🇿", MA:"🇲🇦", TN:"🇹🇳", EG:"🇪🇬", LY:"🇱🇾", SD:"🇸🇩", MR:"🇲🇷",
  NG:"🇳🇬", GH:"🇬🇭", ZA:"🇿🇦", KE:"🇰🇪", UG:"🇺🇬", TZ:"🇹🇿", ET:"🇪🇹",
  FR:"🇫🇷", BE:"🇧🇪", CH:"🇨🇭", LU:"🇱🇺",
  GB:"🇬🇧", US:"🇺🇸", CA:"🇨🇦", AU:"🇦🇺", NZ:"🇳🇿", IE:"🇮🇪",
  ES:"🇪🇸", MX:"🇲🇽", CO:"🇨🇴", AR:"🇦🇷", PE:"🇵🇪", BR:"🇧🇷", PT:"🇵🇹",
  SA:"🇸🇦", AE:"🇦🇪", IQ:"🇮🇶", JO:"🇯🇴", KW:"🇰🇼", QA:"🇶🇦",
  CN:"🇨🇳", TW:"🇹🇼", HK:"🇭🇰", SG:"🇸🇬", JP:"🇯🇵", KR:"🇰🇷",
  IN:"🇮🇳", PK:"🇵🇰", BD:"🇧🇩", TH:"🇹🇭", ID:"🇮🇩", MY:"🇲🇾",
  VN:"🇻🇳", PH:"🇵🇭", DE:"🇩🇪", AT:"🇦🇹", IT:"🇮🇹", NL:"🇳🇱",
  PL:"🇵🇱", RU:"🇷🇺", UA:"🇺🇦", TR:"🇹🇷", SE:"🇸🇪", NO:"🇳🇴",
  DK:"🇩🇰", FI:"🇫🇮", GR:"🇬🇷", RO:"🇷🇴", HU:"🇭🇺", IL:"🇮🇱", IR:"🇮🇷",
};

const COUNTRY_NAMES: Record<string, string> = {
  BJ:"Bénin", TG:"Togo", CI:"Côte d'Ivoire", SN:"Sénégal", BF:"Burkina Faso",
  NE:"Niger", GN:"Guinée", ML:"Mali", CM:"Cameroun", GA:"Gabon",
  CG:"Congo", CD:"RD Congo", MG:"Madagascar", DZ:"Algérie", MA:"Maroc",
  TN:"Tunisie", EG:"Égypte", LY:"Libye", SD:"Soudan", MR:"Mauritanie",
  NG:"Nigeria", GH:"Ghana", ZA:"Afrique du Sud", KE:"Kenya", UG:"Ouganda",
  TZ:"Tanzanie", ET:"Éthiopie",
  FR:"France", BE:"Belgique", CH:"Suisse", LU:"Luxembourg",
  GB:"Royaume-Uni", US:"États-Unis", CA:"Canada", AU:"Australie",
  NZ:"Nouvelle-Zélande", IE:"Irlande",
  ES:"Espagne", MX:"Mexique", CO:"Colombie", AR:"Argentine", PE:"Pérou",
  BR:"Brésil", PT:"Portugal",
  SA:"Arabie Saoudite", AE:"Émirats Arabes Unis",
  CN:"Chine", JP:"Japon", KR:"Corée du Sud", IN:"Inde", PK:"Pakistan",
  BD:"Bangladesh", TH:"Thaïlande", ID:"Indonésie", MY:"Malaisie",
  VN:"Vietnam", PH:"Philippines", SG:"Singapour",
  DE:"Allemagne", AT:"Autriche", IT:"Italie", NL:"Pays-Bas", PL:"Pologne",
  RU:"Russie", UA:"Ukraine", TR:"Turquie", SE:"Suède", NO:"Norvège",
  DK:"Danemark", FI:"Finlande", GR:"Grèce", RO:"Roumanie", HU:"Hongrie",
  IL:"Israël", IR:"Iran",
};

const TIMEZONE_COUNTRY: Record<string, string> = {
  "Africa/Porto-Novo":"BJ","Africa/Cotonou":"BJ",
  "Africa/Dakar":"SN","Africa/Abidjan":"CI","Africa/Bamako":"ML",
  "Africa/Ouagadougou":"BF","Africa/Niamey":"NE","Africa/Lome":"TG",
  "Africa/Conakry":"GN","Africa/Douala":"CM","Africa/Libreville":"GA",
  "Africa/Brazzaville":"CG","Africa/Kinshasa":"CD","Africa/Lagos":"NG",
  "Africa/Accra":"GH","Africa/Nairobi":"KE","Africa/Addis_Ababa":"ET",
  "Africa/Johannesburg":"ZA","Africa/Casablanca":"MA","Africa/Tunis":"TN",
  "Africa/Algiers":"DZ","Africa/Cairo":"EG","Africa/Tripoli":"LY",
  "Europe/Paris":"FR","Europe/Brussels":"BE","Europe/Berlin":"DE",
  "Europe/London":"GB","Europe/Madrid":"ES","Europe/Rome":"IT",
  "Europe/Amsterdam":"NL","Europe/Warsaw":"PL","Europe/Lisbon":"PT",
  "Europe/Moscow":"RU","Europe/Kiev":"UA","Europe/Istanbul":"TR",
  "Europe/Stockholm":"SE","Europe/Oslo":"NO","Europe/Copenhagen":"DK",
  "Europe/Helsinki":"FI","Europe/Athens":"GR","Europe/Bucharest":"RO",
  "Europe/Budapest":"HU","Europe/Vienna":"AT","Europe/Zurich":"CH",
  "America/New_York":"US","America/Chicago":"US","America/Denver":"US",
  "America/Los_Angeles":"US","America/Toronto":"CA","America/Vancouver":"CA",
  "America/Montreal":"CA","America/Sao_Paulo":"BR","America/Mexico_City":"MX",
  "America/Buenos_Aires":"AR","America/Bogota":"CO","America/Lima":"PE",
  "America/Santiago":"CL","America/Caracas":"VE",
  "Asia/Tokyo":"JP","Asia/Shanghai":"CN","Asia/Hong_Kong":"HK",
  "Asia/Seoul":"KR","Asia/Kolkata":"IN","Asia/Karachi":"PK",
  "Asia/Dhaka":"BD","Asia/Dubai":"AE","Asia/Riyadh":"SA",
  "Asia/Istanbul":"TR","Asia/Tehran":"IR","Asia/Bangkok":"TH",
  "Asia/Jakarta":"ID","Asia/Singapore":"SG","Asia/Kuala_Lumpur":"MY",
  "Asia/Ho_Chi_Minh":"VN","Asia/Manila":"PH","Asia/Jerusalem":"IL",
  "Pacific/Auckland":"NZ","Australia/Sydney":"AU","Australia/Melbourne":"AU",
};

function guessFromTimezone(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return TIMEZONE_COUNTRY[tz] ?? null;
  } catch { return null; }
}

function guessLangFromBrowser(): string {
  const lang = navigator.language || (navigator.languages?.[0]) || "fr";
  const country = lang.split("-")[1]?.toUpperCase();
  if (country && COUNTRY_LANG[country]) return COUNTRY_LANG[country];
  return lang.split("-")[0].toLowerCase();
}

function buildRegion(countryCode: string, countryName: string, flag: string, source: string): RegionInfo {
  const cc = countryCode.toUpperCase();
  const langCode = COUNTRY_LANG[cc] ?? guessLangFromBrowser();
  return {
    countryCode: cc,
    countryName: countryName || COUNTRY_NAMES[cc] || cc,
    countryFlag: flag || COUNTRY_FLAGS[cc] || "🌍",
    langCode,
    currency: COUNTRY_CURRENCY[cc] ?? "USD",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    detected: true,
    source,
  };
}

function buildFallback(): RegionInfo {
  const langCode = guessLangFromBrowser();
  const tzCountry = guessFromTimezone();
  if (tzCountry) return buildRegion(tzCountry, COUNTRY_NAMES[tzCountry] ?? "", COUNTRY_FLAGS[tzCountry] ?? "🌍", "timezone");
  return {
    countryCode: "",
    countryName: "Monde",
    countryFlag: "🌍",
    langCode,
    currency: "USD",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    detected: false,
    source: "browser",
  };
}

/* ── Synchronous fast detection (timezone → browser lang, 0ms) ── */
export function detectRegionFast(): RegionInfo {
  /* 1. Cached */
  const cached = getCachedRegion();
  if (cached) return cached;

  /* 2. Timezone map (instant) */
  const tzCountry = guessFromTimezone();
  if (tzCountry) return buildRegion(tzCountry, "", "", "timezone");

  /* 3. Browser language country hint */
  const lang = navigator.language || (navigator.languages?.[0]) || "";
  const country = lang.split("-")[1]?.toUpperCase();
  if (country && COUNTRY_NAMES[country]) return buildRegion(country, "", "", "browser-lang");

  return buildFallback();
}

/* ── Cache ── */
const CACHE_KEY = "bp_region_v2";
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12h (refresh after 12h in case user travels)

export function getCachedRegion(): RegionInfo | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return data as RegionInfo;
  } catch { return null; }
}

export function saveRegion(r: RegionInfo) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data: r, ts: Date.now() })); } catch {}
}

export function clearRegionCache() {
  try { localStorage.removeItem(CACHE_KEY); } catch {}
}

export async function detectRegion(skipCache = false): Promise<RegionInfo> {
  if (!skipCache) {
    const cached = getCachedRegion();
    if (cached) return cached;
  }

  let result: RegionInfo | null = null;

  /* ── 1. Backend /api/region (Cloudflare CF-IPCountry) ── */
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 1500);
    const res = await fetch("/api/region", { signal: ctrl.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (data.countryCode && data.countryCode.length === 2) {
        result = buildRegion(data.countryCode, data.countryName ?? "", data.flag ?? "", data.source ?? "cloudflare");
      }
    }
  } catch { /* timeout or network — continue to fallback */ }

  /* ── 2. Public IP geolocation (ipapi.co) ── */
  if (!result) {
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 2000);
      const res = await fetch("https://ipapi.co/json/", { signal: ctrl.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        const cc = (data.country_code as string)?.toUpperCase();
        if (cc && cc.length === 2) {
          result = buildRegion(cc, data.country_name ?? "", "", "ipapi");
          if (data.currency) result.currency = data.currency;
          if (data.timezone) result.timezone = data.timezone;
        }
      }
    } catch { /* timeout — continue */ }
  }

  /* ── 3. Timezone inference ── */
  if (!result) {
    const tzCountry = guessFromTimezone();
    if (tzCountry) result = buildRegion(tzCountry, "", "", "timezone");
  }

  /* ── 4. Browser language ── */
  if (!result) result = buildFallback();

  saveRegion(result);
  return result;
}

export function getLanguageForRegion(region: RegionInfo): Language {
  const lang = getLanguageByCode(region.langCode);
  return lang ?? getPopularLanguages()[0];
}
