import { pgTable, serial, integer, text, varchar, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { playersTable } from "./players";
import { clubsTable } from "./clubs";
import { usersTable } from "./auth";

export const membershipsTable = pgTable(
  "memberships",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    clubId: integer("club_id").notNull().references(() => clubsTable.id, { onDelete: "cascade" }),
    role: text("role").default("player").notNull(), // 'club_admin' | 'player'
    playerId: integer("player_id").references(() => playersTable.id, { onDelete: "set null" }),
    status: text("status").default("active").notNull(), // 'active' | 'inactive' | 'pending'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("unique_user_club_membership").on(table.userId, table.clubId),
    uniqueIndex("unique_club_player_membership").on(table.clubId, table.playerId),
  ]
);

export type Membership = typeof membershipsTable.$inferSelect;
export type InsertMembership = typeof membershipsTable.$inferInsert;