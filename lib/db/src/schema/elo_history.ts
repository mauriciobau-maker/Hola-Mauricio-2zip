import { pgTable, integer, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { playersTable } from "./players";
import { matchesTable } from "./matches";
import { sportsTable } from "./sports";

export const eloHistoryTable = pgTable("elo_history", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id")
    .notNull()
    .references(() => playersTable.id, { onDelete: "cascade" }),
  matchId: integer("match_id").references(() => matchesTable.id, {
    onDelete: "set null",
  }),
  sportId: integer("sport_id")
    .notNull()
    .references(() => sportsTable.id),
  eloBefore: integer("elo_before").notNull(),
  eloAfter: integer("elo_after").notNull(),
  eloChange: integer("elo_change").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertEloHistorySchema = createInsertSchema(eloHistoryTable).omit({
  id: true,
  createdAt: true,
});
export type InsertEloHistory = z.infer<typeof insertEloHistorySchema>;
export type EloHistory = typeof eloHistoryTable.$inferSelect;
