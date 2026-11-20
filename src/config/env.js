import "dotenv/config";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const supabaseUrl = required("SUPABASE_URL");
const publishableKey = required("SUPABASE_PUBLISHABLE_KEY");

let parsedUrl;
try {
  parsedUrl = new URL(supabaseUrl);
} catch {
  throw new Error("SUPABASE_URL must be a valid URL");
}

if (parsedUrl.protocol !== "https:" && parsedUrl.hostname !== "localhost") {
  throw new Error("SUPABASE_URL must use HTTPS outside local development");
}

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be a valid TCP port");
}

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV ?? "development",
  port,
  supabaseUrl: parsedUrl.toString().replace(/\/$/, ""),
  supabasePublishableKey: publishableKey
});
