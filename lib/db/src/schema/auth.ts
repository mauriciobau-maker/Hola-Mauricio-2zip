import { sql } from "drizzle-orm";
import { index, integer, jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { clubsTable } from "./clubs";

// (IMPORTANT) This table was mandatory for Replit Auth. Ya no se usa desde
// que la app pasó a Clerk (Clerk maneja sus propias sesiones). Se deja sin
// borrar por ahora — no molesta, y borrar tablas no es algo para hacer de
// pasada.
export const sessionsTable = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const usersTable = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Id del usuario en Clerk. Nulo para cuentas viejas de Replit Auth que
  // todavía no se vincularon a un login de Clerk.
  clerkUserId: varchar("clerk_user_id").unique(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  // Nombre de display para admins creados manualmente (no tienen OIDC login)
  name: varchar("name"),
  nickname: varchar("nickname"),
  phone: varchar("phone"),
  playerId: integer("player_id"),
  isAdmin: integer("is_admin").notNull().default(0),
  isClubAdmin: integer("is_club_admin").notNull().default(0),
  clubId: integer("club_id").references(() => clubsTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type UpsertUser = typeof usersTable.$inferInsert;
export type User = typeof usersTable.$inferSelect;
