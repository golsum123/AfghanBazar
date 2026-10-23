import { createLoadGuard, needsReload, postLoginDestination } from "./auth-flow.ts";
import type { AppRole } from "../types/index.ts";

export interface SessionLike {
  user?: { id: string } | null;
}

export interface AuthSnapshot<S extends SessionLike, P> {
  session: S | null;
  profile: P | null;
  roles: AppRole[];
  loading: boolean;
}

interface Options<S extends SessionLike, P> {
  /** Fetches profile and roles for a signed-in session. May throw. */
  fetchUser: (session: S) => Promise<{ profile: P | null; roles: AppRole[] }>;
  /** Defers backend reads out of the auth callback. */
  defer?: (fn: () => void) => void;
}

/**
 * Framework-free auth state machine. A different user clears roles and holds
 * `loading` until theirs arrive; loads for superseded sessions are discarded.
 */
export function createAuthStore<S extends SessionLike, P>({ fetchUser, defer }: Options<S, P>) {
  const guard = createLoadGuard();
  const schedule = defer ?? ((fn: () => void) => void setTimeout(fn, 0));
  const listeners = new Set<() => void>();
  let loadedUserId: string | null = null;
  let state: AuthSnapshot<S, P> = { session: null, profile: null, roles: [], loading: true };

  function set(patch: Partial<AuthSnapshot<S, P>>) {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  }

  async function load(current: S | null) {
    const token = guard.next();
    if (!current?.user) {
      loadedUserId = null;
      set({ profile: null, roles: [], loading: false });
      return;
    }
    try {
      const result = await fetchUser(current);
      if (!guard.isCurrent(token)) return;
      loadedUserId = current.user.id;
      set({ profile: result.profile, roles: result.roles, loading: false });
    } catch {
      if (!guard.isCurrent(token)) return;
      set({ profile: null, roles: [], loading: false });
    }
  }

  return {
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    applySession(next: S | null) {
      const nextId = next?.user?.id ?? null;
      if (!needsReload(loadedUserId, nextId)) {
        // A signed-out visitor has nothing to load, so stop waiting.
        set({ session: next, ...(nextId ? {} : { loading: false }) });
        return;
      }
      guard.invalidate();
      loadedUserId = null;
      set({ session: next, profile: null, roles: [], ...(nextId ? { loading: true } : {}) });
      schedule(() => void load(next));
    },
    /** Forces a reload for the current session (e.g. after a profile edit). */
    reload: (current: S | null) => load(current),
    clear() {
      guard.invalidate();
      loadedUserId = null;
      set({ profile: null, roles: [] });
    },
    dispose() {
      guard.invalidate();
      listeners.clear();
    },
  };
}

/** Destination for the sign-in page, or null while the session or its roles are still settling. */
export function resolveDestination(
  state: Pick<AuthSnapshot<SessionLike, unknown>, "session" | "roles" | "loading">,
  redirect?: string,
): string | null {
  if (state.loading || !state.session) return null;
  return postLoginDestination(state.roles, redirect);
}
