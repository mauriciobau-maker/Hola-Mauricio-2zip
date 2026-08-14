import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and } from "drizzle-orm";
import { db, notificationSubscriptionsTable, playersTable } from "@workspace/db";
import * as z from "zod";
import { isEmailConfigured } from "../lib/email";
import { isSuperAdminUser, requireCommunityAccess } from "../middlewares/requireCommunity";

const router: IRouter = Router();

const SubscriptionSchema = z.object({
  type: z.enum(["email", "whatsapp"]),
  value: z.string().min(1),
});

function getSessionUser(req: Request) {
  return req.user as {
    id: string;
    clubId?: number | null;
    playerId?: number | null;
    isAdmin?: number | boolean | null;
    isClubAdmin?: number | boolean | null;
  } | undefined;
}

function canManagePlayer(user: ReturnType<typeof getSessionUser>, playerId: number): boolean {
  if (!user) return false;
  if (isSuperAdminUser(user)) return true;
  if (user.isClubAdmin === 1 || user.isClubAdmin === true) return true;
  return user.playerId === playerId;
}

async function getScopedPlayer(req: Request, playerId: number) {
  const user = getSessionUser(req);
  if (!user) return null;

  const [player] = await db
    .select({ id: playersTable.id, clubId: playersTable.clubId })
    .from(playersTable)
    .where(
      isSuperAdminUser(user)
        ? eq(playersTable.id, playerId)
        : and(eq(playersTable.id, playerId), eq(playersTable.clubId, user.clubId!)),
    );

  if (!player || !canManagePlayer(user, player.id)) return null;
  return player;
}

// GET /notificaciones/config — estado de configuración SMTP
router.get("/notificaciones/config", (_req: Request, res: Response) => {
  res.json({ emailConfigured: isEmailConfigured() });
});

// GET /notificaciones/suscripciones/:playerId
router.get(
  "/notificaciones/suscripciones/:playerId",
  requireCommunityAccess,
  async (req: Request, res: Response): Promise<void> => {
    const rawPlayerId = Array.isArray(req.params.playerId) ? req.params.playerId[0] : req.params.playerId;
    const playerId = parseInt(rawPlayerId, 10);
    if (isNaN(playerId)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const player = await getScopedPlayer(req, playerId);
    if (!player) {
      // Do not reveal whether a player belongs to another community.
      res.status(404).json({ error: "Jugador no encontrado" });
      return;
    }

    const rows = await db
      .select()
      .from(notificationSubscriptionsTable)
      .where(eq(notificationSubscriptionsTable.playerId, player.id));

    res.json(rows.map((r) => ({
      id: r.id,
      type: r.type,
      value: r.value,
      active: r.active,
      createdAt: r.createdAt.toISOString(),
    })));
  },
);

// POST /notificaciones/suscripciones/:playerId
router.post(
  "/notificaciones/suscripciones/:playerId",
  requireCommunityAccess,
  async (req: Request, res: Response): Promise<void> => {
    const rawPlayerId = Array.isArray(req.params.playerId) ? req.params.playerId[0] : req.params.playerId;
    const playerId = parseInt(rawPlayerId, 10);
    if (isNaN(playerId)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const player = await getScopedPlayer(req, playerId);
    if (!player) {
      res.status(404).json({ error: "Jugador no encontrado" });
      return;
    }

    const parsed = SubscriptionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const { type, value } = parsed.data;

    // Upsert — un jugador solo puede tener una entrada por tipo
    const existing = await db
      .select()
      .from(notificationSubscriptionsTable)
      .where(
        and(
          eq(notificationSubscriptionsTable.playerId, player.id),
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
        .values({ playerId: player.id, type, value, active: true })
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
  },
);

// DELETE /notificaciones/suscripciones/:id
router.delete(
  "/notificaciones/suscripciones/:id",
  requireCommunityAccess,
  async (req: Request, res: Response): Promise<void> => {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(rawId, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const [subscription] = await db
      .select({
        id: notificationSubscriptionsTable.id,
        playerId: notificationSubscriptionsTable.playerId,
      })
      .from(notificationSubscriptionsTable)
      .where(eq(notificationSubscriptionsTable.id, id));

    if (!subscription || !(await getScopedPlayer(req, subscription.playerId))) {
      res.status(404).json({ error: "Suscripción no encontrada" });
      return;
    }

    await db.delete(notificationSubscriptionsTable).where(eq(notificationSubscriptionsTable.id, id));
    res.sendStatus(204);
  },
);

export default router;
