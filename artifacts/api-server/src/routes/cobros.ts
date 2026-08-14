import { Router, type Request, type Response } from "express";
import { and, eq } from "drizzle-orm";
import { db, cobrosTable, playersTable } from "@workspace/db";
import {
  isSuperAdminUser,
  requireCommunityAccess,
} from "../middlewares/requireCommunity";

const router = Router();

router.use(requireCommunityAccess);

function getSessionUser(req: Request) {
  return req.user as {
    clubId?: number | null;
    isAdmin?: number | boolean | null;
  };
}

// GET: Super Admin puede consultar globalmente; usuarios normales solo su club.
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const user = getSessionUser(req);
    const cobros = isSuperAdminUser(user)
      ? await db.select().from(cobrosTable)
      : await db
          .select()
          .from(cobrosTable)
          .where(eq(cobrosTable.clubId, user.clubId!));

    res.json(cobros);
  } catch (error) {
    console.error("Error al obtener cobros:", error);
    res.status(500).json({ error: "Error al obtener cobros" });
  }
});

// POST: clubId nunca proviene de un usuario normal; el Super Admin debe
// indicar explícitamente el club objetivo. El jugador también debe pertenecer
// al mismo club para impedir asociaciones cruzadas.
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const user = getSessionUser(req);
    const { playerId, monto, notas } = req.body;
    const targetClubId = isSuperAdminUser(user)
      ? Number(req.body.clubId)
      : user.clubId;

    if (!Number.isInteger(targetClubId) || targetClubId! <= 0) {
      res.status(400).json({
        error: "Debe indicarse un club válido para registrar el cobro",
      });
      return;
    }

    const normalizedPlayerId = Number(playerId);
    if (!Number.isInteger(normalizedPlayerId) || normalizedPlayerId <= 0) {
      res.status(400).json({ error: "playerId inválido" });
      return;
    }

    const [player] = await db
      .select({ id: playersTable.id })
      .from(playersTable)
      .where(
        and(
          eq(playersTable.id, normalizedPlayerId),
          eq(playersTable.clubId, targetClubId!),
        ),
      );

    if (!player) {
      res.status(404).json({ error: "Jugador no encontrado en el club indicado" });
      return;
    }

    const [newCobro] = await db
      .insert(cobrosTable)
      .values({
        playerId: normalizedPlayerId,
        clubId: targetClubId!,
        monto,
        notas,
        estado: "pendiente",
      })
      .returning();

    res.status(201).json(newCobro);
  } catch (error) {
    console.error("Error al crear cobro:", error);
    res.status(500).json({ error: "Error al crear cobro" });
  }
});

// PATCH: actualizar estado solo dentro del ámbito permitido.
router.patch("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const user = getSessionUser(req);
    const rawId = req.params.id;
    const id = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);

    if (isNaN(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const [existing] = await db
      .select()
      .from(cobrosTable)
      .where(
        isSuperAdminUser(user)
          ? eq(cobrosTable.id, id)
          : and(eq(cobrosTable.id, id), eq(cobrosTable.clubId, user.clubId!)),
      );

    if (!existing) {
      res.status(404).json({ error: "Cobro no encontrado" });
      return;
    }

    const { estado } = req.body;
    const [updated] = await db
      .update(cobrosTable)
      .set({
        estado,
        pagadoAt: estado === "pagado" ? new Date() : null,
      })
      .where(eq(cobrosTable.id, id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error("Error al actualizar cobro:", error);
    res.status(500).json({ error: "Error al actualizar cobro" });
  }
});

export default router;
