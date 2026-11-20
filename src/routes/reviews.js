import { Router } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { isValidUuid } from "../lib/validation.js";

const router = Router();

router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await req.supabase.from("reviews")
      .select("appointment_id, rating, comment, created_at")
      .eq("customer_id", req.user.id);
    if (error) return next(error);
    return res.json({ data });
  } catch (error) { return next(error); }
});

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { appointmentId, rating, comment = null } = req.body ?? {};
    if (!isValidUuid(appointmentId) || !Number.isInteger(rating) || rating < 1 || rating > 5 ||
        (comment !== null && (typeof comment !== "string" || comment.length > 1000))) {
      return res.status(400).json({ error: "Invalid review details" });
    }

    const { data, error } = await req.supabase.from("reviews").insert({
      appointment_id: appointmentId,
      customer_id: req.user.id,
      rating,
      comment: typeof comment === "string" ? comment.trim() || null : null
    }).select("id, appointment_id, rating, comment, created_at").single();

    if (error) {
      if (error.code === "23505") return res.status(409).json({ error: "This appointment already has a review" });
      if (error.code === "42501") return res.status(403).json({ error: "Only completed appointments can be reviewed" });
      return next(error);
    }
    return res.status(201).json({ data });
  } catch (error) {
    return next(error);
  }
});

export default router;
