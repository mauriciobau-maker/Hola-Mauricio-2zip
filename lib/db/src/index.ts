import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

// Esto ya exporta automáticamente todo lo que esté en tu carpeta schema (incluyendo players, encuentros, gastos, etc.)
export * from "./schema";

// Rutas adicionales si las hubiera
export * from "./schema/gastos";