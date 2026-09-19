import { supabase } from "@/integrations/supabase/client";
import type { AppUser, ApiResult } from "@/types";

/**
 * Thin service layer around the backend auth client.
 * Phase 1: session reading helpers only — no UI flows wired yet.
 */

export async function getCurrentUser(): Promise<ApiResult<AppUser | null>> {
  const { data, error } = await supabase.auth.getSession();

  if (error) return { data: null, error: error.message };
  if (!data.session) return { data: null, error: null };

  const { user } = data.session;
  return {
    data: {
      id: user.id,
      email: user.email ?? null,
      fullName: (user.user_metadata?.full_name as string | undefined) ?? null,
    },
    error: null,
  };
}

export async function signOut(): Promise<ApiResult<null>> {
  const { error } = await supabase.auth.signOut();
  return { data: null, error: error?.message ?? null };
}
