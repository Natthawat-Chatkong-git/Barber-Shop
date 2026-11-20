import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";

const authOptions = {
  autoRefreshToken: false,
  persistSession: false,
  detectSessionInUrl: false
};

export const publicSupabase = createClient(
  env.supabaseUrl,
  env.supabasePublishableKey,
  { auth: authOptions }
);

export function createUserSupabase(accessToken) {
  if (typeof accessToken !== "string" || accessToken.length === 0) {
    throw new TypeError("A Supabase access token is required");
  }

  return createClient(
    env.supabaseUrl,
    env.supabasePublishableKey,
    {
      auth: authOptions,
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    }
  );
}
