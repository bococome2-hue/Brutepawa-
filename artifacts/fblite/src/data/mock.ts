export const COUNTRIES = [
  { code: "BJ", name: "Bénin", flag: "🇧🇯", phone: "+229", currency: "FCFA", cities: ["Cotonou", "Porto-Novo", "Parakou", "Abomey"] },
  { code: "TG", name: "Togo", flag: "🇹🇬", phone: "+228", currency: "FCFA", cities: ["Lomé", "Sokodé", "Kara", "Atakpamé"] },
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮", phone: "+225", currency: "FCFA", cities: ["Abidjan", "Bouaké", "Yamoussoukro", "San Pedro"] },
  { code: "SN", name: "Sénégal", flag: "🇸🇳", phone: "+221", currency: "FCFA", cities: ["Dakar", "Thiès", "Saint-Louis", "Ziguinchor"] },
  { code: "BF", name: "Burkina Faso", flag: "🇧🇫", phone: "+226", currency: "FCFA", cities: ["Ouagadougou", "Bobo-Dioulasso", "Koudougou", "Banfora"] },
  { code: "NE", name: "Niger", flag: "🇳🇪", phone: "+227", currency: "FCFA", cities: ["Niamey", "Zinder", "Maradi", "Agadez"] },
  { code: "ML", name: "Mali", flag: "🇲🇱", phone: "+223", currency: "FCFA", cities: ["Bamako", "Sikasso", "Mopti", "Gao"] },
  { code: "GN", name: "Guinée", flag: "🇬🇳", phone: "+224", currency: "GNF", cities: ["Conakry", "Kankan", "Kindia", "Labé"] },
  { code: "CM", name: "Cameroun", flag: "🇨🇲", phone: "+237", currency: "FCFA", cities: ["Yaoundé", "Douala", "Garoua", "Bamenda"] },
  { code: "TD", name: "Tchad", flag: "🇹🇩", phone: "+235", currency: "FCFA", cities: ["N'Djaména", "Moundou", "Sarh", "Abéché"] },
  { code: "GA", name: "Gabon", flag: "🇬🇦", phone: "+241", currency: "FCFA", cities: ["Libreville", "Port-Gentil", "Franceville", "Oyem"] },
  { code: "CG", name: "Congo", flag: "🇨🇬", phone: "+242", currency: "FCFA", cities: ["Brazzaville", "Pointe-Noire", "Dolisie", "Nkayi"] },
  { code: "CD", name: "R.D. Congo", flag: "🇨🇩", phone: "+243", currency: "CDF", cities: ["Kinshasa", "Lubumbashi", "Mbuji-Mayi", "Kisangani"] },
  { code: "CF", name: "Centrafrique", flag: "🇨🇫", phone: "+236", currency: "FCFA", cities: ["Bangui", "Bimbo", "Mbaïki", "Berberati"] },
];

export function getCountry(code: string) {
  return COUNTRIES.find(c => c.code === code) ?? COUNTRIES[0];
}

