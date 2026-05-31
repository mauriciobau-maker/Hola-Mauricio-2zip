import { pgTable, integer, serial, timestamp } from "drizzle-orm/pg-core";
import { playersTable } from "./players";
import { matchesTable } from "./matches";

export const eloHistoryTable = pgTable("elo_history", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playersTable.id, { onDelete: "cascade" }),
  matchId: integer("match_id").notNull().references(() => matchesTable.id, { onDelete: "cascade" }),
  eloBefore: integer("elo_before").notNull(),
  eloAfter: integer("elo_after").notNull(),
  eloChange: integer("elo_change").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type EloHistory = typeof eloHistoryTable.$inferSelect;
