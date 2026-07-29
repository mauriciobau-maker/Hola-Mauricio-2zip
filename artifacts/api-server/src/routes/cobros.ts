import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { cobrosTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// GET: Listar todos los cobros (podemos filtrar por club luego)
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const cobros = await db.select().from(cobrosTable);
    res.json(cobros);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener cobros" });
  }
});

// POST: Registrar un nuevo cobro
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { playerId, clubId, monto, notas } = req.body;
    const [newCobro] = await db.insert(cobrosTable).values({
      playerId,
      clubId,
      monto,
      notas,
      estado: "pendiente"
    }).returning();
    res.json(newCobro);
  } catch (error) {
    res.status(500).json({ error: "Error al crear cobro" });
  }
});

// PATCH: Actualizar estado de cobro (ej: marcar como pagado)
router.patch("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id;
    const id = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);

    const { estado } = req.body;
    const [updated] = await db.update(cobrosTable)
      .set({ 
        estado,
        pagadoAt: estado === 'pagado' ? new Date() : null 
      })
      .where(eq(cobrosTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Cobro no encontrado" });
      return;
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar cobro" });
  }
});

export default router;