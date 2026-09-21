import { pgTable, serial, integer, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { encuentrosTable } from "./encuentros";
import { clubsTable } from "./clubs";
import { playersTable } from "./players";

export const gastosTable = pgTable("gastos", {
  id: serial("id").primaryKey(),
  encuentroId: integer("encuentro_id").references(() => encuentrosTable.id, { onDelete: "cascade" }),
  clubId: integer("club_id").references(() => clubsTable.id),
  arriendo: integer("arriendo").notNull().default(0),
  implementos: integer("implementos").notNull().default(0),
  bebidas: integer("bebidas").notNull().default(0),
  alimentos: integer("alimentos").notNull().default(0),
  otros: integer("otros").notNull().default(0),
  descripcionOtros: text("descripcion_otros"),
  total: integer("total").notNull().default(0),
  creadoPor: text("creado_por"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const gastoParticipantesTable = pgTable("gasto_participantes", {
  id: serial("id").primaryKey(),
  gastoId: integer("gasto_id").notNull().references(() => gastosTable.id, { onDelete: "cascade" }),
  playerId: integer("player_id").notNull().references(() => playersTable.id, { onDelete: "cascade" }),
  esInvitado: boolean("es_invitado").notNull().default(false),
  pagaArriendo: boolean("paga_arriendo").notNull().default(true),
  pagaImplementos: boolean("paga_implementos").notNull().default(true),
  pagaBebidas: boolean("paga_bebidas").notNull().default(true),
  pagaAlimentos: boolean("paga_alimentos").notNull().default(true),
  pagaOtros: boolean("paga_otros").notNull().default(true),
  montoCalculado: integer("monto_calculado").notNull().default(0),
  montoPersonalizado: integer("monto_personalizado"),
});

export const cobrosTable = pgTable("cobros", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playersTable.id, { onDelete: "cascade" }),
  clubId: integer("club_id").references(() => clubsTable.id),
  encuentroId: integer("encuentro_id").references(() => encuentrosTable.id, { onDelete: "set null" }),
  gastoId: integer("gasto_id").references(() => gastosTable.id, { onDelete: "set null" }),
  monto: integer("monto").notNull().default(0),
  // Desglose libre: [{ concepto: "Cancha 14/9", monto: 7500 }, { concepto: "Saldo a favor", monto: -14 }, ...]
  // "monto" de arriba siempre es la suma de estos items (se recalcula en el backend).
  items: jsonb("items").$type<{ concepto: string; monto: number }[]>(),
  estado: text("estado").notNull().default("pendiente"),
  comprobanteUrl: text("comprobante_url"),
  pagadoAt: timestamp("pagado_at", { withTimezone: true }),
  confirmadoPor: text("confirmado_por"),
  notas: text("notas"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Calculadora de torneo: solo la llena el administrador. Reparte el costo
// entre los jugadores seleccionados en partes iguales, y permite un ajuste
// individual por jugador (positivo o negativo) para casos como "a este le
// toca descuento" o "este arrastra saldo pendiente". Al aplicar, crea un
// cobro por jugador con su parte + su ajuste, como ítems separados.
export const torneoCalculosTable = pgTable("torneo_calculos", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").notNull().references(() => clubsTable.id),
  nombre: text("nombre").notNull(),
  items: jsonb("items").notNull().$type<{ concepto: string; monto: number }[]>(),
  jugadores: jsonb("jugadores").notNull().$type<{ playerId: number; ajuste: number }[]>(),
  aplicado: boolean("aplicado").notNull().default(false),
  creadoPor: text("creado_por"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGastoSchema = createInsertSchema(gastosTable).omit({ id: true, createdAt: true });
export type InsertGasto = z.infer<typeof insertGastoSchema>;
export type Gasto = typeof gastosTable.$inferSelect;
export type GastoParticipante = typeof gastoParticipantesTable.$inferSelect;
export type Cobro = typeof cobrosTable.$inferSelect;
export type TorneoCalculo = typeof torneoCalculosTable.$inferSelect;
