import type { AppRole } from "../types/index.ts";

/** Only same-origin absolute paths are accepted as post-login targets. */
export function sanitizeRedirect(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.startsWith("/") && !value.startsWith("//") ? value : undefined;
}

/**
 * Where to send a user once sign-in and role loading have both finished.
 * An explicit, safe `redirect` always wins; otherwise admins land on /admin.
 */
export function postLoginDestination(roles: readonly AppRole[], redirect?: string): string {
  return sanitizeRedirect(redirect) ?? (roles.includes("admin") ? "/admin" : "/dashboard");
}

/** A session change needs a fresh profile/role load only when the user differs from the loaded one. */
export function needsReload(loadedUserId: string | null, nextUserId: string | null): boolean {
  return loadedUserId !== nextUserId;
}

/**
 * Hands out tokens for async loads; only the latest token is current, so a slow
 * response for a previous session can never overwrite the current user's data.
 */
export function createLoadGuard() {
  let latest = 0;
  return {
    next(): number {
      latest += 1;
      return latest;
    },
    invalidate(): void {
      latest += 1;
    },
    isCurrent(token: number): boolean {
      return token === latest;
    },
  };
}
