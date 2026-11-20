import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import servicesRouter from "./services.js";
import appointmentsRouter from "./appointments.js";

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

router.use("/services", servicesRouter);
router.use("/appointments", bookingLimiter, appointmentsRouter);

export default router;
