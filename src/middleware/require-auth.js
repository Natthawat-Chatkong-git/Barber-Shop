import { createUserSupabase } from "../lib/supabase.js";

export async function requireAuth(req, res, next) {
  const authorization = req.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return res.status(401).json({
      error: "Authentication required"
    });
  }

  try {
    const accessToken = match[1].trim();
    const supabase = createUserSupabase(accessToken);
    const { data, error } = await supabase.auth.getUser(accessToken);

    if (error || !data.user) {
      return res.status(401).json({
        error: "Invalid or expired access token"
      });
    }

    req.user = data.user;
    req.supabase = supabase;
    return next();
  } catch (error) {
    return next(error);
  }
}
