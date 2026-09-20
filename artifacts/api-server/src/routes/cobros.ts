import { Router, type Request, type Response } from "express";
import { and, eq } from "drizzle-orm";
import { db, cobrosTable, playersTable } from "@workspace/db";
import {
  isSuperAdminUser,
  isClubAdminUser,
  requireCommunityAccess,
} from "../middlewares/requireCommunity";

const router = Router();

router.use(requireCommunityAccess);

function getSessionUser(req: Request) {
  return req.user as {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    clubId?: number | null;
    playerId?: number | null;
    isAdmin?: number | boolean | null;
    isClubAdmin?: number | boolean | null;
  };
}

function isAdminUser(user: ReturnType<typeof getSessionUser>): boolean {
  return isSuperAdminUser(user) || isClubAdminUser(user);
}

type CobroItem = { concepto: string; monto: number };

// Valida un desglose libre: cada línea necesita un concepto (texto) y un
// monto numérico. El monto puede ser negativo (ej. "Saldo a favor").
function normalizeItems(raw: unknown): CobroItem[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const items: CobroItem[] = [];
  for (const entry of raw) {
    const concepto = typeof entry?.concepto === "string" ? entry.concepto.trim() : "";
    const monto = Number(entry?.monto);
    if (!concepto || !Number.isFinite(monto)) return null;
    items.push({ concepto, monto });
  }
  return items;
}

function sumItems(items: CobroItem[]): number {
  return items.reduce((acc, it) => acc + it.monto, 0);
}

// GET: Admin (club/super) ve todos los cobros de su alcance.
// Un jugador normal solo ve SUS propios cobros, nunca los de otros jugadores.
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const user = getSessionUser(req);

    if (isSuperAdminUser(user)) {
      res.json(await db.select().from(cobrosTable));
      return;
    }

    if (isAdminUser(user)) {
      res.json(
        await db.select().from(cobrosTable).where(eq(cobrosTable.clubId, user.clubId!)),
      );
      return;
    }

    if (!user.playerId) {
      res.json([]);
      return;
    }

    res.json(
      await db
        .select()
        .from(cobrosTable)
        .where(
          and(
            eq(cobrosTable.clubId, user.clubId!),
            eq(cobrosTable.playerId, user.playerId),
          ),
        ),
    );
  } catch (error) {
    console.error("Error al obtener cobros:", error);
    res.status(500).json({ error: "Error al obtener cobros" });
  }
});

// POST: clubId ya viene resuelto por requireCommunityAccess (incluyendo el
// club activo de un Super Admin). El jugador debe pertenecer a ese mismo
// club para impedir asociaciones cruzadas.
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const user = getSessionUser(req);

    if (!isAdminUser(user)) {
      res.status(403).json({
        error: "Solo un administrador del club puede registrar cobros",
      });
      return;
    }

    const { playerId, notas } = req.body;
    const items = normalizeItems(req.body.items);
    if (!items) {
      res.status(400).json({
        error: "Agrega al menos un concepto con su monto",
      });
      return;
    }

    const targetClubId = Number(user.clubId);

    if (!Number.isInteger(targetClubId) || targetClubId <= 0) {
      res.status(400).json({
        error: "Selecciona un club activo antes de registrar el cobro",
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
        monto: sumItems(items),
        items,
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

// PATCH: el admin puede confirmar/editar libremente dentro de su alcance.
// Un jugador solo puede tocar SU PROPIO cobro, y únicamente para adjuntar
// un comprobante y marcarlo como "reportado" (nunca "pagado" directamente:
// esa confirmación final es siempre del administrador).
router.patch("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const user = getSessionUser(req);
    const rawId = req.params.id;
    const id = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);

    if (isNaN(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const admin = isAdminUser(user);

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

    if (admin) {
      const { estado, notas } = req.body;
      const newItems = req.body.items !== undefined ? normalizeItems(req.body.items) : undefined;
      if (req.body.items !== undefined && !newItems) {
        res.status(400).json({ error: "El desglose debe tener al menos un concepto válido" });
        return;
      }
      const [updated] = await db
        .update(cobrosTable)
        .set({
          ...(estado !== undefined ? { estado } : {}),
          ...(notas !== undefined ? { notas } : {}),
          ...(newItems ? { items: newItems, monto: sumItems(newItems) } : {}),
          pagadoAt: estado === "pagado" ? new Date() : existing.pagadoAt,
          confirmadoPor:
            estado === "pagado"
              ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.id || "admin"
              : existing.confirmadoPor,
        })
        .where(eq(cobrosTable.id, id))
        .returning();

      res.json(updated);
      return;
    }

    // Camino del jugador: solo sobre su propio cobro.
    if (!user.playerId || existing.playerId !== user.playerId) {
      res.status(404).json({ error: "Cobro no encontrado" });
      return;
    }

    if (existing.estado === "pagado") {
      res.status(400).json({ error: "Este cobro ya fue confirmado como pagado" });
      return;
    }

    const { comprobanteUrl } = req.body;
    const [updated] = await db
      .update(cobrosTable)
      .set({
        comprobanteUrl: comprobanteUrl ?? existing.comprobanteUrl,
        estado: "reportado", // el jugador solo puede reportar, nunca autoconfirmarse como pagado
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