export const USERS = [
  { id: 1, name: "Kofi Asante", initials: "KA", color: "#22C55E", city: "Accra", country: "Ghana", countryCode: "CI", flag: "🇨🇮", role: "Entrepreneur · Tech", verified: true, friends: 342, followers: 1240, score: "elite", badge: "⭐" },
  { id: 2, name: "Aminata Diallo", initials: "AM", color: "#E91E63", city: "Dakar", country: "Sénégal", countryCode: "SN", flag: "🇸🇳", role: "Marchande · Mode africaine", verified: true, friends: 218, followers: 876, score: "platine", badge: "💎" },
  { id: 3, name: "Yao Kouassi", initials: "YK", color: "#9C27B0", city: "Abidjan", country: "Côte d'Ivoire", countryCode: "CI", flag: "🇨🇮", role: "Développeur Web · Freelance", verified: false, friends: 156, followers: 423, score: "or", badge: "🏅" },
  { id: 4, name: "Fatou Diop", initials: "FD", color: "#FF9800", city: "Bamako", country: "Mali", countryCode: "ML", flag: "🇲🇱", role: "Créatrice · Mode africaine", verified: true, friends: 289, followers: 1102, score: "platine", badge: "💎" },
  { id: 5, name: "Moussa Coulibaly", initials: "MC", color: "#4CAF50", city: "Ouagadougou", country: "Burkina Faso", countryCode: "BF", flag: "🇧🇫", role: "Formateur · Marketing Digital", verified: false, friends: 98, followers: 234, score: "argent", badge: "🥈" },
  { id: 6, name: "Aïssatou Barry", initials: "AB", color: "#F44336", city: "Conakry", country: "Guinée", countryCode: "GN", flag: "🇬🇳", role: "Avocate · Conseil Juridique", verified: true, friends: 201, followers: 567, score: "or", badge: "🏅" },
  { id: 7, name: "Ibrahim Traoré", initials: "IT", color: "#00BCD4", city: "Lomé", country: "Togo", countryCode: "TG", flag: "🇹🇬", role: "Ingénieur · Télécoms", verified: true, friends: 178, followers: 654, score: "or", badge: "🏅" },
  { id: 8, name: "Marie-Claire Mbaye", initials: "MM", color: "#8BC34A", city: "Douala", country: "Cameroun", countryCode: "CM", flag: "🇨🇲", role: "Directrice · PME Export", verified: true, friends: 412, followers: 2100, score: "elite", badge: "⭐" },
  { id: 9, name: "Jean-Paul Nkosi", initials: "JN", color: "#FF5722", city: "Kinshasa", country: "R.D. Congo", countryCode: "CD", flag: "🇨🇩", role: "Entrepreneur · Import/Export", verified: false, friends: 87, followers: 312, score: "bronze", badge: "🥉" },
  { id: 10, name: "Sylvie Ondoua", initials: "SO", color: "#607D8B", city: "Libreville", country: "Gabon", countryCode: "GA", flag: "🇬🇦", role: "DG · Groupe Ondoua", verified: true, friends: 534, followers: 3200, score: "elite", badge: "⭐" },
];

export const POSTS = [
  { id: 1, userId: 1, content: "Fier de lancer Brute Pawa, la plateforme sociale, professionnelle et commerciale de référence en Afrique francophone ! 🚀🌍 Réseau, marketplace, emplois, tontines et bien plus.", emoji: "🚀", time: "Il y a 2 min", likes: 247, comments: 38, shares: 12, liked: false, sponsored: false },
  { id: 2, userId: 2, content: "Ma tontine du mois vient d'atteindre son objectif 🎉 On est 8 membres et on a collecté 400 000 FCFA en 4 semaines. La solidarité africaine, ça marche vraiment !", emoji: "💰", time: "Il y a 15 min", likes: 183, comments: 24, shares: 6, liked: true, sponsored: false },
  { id: 3, userId: 4, content: "Nouvelle collection de boubous disponibles ! 👗 Livraison dans toute l'Afrique de l'Ouest. Contactez-moi pour commander. #ModeAfricaine #BrutePawa", emoji: "👗", time: "Il y a 1 h", likes: 312, comments: 45, shares: 28, liked: false, sponsored: true, sponsorTag: "Sponsorisé" },
  { id: 4, userId: 3, content: "Je viens de terminer ma formation en développement web 📚 Je recommande à tous ceux qui veulent se lancer dans le numérique. Les cours sont en français et très bien structurés.", emoji: "📚", time: "Il y a 3 h", likes: 94, comments: 17, shares: 9, liked: false, sponsored: false },
  { id: 5, userId: 5, content: "Nouveau cours disponible : 'Gagner sa vie en ligne depuis l'Afrique' 💻 Inscrivez-vous maintenant, les 50 premières places sont gratuites ! #Formation #Digital", emoji: "💻", time: "Il y a 5 h", likes: 156, comments: 21, shares: 14, liked: false, sponsored: false },
  { id: 6, userId: 8, content: "🇨🇲 Depuis Douala, nous exportons des produits artisanaux vers 12 pays africains. Brute Pawa a transformé notre façon de travailler. Merci à cette communauté incroyable !", emoji: "🌍", time: "Il y a 7 h", likes: 489, comments: 62, shares: 34, liked: false, sponsored: false },
  { id: 7, userId: 10, content: "Le réseau professionnel africain se construit ici. 2 ans sur Brute Pawa, +3200 abonnés, 15 partenariats signés avec des entreprises de 8 pays. L'Afrique se connecte ! 💪", emoji: "💼", time: "Il y a 1 j", likes: 724, comments: 98, shares: 87, liked: false, sponsored: true, sponsorTag: "Sponsorisé" },
];

