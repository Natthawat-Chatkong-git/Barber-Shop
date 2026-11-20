import { Router } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { isValidUuid, isValidZonedTimestamp } from "../lib/validation.js";

const router = Router();
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_WITH_TIMEZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await req.supabase
      .from("appointments")
      .select("id, starts_at, ends_at, status, customer_note, barbers(display_name), appointment_services(service_name, unit_price, duration_minutes)")
      .order("starts_at", { ascending: false })
      .limit(50);
    if (error) return next(error);
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
});

router.post("/:id/cancel", requireAuth, async (req, res, next) => {
  try {
    if (!isValidUuid(req.params.id)) {
      return res.status(400).json({ error: "Invalid appointment ID" });
    }
    const { data, error } = await req.supabase.rpc("cancel_appointment", {
      p_appointment_id: req.params.id
    });
    if (error) {
      if (error.code === "22023") return res.status(409).json({ error: error.message });
      return next(error);
    }
    return res.json({ data: { appointmentId: data } });
  } catch (error) {
    return next(error);
  }
});

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { serviceIds, startsAt, barberId = null, customerNote = null } = req.body ?? {};

    if (
      !Array.isArray(serviceIds) ||
      serviceIds.length === 0 ||
      serviceIds.length > 10 ||
      !serviceIds.every(isValidUuid)
    ) {
      return res.status(400).json({
        error: "serviceIds must be an array of 1 to 10 valid UUIDs"
      });
    }

    if (
      !isValidZonedTimestamp(startsAt)
    ) {
      return res.status(400).json({
        error: "startsAt must be an ISO-8601 timestamp with an explicit timezone"
      });
    }

    if (barberId !== null && !isValidUuid(barberId)) {
      return res.status(400).json({
        error: "barberId must be a valid UUID or null"
      });
    }

    if (customerNote !== null && (typeof customerNote !== "string" || customerNote.length > 500)) {
      return res.status(400).json({
        error: "customerNote must be a string of at most 500 characters"
      });
    }

    const { data, error } = await req.supabase.rpc("create_appointment", {
      p_service_ids: serviceIds,
      p_starts_at: new Date(startsAt).toISOString(),
      p_barber_id: barberId,
      p_customer_note: customerNote
    });

    if (error) {
      const status = ["22023", "23P01"].includes(error.code) ? 409 : 400;
      return res.status(status).json({ error: error.message });
    }

    return res.status(201).json({
      data: { appointmentId: data }
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
