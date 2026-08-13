import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { cobrosTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireClub } from "../middlewares/requireCommunity";

const router = Router();

// All cobros routes require an authenticated user with a community assignment.
router.use(requireAuth, requireClub);

// GET: Listar cobros del club del usuario autenticado
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const clubId = (req.user as { clubId: number }).clubId;
    const cobros = await db
      .select()
      .from(cobrosTable)
      .where(eq(cobrosTable.clubId, clubId));
    res.json(cobros);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener cobros" });
  }
});

// POST: Registrar un nuevo cobro — clubId siempre del usuario autenticado
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const clubId = (req.user as { clubId: number }).clubId;
    const { playerId, monto, notas } = req.body;
    const [newCobro] = await db
      .insert(cobrosTable)
      .values({
        playerId,
        clubId,
        monto,
        notas,
        estado: "pendiente",
      })
      .returning();
    res.json(newCobro);
  } catch (error) {
    res.status(500).json({ error: "Error al crear cobro" });
  }
});

// PATCH: Actualizar estado de cobro — solo si pertenece al club del usuario
router.patch("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id;
    const id = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);
    const clubId = (req.user as { clubId: number }).clubId;

    const [existing] = await db
      .select()
      .from(cobrosTable)
      .where(and(eq(cobrosTable.id, id), eq(cobrosTable.clubId, clubId)));

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
    res.status(500).json({ error: "Error al actualizar cobro" });
  }
});

export default router;
