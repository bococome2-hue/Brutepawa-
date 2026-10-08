export interface Place {
  city: string;
  country: string;
  flag: string;
}

export const PLACES: Place[] = [
  // ── Bénin 🇧🇯
  { city: "Cotonou", country: "Bénin", flag: "🇧🇯" },
  { city: "Porto-Novo", country: "Bénin", flag: "🇧🇯" },
  { city: "Parakou", country: "Bénin", flag: "🇧🇯" },
  { city: "Abomey", country: "Bénin", flag: "🇧🇯" },
  { city: "Allada", country: "Bénin", flag: "🇧🇯" },
  { city: "Bohicon", country: "Bénin", flag: "🇧🇯" },
  { city: "Natitingou", country: "Bénin", flag: "🇧🇯" },
  { city: "Ouidah", country: "Bénin", flag: "🇧🇯" },
  { city: "Lokossa", country: "Bénin", flag: "🇧🇯" },
  { city: "Kandi", country: "Bénin", flag: "🇧🇯" },
  { city: "Savalou", country: "Bénin", flag: "🇧🇯" },
  { city: "Djougou", country: "Bénin", flag: "🇧🇯" },
  { city: "Abomey-Calavi", country: "Bénin", flag: "🇧🇯" },
  { city: "Aplahoué", country: "Bénin", flag: "🇧🇯" },
  { city: "Dogbo", country: "Bénin", flag: "🇧🇯" },
  { city: "Tchaourou", country: "Bénin", flag: "🇧🇯" },
  { city: "Savè", country: "Bénin", flag: "🇧🇯" },
  { city: "Pobè", country: "Bénin", flag: "🇧🇯" },
  { city: "Sakété", country: "Bénin", flag: "🇧🇯" },
  { city: "Akpro-Missérété", country: "Bénin", flag: "🇧🇯" },
  { city: "Dassa-Zoumé", country: "Bénin", flag: "🇧🇯" },
  { city: "Glazoué", country: "Bénin", flag: "🇧🇯" },
  { city: "Nikki", country: "Bénin", flag: "🇧🇯" },
  { city: "Malanville", country: "Bénin", flag: "🇧🇯" },
  { city: "Banikoara", country: "Bénin", flag: "🇧🇯" },
  { city: "Sèmè-Podji", country: "Bénin", flag: "🇧🇯" },
  { city: "Comè", country: "Bénin", flag: "🇧🇯" },
  { city: "Adjohoun", country: "Bénin", flag: "🇧🇯" },
  { city: "Athiémé", country: "Bénin", flag: "🇧🇯" },
  { city: "Cové", country: "Bénin", flag: "🇧🇯" },

  // ── Côte d'Ivoire 🇨🇮
  { city: "Abidjan", country: "Côte d'Ivoire", flag: "🇨🇮" },
  { city: "Bouaké", country: "Côte d'Ivoire", flag: "🇨🇮" },
  { city: "Yamoussoukro", country: "Côte d'Ivoire", flag: "🇨🇮" },
  { city: "Korhogo", country: "Côte d'Ivoire", flag: "🇨🇮" },
  { city: "San-Pédro", country: "Côte d'Ivoire", flag: "🇨🇮" },
  { city: "Daloa", country: "Côte d'Ivoire", flag: "🇨🇮" },
  { city: "Divo", country: "Côte d'Ivoire", flag: "🇨🇮" },
  { city: "Man", country: "Côte d'Ivoire", flag: "🇨🇮" },
  { city: "Gagnoa", country: "Côte d'Ivoire", flag: "🇨🇮" },
  { city: "Soubré", country: "Côte d'Ivoire", flag: "🇨🇮" },
  { city: "Abengourou", country: "Côte d'Ivoire", flag: "🇨🇮" },
  { city: "Bondoukou", country: "Côte d'Ivoire", flag: "🇨🇮" },
  { city: "Odienné", country: "Côte d'Ivoire", flag: "🇨🇮" },
  { city: "Ferkessédougou", country: "Côte d'Ivoire", flag: "🇨🇮" },
  { city: "Séguéla", country: "Côte d'Ivoire", flag: "🇨🇮" },
  { city: "Sassandra", country: "Côte d'Ivoire", flag: "🇨🇮" },
  { city: "Grand-Bassam", country: "Côte d'Ivoire", flag: "🇨🇮" },
  { city: "Anyama", country: "Côte d'Ivoire", flag: "🇨🇮" },
  { city: "Adjamé", country: "Côte d'Ivoire", flag: "🇨🇮" },
  { city: "Yopougon", country: "Côte d'Ivoire", flag: "🇨🇮" },
  { city: "Abobo", country: "Côte d'Ivoire", flag: "🇨🇮" },
  { city: "Cocody", country: "Côte d'Ivoire", flag: "🇨🇮" },
  { city: "Marcory", country: "Côte d'Ivoire", flag: "🇨🇮" },
  { city: "Treichville", country: "Côte d'Ivoire", flag: "🇨🇮" },
  { city: "Plateau", country: "Côte d'Ivoire", flag: "🇨🇮" },

  // ── Togo 🇹🇬
  { city: "Lomé", country: "Togo", flag: "🇹🇬" },
  { city: "Sokodé", country: "Togo", flag: "🇹🇬" },
  { city: "Kara", country: "Togo", flag: "🇹🇬" },
  { city: "Atakpamé", country: "Togo", flag: "🇹🇬" },
  { city: "Tsévié", country: "Togo", flag: "🇹🇬" },
  { city: "Aného", country: "Togo", flag: "🇹🇬" },
  { city: "Bassar", country: "Togo", flag: "🇹🇬" },
  { city: "Palimé", country: "Togo", flag: "🇹🇬" },
  { city: "Dapaong", country: "Togo", flag: "🇹🇬" },
  { city: "Tchamba", country: "Togo", flag: "🇹🇬" },
  { city: "Mango", country: "Togo", flag: "🇹🇬" },
  { city: "Vogan", country: "Togo", flag: "🇹🇬" },

  // ── Sénégal 🇸🇳
  { city: "Dakar", country: "Sénégal", flag: "🇸🇳" },
  { city: "Thiès", country: "Sénégal", flag: "🇸🇳" },
  { city: "Saint-Louis", country: "Sénégal", flag: "🇸🇳" },
  { city: "Ziguinchor", country: "Sénégal", flag: "🇸🇳" },
  { city: "Touba", country: "Sénégal", flag: "🇸🇳" },
  { city: "Kaolack", country: "Sénégal", flag: "🇸🇳" },
  { city: "Mbour", country: "Sénégal", flag: "🇸🇳" },
  { city: "Diourbel", country: "Sénégal", flag: "🇸🇳" },
  { city: "Tambacounda", country: "Sénégal", flag: "🇸🇳" },
  { city: "Louga", country: "Sénégal", flag: "🇸🇳" },
  { city: "Kolda", country: "Sénégal", flag: "🇸🇳" },
  { city: "Vélingara", country: "Sénégal", flag: "🇸🇳" },
  { city: "Sédhiou", country: "Sénégal", flag: "🇸🇳" },
  { city: "Fatick", country: "Sénégal", flag: "🇸🇳" },
  { city: "Pikine", country: "Sénégal", flag: "🇸🇳" },
  { city: "Guédiawaye", country: "Sénégal", flag: "🇸🇳" },

  // ── Mali 🇲🇱
  { city: "Bamako", country: "Mali", flag: "🇲🇱" },
  { city: "Sikasso", country: "Mali", flag: "🇲🇱" },
  { city: "Ségou", country: "Mali", flag: "🇲🇱" },
  { city: "Mopti", country: "Mali", flag: "🇲🇱" },
  { city: "Gao", country: "Mali", flag: "🇲🇱" },
  { city: "Tombouctou", country: "Mali", flag: "🇲🇱" },
  { city: "Kayes", country: "Mali", flag: "🇲🇱" },
  { city: "Koutiala", country: "Mali", flag: "🇲🇱" },

  // ── Burkina Faso 🇧🇫
  { city: "Ouagadougou", country: "Burkina Faso", flag: "🇧🇫" },
  { city: "Bobo-Dioulasso", country: "Burkina Faso", flag: "🇧🇫" },
  { city: "Koudougou", country: "Burkina Faso", flag: "🇧🇫" },
  { city: "Banfora", country: "Burkina Faso", flag: "🇧🇫" },
  { city: "Ouahigouya", country: "Burkina Faso", flag: "🇧🇫" },
  { city: "Kaya", country: "Burkina Faso", flag: "🇧🇫" },
  { city: "Dédougou", country: "Burkina Faso", flag: "🇧🇫" },
  { city: "Tenkodogo", country: "Burkina Faso", flag: "🇧🇫" },
  { city: "Fada N'Gourma", country: "Burkina Faso", flag: "🇧🇫" },
  { city: "Dori", country: "Burkina Faso", flag: "🇧🇫" },

  // ── Niger 🇳🇪
  { city: "Niamey", country: "Niger", flag: "🇳🇪" },
  { city: "Zinder", country: "Niger", flag: "🇳🇪" },
  { city: "Maradi", country: "Niger", flag: "🇳🇪" },
  { city: "Agadez", country: "Niger", flag: "🇳🇪" },
  { city: "Tahoua", country: "Niger", flag: "🇳🇪" },
  { city: "Dosso", country: "Niger", flag: "🇳🇪" },
  { city: "Diffa", country: "Niger", flag: "🇳🇪" },

  // ── Guinée 🇬🇳
  { city: "Conakry", country: "Guinée", flag: "🇬🇳" },
  { city: "Kankan", country: "Guinée", flag: "🇬🇳" },
  { city: "Labé", country: "Guinée", flag: "🇬🇳" },
  { city: "Nzérékoré", country: "Guinée", flag: "🇬🇳" },
  { city: "Kindia", country: "Guinée", flag: "🇬🇳" },
  { city: "Mamou", country: "Guinée", flag: "🇬🇳" },
  { city: "Faranah", country: "Guinée", flag: "🇬🇳" },
  { city: "Boké", country: "Guinée", flag: "🇬🇳" },
  { city: "Kissidougou", country: "Guinée", flag: "🇬🇳" },

  // ── Guinée-Bissau 🇬🇼
  { city: "Bissau", country: "Guinée-Bissau", flag: "🇬🇼" },
  { city: "Bafatá", country: "Guinée-Bissau", flag: "🇬🇼" },
  { city: "Gabú", country: "Guinée-Bissau", flag: "🇬🇼" },

  // ── Ghana 🇬🇭
  { city: "Accra", country: "Ghana", flag: "🇬🇭" },
  { city: "Kumasi", country: "Ghana", flag: "🇬🇭" },
  { city: "Tamale", country: "Ghana", flag: "🇬🇭" },
  { city: "Sekondi-Takoradi", country: "Ghana", flag: "🇬🇭" },
  { city: "Cape Coast", country: "Ghana", flag: "🇬🇭" },
  { city: "Tema", country: "Ghana", flag: "🇬🇭" },
  { city: "Obuasi", country: "Ghana", flag: "🇬🇭" },
  { city: "Ho", country: "Ghana", flag: "🇬🇭" },
  { city: "Koforidua", country: "Ghana", flag: "🇬🇭" },
  { city: "Sunyani", country: "Ghana", flag: "🇬🇭" },
  { city: "Wa", country: "Ghana", flag: "🇬🇭" },
  { city: "Bolgatanga", country: "Ghana", flag: "🇬🇭" },

  // ── Nigeria 🇳🇬
  { city: "Lagos", country: "Nigeria", flag: "🇳🇬" },
  { city: "Abuja", country: "Nigeria", flag: "🇳🇬" },
  { city: "Kano", country: "Nigeria", flag: "🇳🇬" },
  { city: "Ibadan", country: "Nigeria", flag: "🇳🇬" },
  { city: "Port Harcourt", country: "Nigeria", flag: "🇳🇬" },
  { city: "Enugu", country: "Nigeria", flag: "🇳🇬" },
  { city: "Onitsha", country: "Nigeria", flag: "🇳🇬" },
  { city: "Benin City", country: "Nigeria", flag: "🇳🇬" },
  { city: "Warri", country: "Nigeria", flag: "🇳🇬" },
  { city: "Kaduna", country: "Nigeria", flag: "🇳🇬" },
  { city: "Aba", country: "Nigeria", flag: "🇳🇬" },
  { city: "Maiduguri", country: "Nigeria", flag: "🇳🇬" },
  { city: "Zaria", country: "Nigeria", flag: "🇳🇬" },
  { city: "Abeokuta", country: "Nigeria", flag: "🇳🇬" },
  { city: "Oshogbo", country: "Nigeria", flag: "🇳🇬" },
  { city: "Calabar", country: "Nigeria", flag: "🇳🇬" },
  { city: "Sokoto", country: "Nigeria", flag: "🇳🇬" },
  { city: "Uyo", country: "Nigeria", flag: "🇳🇬" },

  // ── Cameroun 🇨🇲
  { city: "Douala", country: "Cameroun", flag: "🇨🇲" },
  { city: "Yaoundé", country: "Cameroun", flag: "🇨🇲" },
  { city: "Garoua", country: "Cameroun", flag: "🇨🇲" },
  { city: "Bafoussam", country: "Cameroun", flag: "🇨🇲" },
  { city: "Ngaoundéré", country: "Cameroun", flag: "🇨🇲" },
  { city: "Maroua", country: "Cameroun", flag: "🇨🇲" },
  { city: "Bertoua", country: "Cameroun", flag: "🇨🇲" },
  { city: "Bamenda", country: "Cameroun", flag: "🇨🇲" },
  { city: "Buea", country: "Cameroun", flag: "🇨🇲" },
  { city: "Limbe", country: "Cameroun", flag: "🇨🇲" },
  { city: "Ebolowa", country: "Cameroun", flag: "🇨🇲" },
  { city: "Kribi", country: "Cameroun", flag: "🇨🇲" },

  // ── RDC 🇨🇩
  { city: "Kinshasa", country: "RDC", flag: "🇨🇩" },
  { city: "Lubumbashi", country: "RDC", flag: "🇨🇩" },
  { city: "Mbuji-Mayi", country: "RDC", flag: "🇨🇩" },
  { city: "Goma", country: "RDC", flag: "🇨🇩" },
  { city: "Bukavu", country: "RDC", flag: "🇨🇩" },
  { city: "Kisangani", country: "RDC", flag: "🇨🇩" },
  { city: "Matadi", country: "RDC", flag: "🇨🇩" },
  { city: "Kananga", country: "RDC", flag: "🇨🇩" },
  { city: "Bunia", country: "RDC", flag: "🇨🇩" },
  { city: "Beni", country: "RDC", flag: "🇨🇩" },
  { city: "Kolwezi", country: "RDC", flag: "🇨🇩" },
  { city: "Likasi", country: "RDC", flag: "🇨🇩" },

  // ── Congo-Brazzaville 🇨🇬
  { city: "Brazzaville", country: "Congo", flag: "🇨🇬" },
  { city: "Pointe-Noire", country: "Congo", flag: "🇨🇬" },
  { city: "Dolisie", country: "Congo", flag: "🇨🇬" },
  { city: "Nkayi", country: "Congo", flag: "🇨🇬" },
  { city: "Impfondo", country: "Congo", flag: "🇨🇬" },

  // ── Gabon 🇬🇦
  { city: "Libreville", country: "Gabon", flag: "🇬🇦" },
  { city: "Port-Gentil", country: "Gabon", flag: "🇬🇦" },
  { city: "Franceville", country: "Gabon", flag: "🇬🇦" },
  { city: "Oyem", country: "Gabon", flag: "🇬🇦" },
  { city: "Moanda", country: "Gabon", flag: "🇬🇦" },
  { city: "Lambaréné", country: "Gabon", flag: "🇬🇦" },

  // ── Guinée équatoriale 🇬🇶
  { city: "Malabo", country: "Guinée équatoriale", flag: "🇬🇶" },
  { city: "Bata", country: "Guinée équatoriale", flag: "🇬🇶" },

  // ── Centrafrique 🇨🇫
  { city: "Bangui", country: "Centrafrique", flag: "🇨🇫" },
  { city: "Bimbo", country: "Centrafrique", flag: "🇨🇫" },

  // ── Tchad 🇹🇩
  { city: "N'Djamena", country: "Tchad", flag: "🇹🇩" },
  { city: "Moundou", country: "Tchad", flag: "🇹🇩" },
  { city: "Sarh", country: "Tchad", flag: "🇹🇩" },
  { city: "Abéché", country: "Tchad", flag: "🇹🇩" },

  // ── Mauritanie 🇲🇷
  { city: "Nouakchott", country: "Mauritanie", flag: "🇲🇷" },
  { city: "Nouadhibou", country: "Mauritanie", flag: "🇲🇷" },
  { city: "Zouerate", country: "Mauritanie", flag: "🇲🇷" },
  { city: "Rosso", country: "Mauritanie", flag: "🇲🇷" },

  // ── Sierra Leone 🇸🇱
  { city: "Freetown", country: "Sierra Leone", flag: "🇸🇱" },
  { city: "Bo", country: "Sierra Leone", flag: "🇸🇱" },
  { city: "Kenema", country: "Sierra Leone", flag: "🇸🇱" },

  // ── Liberia 🇱🇷
  { city: "Monrovia", country: "Liberia", flag: "🇱🇷" },
  { city: "Gbarnga", country: "Liberia", flag: "🇱🇷" },

  // ── Gambie 🇬🇲
  { city: "Banjul", country: "Gambie", flag: "🇬🇲" },
  { city: "Serekunda", country: "Gambie", flag: "🇬🇲" },
  { city: "Brikama", country: "Gambie", flag: "🇬🇲" },

  // ── Cap-Vert 🇨🇻
  { city: "Praia", country: "Cap-Vert", flag: "🇨🇻" },
  { city: "Mindelo", country: "Cap-Vert", flag: "🇨🇻" },

  // ── Maroc 🇲🇦
  { city: "Casablanca", country: "Maroc", flag: "🇲🇦" },
  { city: "Rabat", country: "Maroc", flag: "🇲🇦" },
  { city: "Fès", country: "Maroc", flag: "🇲🇦" },
  { city: "Marrakech", country: "Maroc", flag: "🇲🇦" },
  { city: "Tanger", country: "Maroc", flag: "🇲🇦" },
  { city: "Agadir", country: "Maroc", flag: "🇲🇦" },
  { city: "Meknès", country: "Maroc", flag: "🇲🇦" },
  { city: "Oujda", country: "Maroc", flag: "🇲🇦" },

  // ── Algérie 🇩🇿
  { city: "Alger", country: "Algérie", flag: "🇩🇿" },
  { city: "Oran", country: "Algérie", flag: "🇩🇿" },
  { city: "Constantine", country: "Algérie", flag: "🇩🇿" },
  { city: "Annaba", country: "Algérie", flag: "🇩🇿" },
  { city: "Batna", country: "Algérie", flag: "🇩🇿" },
  { city: "Sétif", country: "Algérie", flag: "🇩🇿" },
  { city: "Blida", country: "Algérie", flag: "🇩🇿" },
  { city: "Tlemcen", country: "Algérie", flag: "🇩🇿" },

  // ── Tunisie 🇹🇳
  { city: "Tunis", country: "Tunisie", flag: "🇹🇳" },
  { city: "Sfax", country: "Tunisie", flag: "🇹🇳" },
  { city: "Sousse", country: "Tunisie", flag: "🇹🇳" },
  { city: "Kairouan", country: "Tunisie", flag: "🇹🇳" },
  { city: "Bizerte", country: "Tunisie", flag: "🇹🇳" },

  // ── Égypte 🇪🇬
  { city: "Le Caire", country: "Égypte", flag: "🇪🇬" },
  { city: "Alexandrie", country: "Égypte", flag: "🇪🇬" },
  { city: "Gizeh", country: "Égypte", flag: "🇪🇬" },
  { city: "Louxor", country: "Égypte", flag: "🇪🇬" },

  // ── Kenya 🇰🇪
  { city: "Nairobi", country: "Kenya", flag: "🇰🇪" },
  { city: "Mombasa", country: "Kenya", flag: "🇰🇪" },
  { city: "Kisumu", country: "Kenya", flag: "🇰🇪" },
  { city: "Nakuru", country: "Kenya", flag: "🇰🇪" },
  { city: "Eldoret", country: "Kenya", flag: "🇰🇪" },

  // ── Tanzanie 🇹🇿
  { city: "Dar es Salaam", country: "Tanzanie", flag: "🇹🇿" },
  { city: "Zanzibar", country: "Tanzanie", flag: "🇹🇿" },
  { city: "Dodoma", country: "Tanzanie", flag: "🇹🇿" },
  { city: "Arusha", country: "Tanzanie", flag: "🇹🇿" },
  { city: "Mwanza", country: "Tanzanie", flag: "🇹🇿" },

  // ── Rwanda 🇷🇼
  { city: "Kigali", country: "Rwanda", flag: "🇷🇼" },
  { city: "Butare", country: "Rwanda", flag: "🇷🇼" },

  // ── Éthiopie 🇪🇹
  { city: "Addis-Abeba", country: "Éthiopie", flag: "🇪🇹" },
  { city: "Dire Dawa", country: "Éthiopie", flag: "🇪🇹" },
  { city: "Mekelle", country: "Éthiopie", flag: "🇪🇹" },
  { city: "Gondar", country: "Éthiopie", flag: "🇪🇹" },

  // ── Afrique du Sud 🇿🇦
  { city: "Johannesburg", country: "Afrique du Sud", flag: "🇿🇦" },
  { city: "Le Cap", country: "Afrique du Sud", flag: "🇿🇦" },
  { city: "Durban", country: "Afrique du Sud", flag: "🇿🇦" },
  { city: "Pretoria", country: "Afrique du Sud", flag: "🇿🇦" },
  { city: "Port Elizabeth", country: "Afrique du Sud", flag: "🇿🇦" },

  // ── Madagascar 🇲🇬
  { city: "Antananarivo", country: "Madagascar", flag: "🇲🇬" },
  { city: "Toamasina", country: "Madagascar", flag: "🇲🇬" },
  { city: "Fianarantsoa", country: "Madagascar", flag: "🇲🇬" },

  // ── France (diaspora) 🇫🇷
  { city: "Paris", country: "France", flag: "🇫🇷" },
  { city: "Lyon", country: "France", flag: "🇫🇷" },
  { city: "Marseille", country: "France", flag: "🇫🇷" },
  { city: "Bordeaux", country: "France", flag: "🇫🇷" },
  { city: "Toulouse", country: "France", flag: "🇫🇷" },
  { city: "Nantes", country: "France", flag: "🇫🇷" },
  { city: "Strasbourg", country: "France", flag: "🇫🇷" },
  { city: "Montpellier", country: "France", flag: "🇫🇷" },
  { city: "Nice", country: "France", flag: "🇫🇷" },
  { city: "Rennes", country: "France", flag: "🇫🇷" },
  { city: "Grenoble", country: "France", flag: "🇫🇷" },

  // ── Belgique 🇧🇪
  { city: "Bruxelles", country: "Belgique", flag: "🇧🇪" },
  { city: "Liège", country: "Belgique", flag: "🇧🇪" },
  { city: "Anvers", country: "Belgique", flag: "🇧🇪" },
  { city: "Gand", country: "Belgique", flag: "🇧🇪" },

  // ── Suisse 🇨🇭
  { city: "Genève", country: "Suisse", flag: "🇨🇭" },
  { city: "Zurich", country: "Suisse", flag: "🇨🇭" },
  { city: "Berne", country: "Suisse", flag: "🇨🇭" },
  { city: "Lausanne", country: "Suisse", flag: "🇨🇭" },

  // ── Canada 🇨🇦
  { city: "Montréal", country: "Canada", flag: "🇨🇦" },
  { city: "Ottawa", country: "Canada", flag: "🇨🇦" },
  { city: "Toronto", country: "Canada", flag: "🇨🇦" },
  { city: "Québec", country: "Canada", flag: "🇨🇦" },
  { city: "Vancouver", country: "Canada", flag: "🇨🇦" },

  // ── États-Unis 🇺🇸
  { city: "New York", country: "États-Unis", flag: "🇺🇸" },
  { city: "Atlanta", country: "États-Unis", flag: "🇺🇸" },
  { city: "Washington D.C.", country: "États-Unis", flag: "🇺🇸" },
  { city: "Houston", country: "États-Unis", flag: "🇺🇸" },
  { city: "Los Angeles", country: "États-Unis", flag: "🇺🇸" },
  { city: "Chicago", country: "États-Unis", flag: "🇺🇸" },
  { city: "Miami", country: "États-Unis", flag: "🇺🇸" },
  { city: "Dallas", country: "États-Unis", flag: "🇺🇸" },
  { city: "Minneapolis", country: "États-Unis", flag: "🇺🇸" },
  { city: "Columbus", country: "États-Unis", flag: "🇺🇸" },

  // ── Royaume-Uni 🇬🇧
  { city: "Londres", country: "Royaume-Uni", flag: "🇬🇧" },
  { city: "Manchester", country: "Royaume-Uni", flag: "🇬🇧" },
  { city: "Birmingham", country: "Royaume-Uni", flag: "🇬🇧" },
  { city: "Leeds", country: "Royaume-Uni", flag: "🇬🇧" },

  // ── Italie 🇮🇹
  { city: "Rome", country: "Italie", flag: "🇮🇹" },
  { city: "Milan", country: "Italie", flag: "🇮🇹" },
  { city: "Naples", country: "Italie", flag: "🇮🇹" },

  // ── Espagne 🇪🇸
  { city: "Madrid", country: "Espagne", flag: "🇪🇸" },
  { city: "Barcelone", country: "Espagne", flag: "🇪🇸" },
  { city: "Valence", country: "Espagne", flag: "🇪🇸" },

  // ── Portugal 🇵🇹
  { city: "Lisbonne", country: "Portugal", flag: "🇵🇹" },
  { city: "Porto", country: "Portugal", flag: "🇵🇹" },

  // ── Allemagne 🇩🇪
  { city: "Berlin", country: "Allemagne", flag: "🇩🇪" },
  { city: "Hambourg", country: "Allemagne", flag: "🇩🇪" },
  { city: "Munich", country: "Allemagne", flag: "🇩🇪" },
  { city: "Cologne", country: "Allemagne", flag: "🇩🇪" },

  // ── Pays-Bas 🇳🇱
  { city: "Amsterdam", country: "Pays-Bas", flag: "🇳🇱" },
  { city: "Rotterdam", country: "Pays-Bas", flag: "🇳🇱" },
  { city: "La Haye", country: "Pays-Bas", flag: "🇳🇱" },

  // ── Brésil 🇧🇷
  { city: "São Paulo", country: "Brésil", flag: "🇧🇷" },
  { city: "Rio de Janeiro", country: "Brésil", flag: "🇧🇷" },
  { city: "Salvador", country: "Brésil", flag: "🇧🇷" },

  // ── Émirats 🇦🇪
  { city: "Dubaï", country: "Émirats arabes unis", flag: "🇦🇪" },
  { city: "Abu Dhabi", country: "Émirats arabes unis", flag: "🇦🇪" },

  // ── Chine 🇨🇳
  { city: "Guangzhou", country: "Chine", flag: "🇨🇳" },
  { city: "Shanghai", country: "Chine", flag: "🇨🇳" },
  { city: "Pékin", country: "Chine", flag: "🇨🇳" },
  { city: "Yiwu", country: "Chine", flag: "🇨🇳" },
];

export function searchPlaces(query: string): Place[] {
  if (!query.trim()) return PLACES.slice(0, 12);
  const q = query.toLowerCase().trim();
  return PLACES.filter(p =>
    p.city.toLowerCase().includes(q) ||
    p.city.toLowerCase().startsWith(q)
  ).slice(0, 20);
}
