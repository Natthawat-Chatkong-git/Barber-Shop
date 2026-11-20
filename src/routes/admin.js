import { Router } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { requireAdmin } from "../middleware/require-admin.js";
import { isValidUuid, isValidZonedTimestamp, isValidBusinessHours, canTransitionAppointment } from "../lib/validation.js";

const router = Router();
const APPOINTMENT_STATUSES = new Set(["pending", "confirmed", "in_progress", "completed", "cancelled", "no_show"]);

router.use(requireAuth, requireAdmin);

router.get("/appointments", async (req, res, next) => {
  try {
    const { data, error } = await req.supabase
      .from("appointments")
      .select("id, starts_at, ends_at, status, customer_note, cancellation_reason, customer_name, customer_phone, source, profiles!appointments_customer_id_fkey(full_name, phone), barbers(display_name), appointment_services(service_name, unit_price, duration_minutes)")
      .order("starts_at", { ascending: false })
      .limit(200);
    if (error) return next(error);
    return res.json({ data });
  } catch (error) { return next(error); }
});

router.post("/walk-ins", async (req, res, next) => {
  try {
    const { customerName, customerPhone = null, serviceIds, startsAt, barberId = null, customerNote = null } = req.body ?? {};
    const phonePattern = /^[0-9+() -]{7,20}$/;
    if (typeof customerName !== "string" || !customerName.trim() || customerName.length > 100 ||
        (customerPhone !== null && (typeof customerPhone !== "string" || !phonePattern.test(customerPhone))) ||
        !Array.isArray(serviceIds) || serviceIds.length < 1 || serviceIds.length > 10 ||
        !serviceIds.every(isValidUuid) || !isValidZonedTimestamp(startsAt) ||
        (barberId !== null && !isValidUuid(barberId)) ||
        (customerNote !== null && (typeof customerNote !== "string" || customerNote.length > 500))) {
      return res.status(400).json({ error: "Invalid walk-in booking details" });
    }
    const { data, error } = await req.supabase.rpc("create_walk_in_appointment", {
      p_customer_name: customerName.trim(),
      p_customer_phone: customerPhone,
      p_service_ids: serviceIds,
      p_starts_at: new Date(startsAt).toISOString(),
      p_barber_id: barberId,
      p_customer_note: customerNote
    });
    if (error) {
      if (error.code === "23P01") return res.status(409).json({ error: "ช่วงเวลานี้ถูกจองไปแล้ว กรุณาเลือกเวลาอื่น" });
      if (error.code === "22023") return res.status(409).json({ error: "ข้อมูลคิว Walk-in ไม่ถูกต้องหรือบริการไม่พร้อมใช้งาน" });
      if (error.code === "42501") return res.status(403).json({ error: "Administrator access required" });
      return next(error);
    }
    return res.status(201).json({ data: { appointmentId: data } });
  } catch (error) { return next(error); }
});

router.patch("/appointments/:id/status", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, cancellationReason = null } = req.body ?? {};
    if (!isValidUuid(id) || !APPOINTMENT_STATUSES.has(status)) {
      return res.status(400).json({ error: "Invalid appointment ID or status" });
    }
    const { data: current, error: currentError } = await req.supabase
      .from("appointments").select("status").eq("id", id).single();
    if (currentError) {
      if (currentError.code === "PGRST116") return res.status(404).json({ error: "Appointment not found" });
      return next(currentError);
    }
    if (!canTransitionAppointment(current.status, status)) {
      return res.status(409).json({ error: `Cannot change appointment from ${current.status} to ${status}` });
    }
    if (cancellationReason !== null && (typeof cancellationReason !== "string" || cancellationReason.length > 500)) {
      return res.status(400).json({ error: "Cancellation reason must be at most 500 characters" });
    }
    const update = { status, cancellation_reason: status === "cancelled" ? cancellationReason : null };
    const { data, error } = await req.supabase
      .from("appointments")
      .update(update)
      .eq("id", id)
      .eq("status", current.status)
      .select("id, status, cancellation_reason")
      .single();
    if (error) {
      if (error.code === "PGRST116") return res.status(404).json({ error: "Barber not found" });
      return next(error);
    }
    return res.json({ data });
  } catch (error) { return next(error); }
});

router.get("/services", async (req, res, next) => {
  try {
    const { data, error } = await req.supabase
      .from("services")
      .select("id, name, description, duration_minutes, price, is_active")
      .order("name");
    if (error) return next(error);
    return res.json({ data });
  } catch (error) { return next(error); }
});

router.post("/services", async (req, res, next) => {
  try {
    const { name, description = null, durationMinutes, price } = req.body ?? {};
    if (typeof name !== "string" || !name.trim() || name.length > 100 ||
        (description !== null && (typeof description !== "string" || description.length > 300)) ||
        !Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 600 ||
        typeof price !== "number" || !Number.isFinite(price) || price < 0 || price > 100000) {
      return res.status(400).json({ error: "ข้อมูลบริการไม่ถูกต้อง" });
    }
    const { data, error } = await req.supabase.from("services").insert({
      name: name.trim(), description: typeof description === "string" ? description.trim() || null : null,
      duration_minutes: durationMinutes, price, is_active: true
    }).select().single();
    if (error) {
      if (error.code === "23505") return res.status(409).json({ error: "มีบริการชื่อนี้อยู่แล้ว" });
      return next(error);
    }
    return res.status(201).json({ data });
  } catch (error) { return next(error); }
});

