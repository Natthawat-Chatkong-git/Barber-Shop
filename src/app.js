import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./config/env.js";
import apiRouter from "./routes/api.js";

const app = express();
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(currentDir, "../public");

app.disable("x-powered-by");
app.set("trust proxy", env.trustProxyHops);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      "default-src": ["'self'"],
      "base-uri": ["'self'"],
      "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
      "form-action": ["'self'"],
      "frame-ancestors": ["'none'"],
      "img-src": ["'self'", "data:", "https:"],
      "object-src": ["'none'"],
      "script-src": ["'self'", "https://esm.sh"],
      "script-src-attr": ["'none'"],
      "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      "connect-src": ["'self'", "https://*.supabase.co", "https://esm.sh"]
    }
  }
}));
app.use(express.json({ limit: "20kb" }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." }
});

app.use("/api", apiLimiter, apiRouter);
app.use(express.static(publicDir, {
  dotfiles: "deny",
  index: "index.html",
  maxAge: env.nodeEnv === "production" ? "1h" : 0
}));

app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "API route not found" });
  }
  return res.status(404).send("Page not found");
});

app.use((error, _req, res, _next) => {
  // Keep diagnostic details in server logs, not in public responses.
  console.error(error);
  if (res.headersSent) return;

  return res.status(500).json({
    error: "Internal server error"
  });
});

export default app;
