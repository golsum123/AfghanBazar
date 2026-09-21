import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
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

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (!roleRows || roleRows.length === 0) {
    const requested = (user.user_metadata?.["requested_role"] as string | undefined) ?? "customer";
    const role: AppRole = requested === "seller" ? "seller" : "customer";
    await supabase.from("user_roles").insert({ user_id: user.id, role });
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (current: Session | null) => {
    if (!current?.user) {
      setProfile(null);
      setRoles([]);
      setLoading(false);
      return;
    }

    await ensureProfile(current.user);

    const [{ data: profileRow }, { data: roleRows }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", current.user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", current.user.id),
    ]);

    setProfile((profileRow as Profile | null) ?? null);
    setRoles((roleRows ?? []).map((r) => r.role as AppRole));
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return;
      setSession(next);
      // Defer backend reads out of the auth callback.
      setTimeout(() => {
        void load(next);
      }, 0);
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      void load(data.session);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [load]);

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
        await load(data.session);
      },
      signOut: async () => {
        await supabase.auth.signOut();
        setProfile(null);
        setRoles([]);
      },
    }),
    [session, profile, roles, loading, load],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
