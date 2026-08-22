import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, sportsTable, clubSportCategoriesTable, sportModalitiesTable, clubSportsTable } from "@workspace/db";
import { isSuperAdminUser, requireCommunityAccess } from "../middlewares/requireCommunity";

const router: IRouter = Router();

// Endpoint para obtener todos los deportes activos.
// Los deportes son catálogo global, por lo que no requieren clubId.
router.get("/sports", async (req, res): Promise<void> => {
  try {
    const sports = await db.select().from(sportsTable).where(eq(sportsTable.active, true));
    res.json(sports);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener deportes" });
  }
});

// Las modalidades también son catálogo global por deporte.
router.get("/sport-modalities", async (req, res): Promise<void> => {
  const sportId = Number(req.query.sportId);
  if (!Number.isInteger(sportId) || sportId <= 0) {
    res.status(400).json({ error: "sportId es obligatorio" });
    return;
  }
  const modalities = await db
    .select()
    .from(sportModalitiesTable)
    .where(eq(sportModalitiesTable.sportId, sportId));
  res.json(modalities);
});

// Las categorías pertenecen a un clubSport, por lo que NUNCA deben
// devolverse globalmente a un usuario de una comunidad.
router.get("/club-sport-categories", requireCommunityAccess, async (req, res): Promise<void> => {
  try {
    const user = req.user as { clubId?: number | null; isAdmin?: number | boolean | null };

    const categories = isSuperAdminUser(user)
      ? await db.select().from(clubSportCategoriesTable)
      : await db
          .select({
            id: clubSportCategoriesTable.id,
            clubSportId: clubSportCategoriesTable.clubSportId,
            name: clubSportCategoriesTable.name,
            createdAt: clubSportCategoriesTable.createdAt,
          })
          .from(clubSportCategoriesTable)
          .innerJoin(
            clubSportsTable,
            eq(clubSportsTable.id, clubSportCategoriesTable.clubSportId),
          )
          .where(eq(clubSportsTable.clubId, user.clubId!));

    res.json(categories);
  } catch (error: any) {
    console.error("Error al obtener categorías por comunidad:", error?.message || error);
    res.status(500).json({ error: "Error al obtener categorías" });
  }
});

export default router;
