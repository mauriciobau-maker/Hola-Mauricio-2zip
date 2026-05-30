import { pgTable, integer, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { playersTable } from "./players";

export const setScoreSchema = z.object({
  setNumber: z.number().int(),
  team1Games: z.number().int(),
  team2Games: z.number().int(),
});

export type SetScore = z.infer<typeof setScoreSchema>;

export const matchesTable = pgTable("matches", {
  id: serial("id").primaryKey(),
  team1Player1Id: integer("team1_player1_id").notNull().references(() => playersTable.id),
  team1Player2Id: integer("team1_player2_id").notNull().references(() => playersTable.id),
  team2Player1Id: integer("team2_player1_id").notNull().references(() => playersTable.id),
  team2Player2Id: integer("team2_player2_id").notNull().references(() => playersTable.id),
  team1SetsWon: integer("team1_sets_won").notNull().default(0),
  team2SetsWon: integer("team2_sets_won").notNull().default(0),
  sets: jsonb("sets").notNull().$type<SetScore[]>(),
  playedAt: timestamp("played_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMatchSchema = createInsertSchema(matchesTable).omit({ id: true, createdAt: true });
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type Match = typeof matchesTable.$inferSelect;
