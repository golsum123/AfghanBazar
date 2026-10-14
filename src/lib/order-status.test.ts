import assert from "node:assert/strict";
import { test } from "node:test";
import { allowedNextStatuses } from "./order-status.ts";

test("orders only move forward or to cancelled", () => {
  assert.deepEqual(allowedNextStatuses("confirmed"), ["processing", "shipped", "delivered", "cancelled"]);
  assert.deepEqual(allowedNextStatuses("shipped"), ["delivered", "cancelled"]);
});

test("delivered and cancelled orders are final", () => {
  assert.deepEqual(allowedNextStatuses("delivered"), []);
  assert.deepEqual(allowedNextStatuses("cancelled"), []);
});

test("never offers a step backwards", () => {
  assert.ok(!allowedNextStatuses("processing").includes("confirmed"));
  assert.ok(!allowedNextStatuses("processing").includes("pending"));
});
