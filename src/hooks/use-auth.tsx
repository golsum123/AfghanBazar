import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { createAuthStore } from "@/lib/auth-store";
import type { AppRole, Profile } from "@/types";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  hasRole: (role: AppRole) => boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Makes sure a signed-in user has a profile row and at least one role.
 * Runs with the user's own session, so RLS still applies.
 */
async function ensureProfile(user: User) {
  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!existing) {
    const meta = user.user_metadata ?? {};
    await supabase.from("profiles").insert({
      id: user.id,
      email: user.email ?? null,
      full_name: (meta["full_name"] as string | undefined) ?? null,
      phone: (meta["phone"] as string | undefined) ?? null,
      country: (meta["country"] as string | undefined) ?? null,
      city: (meta["city"] as string | undefined) ?? null,
    });
  }

  const { data: roleRows, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  // Only seed a default role after a successful read that found none; a failed read must not touch roles.
  if (!roleError && roleRows && roleRows.length === 0) {
    const requested = (user.user_metadata?.["requested_role"] as string | undefined) ?? "customer";
    const role: AppRole = requested === "seller" ? "seller" : "customer";
    await supabase.from("user_roles").insert({ user_id: user.id, role });
  }
}

async function fetchUser(current: Session) {
  await ensureProfile(current.user);

  const [{ data: profileRow }, { data: roleRows }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", current.user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", current.user.id),
  ]);

  return {
    profile: (profileRow as Profile | null) ?? null,
    roles: (roleRows ?? []).map((r) => r.role as AppRole),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => createAuthStore<Session, Profile>({ fetchUser }));
  const { session, profile, roles, loading } = useSyncExternalStore(
    store.subscribe,
    store.getState,
    store.getState,
  );

  useEffect(() => {
    let active = true;

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      if (active) store.applySession(next);
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (active) store.applySession(data.session);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [store]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      roles,
      loading,
      hasRole: (role: AppRole) => roles.includes(role),
      refreshProfile: async () => {
        const { data } = await supabase.auth.getSession();
        await store.reload(data.session);
      },
      signOut: async () => {
        store.clear();
        await supabase.auth.signOut();
      },
    }),
    [session, profile, roles, loading, store],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
