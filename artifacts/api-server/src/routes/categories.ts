import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, clubSportCategoriesTable, clubSportsTable } from "@workspace/db";
import { isSuperAdminUser, requireCommunityAccess } from "../middlewares/requireCommunity";

const router: IRouter = Router();

router.get("/club-sport-categories", requireCommunityAccess, async (req, res): Promise<void> => {
  try {
    const user = req.user as { clubId?: number | null; isAdmin?: number | boolean | null };
    const categories = isSuperAdminUser(user)
      ? await db.select().from(clubSportCategoriesTable)
      : await db
          .select({ id: clubSportCategoriesTable.id, clubSportId: clubSportCategoriesTable.clubSportId, name: clubSportCategoriesTable.name, createdAt: clubSportCategoriesTable.createdAt })
          .from(clubSportCategoriesTable)
          .innerJoin(clubSportsTable, eq(clubSportsTable.id, clubSportCategoriesTable.clubSportId))
          .where(eq(clubSportsTable.clubId, user.clubId!));
    res.json(categories);
  } catch (error: any) {
    console.error("⚠️ Advertencia: No se pudieron cargar las categorías (tabla faltante):", error.message);
    // Devolvemos un arreglo vacío para que el frontend no colapse con error 500
    res.json([]);
  }
});

export default router;