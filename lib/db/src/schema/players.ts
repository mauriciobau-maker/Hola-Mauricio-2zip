import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clubsTable } from "./clubs";

export const playersTable = pgTable("players", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nickname: text("nickname"),
  elo: integer("elo").notNull().default(1500),
  // --- NUEVOS CAMPOS ---
  phone: text("phone"),         // Para contacto
  waId: text("wa_id"),            // ID persistente de WhatsApp
  wspConsent: boolean("wsp_consent").default(false), // Cumplimiento legal
  language: text("language").default("es"), // Configuración de idioma
  // ---------------------
  clubId: integer("club_id").references(() => clubsTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPlayerSchema = createInsertSchema(playersTable).omit({ id: true, createdAt: true });
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof playersTable.$inferSelect;

// --- TABLAS DE CATEGORÍAS AÑADIDAS PARA RESOLVER EL ERROR DE COMPILACIÓN ---
export const clubSportCategoriesTable = pgTable("club_sport_categories", {
  id: serial("id").primaryKey(),
  clubSportId: integer("club_sport_id"),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const playerCategoriesTable = pgTable("player_categories", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playersTable.id, { onDelete: "cascade" }),
  categoryId: integer("category_id").notNull().references(() => clubSportCategoriesTable.id, { onDelete: "cascade" }),
});