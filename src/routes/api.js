import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { publicSupabase } from "../lib/supabase.js";
import { requireAuth } from "../middleware/require-auth.js";
import servicesRouter from "./services.js";
import appointmentsRouter from "./appointments.js";
import adminRouter from "./admin.js";
import reviewsRouter from "./reviews.js";

const router = Router();

const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many booking requests. Please try again later." }
});

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Only publishable configuration is sent to the browser. No server secrets are exposed.
router.get("/config", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({
    supabaseUrl: process.env.SUPABASE_URL,
    supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY
  });
});

router.get("/barbers", async (_req, res, next) => {
  try {
    const { data, error } = await publicSupabase
      .from("barbers")
      .select("id, display_name, bio, experience_years, avatar_url")
      .eq("is_active", true)
      .order("display_name");
    if (error) return next(error);
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
});

router.get("/business-hours", async (_req, res, next) => {
  try {
    const { data, error } = await publicSupabase
      .from("business_hours")
      .select("weekday, opens_at, closes_at, is_closed")
      .order("weekday");
    if (error) return next(error);
    return res.json({ data, timezone: "Asia/Bangkok" });
  } catch (error) {
    return next(error);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await req.supabase
      .from("profiles")
      .select("id, full_name, phone, avatar_url, role")
      .eq("id", req.user.id)
      .single();
    if (error) return next(error);
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
});

router.use("/services", servicesRouter);
router.use("/appointments", bookingLimiter, appointmentsRouter);
router.use("/admin", adminRouter);
router.use("/reviews", reviewsRouter);

export default router;
