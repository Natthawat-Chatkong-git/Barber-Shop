export async function requireAdmin(req, res, next) {
  try {
    const { data, error } = await req.supabase
      .from("profiles")
      .select("role")
      .eq("id", req.user.id)
      .single();

    if (error) return next(error);
    if (data.role !== "admin") {
      return res.status(403).json({ error: "Administrator access required" });
    }
    return next();
  } catch (error) {
    return next(error);
  }
}
