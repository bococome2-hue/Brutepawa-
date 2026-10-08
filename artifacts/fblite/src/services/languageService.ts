export interface Language {
  code: string;
  nameNative: string;
  nameEnglish: string;
  flag: string;
  dir: "ltr" | "rtl";
}

export const ALL_LANGUAGES: Language[] = [
  { code: "fr", nameNative: "Français", nameEnglish: "French", flag: "🇫🇷", dir: "ltr" },
  { code: "en", nameNative: "English", nameEnglish: "English", flag: "🇬🇧", dir: "ltr" },
  { code: "es", nameNative: "Español", nameEnglish: "Spanish", flag: "🇪🇸", dir: "ltr" },
  { code: "pt", nameNative: "Português", nameEnglish: "Portuguese", flag: "🇧🇷", dir: "ltr" },
  { code: "ar", nameNative: "العربية", nameEnglish: "Arabic", flag: "🇸🇦", dir: "rtl" },
  { code: "zh", nameNative: "中文 (简体)", nameEnglish: "Chinese Simplified", flag: "🇨🇳", dir: "ltr" },
  { code: "ru", nameNative: "Русский", nameEnglish: "Russian", flag: "🇷🇺", dir: "ltr" },
  { code: "de", nameNative: "Deutsch", nameEnglish: "German", flag: "🇩🇪", dir: "ltr" },
  { code: "tr", nameNative: "Türkçe", nameEnglish: "Turkish", flag: "🇹🇷", dir: "ltr" },
  { code: "ja", nameNative: "日本語", nameEnglish: "Japanese", flag: "🇯🇵", dir: "ltr" },
  { code: "hi", nameNative: "हिन्दी", nameEnglish: "Hindi", flag: "🇮🇳", dir: "ltr" },
  { code: "ko", nameNative: "한국어", nameEnglish: "Korean", flag: "🇰🇷", dir: "ltr" },
  { code: "it", nameNative: "Italiano", nameEnglish: "Italian", flag: "🇮🇹", dir: "ltr" },
  { code: "nl", nameNative: "Nederlands", nameEnglish: "Dutch", flag: "🇳🇱", dir: "ltr" },
  { code: "pl", nameNative: "Polski", nameEnglish: "Polish", flag: "🇵🇱", dir: "ltr" },
  { code: "uk", nameNative: "Українська", nameEnglish: "Ukrainian", flag: "🇺🇦", dir: "ltr" },
  { code: "sv", nameNative: "Svenska", nameEnglish: "Swedish", flag: "🇸🇪", dir: "ltr" },
  { code: "no", nameNative: "Norsk", nameEnglish: "Norwegian", flag: "🇳🇴", dir: "ltr" },
  { code: "da", nameNative: "Dansk", nameEnglish: "Danish", flag: "🇩🇰", dir: "ltr" },
  { code: "fi", nameNative: "Suomi", nameEnglish: "Finnish", flag: "🇫🇮", dir: "ltr" },
  { code: "cs", nameNative: "Čeština", nameEnglish: "Czech", flag: "🇨🇿", dir: "ltr" },
  { code: "hu", nameNative: "Magyar", nameEnglish: "Hungarian", flag: "🇭🇺", dir: "ltr" },
  { code: "ro", nameNative: "Română", nameEnglish: "Romanian", flag: "🇷🇴", dir: "ltr" },
  { code: "el", nameNative: "Ελληνικά", nameEnglish: "Greek", flag: "🇬🇷", dir: "ltr" },
  { code: "he", nameNative: "עברית", nameEnglish: "Hebrew", flag: "🇮🇱", dir: "rtl" },
  { code: "fa", nameNative: "فارسی", nameEnglish: "Persian", flag: "🇮🇷", dir: "rtl" },
  { code: "ur", nameNative: "اردو", nameEnglish: "Urdu", flag: "🇵🇰", dir: "rtl" },
  { code: "bn", nameNative: "বাংলা", nameEnglish: "Bengali", flag: "🇧🇩", dir: "ltr" },
  { code: "ta", nameNative: "தமிழ்", nameEnglish: "Tamil", flag: "🇮🇳", dir: "ltr" },
  { code: "te", nameNative: "తెలుగు", nameEnglish: "Telugu", flag: "🇮🇳", dir: "ltr" },
  { code: "gu", nameNative: "ગુજરાતી", nameEnglish: "Gujarati", flag: "🇮🇳", dir: "ltr" },
  { code: "th", nameNative: "ภาษาไทย", nameEnglish: "Thai", flag: "🇹🇭", dir: "ltr" },
  { code: "id", nameNative: "Bahasa Indonesia", nameEnglish: "Indonesian", flag: "🇮🇩", dir: "ltr" },
  { code: "ms", nameNative: "Bahasa Melayu", nameEnglish: "Malay", flag: "🇲🇾", dir: "ltr" },
  { code: "vi", nameNative: "Tiếng Việt", nameEnglish: "Vietnamese", flag: "🇻🇳", dir: "ltr" },
  { code: "sw", nameNative: "Kiswahili", nameEnglish: "Swahili", flag: "🇰🇪", dir: "ltr" },
  { code: "am", nameNative: "አማርኛ", nameEnglish: "Amharic", flag: "🇪🇹", dir: "ltr" },
  { code: "yo", nameNative: "Yorùbá", nameEnglish: "Yoruba", flag: "🇳🇬", dir: "ltr" },
  { code: "ig", nameNative: "Igbo", nameEnglish: "Igbo", flag: "🇳🇬", dir: "ltr" },
  { code: "ha", nameNative: "Hausa", nameEnglish: "Hausa", flag: "🇳🇬", dir: "ltr" },
  { code: "ln", nameNative: "Lingála", nameEnglish: "Lingala", flag: "🇨🇩", dir: "ltr" },
  { code: "wo", nameNative: "Wolof", nameEnglish: "Wolof", flag: "🇸🇳", dir: "ltr" },
  { code: "ff", nameNative: "Fulfulde", nameEnglish: "Fula", flag: "🇬🇳", dir: "ltr" },
  { code: "ca", nameNative: "Català", nameEnglish: "Catalan", flag: "🏳️", dir: "ltr" },
  { code: "hr", nameNative: "Hrvatski", nameEnglish: "Croatian", flag: "🇭🇷", dir: "ltr" },
  { code: "sk", nameNative: "Slovenčina", nameEnglish: "Slovak", flag: "🇸🇰", dir: "ltr" },
  { code: "sl", nameNative: "Slovenščina", nameEnglish: "Slovenian", flag: "🇸🇮", dir: "ltr" },
  { code: "bg", nameNative: "Български", nameEnglish: "Bulgarian", flag: "🇧🇬", dir: "ltr" },
  { code: "sr", nameNative: "Српски", nameEnglish: "Serbian", flag: "🇷🇸", dir: "ltr" },
  { code: "lt", nameNative: "Lietuvių", nameEnglish: "Lithuanian", flag: "🇱🇹", dir: "ltr" },
  { code: "lv", nameNative: "Latviešu", nameEnglish: "Latvian", flag: "🇱🇻", dir: "ltr" },
  { code: "et", nameNative: "Eesti", nameEnglish: "Estonian", flag: "🇪🇪", dir: "ltr" },
  { code: "mk", nameNative: "Македонски", nameEnglish: "Macedonian", flag: "🇲🇰", dir: "ltr" },
  { code: "sq", nameNative: "Shqip", nameEnglish: "Albanian", flag: "🇦🇱", dir: "ltr" },
  { code: "af", nameNative: "Afrikaans", nameEnglish: "Afrikaans", flag: "🇿🇦", dir: "ltr" },
  { code: "zu", nameNative: "IsiZulu", nameEnglish: "Zulu", flag: "🇿🇦", dir: "ltr" },
  { code: "xh", nameNative: "IsiXhosa", nameEnglish: "Xhosa", flag: "🇿🇦", dir: "ltr" },
  { code: "so", nameNative: "Soomaaliga", nameEnglish: "Somali", flag: "🇸🇴", dir: "ltr" },
  { code: "mg", nameNative: "Malagasy", nameEnglish: "Malagasy", flag: "🇲🇬", dir: "ltr" },
  { code: "ky", nameNative: "Кыргызча", nameEnglish: "Kyrgyz", flag: "🇰🇬", dir: "ltr" },
  { code: "kk", nameNative: "Қазақша", nameEnglish: "Kazakh", flag: "🇰🇿", dir: "ltr" },
  { code: "uz", nameNative: "Oʻzbekcha", nameEnglish: "Uzbek", flag: "🇺🇿", dir: "ltr" },
  { code: "az", nameNative: "Azərbaycan", nameEnglish: "Azerbaijani", flag: "🇦🇿", dir: "ltr" },
  { code: "ka", nameNative: "ქართული", nameEnglish: "Georgian", flag: "🇬🇪", dir: "ltr" },
  { code: "hy", nameNative: "Հայերեն", nameEnglish: "Armenian", flag: "🇦🇲", dir: "ltr" },
  { code: "ne", nameNative: "नेपाली", nameEnglish: "Nepali", flag: "🇳🇵", dir: "ltr" },
  { code: "si", nameNative: "සිංහල", nameEnglish: "Sinhala", flag: "🇱🇰", dir: "ltr" },
  { code: "my", nameNative: "မြန်မာဘာသာ", nameEnglish: "Burmese", flag: "🇲🇲", dir: "ltr" },
  { code: "km", nameNative: "ភាសាខ្មែរ", nameEnglish: "Khmer", flag: "🇰🇭", dir: "ltr" },
  { code: "lo", nameNative: "ພາສາລາວ", nameEnglish: "Lao", flag: "🇱🇦", dir: "ltr" },
  { code: "mn", nameNative: "Монгол", nameEnglish: "Mongolian", flag: "🇲🇳", dir: "ltr" },
  { code: "tl", nameNative: "Filipino", nameEnglish: "Filipino", flag: "🇵🇭", dir: "ltr" },
  { code: "jv", nameNative: "Basa Jawa", nameEnglish: "Javanese", flag: "🇮🇩", dir: "ltr" },
  { code: "su", nameNative: "Basa Sunda", nameEnglish: "Sundanese", flag: "🇮🇩", dir: "ltr" },
  { code: "mr", nameNative: "मराठी", nameEnglish: "Marathi", flag: "🇮🇳", dir: "ltr" },
  { code: "pa", nameNative: "ਪੰਜਾਬੀ", nameEnglish: "Punjabi", flag: "🇮🇳", dir: "ltr" },
  { code: "ml", nameNative: "മലയാളം", nameEnglish: "Malayalam", flag: "🇮🇳", dir: "ltr" },
  { code: "kn", nameNative: "ಕನ್ನಡ", nameEnglish: "Kannada", flag: "🇮🇳", dir: "ltr" },
  { code: "or", nameNative: "ଓଡ଼ିଆ", nameEnglish: "Odia", flag: "🇮🇳", dir: "ltr" },
  { code: "ht", nameNative: "Kreyòl ayisyen", nameEnglish: "Haitian Creole", flag: "🇭🇹", dir: "ltr" },
  { code: "rw", nameNative: "Ikinyarwanda", nameEnglish: "Kinyarwanda", flag: "🇷🇼", dir: "ltr" },
  { code: "sn", nameNative: "chiShona", nameEnglish: "Shona", flag: "🇿🇼", dir: "ltr" },
  { code: "ny", nameNative: "Chichewa", nameEnglish: "Chichewa", flag: "🇲🇼", dir: "ltr" },
  { code: "st", nameNative: "Sesotho", nameEnglish: "Sesotho", flag: "🇱🇸", dir: "ltr" },
  { code: "tw", nameNative: "Twi", nameEnglish: "Twi", flag: "🇬🇭", dir: "ltr" },
  { code: "ee", nameNative: "Eʋegbe", nameEnglish: "Ewe", flag: "🇬🇭", dir: "ltr" },
  { code: "ak", nameNative: "Akan", nameEnglish: "Akan", flag: "🇬🇭", dir: "ltr" },
  { code: "bm", nameNative: "Bamanankan", nameEnglish: "Bambara", flag: "🇲🇱", dir: "ltr" },
  { code: "dz", nameNative: "རྫོང་ཁ", nameEnglish: "Dzongkha", flag: "🇧🇹", dir: "ltr" },
  { code: "ti", nameNative: "ትግርኛ", nameEnglish: "Tigrinya", flag: "🇪🇷", dir: "ltr" },
  { code: "om", nameNative: "Afaan Oromoo", nameEnglish: "Oromo", flag: "🇪🇹", dir: "ltr" },
];

