export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const ISO_WITH_TIMEZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;

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
  if (typeof value !== "string" || !ISO_WITH_TIMEZONE.test(value) || Number.isNaN(Date.parse(value))) {
    return false;
  }

  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  const [hour, minute, second = 0] = value.slice(11, 19).split(":").map(Number);
  const calendar = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

  return calendar.getUTCFullYear() === year &&
    calendar.getUTCMonth() === month - 1 &&
    calendar.getUTCDate() === day &&
    calendar.getUTCHours() === hour &&
    calendar.getUTCMinutes() === minute &&
    calendar.getUTCSeconds() === second;
}

export function canTransitionAppointment(from, to) {
  return from === to || Boolean(transitions[from]?.has(to));
}

export function isValidBusinessHours(opensAt, closesAt) {
  const pattern = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
  return typeof opensAt === "string" && typeof closesAt === "string" &&
    pattern.test(opensAt) && pattern.test(closesAt) && opensAt < closesAt;
}

export function isValidDateOnly(value) {
  if (typeof value !== "string" || !/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