export const STORIES = [
  { id: 1, userId: 2, bg: "#E91E63", emoji: "💃" },
  { id: 2, userId: 3, bg: "#9C27B0", emoji: "🎓" },
  { id: 3, userId: 4, bg: "#FF9800", emoji: "👗" },
  { id: 4, userId: 5, bg: "#4CAF50", emoji: "📱" },
  { id: 5, userId: 8, bg: "#00BCD4", emoji: "🌍" },
  { id: 6, userId: 10, bg: "#607D8B", emoji: "💼" },
];

export const PRODUCTS = [
  { id: 1, name: "Boubou brodé premium", price: 35000, currency: "FCFA", seller: "Fatou Diop", city: "Bamako", country: "Mali", countryCode: "ML", flag: "🇲🇱", category: "Mode", emoji: "👗", condition: "Neuf", likes: 42, verified: true },
  { id: 2, name: "Smartphone Samsung A54", price: 180000, currency: "FCFA", seller: "Moussa Coulibaly", city: "Ouagadougou", country: "Burkina Faso", countryCode: "BF", flag: "🇧🇫", category: "Électronique", emoji: "📱", condition: "Occasion", likes: 28, verified: false },
  { id: 3, name: "Tissu wax hollandais 6m", price: 15000, currency: "FCFA", seller: "Aminata Diallo", city: "Dakar", country: "Sénégal", countryCode: "SN", flag: "🇸🇳", category: "Mode", emoji: "🧵", condition: "Neuf", likes: 67, verified: true },
  { id: 4, name: "Laptop HP 8Go RAM", price: 250000, currency: "FCFA", seller: "Yao Kouassi", city: "Abidjan", country: "Côte d'Ivoire", countryCode: "CI", flag: "🇨🇮", category: "Électronique", emoji: "💻", condition: "Occasion", likes: 19, verified: true },
  { id: 5, name: "Bijoux artisanaux or", price: 45000, currency: "FCFA", seller: "Aïssatou Barry", city: "Conakry", country: "Guinée", countryCode: "GN", flag: "🇬🇳", category: "Bijoux", emoji: "💍", condition: "Neuf", likes: 88, verified: true },
  { id: 6, name: "Sac en cuir fait main", price: 28000, currency: "FCFA", seller: "Fatou Diop", city: "Bamako", country: "Mali", countryCode: "ML", flag: "🇲🇱", category: "Mode", emoji: "👜", condition: "Neuf", likes: 54, verified: true },
  { id: 7, name: "Tabouret bété sculpté", price: 22000, currency: "FCFA", seller: "Kofi Asante", city: "Abidjan", country: "Côte d'Ivoire", countryCode: "CI", flag: "🇨🇮", category: "Artisanat", emoji: "🪑", condition: "Neuf", likes: 31, verified: true },
  { id: 8, name: "Huile de palme bio 5L", price: 8500, currency: "FCFA", seller: "Ibrahim Traoré", city: "Lomé", country: "Togo", countryCode: "TG", flag: "🇹🇬", category: "Alimentation", emoji: "🫙", condition: "Neuf", likes: 44, verified: false },
  { id: 9, name: "Moto Yamaha 125cc", price: 450000, currency: "FCFA", seller: "Jean-Paul Nkosi", city: "Kinshasa", country: "R.D. Congo", countryCode: "CD", flag: "🇨🇩", category: "Auto/Moto", emoji: "🏍️", condition: "Occasion", likes: 72, verified: false },
  { id: 10, name: "Parfum oud arabique", price: 35000, currency: "FCFA", seller: "Marie-Claire Mbaye", city: "Douala", country: "Cameroun", countryCode: "CM", flag: "🇨🇲", category: "Beauté", emoji: "🧴", condition: "Neuf", likes: 59, verified: true },
];

