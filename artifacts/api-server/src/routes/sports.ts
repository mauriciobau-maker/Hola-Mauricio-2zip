import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, sportsTable, clubSportCategoriesTable } from "@workspace/db";

const router: IRouter = Router();

// Endpoint para obtener todos los deportes activos
router.get("/sports", async (req, res): Promise<void> => {
  try {
    const sports = await db.select().from(sportsTable).where(eq(sportsTable.active, true));
    res.json(sports);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener deportes" });
  }
});

// Endpoint para obtener las categorías de deportes de los clubes
router.get("/club-sport-categories", async (req, res): Promise<void> => {
  try {
    const categories = await db.select().from(clubSportCategoriesTable);
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener categorías" });
  }
});

export default router;