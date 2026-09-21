/**
 * Shared application types for AfghanBazaar.
 */

export type AppRole = "customer" | "seller" | "admin" | "crm_staff";

/** Kept for backwards compatibility with earlier phase-1 code. */
export type UserRole = AppRole;

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  avatar_url: string | null;
  role: AppRole;
  created_at: string;
  updated_at: string;
}

export interface AppUser {
  id: string;
  email: string | null;
  fullName?: string | null;
  role?: AppRole;
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