export const SERVICES = [
  { id: 1, name: "Développement web & mobile", provider: "Yao Kouassi", city: "Abidjan", countryCode: "CI", flag: "🇨🇮", price: 150000, currency: "FCFA", duration: "par projet", emoji: "💻", rating: 4.8, reviews: 23, verified: true },
  { id: 2, name: "Création de logo & identité visuelle", provider: "Moussa Coulibaly", city: "Ouagadougou", countryCode: "BF", flag: "🇧🇫", price: 25000, currency: "FCFA", duration: "par logo", emoji: "🎨", rating: 4.6, reviews: 41, verified: false },
  { id: 3, name: "Conseil juridique entreprises", provider: "Aïssatou Barry", city: "Conakry", countryCode: "GN", flag: "🇬🇳", price: 50000, currency: "FCFA", duration: "par heure", emoji: "⚖️", rating: 4.9, reviews: 18, verified: true },
  { id: 4, name: "Couture sur mesure (prêt-à-porter)", provider: "Fatou Diop", city: "Bamako", countryCode: "ML", flag: "🇲🇱", price: 20000, currency: "FCFA", duration: "par pièce", emoji: "✂️", rating: 4.7, reviews: 67, verified: true },
  { id: 5, name: "Comptabilité & gestion PME", provider: "Sylvie Ondoua", city: "Libreville", countryCode: "GA", flag: "🇬🇦", price: 80000, currency: "FCFA", duration: "par mois", emoji: "📊", rating: 4.9, reviews: 34, verified: true },
  { id: 6, name: "Formation marketing digital", provider: "Ibrahim Traoré", city: "Lomé", countryCode: "TG", flag: "🇹🇬", price: 45000, currency: "FCFA", duration: "par formation", emoji: "📈", rating: 4.5, reviews: 52, verified: false },
];

export const JOBS = [
  { id: 1, title: "Développeur React.js", company: "Brute Pawa Tech", city: "Abidjan", country: "Côte d'Ivoire", flag: "🇨🇮", type: "CDI", salary: "400 000 – 600 000 FCFA", posted: "Il y a 2 jours", emoji: "💼", applied: false },
  { id: 2, title: "Community Manager", company: "Boutique Fatou Mode", city: "Dakar", country: "Sénégal", flag: "🇸🇳", type: "CDD", salary: "150 000 FCFA", posted: "Il y a 5 jours", emoji: "📱", applied: false },
  { id: 3, title: "Comptable senior", company: "Groupe Ondoua SA", city: "Libreville", country: "Gabon", flag: "🇬🇦", type: "CDI", salary: "350 000 FCFA", posted: "Aujourd'hui", emoji: "📊", applied: false },
  { id: 4, title: "Responsable Marketing", company: "TechHub Douala", city: "Douala", country: "Cameroun", flag: "🇨🇲", type: "CDI", salary: "280 000 – 350 000 FCFA", posted: "Il y a 1 jour", emoji: "📈", applied: false },
  { id: 5, title: "Chef de projet digital", company: "Startup Mali", city: "Bamako", country: "Mali", flag: "🇲🇱", type: "CDD", salary: "220 000 FCFA", posted: "Il y a 3 jours", emoji: "🚀", applied: false },
  { id: 6, title: "Mission : Traduction FR/AR", company: "Cabinet Barry", city: "En ligne", country: "Guinée", flag: "🇬🇳", type: "Freelance", salary: "80 000 FCFA", posted: "Il y a 1 jour", emoji: "📝", applied: false },
  { id: 7, title: "Rédaction de contenu web", company: "Startup Dakar", city: "En ligne", country: "Sénégal", flag: "🇸🇳", type: "Freelance", salary: "30 000 FCFA", posted: "Aujourd'hui", emoji: "✍️", applied: false },
  { id: 8, title: "Design de flyers", company: "Événement Lomé", city: "En ligne", country: "Togo", flag: "🇹🇬", type: "Freelance", salary: "20 000 FCFA", posted: "Il y a 2 jours", emoji: "🎨", applied: false },
];

export const GROUPS = [
  { id: 1, name: "Entrepreneurs Africains 🌍", members: 12840, category: "Business", emoji: "💼", joined: true, country: "Multi-pays" },
  { id: 2, name: "Mode & Artisanat West Africa", members: 8920, category: "Mode", emoji: "👗", joined: false, country: "Multi-pays" },
  { id: 3, name: "Développeurs #237 Cameroun", members: 5630, category: "Tech", emoji: "💻", joined: true, country: "Cameroun" },
  { id: 4, name: "Tontines & Épargne Solidaire", members: 3210, category: "Finance", emoji: "🏦", joined: false, country: "Multi-pays" },
  { id: 5, name: "Étudiants Africains à l'Étranger", members: 18750, category: "Éducation", emoji: "🎓", joined: false, country: "Multi-pays" },
  { id: 6, name: "PME Sénégal Business", members: 4200, category: "Business", emoji: "🇸🇳", joined: false, country: "Sénégal" },
  { id: 7, name: "Femmes Entrepreneures RDC", members: 2850, category: "Business", emoji: "👩‍💼", joined: false, country: "R.D. Congo" },
];

