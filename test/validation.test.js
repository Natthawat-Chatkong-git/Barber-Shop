import test from "node:test";
import assert from "node:assert/strict";
import {
  isValidUuid,
  isValidZonedTimestamp,
  canTransitionAppointment,
  isValidBusinessHours
} from "../src/lib/validation.js";

test("UUID validation accepts valid UUIDs and rejects malformed values", () => {
  assert.equal(isValidUuid("550e8400-e29b-41d4-a716-446655440000"), true);
  assert.equal(isValidUuid("not-a-uuid"), false);
  assert.equal(isValidUuid(null), false);
});

test("booking timestamps require an explicit timezone and a real date", () => {
  assert.equal(isValidZonedTimestamp("2026-11-23T10:00:00+07:00"), true);
  assert.equal(isValidZonedTimestamp("2026-11-23T10:00:00"), false);
  assert.equal(isValidZonedTimestamp("2026-02-30T10:00:00+07:00"), false);
});

test("appointment status transitions follow the allowed workflow", () => {
  assert.equal(canTransitionAppointment("pending", "confirmed"), true);
  assert.equal(canTransitionAppointment("confirmed", "in_progress"), true);
  assert.equal(canTransitionAppointment("in_progress", "completed"), true);
  assert.equal(canTransitionAppointment("completed", "pending"), false);
  assert.equal(canTransitionAppointment("cancelled", "confirmed"), false);
});

test("business hours require valid 24-hour times and a positive interval", () => {
  assert.equal(isValidBusinessHours("10:00", "20:00"), true);
  assert.equal(isValidBusinessHours("20:00", "10:00"), false);
  assert.equal(isValidBusinessHours("25:00", "26:00"), false);
});
