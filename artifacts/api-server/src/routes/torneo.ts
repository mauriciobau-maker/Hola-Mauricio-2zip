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

function normalizeJugadores(raw: unknown): { playerId: number; ajuste: number }[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const jugadores: { playerId: number; ajuste: number }[] = [];
  for (const entry of raw) {
    const playerId = Number(entry?.playerId);
    const ajuste = Number(entry?.ajuste ?? 0);
    if (!Number.isInteger(playerId) || playerId <= 0 || !Number.isFinite(ajuste)) return null;
    jugadores.push({ playerId, ajuste });
  }
  return jugadores;
}

// POST: crea una calculadora (costos compartidos + jugadores que lo dividen,
// cada uno con su propio ajuste opcional).
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
    const jugadores = normalizeJugadores(req.body.jugadores);

    if (!nombre) {
      res.status(400).json({ error: "Ponle un nombre al torneo/actividad" });
      return;
    }
    if (!items) {
      res.status(400).json({ error: "Agrega al menos un concepto de costo" });
      return;
    }
    if (!jugadores) {
      res.status(400).json({ error: "Selecciona al menos un jugador para repartir el costo" });
      return;
    }

    // Todos los jugadores deben ser del club activo, para no mezclar cobros entre clubes.
    const validPlayers = await db
      .select({ id: playersTable.id })
      .from(playersTable)
      .where(and(eq(playersTable.clubId, clubId)));
    const validIds = new Set(validPlayers.map((p) => p.id));
    if (!jugadores.every((j) => validIds.has(j.playerId))) {
      res.status(400).json({ error: "Uno o más jugadores no pertenecen a este club" });
      return;
    }

    const [created] = await db
      .insert(torneoCalculosTable)
      .values({
        clubId,
        nombre,
        items,
        jugadores,
        creadoPor: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.id || "admin",
      })
      .returning();

    res.status(201).json(created);
  } catch (error) {
    console.error("Error al crear calculadora de torneo:", error);
    res.status(500).json({ error: "Error al crear calculadora de torneo" });
  }
});

// POST /:id/aplicar: reparte el costo total en partes iguales entre todos los
// jugadores, y a cada uno le suma su propio ajuste (si lo tiene) como una
// línea aparte, para que quede claro en su detalle de dónde viene cada peso.
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

    const totalCostos = calculo.items.reduce((acc, it) => acc + it.monto, 0);
    const jugadores = calculo.jugadores;
    const basePP = Math.round(totalCostos / jugadores.length);

    const nuevosCobros = await db
      .insert(cobrosTable)
      .values(
        jugadores.map(({ playerId, ajuste }) => {
          const items = [{ concepto: calculo.nombre, monto: basePP }];
          if (ajuste) items.push({ concepto: "Ajuste", monto: ajuste });
          return {
            playerId,
            clubId: calculo.clubId,
            monto: basePP + ajuste,
            items,
            estado: "pendiente" as const,
          };
        }),
      )
      .returning();

    await db
      .update(torneoCalculosTable)
      .set({ aplicado: true })
      .where(eq(torneoCalculosTable.id, id));

    res.status(201).json({ basePP, totalCostos, cobrosCreados: nuevosCobros.length });
  } catch (error) {
    console.error("Error al aplicar calculadora de torneo:", error);
    res.status(500).json({ error: "Error al aplicar calculadora de torneo" });
  }
});

export default router;