export const POPULAR_CODES = ["fr", "en", "es", "pt", "ar", "zh", "ru", "de", "tr", "ja"];

export function getPopularLanguages(): Language[] {
  return POPULAR_CODES.map(code => ALL_LANGUAGES.find(l => l.code === code)!).filter(Boolean);
}

export function getLanguageByCode(code: string): Language | undefined {
  return ALL_LANGUAGES.find(l => l.code === code);
}

export function getLanguageDirection(code: string): "ltr" | "rtl" {
  return getLanguageByCode(code)?.dir ?? "ltr";
}

export function getLocalizedName(code: string): string {
  return getLanguageByCode(code)?.nameNative ?? code;
}

export function getFlag(code: string): string {
  return getLanguageByCode(code)?.flag ?? "🌐";
}

function normalize(str: string): string {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function searchLanguages(query: string): Language[] {
  if (!query.trim()) return getPopularLanguages();
  const q = normalize(query.trim());
  const exact: Language[] = [];
  const partial: Language[] = [];
  for (const lang of ALL_LANGUAGES) {
    const code = lang.code.toLowerCase();
    const native = normalize(lang.nameNative);
    const english = normalize(lang.nameEnglish);
    if (code === q || native === q || english === q) {
      exact.push(lang);
    } else if (
      code.startsWith(q) ||
      native.startsWith(q) ||
      english.startsWith(q) ||
      native.includes(q) ||
      english.includes(q)
    ) {
      partial.push(lang);
    }
  }
  return [...exact, ...partial].slice(0, 30);
}
