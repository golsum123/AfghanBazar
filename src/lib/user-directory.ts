import type { AppRole } from "@/types";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface SellerSummary {
  storeName: string;
  approvalStatus: ApprovalStatus;
}

const ROLE_PRIORITY: AppRole[] = ["admin", "crm_staff", "seller", "customer"];

/** Orders roles from most to least privileged so the badges read consistently. */
export function sortRoles(roles: readonly AppRole[]): AppRole[] {
  return [...new Set(roles)].sort((a, b) => ROLE_PRIORITY.indexOf(a) - ROLE_PRIORITY.indexOf(b));
}

/** Groups user_roles rows by user. Authorization comes from here, never from profiles.role. */
export function groupRoles(
  rows: readonly { user_id: string; role: AppRole }[],
): Record<string, AppRole[]> {
  const map: Record<string, AppRole[]> = {};
  for (const row of rows) (map[row.user_id] ??= []).push(row.role);
  for (const id of Object.keys(map)) map[id] = sortRoles(map[id] ?? []);
  return map;
}

/**
 * True when the display-only profiles.role is not the account's most privileged real role.
 * Flags drift (for example a missing admin row) instead of hiding it.
 */
export function profileRoleDrifted(profileRole: AppRole, roles: readonly AppRole[]): boolean {
  const top = sortRoles(roles)[0];
  return top !== undefined && top !== profileRole;
}
