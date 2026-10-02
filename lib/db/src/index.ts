try {
  process.loadEnvFile?.();
} catch {}

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

export const pool = new Pool({
  connectionString,
  ssl: connectionString?.includes("sslmode=require") || connectionString?.includes("neon.tech") || connectionString?.includes("render.com")
    ? { rejectUnauthorized: false }
    : undefined,
});

export const db = drizzle(pool, { schema });

export * from "./schema";
export * from "./schema/gastos";
