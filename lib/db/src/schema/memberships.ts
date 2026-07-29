import { pgTable, serial, integer, text } from "drizzle-orm/pg-core";
import { playersTable } from "./players";
import { clubsTable } from "./clubs";

export const membershipsTable = pgTable("memberships", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playersTable.id, { onDelete: "cascade" }),
  clubId: integer("club_id").notNull().references(() => clubsTable.id, { onDelete: "cascade" }),
  role: text("role").default("player").notNull(), // 'admin', 'player', 'super'
});

export type Membership = typeof membershipsTable.$inferSelect;