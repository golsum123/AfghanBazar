import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { createLoadGuard, needsReload } from "@/lib/auth-flow";
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const guard = useRef(createLoadGuard());
  const loadedUserId = useRef<string | null>(null);

  /** Loads profile and roles for `current`; results are dropped if a newer load or sign-out superseded it. */
  const load = useCallback(async (current: Session | null) => {
    const token = guard.current.next();

    if (!current?.user) {
      loadedUserId.current = null;
      setProfile(null);
      setRoles([]);
      setLoading(false);
      return;
    }

    try {
      await ensureProfile(current.user);

      const [{ data: profileRow }, { data: roleRows }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", current.user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", current.user.id),
      ]);

      if (!guard.current.isCurrent(token)) return;
      loadedUserId.current = current.user.id;
      setProfile((profileRow as Profile | null) ?? null);
      setRoles((roleRows ?? []).map((r) => r.role as AppRole));
    } catch {
      if (!guard.current.isCurrent(token)) return;
      setProfile(null);
      setRoles([]);
    }
    if (guard.current.isCurrent(token)) setLoading(false);
  }, []);

  /** Applies a session change; a different user resets roles and holds `loading` until they are fetched. */
  const applySession = useCallback(
    (next: Session | null) => {
      setSession(next);
      const nextId = next?.user?.id ?? null;
      if (!needsReload(loadedUserId.current, nextId)) return;
      // Drop any in-flight load for the previous user and block routing until the new roles arrive.
      guard.current.invalidate();
      loadedUserId.current = null;
      setProfile(null);
      setRoles([]);
      if (nextId) setLoading(true);
      // Defer backend reads out of the auth callback.
      setTimeout(() => {
        void load(next);
      }, 0);
    },
    [load],
  );

  useEffect(() => {
    let active = true;
    const loadGuard = guard.current;

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return;
      applySession(next);
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      applySession(data.session);
    });

    return () => {
      active = false;
      loadGuard.invalidate();
      subscription.subscription.unsubscribe();
    };
  }, [applySession]);

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
        guard.current.invalidate();
        loadedUserId.current = null;
        setProfile(null);
        setRoles([]);
        await supabase.auth.signOut();
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
