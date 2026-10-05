import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, clubSportCategoriesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/club-sport-categories", async (req, res): Promise<void> => {
  try {
    const categories = await db.select().from(clubSportCategoriesTable);
    res.json(categories);
  } catch (error: any) {
    console.error("⚠️ Advertencia: No se pudieron cargar las categorías (tabla faltante):", error.message);
    // Devolvemos un arreglo vacío para que el frontend no colapse con error 500
    res.json([]);
  }
});

export default router;