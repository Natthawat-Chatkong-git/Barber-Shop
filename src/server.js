import { env } from "./config/env.js";
import app from "./app.js";

const server = app.listen(env.port, () => {
  console.log(`Barber-Shop server listening on http://localhost:${env.port}`);
});

function shutdown(signal) {
  console.log(`${signal} received. Closing HTTP server...`);
  server.close((error) => {
    if (error) {
      console.error("Failed to close HTTP server cleanly:", error);
      process.exitCode = 1;
    }
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
