import { pgTable, serial, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { playersTable } from "./players";
import { sportsTable } from "./sports";

export const playerSportRatingsTable = pgTable(
  "player_sport_ratings",
  {
    id: serial("id").primaryKey(),
    playerId: integer("player_id")
      .notNull()
      .references(() => playersTable.id, { onDelete: "cascade" }),
    sportId: integer("sport_id")
      .notNull()
      .references(() => sportsTable.id, { onDelete: "cascade" }),
    elo: integer("elo").notNull().default(1500),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    playerSportUnique: unique("player_sport_ratings_player_id_sport_id_unique").on(table.playerId, table.sportId),
  }),
);

export const insertPlayerSportRatingSchema = createInsertSchema(playerSportRatingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlayerSportRating = z.infer<typeof insertPlayerSportRatingSchema>;
export type PlayerSportRating = typeof playerSportRatingsTable.$inferSelect;