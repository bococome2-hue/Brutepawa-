export const ADMIN_SECRET_PATH = "/bp-ops-9k2x7m-ctrl";

export const ADMIN_EMAILS: string[] = [
  "jeanjacques15414554@gmail.com",
  "kofi@africonnect.com",
];

export function isAdmin(email: string): boolean {
  return ADMIN_EMAILS.includes(email?.toLowerCase().trim());
}