router.patch("/services/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, durationMinutes, price, isActive } = req.body ?? {};
    if (!isValidUuid(id)) return res.status(400).json({ error: "Invalid service ID" });
    const update = {};
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim() || name.length > 100) return res.status(400).json({ error: "Invalid service name" });
      update.name = name.trim();
    }
    if (description !== undefined) {
      if (description !== null && (typeof description !== "string" || description.length > 300)) return res.status(400).json({ error: "Invalid service description" });
      update.description = typeof description === "string" ? description.trim() || null : null;
    }
    if (durationMinutes !== undefined) {
      if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 600) return res.status(400).json({ error: "Invalid duration" });
      update.duration_minutes = durationMinutes;
    }
    if (price !== undefined) {
      if (typeof price !== "number" || !Number.isFinite(price) || price < 0 || price > 100000) return res.status(400).json({ error: "Invalid price" });
      update.price = price;
    }
    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") return res.status(400).json({ error: "Invalid active state" });
      update.is_active = isActive;
    }
    if (!Object.keys(update).length) return res.status(400).json({ error: "No fields to update" });
    const { data, error } = await req.supabase.from("services").update(update).eq("id", id).select().single();
    if (error) return next(error);
    return res.json({ data });
  } catch (error) { return next(error); }
});

router.get("/barbers", async (req, res, next) => {
  try {
    const { data, error } = await req.supabase
      .from("barbers")
      .select("id, profile_id, display_name, bio, experience_years, avatar_url, is_active")
      .order("display_name");
    if (error) return next(error);
    return res.json({ data });
  } catch (error) { return next(error); }
});

router.get("/barber-candidates", async (req, res, next) => {
  try {
    const [{ data: profiles, error: profileError }, { data: barbers, error: barberError }] = await Promise.all([
      req.supabase.from("profiles").select("id, full_name, role").order("full_name"),
      req.supabase.from("barbers").select("profile_id")
    ]);
    if (profileError) return next(profileError);
    if (barberError) return next(barberError);
    const assigned = new Set((barbers || []).map((barber) => barber.profile_id));
    return res.json({ data: (profiles || []).filter((profile) => !assigned.has(profile.id) && profile.role !== "admin") });
  } catch (error) { return next(error); }
});

router.post("/barbers", async (req, res, next) => {
  try {
    const { profileId, displayName, bio = null, experienceYears = 0 } = req.body ?? {};
    if (!isValidUuid(profileId) || typeof displayName !== "string" ||
        !displayName.trim() || displayName.length > 100 ||
        (bio !== null && (typeof bio !== "string" || bio.length > 1000)) ||
        !Number.isInteger(experienceYears) || experienceYears < 0 || experienceYears > 80) {
      return res.status(400).json({ error: "Invalid barber profile details" });
    }
    const { data, error } = await req.supabase.rpc("create_barber", {
      p_profile_id: profileId,
      p_display_name: displayName.trim(),
      p_bio: typeof bio === "string" ? bio.trim() || null : null,
      p_experience_years: experienceYears
    });
    if (error) {
      if (error.code === "23505") return res.status(409).json({ error: "This profile is already assigned to a barber" });
      if (error.code === "22023") return res.status(400).json({ error: "Select a valid non-admin user profile" });
      if (error.code === "42501") return res.status(403).json({ error: "Administrator access required" });
      return next(error);
    }
    return res.status(201).json({ data: { id: data } });
  } catch (error) { return next(error); }
});

router.patch("/barbers/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body ?? {};
    if (!isValidUuid(id) || typeof isActive !== "boolean") {
      return res.status(400).json({ error: "Invalid barber ID or active state" });
    }
    const { data, error } = await req.supabase.from("barbers").update({ is_active: isActive }).eq("id", id).select().single();
    if (error) {
      if (error.code === "PGRST116") return res.status(409).json({ error: "Appointment status changed concurrently; refresh and try again" });
      return next(error);
    }
    return res.json({ data });
  } catch (error) { return next(error); }
});

router.get("/business-hours", async (req, res, next) => {
  try {
    const { data, error } = await req.supabase.from("business_hours")
      .select("weekday, opens_at, closes_at, is_closed").order("weekday");
    if (error) return next(error);
    return res.json({ data });
  } catch (error) { return next(error); }
});

router.patch("/business-hours/:weekday", async (req, res, next) => {
  try {
    const weekday = Number(req.params.weekday);
    const { opensAt, closesAt, isClosed } = req.body ?? {};
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6 || typeof isClosed !== "boolean" ||
        (!isClosed && !isValidBusinessHours(opensAt, closesAt))) {
      return res.status(400).json({ error: "Invalid business hours" });
    }
    const update = { is_closed: isClosed, opens_at: isClosed ? null : opensAt, closes_at: isClosed ? null : closesAt };
    const { data, error } = await req.supabase.from("business_hours").update(update).eq("weekday", weekday)
      .select("weekday, opens_at, closes_at, is_closed").single();
    if (error) return next(error);
    return res.json({ data });
  } catch (error) { return next(error); }
});

export default router;
