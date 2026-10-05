import { pgTable, serial, integer, text, boolean, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sportsTable } from "./sports";

export const sportModalitiesTable = pgTable(
  "sport_modalities",
  {
    id: serial("id").primaryKey(),
    sportId: integer("sport_id")
      .notNull()
      .references(() => sportsTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    teamSize: integer("team_size").notNull(),
    minTeamSize: integer("min_team_size"),
    maxTeamSize: integer("max_team_size"),
    useSets: boolean("use_sets").notNull().default(true),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sportSlugUnique: unique("sport_modalities_sport_id_slug_unique").on(table.sportId, table.slug),
  }),
);

export const insertSportModalitySchema = createInsertSchema(sportModalitiesTable).omit({ id: true, createdAt: true });
export type InsertSportModality = z.infer<typeof insertSportModalitySchema>;
export type SportModality = typeof sportModalitiesTable.$inferSelect;