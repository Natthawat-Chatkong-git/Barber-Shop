export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const ISO_WITH_TIMEZONE = /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}(?::\\d{2}(?:\\.\\d{1,3})?)?(Z|[+-]\\d{2}:\\d{2})$/;

const transitions = Object.freeze({
  pending: new Set(["confirmed", "cancelled"]),
  confirmed: new Set(["in_progress", "cancelled", "no_show"]),
  in_progress: new Set(["completed"]),
  completed: new Set(),
  cancelled: new Set(),
  no_show: new Set()
});

export function isValidUuid(value) {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function isValidZonedTimestamp(value) {
  return typeof value === "string" && ISO_WITH_TIMEZONE.test(value) && !Number.isNaN(Date.parse(value));
}

export function canTransitionAppointment(from, to) {
  return from === to || Boolean(transitions[from]?.has(to));
}

export function isValidBusinessHours(opensAt, closesAt) {
  const pattern = /^([01]\\d|2[0-3]):[0-5]\\d(:[0-5]\\d)?$/;
  return typeof opensAt === "string" && typeof closesAt === "string" &&
    pattern.test(opensAt) && pattern.test(closesAt) && opensAt < closesAt;
}
