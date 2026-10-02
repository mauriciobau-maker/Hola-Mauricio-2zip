import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and } from "drizzle-orm";
import { db, notificationSubscriptionsTable, playersTable } from "@workspace/db";
import * as z from "zod";
import { isEmailConfigured } from "../lib/email";

const router: IRouter = Router();

const SubscriptionSchema = z.object({
  type: z.enum(["email", "whatsapp"]),
  value: z.string().min(1),
});

// GET /notificaciones/config — estado de configuración SMTP
router.get("/notificaciones/config", (_req: Request, res: Response) => {
  res.json({ emailConfigured: isEmailConfigured() });
});

// GET /notificaciones/suscripciones/:playerId
router.get("/notificaciones/suscripciones/:playerId", async (req: Request, res: Response): Promise<void> => {
  const rawPlayerId = Array.isArray(req.params.playerId) ? req.params.playerId[0] : req.params.playerId;
  const playerId = parseInt(rawPlayerId, 10);
  if (isNaN(playerId)) { res.status(400).json({ error: "ID inválido" }); return; }

  const rows = await db
    .select()
    .from(notificationSubscriptionsTable)
    .where(eq(notificationSubscriptionsTable.playerId, playerId));

  res.json(rows.map((r) => ({
    id: r.id,
    type: r.type,
    value: r.value,
    active: r.active,
    createdAt: r.createdAt.toISOString(),
  })));
});

// POST /notificaciones/suscripciones/:playerId
router.post("/notificaciones/suscripciones/:playerId", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const rawPlayerId2 = Array.isArray(req.params.playerId) ? req.params.playerId[0] : req.params.playerId;
  const playerId = parseInt(rawPlayerId2, 10);
  if (isNaN(playerId)) { res.status(400).json({ error: "ID inválido" }); return; }

  const parsed = SubscriptionSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { type, value } = parsed.data;

  // Upsert — un jugador solo puede tener una entrada por tipo
  const existing = await db
    .select()
    .from(notificationSubscriptionsTable)
    .where(
      and(
        eq(notificationSubscriptionsTable.playerId, playerId),
        eq(notificationSubscriptionsTable.type, type),
      )
    );

  let row;
  if (existing.length > 0) {
    const [updated] = await db
      .update(notificationSubscriptionsTable)
      .set({ value, active: true })
      .where(eq(notificationSubscriptionsTable.id, existing[0].id))
      .returning();
    row = updated;
  } else {
    const [created] = await db
      .insert(notificationSubscriptionsTable)
      .values({ playerId, type, value, active: true })
      .returning();
    row = created;
  }

  res.status(201).json({
    id: row.id,
    type: row.type,
    value: row.value,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
  });
});

// DELETE /notificaciones/suscripciones/:id
router.delete("/notificaciones/suscripciones/:id", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

  await db.delete(notificationSubscriptionsTable).where(eq(notificationSubscriptionsTable.id, id));
  res.sendStatus(204);
});

export default router;
