import { Router } from "express";
import { publicSupabase } from "../lib/supabase.js";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const { data, error } = await publicSupabase
      .from("services")
      .select("id, name, description, duration_minutes, price")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) return next(error);
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
});

export default router;
