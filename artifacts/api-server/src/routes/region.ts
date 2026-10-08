import { Router, type IRouter } from "express";

const router: IRouter = Router();

/* ── Country data (inline — no external dep) ── */
const NAMES: Record<string, string> = {
  BJ:"Bénin", TG:"Togo", CI:"Côte d'Ivoire", SN:"Sénégal", BF:"Burkina Faso",
  NE:"Niger", GN:"Guinée", ML:"Mali", CM:"Cameroun", GA:"Gabon", CG:"Congo",
  CD:"RD Congo", MG:"Madagascar", DZ:"Algérie", MA:"Maroc", TN:"Tunisie",
  EG:"Égypte", LY:"Libye", SD:"Soudan", MR:"Mauritanie", CV:"Cap-Vert",
  GW:"Guinée-Bissau", ST:"São Tomé", AO:"Angola", MZ:"Mozambique",
  NG:"Nigeria", GH:"Ghana", SL:"Sierra Leone", LR:"Liberia", GM:"Gambie",
  ER:"Érythrée", SO:"Somalie", ET:"Éthiopie", KE:"Kenya", UG:"Ouganda",
  RW:"Rwanda", TZ:"Tanzanie", ZA:"Afrique du Sud", ZW:"Zimbabwe",
  ZM:"Zambie", MW:"Malawi", NA:"Namibie", BW:"Botswana", LS:"Lesotho",
  SZ:"Eswatini", KM:"Comores", SC:"Seychelles", MU:"Maurice", RE:"La Réunion",
  FR:"France", BE:"Belgique", CH:"Suisse", LU:"Luxembourg",
  GB:"Royaume-Uni", US:"États-Unis", CA:"Canada", AU:"Australie",
  NZ:"Nouvelle-Zélande", IE:"Irlande",
  ES:"Espagne", MX:"Mexique", CO:"Colombie", AR:"Argentine", PE:"Pérou",
  VE:"Venezuela", CL:"Chili", EC:"Équateur", BO:"Bolivie", PY:"Paraguay",
  UY:"Uruguay", GT:"Guatemala", CU:"Cuba", DO:"Rép. Dominicaine",
  HN:"Honduras", SV:"El Salvador", NI:"Nicaragua", CR:"Costa Rica", PA:"Panama",
  BR:"Brésil", PT:"Portugal",
  SA:"Arabie Saoudite", AE:"Émirats Arabes Unis", IQ:"Irak", SY:"Syrie",
  JO:"Jordanie", LB:"Liban", KW:"Koweït", QA:"Qatar", BH:"Bahreïn",
  OM:"Oman", YE:"Yémen",
  CN:"Chine", TW:"Taïwan", HK:"Hong Kong", MO:"Macao", SG:"Singapour",
  JP:"Japon", KR:"Corée du Sud", IN:"Inde", PK:"Pakistan", BD:"Bangladesh",
  LK:"Sri Lanka", MM:"Myanmar", NP:"Népal", TH:"Thaïlande", ID:"Indonésie",
  MY:"Malaisie", VN:"Vietnam", PH:"Philippines", KH:"Cambodge", LA:"Laos",
  DE:"Allemagne", AT:"Autriche", IT:"Italie", NL:"Pays-Bas", PL:"Pologne",
  RU:"Russie", UA:"Ukraine", TR:"Turquie", SE:"Suède", NO:"Norvège",
  DK:"Danemark", FI:"Finlande", GR:"Grèce", RO:"Roumanie", HU:"Hongrie",
  CZ:"Tchéquie", SK:"Slovaquie", PT2:"Portugal", IL:"Israël", IR:"Iran",
  UZ:"Ouzbékistan", AZ:"Azerbaïdjan", GE:"Géorgie", AM:"Arménie",
};