export const PAGES = [
  { id: 1, name: "Brute Pawa Officiel", followers: 48200, category: "Application", emoji: "🌍", liked: true },
  { id: 2, name: "Mode Africaine Magazine", followers: 18500, category: "Magazine", emoji: "👗", liked: false },
  { id: 3, name: "Tech Hub Abidjan", followers: 9200, category: "Technologie", emoji: "💡", liked: true },
  { id: 4, name: "Recettes Africaines", followers: 31000, category: "Cuisine", emoji: "🍲", liked: false },
  { id: 5, name: "Emplois Afrique Francophone", followers: 22400, category: "Emploi", emoji: "💼", liked: true },
  { id: 6, name: "Investisseurs Afrique", followers: 14800, category: "Finance", emoji: "📈", liked: false },
];

export const COMPANIES = [
  { id: 1, name: "TechHub Douala", sector: "Technologie", city: "Douala", country: "Cameroun", flag: "🇨🇲", employees: "50–200", emoji: "💡", verified: true, followers: 4200 },
  { id: 2, name: "Groupe Ondoua SA", sector: "Import/Export", city: "Libreville", country: "Gabon", flag: "🇬🇦", employees: "200+", emoji: "🏢", verified: true, followers: 8900 },
  { id: 3, name: "Boutique Fatou Mode", sector: "Mode & Textile", city: "Bamako", country: "Mali", flag: "🇲🇱", employees: "1–10", emoji: "👗", verified: true, followers: 1102 },
  { id: 4, name: "Dakar Fintech Lab", sector: "Fintech", city: "Dakar", country: "Sénégal", flag: "🇸🇳", employees: "10–50", emoji: "💳", verified: true, followers: 3400 },
  { id: 5, name: "Agri-Congo SARL", sector: "Agriculture", city: "Brazzaville", country: "Congo", flag: "🇨🇬", employees: "50–200", emoji: "🌾", verified: false, followers: 890 },
];

export const NOTIFICATIONS = [
  { id: 1, type: "like", user: "Aminata Diallo", initials: "AM", color: "#E91E63", action: "a aimé votre publication", detail: "🚀 Fier de lancer Brute Pawa...", time: "Il y a 2 min", read: false },
  { id: 2, type: "friend", user: "Moussa Coulibaly", initials: "MC", color: "#4CAF50", action: "vous a envoyé une demande d'ami", detail: "", time: "Il y a 10 min", read: false },
  { id: 3, type: "comment", user: "Yao Kouassi", initials: "YK", color: "#9C27B0", action: "a commenté votre publication", detail: "\"Super initiative ! 🙌\"", time: "Il y a 30 min", read: false },
  { id: 4, type: "message", user: "Fatou Diop", initials: "FD", color: "#FF9800", action: "vous a envoyé un message", detail: "Bonjour, êtes-vous disponible ?", time: "Il y a 1 h", read: true },
  { id: 5, type: "job", user: "Système", initials: "🔔", color: "#22C55E", action: "Nouvelle offre correspondant à votre profil", detail: "Développeur React.js – Brute Pawa Tech", time: "Il y a 2 h", read: true },
  { id: 6, type: "tontine", user: "Système", initials: "💰", color: "#F44336", action: "Rappel : cotisation tontine à payer", detail: "Tontine Famille – Échéance demain", time: "Il y a 3 h", read: true },
  { id: 7, type: "verified", user: "Brute Pawa", initials: "⭐", color: "#FFD700", action: "Votre compte a été vérifié", detail: "Badge de vérification ✅ activé", time: "Il y a 5 h", read: true },
  { id: 8, type: "group", user: "Entrepreneurs Africains", initials: "💼", color: "#22C55E", action: "nouvelle publication dans le groupe", detail: "\"5 conseils pour développer son business en Afrique\"", time: "Il y a 6 h", read: true },
  { id: 9, type: "premium", user: "Brute Pawa", initials: "💳", color: "#9C27B0", action: "Votre période Premium se termine dans 3 jours", detail: "Renouvelez pour garder vos avantages", time: "Il y a 1 j", read: true },
];

