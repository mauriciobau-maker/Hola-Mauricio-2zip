import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sportsTable = pgTable("sports", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  teamSize: integer("team_size").notNull().default(2),
  minTeamSize: integer("min_team_size"),
  maxTeamSize: integer("max_team_size"),
  useSets: boolean("use_sets").notNull().default(true),
  active: boolean("active").notNull().default(true),
});

export const insertSportSchema = createInsertSchema(sportsTable).omit({ id: true });
export type InsertSport = z.infer<typeof insertSportSchema>;
export type Sport = typeof sportsTable.$inferSelect;