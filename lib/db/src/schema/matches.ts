import { pgTable, integer, serial, timestamp, jsonb, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sportsTable } from "./sports";
import { clubsTable } from "./clubs";

export const setScoreSchema = z.object({
  setNumber: z.number().int(),
  team1Games: z.number().int(),
  team2Games: z.number().int(),
});
export type SetScore = z.infer<typeof setScoreSchema>;

export const matchesTable = pgTable("matches", {
  id: serial("id").primaryKey(),
  sportId: integer("sport_id").notNull().references(() => sportsTable.id),
  clubId: integer("club_id").references(() => clubsTable.id),
  team1Score: integer("team1_score").notNull().default(0),
  team2Score: integer("team2_score").notNull().default(0),
  sets: jsonb("sets").$type<SetScore[]>(),
  result: text("result").notNull(),
  playedAt: timestamp("played_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMatchSchema = createInsertSchema(matchesTable).omit({ id: true, createdAt: true });
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type Match = typeof matchesTable.$inferSelect;