export const CONVERSATIONS = [
  { id: 1, user: USERS[1], lastMessage: "Bonjour, êtes-vous disponible pour discuter ?", time: "14:32", unread: 2 },
  { id: 2, user: USERS[3], lastMessage: "Merci pour la commande ! J'envoie aujourd'hui.", time: "12:15", unread: 0 },
  { id: 3, user: USERS[2], lastMessage: "Le cours est vraiment excellent !", time: "Hier", unread: 1 },
  { id: 4, user: USERS[4], lastMessage: "D'accord, je vous rappelle demain.", time: "Hier", unread: 0 },
  { id: 5, user: USERS[5], lastMessage: "Votre dossier est bien reçu.", time: "Lun.", unread: 0 },
];

export const TONTINES = [
  { id: 1, name: "Tontine Famille Asante", members: 8, amount: 50000, currency: "FCFA", cycle: "Mensuel", nextDate: "15 juin 2026", totalSaved: 400000, myTurn: false, emoji: "👨‍👩‍👧‍👦" },
  { id: 2, name: "Entrepreneurs Abidjan", members: 12, amount: 100000, currency: "FCFA", cycle: "Mensuel", nextDate: "20 juin 2026", totalSaved: 1200000, myTurn: true, emoji: "💼" },
];

export const COURSES = [
  { id: 1, title: "Développement Web de A à Z", instructor: "Yao Kouassi", level: "Débutant", price: 0, currency: "FCFA", duration: "12h", students: 1840, rating: 4.8, emoji: "💻", enrolled: true, progress: 65 },
  { id: 2, title: "Marketing Digital en Afrique", instructor: "Moussa Coulibaly", level: "Intermédiaire", price: 45000, currency: "FCFA", duration: "8h", students: 920, rating: 4.6, emoji: "📱", enrolled: false, progress: 0 },
  { id: 3, title: "Entrepreneuriat & Business Plan", instructor: "Kofi Asante", level: "Tous niveaux", price: 0, currency: "FCFA", duration: "6h", students: 3200, rating: 4.9, emoji: "🚀", enrolled: true, progress: 30 },
  { id: 4, title: "Gestion financière PME Afrique", instructor: "Sylvie Ondoua", level: "Avancé", price: 60000, currency: "FCFA", duration: "10h", students: 480, rating: 4.7, emoji: "📊", enrolled: false, progress: 0 },
];

export const STATS_BY_COUNTRY = [
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮", users: 48200, active: 32100, posts: 124000, jobs: 890, sales: 4200000 },
  { code: "SN", name: "Sénégal", flag: "🇸🇳", users: 41800, active: 28900, posts: 98000, jobs: 720, sales: 3800000 },
  { code: "CM", name: "Cameroun", flag: "🇨🇲", users: 38500, active: 25600, posts: 87000, jobs: 640, sales: 3200000 },
  { code: "ML", name: "Mali", flag: "🇲🇱", users: 28400, active: 18700, posts: 62000, jobs: 420, sales: 2100000 },
  { code: "BF", name: "Burkina Faso", flag: "🇧🇫", users: 22100, active: 14200, posts: 48000, jobs: 310, sales: 1600000 },
  { code: "CD", name: "R.D. Congo", flag: "🇨🇩", users: 19800, active: 12400, posts: 41000, jobs: 280, sales: 1400000 },
  { code: "GN", name: "Guinée", flag: "🇬🇳", users: 15600, active: 9800, posts: 32000, jobs: 210, sales: 980000 },
  { code: "TG", name: "Togo", flag: "🇹🇬", users: 14200, active: 8900, posts: 28000, jobs: 180, sales: 840000 },
  { code: "BJ", name: "Bénin", flag: "🇧🇯", users: 12800, active: 7600, posts: 24000, jobs: 150, sales: 720000 },
  { code: "NE", name: "Niger", flag: "🇳🇪", users: 10200, active: 6100, posts: 19000, jobs: 120, sales: 560000 },
  { code: "GA", name: "Gabon", flag: "🇬🇦", users: 9400, active: 5800, posts: 17000, jobs: 110, sales: 520000 },
  { code: "CG", name: "Congo", flag: "🇨🇬", users: 8200, active: 5100, posts: 14000, jobs: 90, sales: 420000 },
  { code: "TD", name: "Tchad", flag: "🇹🇩", users: 6800, active: 4200, posts: 11000, jobs: 70, sales: 320000 },
  { code: "CF", name: "Centrafrique", flag: "🇨🇫", users: 3200, active: 1900, posts: 5000, jobs: 30, sales: 140000 },
];

export function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(".0", "") + " M";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(".0", "") + " k";
  return String(n);
}

export function getUser(id: number) {
  return USERS.find(u => u.id === id) ?? USERS[0];
}
