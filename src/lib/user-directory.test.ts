import assert from "node:assert/strict";
import { test } from "node:test";
import { groupRoles, profileRoleDrifted, sortRoles } from "./user-directory.ts";

test("roles are ordered most privileged first and de-duplicated", () => {
  assert.deepEqual(sortRoles(["customer", "admin", "seller", "admin"]), [
    "admin",
    "seller",
    "customer",
  ]);
});

test("groups user_roles rows per user without mixing accounts", () => {
  const grouped = groupRoles([
    { user_id: "a", role: "customer" },
    { user_id: "b", role: "seller" },
    { user_id: "a", role: "admin" },
  ]);
  assert.deepEqual(grouped, { a: ["admin", "customer"], b: ["seller"] });
});

test("flags profiles.role that disagrees with user_roles", () => {
  assert.equal(profileRoleDrifted("seller", ["admin", "customer"]), true);
  assert.equal(profileRoleDrifted("admin", ["customer", "admin"]), false);
  assert.equal(profileRoleDrifted("customer", []), false);
});
