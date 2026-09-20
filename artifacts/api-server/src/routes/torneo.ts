import { Router, type Request, type Response } from "express";
import { and, eq } from "drizzle-orm";
import { db, torneoCalculosTable, cobrosTable, playersTable } from "@workspace/db";
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
    isAdmin?: number | boolean | null;
    isClubAdmin?: number | boolean | null;
  };
}

function isAdminUser(user: ReturnType<typeof getSessionUser>): boolean {
  return isSuperAdminUser(user) || isClubAdminUser(user);
}

type Item = { concepto: string; monto: number };

function normalizeItems(raw: unknown): Item[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const items: Item[] = [];
  for (const entry of raw) {
    const concepto = typeof entry?.concepto === "string" ? entry.concepto.trim() : "";
    const monto = Number(entry?.monto);
    if (!concepto || !Number.isFinite(monto)) return null;
    items.push({ concepto, monto });
  }
  return items;
}

// Toda la calculadora de torneo es exclusiva de administradores del club.
router.use((req: Request, res: Response, next) => {
  if (!isAdminUser(getSessionUser(req))) {
    res.status(403).json({ error: "Solo un administrador del club puede usar esta herramienta" });
    return;
  }
  next();
});

// GET: lista las calculadoras del club (o de todos los clubes para Super Admin sin club activo).
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const user = getSessionUser(req);
    const clubId = Number(user.clubId);
    const rows =
      Number.isInteger(clubId) && clubId > 0
        ? await db.select().from(torneoCalculosTable).where(eq(torneoCalculosTable.clubId, clubId))
        : await db.select().from(torneoCalculosTable);
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener calculadoras de torneo:", error);
    res.status(500).json({ error: "Error al obtener calculadoras de torneo" });
  }
});

// POST: crea una calculadora (proveedores/costos + descuento + jugadores que lo dividen).
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const user = getSessionUser(req);
    const clubId = Number(user.clubId);
    if (!Number.isInteger(clubId) || clubId <= 0) {
      res.status(400).json({ error: "Selecciona un club activo antes de continuar" });
      return;
    }

    const nombre = typeof req.body.nombre === "string" ? req.body.nombre.trim() : "";
    const items = normalizeItems(req.body.items);
    const descuento = Number(req.body.descuento ?? 0);
    const jugadorIds = Array.isArray(req.body.jugadorIds)
      ? req.body.jugadorIds.map(Number).filter((n: number) => Number.isInteger(n) && n > 0)
      : [];

    if (!nombre) {
      res.status(400).json({ error: "Ponle un nombre al torneo/actividad" });
      return;
    }
    if (!items) {
      res.status(400).json({ error: "Agrega al menos un concepto de costo" });
      return;
    }
    if (!Number.isFinite(descuento)) {
      res.status(400).json({ error: "Descuento inválido" });
      return;
    }
    if (jugadorIds.length === 0) {
      res.status(400).json({ error: "Selecciona al menos un jugador para repartir el costo" });
      return;
    }

    // Todos los jugadores deben ser del club activo, para no mezclar cobros entre clubes.
    const validPlayers = await db
      .select({ id: playersTable.id })
      .from(playersTable)
      .where(and(eq(playersTable.clubId, clubId)));
    const validIds = new Set(validPlayers.map((p) => p.id));
    if (!jugadorIds.every((id: number) => validIds.has(id))) {
      res.status(400).json({ error: "Uno o más jugadores no pertenecen a este club" });
      return;
    }

    const [created] = await db
      .insert(torneoCalculosTable)
      .values({
        clubId,
        nombre,
        items,
        descuento,
        jugadorIds,
        creadoPor: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.id || "admin",
      })
      .returning();

    res.status(201).json(created);
  } catch (error) {
    console.error("Error al crear calculadora de torneo:", error);
    res.status(500).json({ error: "Error al crear calculadora de torneo" });
  }
});

// POST /:id/aplicar: crea un ítem de cobro "nombre del torneo: pp" para cada
// jugador seleccionado. pp = (suma de items - descuento) / cantidad de jugadores.
router.post("/:id/aplicar", async (req: Request, res: Response): Promise<void> => {
  try {
    const user = getSessionUser(req);
    const clubId = Number(user.clubId);
    const rawId = req.params.id;
    const id = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const [calculo] = await db
      .select()
      .from(torneoCalculosTable)
      .where(
        isSuperAdminUser(user)
          ? eq(torneoCalculosTable.id, id)
          : and(eq(torneoCalculosTable.id, id), eq(torneoCalculosTable.clubId, clubId)),
      );

    if (!calculo) {
      res.status(404).json({ error: "Calculadora no encontrada" });
      return;
    }

    const total = calculo.items.reduce((acc, it) => acc + it.monto, 0) - calculo.descuento;
    const jugadorIds = calculo.jugadorIds;
    const pp = Math.round(total / jugadorIds.length);

    const nuevosCobros = await db
      .insert(cobrosTable)
      .values(
        jugadorIds.map((playerId) => ({
          playerId,
          clubId: calculo.clubId,
          monto: pp,
          items: [{ concepto: calculo.nombre, monto: pp }],
          estado: "pendiente" as const,
        })),
      )
      .returning();

    await db
      .update(torneoCalculosTable)
      .set({ aplicado: true })
      .where(eq(torneoCalculosTable.id, id));

    res.status(201).json({ pp, total, cobrosCreados: nuevosCobros.length });
  } catch (error) {
    console.error("Error al aplicar calculadora de torneo:", error);
    res.status(500).json({ error: "Error al aplicar calculadora de torneo" });
  }
});

export default router;
