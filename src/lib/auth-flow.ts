import type { AppRole } from "../types/index.ts";

/** Only same-origin absolute paths are accepted as post-login targets. */
export function sanitizeRedirect(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.startsWith("/") && !value.startsWith("//") ? value : undefined;
}

const WORKSPACE_ROLES: Array<[prefix: string, allowed: AppRole[]]> = [
  ["/admin", ["admin"]],
  ["/seller", ["seller", "admin"]],
  ["/crm", ["crm_staff", "admin"]],
];

/** Mirrors the RequireRole guards so a redirect the user cannot open is not followed. */
function canOpen(path: string, roles: readonly AppRole[]): boolean {
  const pathname = path.split(/[?#]/)[0] ?? path;
  const match = WORKSPACE_ROLES.find(
    ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return !match || match[1].some((role) => roles.includes(role));
}

/**
 * Default landing workspace by role priority: admin, then CRM staff, then seller,
 * then customer. Used by sign-in and the header so both always agree.
 */
export function defaultWorkspace(roles: readonly AppRole[]): string {
  if (roles.includes("admin")) return "/admin";
  if (roles.includes("crm_staff")) return "/crm";
  if (roles.includes("seller")) return "/seller";
  return "/dashboard";
}

/**
 * Where to send a user once sign-in and role loading have both finished.
 * A safe `redirect` the user is allowed to open wins; otherwise the user lands on
 * their default workspace (see defaultWorkspace). Route guards still enforce access.
 */
export function postLoginDestination(roles: readonly AppRole[], redirect?: string): string {
  const requested = sanitizeRedirect(redirect);
  if (requested && canOpen(requested, roles)) return requested;
  return defaultWorkspace(roles);
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
