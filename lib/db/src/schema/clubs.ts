import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sportsTable } from "./sports";

export const clubsTable = pgTable("clubs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  plan: text("plan").notNull().default("basic"),
  active: boolean("active").notNull().default(true),
  inviteCode: text("invite_code").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const clubSportsTable = pgTable("club_sports", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").notNull().references(() => clubsTable.id, { onDelete: "cascade" }),
  sportId: integer("sport_id").notNull().references(() => sportsTable.id, { onDelete: "cascade" }),
  active: boolean("active").notNull().default(true),
});

export const insertClubSchema = createInsertSchema(clubsTable).omit({ id: true, createdAt: true });
export type InsertClub = z.infer<typeof insertClubSchema>;
export type Club = typeof clubsTable.$inferSelect;
export type ClubSport = typeof clubSportsTable.$inferSelect;