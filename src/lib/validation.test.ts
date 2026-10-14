import assert from "node:assert/strict";
import { test } from "node:test";
import { validateDelivery } from "./validation.ts";

const valid = {
  full_name: "Sahar Mirza",
  phone: "+93 70 123 4567",
  country: "Afghanistan",
  city: "Kabul",
  address: "House 4, Street 2",
  notes: "",
};

test("accepts complete delivery details", () => {
  assert.deepEqual(validateDelivery(valid), {});
});

test("requires every field except notes", () => {
  const errors = validateDelivery({ ...valid, full_name: " ", city: "", address: "" });
  assert.deepEqual(Object.keys(errors).sort(), ["address", "city", "full_name"]);
});

test("rejects malformed phone numbers", () => {
  assert.ok(validateDelivery({ ...valid, phone: "abc" }).phone);
  assert.ok(validateDelivery({ ...valid, phone: "123" }).phone);
  assert.equal(validateDelivery({ ...valid, phone: "+91 98765 43210" }).phone, undefined);
});

test("enforces the same length limits as the database", () => {
  assert.ok(validateDelivery({ ...valid, address: "x".repeat(301) }).address);
  assert.ok(validateDelivery({ ...valid, notes: "x".repeat(501) }).notes);
});
