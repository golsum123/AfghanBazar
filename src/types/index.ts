/**
 * Shared application types for AfghanBazaar.
 * Phase 1: foundation-level types only.
 */

export type UserRole = "customer" | "seller" | "admin";

export interface AppUser {
  id: string;
  email: string | null;
  fullName?: string | null;
  role?: UserRole;
}

export type Country = "AF" | "IN";

export interface NavItem {
  label: string;
  to: string;
  icon?: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

export type LoadStatus = "idle" | "loading" | "success" | "error";

export interface ApiResult<T> {
  data: T | null;
  error: string | null;
}
