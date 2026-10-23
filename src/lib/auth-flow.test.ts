import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createLoadGuard,
  needsReload,
  postLoginDestination,
  sanitizeRedirect,
} from "./auth-flow.ts";

test("admins go to /admin by default, others to /dashboard", () => {
  assert.equal(postLoginDestination(["admin", "seller"]), "/admin");
  assert.equal(postLoginDestination(["customer"]), "/dashboard");
  assert.equal(postLoginDestination(["seller"]), "/dashboard");
});

test("roles that are still loading never yield an admin destination", () => {
  assert.equal(postLoginDestination([]), "/dashboard");
});

test("an explicit safe redirect wins; unsafe ones are ignored", () => {
  assert.equal(postLoginDestination(["admin"], "/orders/1"), "/orders/1");
  assert.equal(postLoginDestination(["admin"], "//evil.com"), "/admin");
  assert.equal(postLoginDestination(["customer"], "https://evil.com"), "/dashboard");
  assert.equal(sanitizeRedirect("/cart"), "/cart");
});

test("reload only when the user changes (sign-in, sign-out, switch), not on token refresh", () => {
  assert.equal(needsReload(null, "u1"), true);
  assert.equal(needsReload("u1", "u1"), false);
  assert.equal(needsReload("u1", null), true);
  assert.equal(needsReload("u1", "u2"), true);
});

test("stale loads from a previous session cannot overwrite the current one", async () => {
  const guard = createLoadGuard();
  const state = { roles: [] as string[] };
  const load = async (roles: string[], delay: number) => {
    const token = guard.next();
    await new Promise((r) => setTimeout(r, delay));
    if (guard.isCurrent(token)) state.roles = roles;
  };
  const slowCustomer = load(["customer"], 30);
  const fastAdmin = load(["admin", "seller"], 5);
  await Promise.all([slowCustomer, fastAdmin]);
  assert.deepEqual(state.roles, ["admin", "seller"]);
});

test("sign-out invalidates an in-flight load, then a new sign-in loads cleanly", async () => {
  const guard = createLoadGuard();
  const state = { roles: [] as string[] };
  const first = guard.next();
  guard.invalidate(); // sign-out
  const second = guard.next(); // sign-in as admin
  await Promise.resolve();
  if (guard.isCurrent(first)) state.roles = ["customer"];
  if (guard.isCurrent(second)) state.roles = ["admin"];
  assert.deepEqual(state.roles, ["admin"]);
});

test("a redirect into a workspace the user cannot open falls back to their default", () => {
  assert.equal(postLoginDestination(["customer"], "/admin/users"), "/dashboard");
  assert.equal(postLoginDestination(["customer"], "/seller"), "/dashboard");
  assert.equal(postLoginDestination(["seller"], "/admin"), "/dashboard");
  assert.equal(postLoginDestination(["seller"], "/seller/products"), "/seller/products");
  assert.equal(postLoginDestination(["admin"], "/admin/users?x=1"), "/admin/users?x=1");
  assert.equal(postLoginDestination(["admin"], "/adminfoo"), "/adminfoo");
  assert.equal(postLoginDestination(["admin"], "/dashboard/orders"), "/dashboard/orders");
});
