import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";

export const encuentrosTable = pgTable("encuentros", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  dateTime: timestamp("date_time", { withTimezone: true }).notNull(),
  location: text("location").notNull(),
  maxSpots: integer("max_spots"),
  notes: text("notes"),
  organizerId: text("organizer_id"),
  notificationEmail: boolean("notification_email").notNull().default(false),
  notificationWhatsapp: boolean("notification_whatsapp").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const asistenciaTable = pgTable("asistencia", {
  id: serial("id").primaryKey(),
  encuentroId: integer("encuentro_id").notNull(),
  playerId: integer("player_id").notNull(),
  status: text("status").notNull().default("pending"),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notificationSubscriptionsTable = pgTable("notification_subscriptions", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull(),
  type: text("type").notNull(),
  value: text("value").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
