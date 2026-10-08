/**
 * URL de base de l'API Brute Pawa.
 * - En dev Replit : EXPO_PUBLIC_DOMAIN est injecté automatiquement par le runner
 * - En build EAS  : EXPO_PUBLIC_API_URL est défini dans eas.json par profil
 */
export const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_URL ??
  (process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
    : "");
