try {
  process.loadEnvFile?.();
} catch {}

import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import app from "./artifacts/api-server/src/app";
import { seedSports } from "./artifacts/api-server/src/lib/seedSports";
import { logger } from "./artifacts/api-server/src/lib/logger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === "production";

async function startServer() {
  try {
    await seedSports();
    logger.info("Sports table initialized");
  } catch (err: any) {
    logger.warn({ msg: err?.message }, "Sports seed skipped (database offline or unconfigured)");
  }

  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      configFile: path.resolve(__dirname, "artifacts/padel-tracker/vite.config.ts"),
      server: {
        middlewareMode: true,
        host: "0.0.0.0",
      },
      appType: "spa",
      root: path.resolve(__dirname, "artifacts/padel-tracker"),
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "artifacts/padel-tracker/dist/public");
    app.use(express.static(distPath));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    logger.info(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  logger.error({ err }, "Fatal startup error");
  process.exit(1);
});
