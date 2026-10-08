/**
 * Centralised user-profile reader.
 *
 * All components must use `useCurrentUser()` (React hook) or
 * `getCurrentUser()` (plain helper for callbacks / effects) instead of
 * reading localStorage directly.
 *
 * Storage keys are checked in priority order: "fb_user" → "bp_user".
 * If neither key exists the functions return an empty object `{}`.
 */

export interface CurrentUser {
  id?: number;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  bio?: string;
  phone?: string;
  country?: string;
  countryCode?: string;
  flag?: string;
  username?: string;
}

const STORAGE_KEYS = ["fb_user", "bp_user"] as const;

/** Plain helper — safe to call inside effects, callbacks, and regular code. */
export function getCurrentUser(): CurrentUser {
  for (const key of STORAGE_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        return JSON.parse(raw) as CurrentUser;
      } catch {
        // malformed JSON — try next key
      }
    }
  }
  return {};
}

/** Returns true when at least one storage key contains a value. */
export function isUserLoggedIn(): boolean {
  return STORAGE_KEYS.some(key => Boolean(localStorage.getItem(key)));
}

/**
 * React hook that returns the current user profile.
 * The value is read once at render time (mirrors the existing behaviour).
 * Use `getCurrentUser()` inside effects and async callbacks.
 */
export function useCurrentUser(): CurrentUser {
  return getCurrentUser();
}