const FLAGS: Record<string, string> = {
  BJ:"🇧🇯", TG:"🇹🇬", CI:"🇨🇮", SN:"🇸🇳", BF:"🇧🇫", NE:"🇳🇪", GN:"🇬🇳",
  ML:"🇲🇱", CM:"🇨🇲", GA:"🇬🇦", CG:"🇨🇬", CD:"🇨🇩", MG:"🇲🇬",
  DZ:"🇩🇿", MA:"🇲🇦", TN:"🇹🇳", EG:"🇪🇬", LY:"🇱🇾", SD:"🇸🇩", MR:"🇲🇷",
  NG:"🇳🇬", GH:"🇬🇭", SL:"🇸🇱", LR:"🇱🇷", GM:"🇬🇲",
  ET:"🇪🇹", KE:"🇰🇪", UG:"🇺🇬", RW:"🇷🇼", TZ:"🇹🇿", ZA:"🇿🇦",
  ZW:"🇿🇼", ZM:"🇿🇲", MW:"🇲🇼", NA:"🇳🇦", BW:"🇧🇼",
  FR:"🇫🇷", BE:"🇧🇪", CH:"🇨🇭", LU:"🇱🇺",
  GB:"🇬🇧", US:"🇺🇸", CA:"🇨🇦", AU:"🇦🇺", NZ:"🇳🇿", IE:"🇮🇪",
  ES:"🇪🇸", MX:"🇲🇽", CO:"🇨🇴", AR:"🇦🇷", PE:"🇵🇪", VE:"🇻🇪",
  CL:"🇨🇱", EC:"🇪🇨", BO:"🇧🇴", PY:"🇵🇾", UY:"🇺🇾",
  BR:"🇧🇷", PT:"🇵🇹", AO:"🇦🇴", MZ:"🇲🇿", CV:"🇨🇻",
  SA:"🇸🇦", AE:"🇦🇪", IQ:"🇮🇶", JO:"🇯🇴", KW:"🇰🇼", QA:"🇶🇦",
  LB:"🇱🇧", YE:"🇾🇪", OM:"🇴🇲", BH:"🇧🇭",
  CN:"🇨🇳", TW:"🇹🇼", HK:"🇭🇰", SG:"🇸🇬", JP:"🇯🇵", KR:"🇰🇷",
  IN:"🇮🇳", PK:"🇵🇰", BD:"🇧🇩", TH:"🇹🇭", ID:"🇮🇩", MY:"🇲🇾",
  VN:"🇻🇳", PH:"🇵🇭",
  DE:"🇩🇪", AT:"🇦🇹", IT:"🇮🇹", NL:"🇳🇱", PL:"🇵🇱",
  RU:"🇷🇺", UA:"🇺🇦", TR:"🇹🇷", SE:"🇸🇪", NO:"🇳🇴",
  DK:"🇩🇰", FI:"🇫🇮", GR:"🇬🇷", RO:"🇷🇴", HU:"🇭🇺",
  IL:"🇮🇱", IR:"🇮🇷", GE:"🇬🇪", AM:"🇦🇲", AZ:"🇦🇿",
};

function buildPayload(cc: string, source: string) {
  const countryCode = cc.toUpperCase();
  return {
    countryCode,
    countryName: NAMES[countryCode] ?? countryCode,
    flag: FLAGS[countryCode] ?? "🌍",
    source,
  };
}

router.get("/region", (req, res) => {
  /* 1. Cloudflare header — most reliable, populated on every request */
  const cfCountry = (req.headers["cf-ipcountry"] as string | undefined)?.toUpperCase();
  if (cfCountry && cfCountry.length === 2 && cfCountry !== "XX" && cfCountry !== "T1") {
    return res.json(buildPayload(cfCountry, "cloudflare"));
  }

  /* 2. Vercel / AWS / generic CDN headers */
  const vercelCountry = (req.headers["x-vercel-ip-country"] as string | undefined)?.toUpperCase();
  if (vercelCountry && vercelCountry.length === 2) {
    return res.json(buildPayload(vercelCountry, "cdn"));
  }

  /* 3. Fallback — caller will enrich via browser APIs */
  return res.json({ countryCode: null, countryName: null, flag: null, source: "fallback" });
});

export default router;
