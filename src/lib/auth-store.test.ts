import assert from "node:assert/strict";
import { test } from "node:test";
import { createAuthStore, resolveDestination } from "./auth-store.ts";
import type { AppRole } from "../types/index.ts";

type Sess = { user: { id: string } };
const admin: Sess = { user: { id: "admin-1" } };
const customer: Sess = { user: { id: "cust-1" } };

/** Store whose role fetches resolve only when the test says so. */
function harness(rolesByUser: Record<string, AppRole[]>) {
  const pending: Array<() => void> = [];
  const store = createAuthStore<Sess, { id: string }>({
    defer: (fn) => fn(),
    fetchUser: (s) =>
      new Promise((resolve) => {
        pending.push(() =>
          resolve({ profile: { id: s.user.id }, roles: rolesByUser[s.user.id] ?? [] }),
        );
      }),
  });
  const flush = async () => {
    while (pending.length) pending.shift()!();
    await new Promise((r) => setImmediate(r));
  };
  const dest = (redirect?: string) => resolveDestination(store.getState(), redirect);
  return { store, flush, dest, pending };
}

test("session restoration: no destination until roles load, then /admin", async () => {
  const h = harness({ "admin-1": ["admin", "seller"] });
  h.store.applySession(admin); // reopened site restores the stored session
  assert.equal(h.dest(), null);
  await h.flush();
  assert.equal(h.dest(), "/admin");
});

test("repeated sign-ins in one tab always land on /admin", async () => {
  const h = harness({ "admin-1": ["admin", "seller"] });
  for (let i = 0; i < 3; i++) {
    h.store.applySession(admin);
    assert.equal(h.dest(), null, `sign-in ${i + 1}: must wait for roles`);
    await h.flush();
    assert.equal(h.dest(), "/admin", `sign-in ${i + 1}`);
    h.store.clear();
    h.store.applySession(null); // sign out
    assert.equal(h.dest(), null);
    await h.flush();
  }
});

test("admin signs out and a customer signs in: no admin leftovers", async () => {
  const h = harness({ "admin-1": ["admin"], "cust-1": ["customer"] });
  h.store.applySession(admin);
  await h.flush();
  h.store.clear();
  h.store.applySession(null);
  await h.flush();
  h.store.applySession(customer);
  assert.deepEqual(h.store.getState().roles, []);
  assert.equal(h.dest(), null);
  await h.flush();
  assert.equal(h.dest(), "/dashboard");
});

test("a slow load for the previous session cannot overwrite the new one", async () => {
  const h = harness({ "admin-1": ["admin"], "cust-1": ["customer"] });
  h.store.applySession(admin); // load A pending
  h.store.applySession(customer); // load B pending, A is stale
  const [resolveA, resolveB] = h.pending.splice(0);
  resolveB!();
  await new Promise((r) => setImmediate(r));
  resolveA!();
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(h.store.getState().roles, ["customer"]);
});

test("token refresh for the same user does not reload or flicker", async () => {
  const h = harness({ "admin-1": ["admin"] });
  h.store.applySession(admin);
  await h.flush();
  h.store.applySession({ user: { id: "admin-1" } });
  assert.equal(h.store.getState().loading, false);
  assert.deepEqual(h.store.getState().roles, ["admin"]);
  assert.equal(h.pending.length, 0);
});

test("signed-out visitors get no destination", () => {
  const h = harness({});
  h.store.applySession(null);
  assert.equal(h.store.getState().loading, false);
  assert.equal(h.dest(), null);
});
