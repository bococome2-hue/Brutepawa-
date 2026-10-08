/**
 * Licences et crédits — BrutePawa
 * Données extraites des métadonnées réelles des packages installés.
 * Généré à partir de pnpm-workspace.yaml + node_modules/.pnpm + artifacts/fblite/node_modules
 * Mis à jour : 17 août 2026
 */

export type LicenseEntry = {
  name: string;
  version: string;
  license: string;
  description: string;
  author: string;
  homepage: string;
  category: Category;
};

export type Category =
  | "Frameworks"
  | "Bibliothèques"
  | "Composants UI"
  | "Icônes"
  | "Outils CSS"
  | "Outils de développement"
  | "SDK et services";

export const LICENSES: LicenseEntry[] = [
  // ─── Frameworks ────────────────────────────────────────────────
  {
    name: "react",
    version: "19.1.0",
    license: "MIT",
    description: "React est une bibliothèque JavaScript pour construire des interfaces utilisateur.",
    author: "Meta Platforms, Inc. and React contributors",
    homepage: "https://react.dev",
    category: "Frameworks",
  },
  {
    name: "react-dom",
    version: "19.1.0",
    license: "MIT",
    description: "Module de rendu React pour le DOM web.",
    author: "Meta Platforms, Inc. and React contributors",
    homepage: "https://react.dev",
    category: "Frameworks",
  },
  {
    name: "vite",
    version: "7.3.5",
    license: "MIT",
    description: "Outil de build et serveur de développement rapide basé sur les modules ES natifs.",
    author: "Evan You",
    homepage: "https://vite.dev",
    category: "Frameworks",
  },
  {
    name: "tailwindcss",
    version: "4.3.1",
    license: "MIT",
    description: "Framework CSS utilitaire pour créer des interfaces personnalisées rapidement.",
    author: "Tailwind Labs Inc.",
    homepage: "https://tailwindcss.com",
    category: "Frameworks",
  },

  // ─── Bibliothèques ─────────────────────────────────────────────
  {
    name: "framer-motion",
    version: "12.40.0",
    license: "MIT",
    description: "Bibliothèque d'animation JavaScript simple et puissante pour React.",
    author: "Matt Perry",
    homepage: "https://www.framer.com/motion",
    category: "Bibliothèques",
  },
  {
    name: "@tanstack/react-query",
    version: "5.101.0",
    license: "MIT",
    description: "Hooks pour gérer, mettre en cache et synchroniser des données asynchrones dans React.",
    author: "Tanner Linsley",
    homepage: "https://tanstack.com/query",
    category: "Bibliothèques",
  },
  {
    name: "wouter",
    version: "3.10.0",
    license: "Unlicense",
    description: "Routeur minimaliste ~1.5 Ko pour React.",
    author: "Alexey Taktarov",
    homepage: "https://github.com/molefrog/wouter",
    category: "Bibliothèques",
  },
  {
    name: "zod",
    version: "3.25.76",
    license: "MIT",
    description: "Bibliothèque de validation et de déclaration de schémas TypeScript-first.",
    author: "Colin McDonnell",
    homepage: "https://zod.dev",
    category: "Bibliothèques",
  },
  {
    name: "react-hook-form",
    version: "7.79.0",
    license: "MIT",
    description: "Bibliothèque de formulaires performante, flexible et extensible pour React Hooks.",
    author: "Beier (Bill) Luo",
    homepage: "https://react-hook-form.com",
    category: "Bibliothèques",
  },
  {
    name: "@hookform/resolvers",
    version: "3.10.0",
    license: "MIT",
    description: "Résolveurs de validation pour React Hook Form (Zod, Yup, Joi, etc.).",
    author: "bluebill1049",
    homepage: "https://react-hook-form.com",
    category: "Bibliothèques",
  },
  {
    name: "date-fns",
    version: "3.6.0",
    license: "MIT",
    description: "Bibliothèque moderne d'utilitaires de dates en JavaScript.",
    author: "date-fns contributors",
    homepage: "https://date-fns.org",
    category: "Bibliothèques",
  },
  {
    name: "recharts",
    version: "2.15.4",
    license: "MIT",
    description: "Bibliothèque de graphiques React basée sur D3.",
    author: "recharts group",
    homepage: "https://recharts.org",
    category: "Bibliothèques",
  },
  {
    name: "embla-carousel-react",
    version: "8.6.0",
    license: "MIT",
    description: "Bibliothèque de carousel légère avec mouvement fluide et précision de balayage.",
    author: "David Jerleke",
    homepage: "https://www.embla-carousel.com",
    category: "Bibliothèques",
  },
  {
    name: "sonner",
    version: "2.0.7",
    license: "MIT",
    description: "Composant toast pour React, opinionated et élégant.",
    author: "Emil Kowalski",
    homepage: "https://sonner.emilkowal.ski",
    category: "Bibliothèques",
  },
  {
    name: "vaul",
    version: "1.1.2",
    license: "MIT",
    description: "Composant tiroir (drawer) pour React.",
    author: "Emil Kowalski",
    homepage: "https://vaul.emilkowal.ski",
    category: "Bibliothèques",
  },
  {
    name: "cmdk",
    version: "1.1.1",
    license: "MIT",
    description: "Composant palette de commandes (⌘K) pour React.",
    author: "Paco Coursey",
    homepage: "https://cmdk.paco.me",
    category: "Bibliothèques",
  },
  {
    name: "react-day-picker",
    version: "9.14.0",
    license: "MIT",
    description: "Sélecteur de date personnalisable pour React.",
    author: "Giampaolo Bellavite",
    homepage: "https://daypicker.dev",
    category: "Bibliothèques",
  },
  {
    name: "react-resizable-panels",
    version: "2.1.9",
    license: "MIT",
    description: "Composants React pour des groupes de panneaux redimensionnables.",
    author: "Brian Vaughn",
    homepage: "https://github.com/bvaughn/react-resizable-panels",
    category: "Bibliothèques",
  },
  {
    name: "input-otp",
    version: "1.4.2",
    license: "MIT",
    description: "Composant de saisie de code à usage unique (OTP) pour React.",
    author: "Guilherme Rodz",
    homepage: "https://input-otp.rodz.dev",
    category: "Bibliothèques",
  },
  {
    name: "next-themes",
    version: "0.4.6",
    license: "MIT",
    description: "Gestion des thèmes (clair/sombre) pour les applications React.",
    author: "Paco Coursey",
    homepage: "https://github.com/pacocoursey/next-themes",
    category: "Bibliothèques",
  },
  {
    name: "clsx",
    version: "2.1.1",
    license: "MIT",
    description: "Utilitaire minuscule (239 o) pour construire des chaînes className conditionnellement.",
    author: "Luke Edwards",
    homepage: "https://github.com/lukeed/clsx",
    category: "Bibliothèques",
  },

  // ─── Composants UI ─────────────────────────────────────────────
  {
    name: "@radix-ui/react-dialog",
    version: "1.1.16",
    license: "MIT",
    description: "Primitives de dialogue accessibles et non stylistées pour React.",
    author: "Radix UI",
    homepage: "https://radix-ui.com/primitives",
    category: "Composants UI",
  },
  {
    name: "@radix-ui/react-dropdown-menu",
    version: "2.1.17",
    license: "MIT",
    description: "Primitives de menu déroulant accessibles pour React.",
    author: "Radix UI",
    homepage: "https://radix-ui.com/primitives",
    category: "Composants UI",
  },
  {
    name: "@radix-ui/react-toast",
    version: "1.2.16",
    license: "MIT",
    description: "Primitives de notification toast accessibles pour React.",
    author: "Radix UI",
    homepage: "https://radix-ui.com/primitives",
    category: "Composants UI",
  },
  {
    name: "@radix-ui/react-select",
    version: "2.3.0",
    license: "MIT",
    description: "Primitives de sélection accessibles pour React.",
    author: "Radix UI",
    homepage: "https://radix-ui.com/primitives",
    category: "Composants UI",
  },
  {
    name: "@radix-ui/react-tabs",
    version: "1.1.14",
    license: "MIT",
    description: "Primitives d'onglets accessibles pour React.",
    author: "Radix UI",
    homepage: "https://radix-ui.com/primitives",
    category: "Composants UI",
  },
  {
    name: "@radix-ui/react-tooltip",
    version: "1.2.9",
    license: "MIT",
    description: "Primitives d'info-bulle accessibles pour React.",
    author: "Radix UI",
    homepage: "https://radix-ui.com/primitives",
    category: "Composants UI",
  },
  {
    name: "@radix-ui/react-slot",
    version: "1.2.5",
    license: "MIT",
    description: "Utilitaire de composition de composants pour Radix UI.",
    author: "Radix UI",
    homepage: "https://radix-ui.com/primitives",
    category: "Composants UI",
  },
  {
    name: "@radix-ui/react-separator",
    version: "1.1.9",
    license: "MIT",
    description: "Primitives de séparateur accessibles pour React.",
    author: "Radix UI",
    homepage: "https://radix-ui.com/primitives",
    category: "Composants UI",
  },
  {
    name: "@radix-ui/react-switch",
    version: "1.3.0",
    license: "MIT",
    description: "Primitives de bascule (switch) accessibles pour React.",
    author: "Radix UI",
    homepage: "https://radix-ui.com/primitives",
    category: "Composants UI",
  },
  {
    name: "@radix-ui/react-accordion",
    version: "1.2.13",
    license: "MIT",
    description: "Primitives d'accordéon accessibles pour React.",
    author: "Radix UI",
    homepage: "https://radix-ui.com/primitives",
    category: "Composants UI",
  },
  {
    name: "@radix-ui/react-avatar",
    version: "1.1.12",
    license: "MIT",
    description: "Primitives d'avatar accessibles pour React.",
    author: "Radix UI",
    homepage: "https://radix-ui.com/primitives",
    category: "Composants UI",
  },
  {
    name: "@radix-ui/react-checkbox",
    version: "1.3.4",
    license: "MIT",
    description: "Primitives de case à cocher accessibles pour React.",
    author: "Radix UI",
    homepage: "https://radix-ui.com/primitives",
    category: "Composants UI",
  },
  {
    name: "@radix-ui/react-progress",
    version: "1.1.9",
    license: "MIT",
    description: "Primitives de barre de progression accessibles pour React.",
    author: "Radix UI",
    homepage: "https://radix-ui.com/primitives",
    category: "Composants UI",
  },
  {
    name: "@radix-ui/react-popover",
    version: "1.1.16",
    license: "MIT",
    description: "Primitives de popover accessibles pour React.",
    author: "Radix UI",
    homepage: "https://radix-ui.com/primitives",
    category: "Composants UI",
  },

  // ─── Icônes ────────────────────────────────────────────────────
  {
    name: "lucide-react",
    version: "0.545.0",
    license: "ISC",
    description: "Collection d'icônes SVG propres et cohérentes pour les applications React.",
    author: "Eric Fennis",
    homepage: "https://lucide.dev",
    category: "Icônes",
  },
  {
    name: "react-icons",
    version: "5.6.0",
    license: "MIT",
    description: "Icônes SVG de bibliothèques populaires utilisables via des imports ES6 dans React.",
    author: "Goran Gajic",
    homepage: "https://react-icons.github.io/react-icons",
    category: "Icônes",
  },

  // ─── Outils CSS ────────────────────────────────────────────────
  {
    name: "tailwind-merge",
    version: "3.6.0",
    license: "MIT",
    description: "Fusion de classes Tailwind CSS sans conflits de styles.",
    author: "Dany Castillo",
    homepage: "https://github.com/dcastil/tailwind-merge",
    category: "Outils CSS",
  },
  {
    name: "class-variance-authority",
    version: "0.7.1",
    license: "Apache-2.0",
    description: "Utilitaire de gestion de variantes de composants basé sur des classes CSS.",
    author: "Joe Bell",
    homepage: "https://cva.style",
    category: "Outils CSS",
  },
  {
    name: "tw-animate-css",
    version: "1.4.0",
    license: "MIT",
    description: "Remplacement compatible TailwindCSS v4 pour tailwindcss-animate.",
    author: "Luca Bosin",
    homepage: "https://github.com/Wombosvideo/tw-animate-css",
    category: "Outils CSS",
  },

  // ─── Outils de développement ───────────────────────────────────
  {
    name: "@vitejs/plugin-react",
    version: "5.0.4",
    license: "MIT",
    description: "Plugin Vite officiel pour les projets React (Fast Refresh, JSX, etc.).",
    author: "Evan You",
    homepage: "https://github.com/vitejs/vite-plugin-react",
    category: "Outils de développement",
  },

  // ─── SDK et services ───────────────────────────────────────────
  {
    name: "@ffmpeg/ffmpeg",
    version: "0.12.15",
    license: "MIT",
    description: "Version WebAssembly de FFmpeg pour le navigateur.",
    author: "Jerome Wu",
    homepage: "https://ffmpegwasm.netlify.app",
    category: "SDK et services",
  },
];

/** Licences réellement présentes dans le projet */
export const PRESENT_LICENSES = [...new Set(LICENSES.map((l) => l.license))].sort();

/** Catégories présentes */
export const PRESENT_CATEGORIES = [...new Set(LICENSES.map((l) => l.category))];
